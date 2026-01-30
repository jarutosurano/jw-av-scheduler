/**
 * Scheduling Engine
 *
 * Core algorithm for generating AV assignments with:
 * - Priority-based position scheduling
 * - Fair rotation using history
 * - Constraint validation
 * - Conflict detection
 */

import type { AVPosition, WeeklySchedule } from '../types';
import type { WeeklyMeetingData } from '../parser/index.js';
import type { HistoryData } from './history.js';
import { getAvailableBrothersForPosition } from './availability.js';
import {
  sortBrothersByFairness,
  canXianDoMicThisMonth,
  addAssignment,
} from './history.js';
import { schedulingPriority, micPositions } from '../config/constraints.js';

/**
 * Result of scheduling a single week
 */
export interface SchedulingResult {
  schedule: WeeklySchedule;
  conflicts: string[];
  warnings: string[];
}

/**
 * Options for the scheduling algorithm
 */
export interface SchedulingOptions {
  /** Skip specific positions (already assigned manually) */
  skipPositions?: AVPosition[];
  /** Force specific assignments (manual overrides) */
  forceAssignments?: Partial<Record<AVPosition, string>>;
  /** Prefer certain brothers for Audio/Video (experienced) */
  preferredAudioVideo?: string[];
}

/**
 * Generate AV schedule for a single week
 */
export function scheduleWeek(
  week: WeeklyMeetingData,
  history: HistoryData,
  options: SchedulingOptions = {}
): SchedulingResult {
  const assignments: Record<AVPosition, string | null> = {
    audio: null,
    video: null,
    avAssistant: null,
    rightMic: null,
    leftMic: null,
    frontStage: null,
    auditorium: null,
    entrance1: null,
    entrance2: null,
  };

  const conflicts: string[] = [];
  const warnings: string[] = [];
  const assignedThisWeek = new Set<string>(); // Track who's already assigned

  // Apply forced assignments first
  if (options.forceAssignments) {
    for (const [position, brotherId] of Object.entries(options.forceAssignments)) {
      if (brotherId) {
        assignments[position as AVPosition] = brotherId;
        assignedThisWeek.add(brotherId);
      }
    }
  }

  // Get year-month for Xian's monthly limit check
  const yearMonth = week.weekOf.substring(0, 7);

  // Schedule positions in priority order
  for (const position of schedulingPriority) {
    // Skip if already assigned (forced) or in skip list
    if (assignments[position]) continue;
    if (options.skipPositions?.includes(position)) continue;

    // Get available brothers for this position
    const availability = getAvailableBrothersForPosition(position, week);
    let candidates = availability.availableBrothers
      .filter((b) => !assignedThisWeek.has(b.id)) // Not already assigned this week
      .map((b) => b.id);

    // Handle Xian's mic-once-monthly rule
    if (micPositions.includes(position)) {
      const xianId = 'xian-salazar';
      if (candidates.includes(xianId)) {
        if (!canXianDoMicThisMonth(history, yearMonth)) {
          // Remove Xian from candidates - already did mic this month
          candidates = candidates.filter((id) => id !== xianId);
          warnings.push(
            `Xian excluded from ${position} - already assigned mic this month`
          );
        }
      }
    }

    // Apply preference for Audio/Video if specified
    if (
      (position === 'audio' || position === 'video') &&
      options.preferredAudioVideo?.length
    ) {
      const preferred = candidates.filter((id) =>
        options.preferredAudioVideo!.includes(id)
      );
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    // Sort by fairness (least recently assigned first)
    const sortedCandidates = sortBrothersByFairness(
      candidates,
      history,
      position,
      week.weekOf
    );

    if (sortedCandidates.length === 0) {
      conflicts.push(`No available brothers for ${position}`);
      continue;
    }

    // Assign the fairest choice
    const selectedBrother = sortedCandidates[0];
    assignments[position] = selectedBrother;
    assignedThisWeek.add(selectedBrother);

    // Add to history
    addAssignment(history, selectedBrother, position, week.weekOf);
  }

  // Build the schedule result
  const schedule: WeeklySchedule = {
    weekOf: week.weekOf,
    midweekDate: week.midweekDate,
    weekendDate: week.weekendDate,
    assignments,
    unavailable: {
      noAV: week.unavailableForAV,
      noMic: week.unavailableForMic,
    },
    conflicts,
  };

  return {
    schedule,
    conflicts,
    warnings,
  };
}

/**
 * Generate schedules for multiple weeks
 */
export function scheduleMultipleWeeks(
  weeks: WeeklyMeetingData[],
  history: HistoryData,
  options: SchedulingOptions = {}
): SchedulingResult[] {
  const results: SchedulingResult[] = [];

  for (const week of weeks) {
    const result = scheduleWeek(week, history, options);
    results.push(result);
  }

  return results;
}

/**
 * Validate a schedule for conflicts
 */
export function validateSchedule(schedule: WeeklySchedule): string[] {
  const errors: string[] = [];
  const assignedBrothers = new Set<string>();

  for (const [position, brotherId] of Object.entries(schedule.assignments)) {
    if (!brotherId) {
      errors.push(`${position} is not assigned`);
      continue;
    }

    // Check for duplicate assignments
    if (assignedBrothers.has(brotherId)) {
      errors.push(`${brotherId} is assigned to multiple positions`);
    }
    assignedBrothers.add(brotherId);

    // Check if brother is in unavailable list
    if (schedule.unavailable.noAV.includes(brotherId)) {
      errors.push(`${brotherId} is unavailable for AV but assigned to ${position}`);
    }

    // Check mic-specific unavailability
    if (
      micPositions.includes(position as AVPosition) &&
      schedule.unavailable.noMic.includes(brotherId)
    ) {
      errors.push(`${brotherId} is unavailable for mic but assigned to ${position}`);
    }
  }

  return errors;
}

/**
 * Get a summary of the schedule
 */
export function getScheduleSummary(schedule: WeeklySchedule): string {
  const lines = [
    `Week of ${schedule.weekOf}`,
    `Midweek: ${schedule.midweekDate} | Weekend: ${schedule.weekendDate}`,
    '',
    'Assignments:',
  ];

  for (const [position, brotherId] of Object.entries(schedule.assignments)) {
    lines.push(`  ${position}: ${brotherId || '(unassigned)'}`);
  }

  if (schedule.conflicts.length > 0) {
    lines.push('');
    lines.push('Conflicts:');
    for (const conflict of schedule.conflicts) {
      lines.push(`  - ${conflict}`);
    }
  }

  return lines.join('\n');
}

/**
 * Convert brother ID to display name
 */
export function idToDisplayName(brotherId: string): string {
  // Convert "jonas-santiso" to "Jonas Santiso"
  return brotherId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format schedule for display with full names
 */
export function formatScheduleForDisplay(
  schedule: WeeklySchedule
): Record<AVPosition, string> {
  const formatted: Record<AVPosition, string> = {} as Record<AVPosition, string>;

  for (const [position, brotherId] of Object.entries(schedule.assignments)) {
    formatted[position as AVPosition] = brotherId
      ? idToDisplayName(brotherId)
      : '(unassigned)';
  }

  return formatted;
}
