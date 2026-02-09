import type {
  AVPosition,
  MeetingPartType,
  PartConstraint,
  RestrictionType,
} from '../types';

/**
 * Meeting part constraints - what AV positions are restricted for each part
 */
export const meetingPartConstraints: Record<MeetingPartType, PartConstraint> = {
  // Midweek Meeting
  midweek_chairman: 'no_av', // Cannot have ANY AV assignment
  opening_prayer: 'none',
  treasures_talk: 'no_mic', // 10 min talk - no mic assignment
  spiritual_gems: 'no_mic', // Espirituwal na Hiyas
  bible_reading: 'no_mic', // Pagbabasa ng Bibliya
  student_talk: 'none', // 3/4/5 min Apply Yourself - no restriction (not the same as Public Talk)
  living_as_christians: 'none', // 5/10/15 min parts
  cbs_chairman: 'no_av', // CBS Conductor - no AV
  cbs_reader: 'no_mic',
  closing_prayer: 'none',

  // Weekend Meeting
  weekend_chairman: 'no_av',
  public_talk: 'no_av',
  wt_conductor: 'no_av', // WT Conductor - no AV at all
  wt_reader: 'no_mic',
};

/**
 * AV positions that are affected by 'no_mic' constraint
 */
export const micPositions: AVPosition[] = ['rightMic', 'leftMic'];

/**
 * AV positions that are affected by 'no_av' constraint (ALL positions)
 */
export const allAVPositions: AVPosition[] = [
  'audio',
  'video',
  'avAssistant',
  'rightMic',
  'leftMic',
  'frontStage',
  'auditorium',
  'entrance1',
  'entrance2',
];

/**
 * Map brother restrictions to blocked AV positions
 */
export const restrictionToPositions: Record<RestrictionType, AVPosition[]> = {
  no_audio: ['audio'],
  no_video: ['video'],
  no_av_assistant: ['avAssistant'],
  no_mic: ['rightMic', 'leftMic'],
  no_frontStage: ['frontStage'],
  no_entrance: ['entrance1', 'entrance2'],
  no_auditorium: ['auditorium'],
  mic_once_monthly: [], // Handled separately with history tracking
};

/**
 * Positions that require Elder or MS privilege
 */
export const privilegedPositions: AVPosition[] = ['auditorium'];

/**
 * Brothers eligible for Video position (fair rotation among all)
 * Includes MS, publishers, and specific elders
 */
export const videoEligibleBrotherIds: string[] = [
  // MS and publishers
  'jayr-sullano',
  'jared-nieva',
  'zach-lucero',
  'john-mahor',
  // Elders
  'matt-mancuso',
  'dandel-cabusas',
  'gally-villanueva',
  'herman-lucero',
  'abraham-penera',
];

/**
 * Brothers to prioritize for assignments (assign every week if no conflict)
 */
export const priorityBrotherIds: string[] = ['zach-lucero', 'john-mahor'];

/**
 * Priority order for scheduling (most critical first)
 */
export const schedulingPriority: AVPosition[] = [
  'audio', // Most critical - schedule first
  'video', // Critical
  'avAssistant', // Support role
  'rightMic', // Mic attendants
  'leftMic',
  'frontStage', // Attendants
  'auditorium',
  'entrance1',
  'entrance2',
];

/**
 * Display names for AV positions
 */
export const positionDisplayNames: Record<AVPosition, string> = {
  audio: 'Audio',
  video: 'Video',
  avAssistant: 'A/V Assistant',
  rightMic: 'Right Mic',
  leftMic: 'Left Mic',
  frontStage: 'Front/Stage Attendant',
  auditorium: 'Auditorium Attendant',
  entrance1: 'Entrance Door 1',
  entrance2: 'Entrance Door 2',
};

/**
 * Check if a position is blocked by a constraint type
 */
export function isPositionBlockedByConstraint(
  position: AVPosition,
  constraint: PartConstraint
): boolean {
  if (constraint === 'none') return false;
  if (constraint === 'no_av') return true; // All positions blocked
  if (constraint === 'no_mic') return micPositions.includes(position);
  return false;
}

/**
 * Check if a brother's restriction blocks a position
 */
export function isPositionBlockedByRestriction(
  position: AVPosition,
  restriction: RestrictionType
): boolean {
  const blockedPositions = restrictionToPositions[restriction];
  return blockedPositions.includes(position);
}

/**
 * Get all positions a brother can be assigned to based on their restrictions
 */
export function getAvailablePositionsForBrother(
  restrictions: RestrictionType[],
  isElderOrMS: boolean
): AVPosition[] {
  return allAVPositions.filter((position) => {
    // Check privilege requirement
    if (privilegedPositions.includes(position) && !isElderOrMS) {
      return false;
    }

    // Check restrictions
    for (const restriction of restrictions) {
      if (isPositionBlockedByRestriction(position, restriction)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Keywords to identify meeting parts from PDF text
 */
export const partKeywords: Record<MeetingPartType, string[]> = {
  // Midweek
  midweek_chairman: ['Chairman'],
  opening_prayer: ['Opening Prayer', 'Prayer'],
  treasures_talk: ['min.)'], // First 10 min talk in Treasures section
  spiritual_gems: ['Espirituwal na Hiyas', 'Spiritual Gems'],
  bible_reading: ['Pagbabasa ng Bibliya', 'Bible Reading', 'Pagbabasa'],
  student_talk: [
    'Maging Mahusay',
    'Pakikipag-usap',
    'Pahayag',
    'Paggawa ng mga Alagad',
  ],
  living_as_christians: [
    'Pamumuhay',
    'Living as Christians',
    'Video Clip',
    'Lokal na Pangangailangan',
  ],
  cbs_chairman: ['Pag-aaral ng Kongregasyon', 'Congregation Bible Study'],
  cbs_reader: [], // Second name after CBS Chairman
  closing_prayer: ['Closing Prayer'],

  // Weekend
  weekend_chairman: ['Chairman'],
  public_talk: [], // Speaker line in weekend PDF
  wt_conductor: [], // Implicit - not in PDF
  wt_reader: ['Watchtower Reader'],
};
