/**
 * Weekend Meeting Parser
 *
 * Parses Hourglass PDF exports for weekend meetings
 */

import type { MeetingPart, MeetingPartType, ParsedMeeting } from '../types';

/**
 * Parsed weekend meeting data for a single week
 */
export interface WeekendMeetingData {
  date: string;
  publicTalkTitle: string | null;
  publicTalkSpeaker: string | null;
  speakerCongregation: string | null;
  chairman: string | null;
  wtReader: string | null;
  openingPrayer: string | null;
  closingPrayer: string | null;
}

/**
 * Parse a date string from PDF format
 * Input: "February 8, 2026"
 * Output: "2026-02-08"
 */
function parseDateString(dateStr: string): string {
  const date = new Date(dateStr.trim());
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Extract name after a label (e.g., "ChairmanLucero, Herman" -> "Lucero, Herman")
 */
function extractNameAfterLabel(line: string, label: string): string | null {
  const labelIndex = line.indexOf(label);
  if (labelIndex === -1) return null;

  const afterLabel = line.substring(labelIndex + label.length).trim();
  return afterLabel || null;
}

/**
 * Parse the public talk speaker line
 * Input: "Quinol, Randino — Victoria Tagalog, Kitchener, ONChairmanSullano, Jayr P."
 * Output: { name: "Quinol, Randino", congregation: "Victoria Tagalog, Kitchener, ON" }
 *
 * Note: The PDF often combines speaker and chairman on the same line
 */
function parsePublicTalkSpeaker(
  line: string
): { name: string; congregation: string } | null {
  // Pattern: "Name — Congregation" (em dash), possibly followed by "Chairman..."
  if (!line.includes('—') && !line.includes(' - ')) {
    return null;
  }

  // Split by em dash first
  const parts = line.split('—');
  if (parts.length >= 2) {
    const name = parts[0].trim();
    // The congregation part might have "ChairmanName" appended
    let congregation = parts[1].trim();

    // Remove "Chairman..." suffix if present
    const chairmanIndex = congregation.indexOf('Chairman');
    if (chairmanIndex !== -1) {
      congregation = congregation.substring(0, chairmanIndex).trim();
    }

    // Also handle "Watchtower Reader" suffix (for some edge cases)
    const wtIndex = congregation.indexOf('Watchtower');
    if (wtIndex !== -1) {
      congregation = congregation.substring(0, wtIndex).trim();
    }

    if (name && congregation) {
      return { name, congregation };
    }
  }

  // Try regular dash as fallback
  const dashParts = line.split(' - ');
  if (dashParts.length >= 2) {
    const name = dashParts[0].trim();
    let congregation = dashParts[1].trim();
    const chairmanIndex = congregation.indexOf('Chairman');
    if (chairmanIndex !== -1) {
      congregation = congregation.substring(0, chairmanIndex).trim();
    }
    if (name && congregation) {
      return { name, congregation };
    }
  }

  return null;
}

/**
 * Parse weekend meeting text into structured data
 */
export function parseWeekendText(text: string): WeekendMeetingData[] {
  const meetings: WeekendMeetingData[] = [];

  // Split by date pattern
  const datePattern =
    /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})/gi;

  const sections = text.split(datePattern);

  // Process each date section
  for (let i = 1; i < sections.length; i += 2) {
    const dateStr = sections[i];
    const content = sections[i + 1] || '';

    try {
      const meeting = parseSingleWeekendMeeting(dateStr, content);
      meetings.push(meeting);
    } catch (error) {
      console.warn(`Failed to parse weekend meeting for ${dateStr}:`, error);
    }
  }

  return meetings;
}

/**
 * Parse a single weekend meeting
 */
