/**
 * Schedule Data Loader
 *
 * Utilities for loading and formatting schedule data in Astro pages.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { MonthlySchedule, WeeklySchedule, AVPosition } from '../types';

const SCHEDULES_DIR = 'schedules';

/**
 * Position display names for the UI
 */
export const positionLabels: Record<AVPosition, string> = {
  audio: 'Audio',
  video: 'Video',
  avAssistant: 'A/V Assistant',
  rightMic: 'Right Mic',
  leftMic: 'Left Mic',
  frontStage: 'Front/Stage',
  auditorium: 'Auditorium',
  entrance1: 'Entrance 1',
  entrance2: 'Entrance 2',
};

/**
 * Position order for display
 */
export const positionOrder: AVPosition[] = [
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
 * Get all available schedule months
 */
export function getAvailableMonths(): string[] {
  const schedulesPath = path.resolve(SCHEDULES_DIR);

  if (!fs.existsSync(schedulesPath)) {
    return [];
  }

  return fs
    .readdirSync(schedulesPath)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort()
    .reverse(); // Most recent first
}

/**
 * Load a monthly schedule by month string (YYYY-MM)
 */
export function loadSchedule(month: string): MonthlySchedule | null {
  const filePath = path.resolve(SCHEDULES_DIR, `${month}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as MonthlySchedule;
}

/**
 * Get the most recent schedule
 */
export function getLatestSchedule(): MonthlySchedule | null {
  const months = getAvailableMonths();
  if (months.length === 0) return null;
  return loadSchedule(months[0]);
}

/**
 * Format a date string for display
 * "2026-02-13" -> "Feb 13"
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a date range for display
 * "2026-02-13", "2026-02-15" -> "Feb 13 & 15"
 */
export function formatDateRange(midweekDate: string, weekendDate: string): string {
  const midweek = new Date(midweekDate + 'T00:00:00');
  const weekend = new Date(weekendDate + 'T00:00:00');

  const midweekDay = midweek.getDate();
  const weekendDay = weekend.getDate();
  const month = midweek.toLocaleDateString('en-US', { month: 'short' });

  return `${month} ${midweekDay} & ${weekendDay}`;
}

/**
 * Format month for display
 * "2026-02" -> "February 2026"
 */
export function formatMonthDisplay(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format month for short display
 * "2026-02" -> "Feb 2026"
 */
export function formatMonthShort(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Convert brother ID to display name
 * "jonas-santiso" -> "Jonas Santiso"
 */
export function formatBrotherName(brotherId: string | null): string {
  if (!brotherId) return '—';

  return brotherId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Group months by year for sidebar navigation
 */
export function groupMonthsByYear(
  months: string[]
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const month of months) {
    const year = month.split('-')[0];
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(month);
  }

  return grouped;
}

/**
 * Get month name from month string
 * "2026-02" -> "February"
 */
export function getMonthName(month: string): string {
  const monthNum = parseInt(month.split('-')[1]);
  const date = new Date(2000, monthNum - 1);
  return date.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Check if a week has any conflicts
 */
export function hasConflicts(week: WeeklySchedule): boolean {
  return week.conflicts.length > 0;
}

/**
 * Get statistics for a monthly schedule
 */
export function getScheduleStats(schedule: MonthlySchedule): {
  totalWeeks: number;
  totalAssignments: number;
  uniqueBrothers: number;
} {
  const brothers = new Set<string>();
  let totalAssignments = 0;

  for (const week of schedule.weeks) {
    for (const brotherId of Object.values(week.assignments)) {
      if (brotherId) {
        brothers.add(brotherId);
        totalAssignments++;
      }
    }
  }

  return {
    totalWeeks: schedule.weeks.length,
    totalAssignments,
    uniqueBrothers: brothers.size,
  };
}
