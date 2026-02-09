/**
 * Special Dates Calendar
 *
 * Define dates with special meeting arrangements here.
 * These take priority over PDF data during schedule generation.
 *
 * - weekendOnly: No midweek meeting (e.g., Memorial) but weekend still happens
 * - noMeeting: No meetings at all that week (e.g., Circuit Assembly, Convention)
 */

export interface SpecialDate {
  /** Friday (midweek) date in YYYY-MM-DD format */
  date: string;
  /** Sunday (weekend) date - auto-calculated if not provided */
  weekendDate?: string;
  /** Display label (e.g., "Memorial", "Circuit Assembly") */
  note: string;
  /** No midweek meeting, but weekend meeting still happens */
  weekendOnly?: boolean;
  /** No meetings at all this week */
  noMeeting?: boolean;
}

/**
 * All known special dates.
 * Add new entries here when the schedule is known.
 */
export const specialDates: SpecialDate[] = [
  // 2026
  {
    date: '2026-04-03',
    weekendDate: '2026-04-05',
    note: 'Memorial',
    weekendOnly: true,
  },
  {
    date: '2026-04-10',
    weekendDate: '2026-04-12',
    note: 'Circuit Assembly',
    noMeeting: true,
  },
];

/**
 * Get special dates for a given month
 */
export function getSpecialDatesForMonth(month: string): SpecialDate[] {
  return specialDates.filter((sd) => sd.date.startsWith(month));
}

/**
 * Check if a specific date is special
 */
export function getSpecialDate(date: string): SpecialDate | undefined {
  return specialDates.find((sd) => sd.date === date);
}
