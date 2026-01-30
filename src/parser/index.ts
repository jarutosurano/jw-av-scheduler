/**
 * Combined Meeting Parser
 *
 * Parses both midweek and weekend PDFs and combines them into weekly data
 * for the AV scheduler engine.
 */

import type { MeetingPart, ParsedMeeting, AVPosition } from '../types';
import { extractPDFText, detectMeetingType } from './pdf-extractor.js';
import { parseMidweekMeetings } from './midweek-parser.js';
import { parseWeekendMeetings, parseWeekendText } from './weekend-parser.js';
import { getWTConductor, getBrotherByName } from '../config/brothers.js';
import { meetingPartConstraints } from '../config/constraints.js';

/**
 * Combined weekly meeting data with both midweek and weekend parts
 */
export interface WeeklyMeetingData {
  weekOf: string; // ISO date of the Friday (midweek meeting)
  midweekDate: string;
  weekendDate: string;
  midweekParts: MeetingPart[];
  weekendParts: MeetingPart[];
  wtConductor: string | null;
  unavailableForAV: string[]; // Brothers who can't have ANY AV assignment
  unavailableForMic: string[]; // Brothers who can't do mic duty
}

/**
 * Parse both PDFs and combine into weekly meeting data
 */
export async function parseHourglassPDFs(
  midweekPdfPath: string,
  weekendPdfPath: string
): Promise<WeeklyMeetingData[]> {
  // Extract text from PDFs
  const midweekResult = await extractPDFText(midweekPdfPath);
  const weekendResult = await extractPDFText(weekendPdfPath);

  // Verify PDF types
  if (detectMeetingType(midweekResult.text) !== 'midweek') {
    console.warn(
      `Warning: ${midweekPdfPath} may not be a midweek meeting PDF`
    );
  }
  if (detectMeetingType(weekendResult.text) !== 'weekend') {
    console.warn(
      `Warning: ${weekendPdfPath} may not be a weekend meeting PDF`
    );
  }

  // Parse meetings
  const midweekMeetings = parseMidweekMeetings(midweekResult.text);
  const weekendMeetings = parseWeekendMeetings(weekendResult.text);

  // Get weekend raw data for WT conductor logic
  const weekendRawData = parseWeekendText(weekendResult.text);

  // Combine into weekly data
  return combineWeeklyMeetings(midweekMeetings, weekendMeetings, weekendRawData);
}

/**
 * Find the corresponding weekend meeting for a midweek meeting date
 * Weekend meeting is typically 2 days after midweek (Friday -> Sunday)
 */
function findMatchingWeekendMeeting(
  midweekDate: string,
  weekendMeetings: ParsedMeeting[]
): ParsedMeeting | null {
  const midweek = new Date(midweekDate);

  for (const weekend of weekendMeetings) {
    const weekendDate = new Date(weekend.date);
    const diffDays = Math.round(
      (weekendDate.getTime() - midweek.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Weekend should be 1-3 days after midweek (typically 2 for Fri->Sun)
    if (diffDays >= 1 && diffDays <= 3) {
      return weekend;
    }
  }

  return null;
}

/**
 * Combine midweek and weekend meetings into weekly data
 */
function combineWeeklyMeetings(
  midweekMeetings: ParsedMeeting[],
  weekendMeetings: ParsedMeeting[],
  weekendRawData: ReturnType<typeof parseWeekendText>
): WeeklyMeetingData[] {
  const weeks: WeeklyMeetingData[] = [];

  for (const midweek of midweekMeetings) {
    const weekend = findMatchingWeekendMeeting(midweek.date, weekendMeetings);

    if (!weekend) {
      console.warn(`No matching weekend meeting found for midweek ${midweek.date}`);
      continue;
    }

    // Find the raw weekend data for this date to get public talk speaker
    const weekendRaw = weekendRawData.find((w) => w.date === weekend.date);
    const publicTalkSpeaker = weekendRaw?.publicTalkSpeaker || null;

    // Determine WT Conductor
    const wtConductorBrother = getWTConductor(publicTalkSpeaker);
    const wtConductor = wtConductorBrother?.fullName || null;

    // Add WT Conductor as a meeting part (implicit)
    const weekendPartsWithWT = [...weekend.parts];
    if (wtConductor) {
      weekendPartsWithWT.push({
        date: weekend.date,
        meetingType: 'weekend',
        partType: 'wt_conductor',
        partTitle: 'WT Conductor',
        assignedBrother: wtConductor,
      });
    }

    // Calculate unavailable brothers
    const { unavailableForAV, unavailableForMic } = calculateUnavailableBrothers(
      midweek.parts,
      weekendPartsWithWT
    );

    weeks.push({
      weekOf: midweek.date,
      midweekDate: midweek.date,
      weekendDate: weekend.date,
      midweekParts: midweek.parts,
      weekendParts: weekendPartsWithWT,
      wtConductor,
      unavailableForAV,
      unavailableForMic,
    });
  }

  return weeks;
}

/**
 * Calculate which brothers are unavailable for AV assignments based on their meeting parts
 */
function calculateUnavailableBrothers(
  midweekParts: MeetingPart[],
  weekendParts: MeetingPart[]
): { unavailableForAV: string[]; unavailableForMic: string[] } {
  const unavailableForAV = new Set<string>();
  const unavailableForMic = new Set<string>();

  const allParts = [...midweekParts, ...weekendParts];

  for (const part of allParts) {
    if (!part.assignedBrother) continue;

    const constraint = meetingPartConstraints[part.partType];

    if (constraint === 'no_av') {
      unavailableForAV.add(part.assignedBrother);
    } else if (constraint === 'no_mic') {
      unavailableForMic.add(part.assignedBrother);
    }
  }

  return {
    unavailableForAV: Array.from(unavailableForAV),
    unavailableForMic: Array.from(unavailableForMic),
  };
}

/**
 * Get brothers available for a specific AV position for a given week
 */
export function getAvailableBrothersForPosition(
  week: WeeklyMeetingData,
  position: AVPosition,
  allBrothers: string[]
): string[] {
  const available: string[] = [];
  const isMicPosition = position === 'rightMic' || position === 'leftMic';

  for (const brother of allBrothers) {
    // Check if unavailable for all AV
    if (week.unavailableForAV.includes(brother)) {
      continue;
    }

    // Check if unavailable for mic (only applies to mic positions)
    if (isMicPosition && week.unavailableForMic.includes(brother)) {
      continue;
    }

    available.push(brother);
  }

  return available;
}

// Re-export individual parsers for flexibility
export { extractPDFText, detectMeetingType } from './pdf-extractor.js';
export { parseMidweekMeetings, parseMidweekText } from './midweek-parser.js';
export { parseWeekendMeetings, parseWeekendText } from './weekend-parser.js';
