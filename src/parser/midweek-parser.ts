/**
 * Midweek Meeting Parser
 *
 * Parses Hourglass PDF exports for midweek meetings
 */

import type { MeetingPart, MeetingPartType, ParsedMeeting } from '../types';

/**
 * Parsed midweek meeting data for a single week
 */
export interface MidweekMeetingData {
  date: string;
  chairman: string | null;
  openingPrayer: string | null;
  treasuresTalk: string | null;
  spiritualGems: string | null;
  bibleReading: string | null;
  studentTalks: string[];
  livingAsChristians: string[];
  cbsChairman: string | null;
  cbsReader: string | null;
  closingPrayer: string | null;
}

/**
 * Parse a date string from PDF format
 * Input: "February 6, 2026 | ISAIAS 30-32" or "February 6, 2026"
 * Output: "2026-02-06"
 */
function parseDateString(dateStr: string): string {
  // Remove the scripture reference if present
  const cleanDate = dateStr.split('|')[0].trim();

  // Parse the date
  const date = new Date(cleanDate);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  // Format as ISO date
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Extract name from a part line
 * Input: "1. Magtiwalang Poprotektahan Ka ni Jehova (10 min.)Penera, Abraham"
 * Output: "Penera, Abraham"
 */
function extractNameFromPartLine(line: string): string | null {
  // Pattern: text with duration in parentheses, then name
  // The name comes after the closing parenthesis
  const match = line.match(/\(\d+\s*min\.?\)\s*(.+)$/i);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Check if a name belongs to a known brother (male names)
 * This helps filter out sister parts from student talks
 */
function isMaleName(name: string): boolean {
  // List of known male first names from our brothers config
  const maleFirstNames = [
    'jonas', 'dandel', 'raffy', 'rafael', 'randy', 'randino', 'matt', 'matthew',
    'melky', 'melquisidecks', 'gally', 'sir galahad', 'abraham', 'herman',
    'edgar', 'edgardo', 'jayr', 'edmer', 'jared', 'ralph', 'zach', 'cezar',
    'john', 'xian', 'genesis', 'mike',
  ];

  const firstName = name.split(',')[0].toLowerCase().trim();
  const reversedFirstName = name.split(' ').pop()?.toLowerCase().trim() || '';

  return (
    maleFirstNames.some((n) => firstName.includes(n)) ||
    maleFirstNames.some((n) => reversedFirstName.includes(n))
  );
}

/**
 * Parse midweek meeting text into structured data
 */
export function parseMidweekText(text: string): MidweekMeetingData[] {
  const meetings: MidweekMeetingData[] = [];

  // Split by date pattern to get individual weeks
  const datePattern =
    /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})/gi;

  const sections = text.split(datePattern);

  // Process each date section
  for (let i = 1; i < sections.length; i += 2) {
    const dateStr = sections[i];
    const content = sections[i + 1] || '';

    try {
      const meeting = parseSingleMidweekMeeting(dateStr, content);
      meetings.push(meeting);
    } catch (error) {
      console.warn(`Failed to parse meeting for ${dateStr}:`, error);
    }
  }

  return meetings;
}

/**
 * Parse a single midweek meeting
 */