function parseSingleWeekendMeeting(
  dateStr: string,
  content: string
): WeekendMeetingData {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const meeting: WeekendMeetingData = {
    date: parseDateString(dateStr),
    publicTalkTitle: null,
    publicTalkSpeaker: null,
    speakerCongregation: null,
    chairman: null,
    wtReader: null,
    openingPrayer: null,
    closingPrayer: null,
  };

  // First non-date line is often the public talk title (or song)
  let titleFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip "Hospitality" lines
    if (line.startsWith('Hospitality')) continue;

    // Opening Prayer
    if (line.includes('Opening Prayer')) {
      meeting.openingPrayer = extractNameAfterLabel(line, 'Opening Prayer');
      continue;
    }

    // Public Talk Speaker - check BEFORE Chairman because the line often contains both
    // Pattern: "Speaker — Congregation[Chairman|Watchtower Reader]..."
    if (line.includes('—') && !meeting.publicTalkSpeaker) {
      const speaker = parsePublicTalkSpeaker(line);
      if (speaker) {
        meeting.publicTalkSpeaker = speaker.name;
        meeting.speakerCongregation = speaker.congregation;
      }

      // Also extract Chairman from the same line if present
      if (line.includes('Chairman')) {
        meeting.chairman = extractNameAfterLabel(line, 'Chairman');
      }
      // Or Watchtower Reader if present
      if (line.includes('Watchtower Reader')) {
        meeting.wtReader = extractNameAfterLabel(line, 'Watchtower Reader');
      }
      continue;
    }

    // Chairman (standalone line)
    if (
      line.includes('Chairman') &&
      !line.includes('Opening') &&
      !meeting.chairman
    ) {
      meeting.chairman = extractNameAfterLabel(line, 'Chairman');
      continue;
    }

    // Watchtower Reader
    if (line.includes('Watchtower Reader')) {
      meeting.wtReader = extractNameAfterLabel(line, 'Watchtower Reader');
      continue;
    }

    // Closing Prayer
    if (line.includes('Closing Prayer')) {
      meeting.closingPrayer = extractNameAfterLabel(line, 'Closing Prayer');
      continue;
    }

    // First line that's not a known field is likely the talk title
    if (
      !titleFound &&
      !line.startsWith('Song') &&
      !line.includes('Prayer') &&
      !line.includes('Chairman') &&
      !line.includes('Reader') &&
      !line.includes('—') &&
      !line.includes('Hospitality')
    ) {
      meeting.publicTalkTitle = line;
      titleFound = true;
    }
  }

  return meeting;
}

/**
 * Convert weekend meeting data to MeetingPart array
 */
export function weekendDataToMeetingParts(
  data: WeekendMeetingData
): MeetingPart[] {
  const parts: MeetingPart[] = [];

  const addPart = (
    partType: MeetingPartType,
    title: string,
    assignedBrother: string | null
  ) => {
    parts.push({
      date: data.date,
      meetingType: 'weekend',
      partType,
      partTitle: title,
      assignedBrother,
    });
  };

  // Chairman (also handles Opening Prayer for weekend meetings)
  if (data.chairman) {
    addPart('weekend_chairman', 'Chairman', data.chairman);
  }

  // Public Talk Speaker
  if (data.publicTalkSpeaker) {
    addPart(
      'public_talk',
      data.publicTalkTitle || 'Public Talk',
      data.publicTalkSpeaker
    );
  }

  // WT Reader
  if (data.wtReader) {
    addPart('wt_reader', 'Watchtower Reader', data.wtReader);
  }

  // Closing Prayer
  if (data.closingPrayer) {
    addPart('closing_prayer', 'Closing Prayer', data.closingPrayer);
  }

  return parts;
}

/**
 * Parse weekend PDF text and return ParsedMeeting array
 */
export function parseWeekendMeetings(text: string): ParsedMeeting[] {
  const meetingsData = parseWeekendText(text);

  return meetingsData.map((data) => ({
    date: data.date,
    meetingType: 'weekend' as const,
    parts: weekendDataToMeetingParts(data),
  }));
}
