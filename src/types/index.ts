/**
 * Brother privilege levels in the congregation
 */
export type Privilege =
  | 'elder'
  | 'ministerial_servant'
  | 'publisher'
  | 'unbaptized';

/**
 * AV assignment positions
 */
export type AVPosition =
  | 'audio'
  | 'video'
  | 'avAssistant'
  | 'rightMic'
  | 'leftMic'
  | 'frontStage'
  | 'auditorium'
  | 'entrance1'
  | 'entrance2';

/**
 * Meeting types
 */
export type MeetingType = 'midweek' | 'weekend';

/**
 * Constraint types for brothers
 */
export type RestrictionType =
  | 'no_audio'
  | 'no_video'
  | 'no_av_assistant'
  | 'no_mic'
  | 'no_frontStage'
  | 'no_entrance'
  | 'no_auditorium'
  | 'mic_once_monthly';

/**
 * Brother profile with privileges and restrictions
 */
export interface Brother {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  privilege: Privilege;
  restrictions: RestrictionType[];
  isWTConductor?: 'primary' | 'backup';
  active: boolean;
}

/**
 * Meeting part from Hourglass PDF
 */
export interface MeetingPart {
  date: string;
  meetingType: MeetingType;
  partType: MeetingPartType;
  partTitle: string;
  assignedBrother: string | null;
  duration?: number;
}

/**
 * Types of meeting parts that affect AV assignments
 */
export type MeetingPartType =
  // Midweek
  | 'midweek_chairman'
  | 'opening_prayer'
  | 'treasures_talk'
  | 'spiritual_gems'
  | 'bible_reading'
  | 'student_talk'
  | 'living_as_christians'
  | 'cbs_chairman'
  | 'cbs_reader'
  | 'closing_prayer'
  // Weekend
  | 'weekend_chairman'
  | 'public_talk'
  | 'wt_conductor'
  | 'wt_reader';

/**
 * Constraint rule for meeting parts
 */
export type PartConstraint = 'no_av' | 'no_mic' | 'none';

/**
 * Special event type for a week
 */
export type SpecialEventType =
  | 'memorial'
  | 'circuit_assembly'
  | 'regional_convention'
  | 'other';

/**
 * Simplified meeting part for storage in schedule JSON
 */
export interface ScheduleMeetingPart {
  partType: MeetingPartType;
  partTitle: string;
  assignedBrother: string | null;
}

/**
 * Weekly AV schedule (Friday + Sunday)
 */
export interface WeeklySchedule {
  weekOf: string; // ISO date of Friday
  midweekDate: string;
  weekendDate: string;
  assignments: Record<AVPosition, string | null>;
  unavailable: {
    noAV: string[];
    noMic: string[];
  };
  conflicts: string[];
  /** Meeting parts from Hourglass PDFs */
  meetingParts?: {
    midweek: ScheduleMeetingPart[];
    weekend: ScheduleMeetingPart[];
  };
  /** Special event note (e.g., "Memorial", "Circuit Assembly") */
  note?: string;
  /** If true, only weekend meeting (no midweek) */
  weekendOnly?: boolean;
  /** If true, no meetings at all (Circuit Assembly, Convention) */
  noMeeting?: boolean;
  /** If true, week is locked and won't be overwritten by regeneration */
  locked?: boolean;
}

/**
 * Monthly schedule output
 */
export interface MonthlySchedule {
  month: string; // YYYY-MM format
  generated: string; // ISO timestamp
  weeks: WeeklySchedule[];
}

/**
 * Assignment history for fair rotation
 */
export interface AssignmentHistory {
  brotherId: string;
  position: AVPosition;
  date: string;
}

/**
 * Parsed meeting data from PDF
 */
export interface ParsedMeeting {
  date: string;
  meetingType: MeetingType;
  parts: MeetingPart[];
}