function parseSingleMidweekMeeting(
  dateStr: string,
  content: string
): MidweekMeetingData {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);

  const meeting: MidweekMeetingData = {
    date: parseDateString(dateStr),
    chairman: null,
    openingPrayer: null,
    treasuresTalk: null,
    spiritualGems: null,
    bibleReading: null,
    studentTalks: [],
    livingAsChristians: [],
    cbsChairman: null,
    cbsReader: null,
    closingPrayer: null,
  };

  let inTreasures = false;
  let inApplyYourself = false;
  let inLivingAsChristians = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';

    // Detect sections
    if (line.includes('TREASURES FROM GOD')) {
      inTreasures = true;
      inApplyYourself = false;
      inLivingAsChristians = false;
      continue;
    }
    if (line.includes('APPLY YOURSELF')) {
      inTreasures = false;
      inApplyYourself = true;
      inLivingAsChristians = false;
      continue;
    }
    if (line.includes('LIVING AS CHRISTIANS')) {
      inTreasures = false;
      inApplyYourself = false;
      inLivingAsChristians = true;
      continue;
    }

    // Chairman - appears at the start, followed by name on next line
    if (line === 'Chairman' && !meeting.chairman) {
      meeting.chairman = nextLine || null;
      continue;
    }

    // Opening Prayer - line starts with "Prayer" in the opening section
    if (line === 'Prayer' && !meeting.openingPrayer && i < 10) {
      meeting.openingPrayer = nextLine || null;
      continue;
    }

    // Treasures section
    if (inTreasures) {
      // First 10 min talk (Treasures talk)
      if (line.startsWith('1.') && line.includes('min.)')) {
        meeting.treasuresTalk = extractNameFromPartLine(line);
      }
      // Spiritual Gems
      if (line.includes('Espirituwal na Hiyas') || line.includes('Spiritual Gems')) {
        meeting.spiritualGems = extractNameFromPartLine(line);
      }
      // Bible Reading
      if (line.includes('Pagbabasa ng Bibliya') || line.includes('Bible Reading')) {
        meeting.bibleReading = extractNameFromPartLine(line);
      }
    }

    // Apply Yourself section (student talks)
    if (inApplyYourself) {
      const name = extractNameFromPartLine(line);
      if (name) {
        // May have multiple names separated by "/"
        const names = name.split('/').map((n) => n.trim());
        for (const n of names) {
          // Only track male names (we don't assign sisters to AV)
          if (isMaleName(n)) {
            meeting.studentTalks.push(n);
          }
        }
      }
    }

    // Living as Christians section
    if (inLivingAsChristians) {
      // CBS (Congregation Bible Study)
      if (
        line.includes('Pag-aaral ng Kongregasyon') ||
        line.includes('Congregation Bible Study')
      ) {
        const names = extractNameFromPartLine(line);
        if (names) {
          const parts = names.split('/').map((n) => n.trim());
          meeting.cbsChairman = parts[0] || null;
          meeting.cbsReader = parts[1] || null;
        }
      }
      // Other Living as Christians parts
      else {
        const name = extractNameFromPartLine(line);
        if (name && isMaleName(name)) {
          meeting.livingAsChristians.push(name);
        }
      }
    }

    // Closing Prayer - "Prayer" near the end followed by name
    if (line === 'Prayer' && i > lines.length - 10) {
      meeting.closingPrayer = nextLine || null;
    }
  }

  return meeting;
}

/**
 * Convert midweek meeting data to MeetingPart array
 */
export function midweekDataToMeetingParts(data: MidweekMeetingData): MeetingPart[] {
  const parts: MeetingPart[] = [];

  const addPart = (
    partType: MeetingPartType,
    title: string,
    assignedBrother: string | null
  ) => {
    parts.push({
      date: data.date,
      meetingType: 'midweek',
      partType,
      partTitle: title,
      assignedBrother,
    });
  };

  // Chairman
  if (data.chairman) {
    addPart('midweek_chairman', 'Chairman', data.chairman);
  }

  // Opening Prayer
  if (data.openingPrayer) {
    addPart('opening_prayer', 'Opening Prayer', data.openingPrayer);
  }

  // Treasures Talk
  if (data.treasuresTalk) {
    addPart('treasures_talk', 'Treasures Talk (10 min)', data.treasuresTalk);
  }

  // Spiritual Gems
  if (data.spiritualGems) {
    addPart('spiritual_gems', 'Espirituwal na Hiyas (10 min)', data.spiritualGems);
  }

  // Bible Reading
  if (data.bibleReading) {
    addPart('bible_reading', 'Pagbabasa ng Bibliya', data.bibleReading);
  }

  // Student talks
  for (const student of data.studentTalks) {
    addPart('student_talk', 'Student Talk', student);
  }

  // Living as Christians parts
  for (const brother of data.livingAsChristians) {
    addPart('living_as_christians', 'Living as Christians', brother);
  }

  // CBS Chairman
  if (data.cbsChairman) {
    addPart('cbs_chairman', 'CBS Chairman', data.cbsChairman);
  }

  // CBS Reader
  if (data.cbsReader) {
    addPart('cbs_reader', 'CBS Reader', data.cbsReader);
  }

  // Closing Prayer
  if (data.closingPrayer) {
    addPart('closing_prayer', 'Closing Prayer', data.closingPrayer);
  }

  return parts;
}

/**
 * Parse midweek PDF text and return ParsedMeeting array
 */
export function parseMidweekMeetings(text: string): ParsedMeeting[] {
  const meetingsData = parseMidweekText(text);

  return meetingsData.map((data) => ({
    date: data.date,
    meetingType: 'midweek' as const,
    parts: midweekDataToMeetingParts(data),
  }));
}
