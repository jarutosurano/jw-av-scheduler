/**
 * Schedule Generator
 *
 * Main entry point for generating monthly AV schedules.
 * Combines PDF parsing, availability checking, and scheduling
 * to produce complete schedules.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { MonthlySchedule, WeeklySchedule } from '../types';
import { parseHourglassPDFs, type WeeklyMeetingData } from '../parser/index.js';
import { loadHistory, saveHistory, clearMonthHistory, type HistoryData } from './history.js';
import {
  scheduleWeek,
  scheduleMultipleWeeks,
  validateSchedule,
  formatScheduleForDisplay,
  type SchedulingOptions,
  type SchedulingResult,
} from './engine.js';
import { positionDisplayNames } from '../config/constraints.js';

/**
 * Special week note
 */
export interface WeekNote {
  date: string;
  note: string;
  weekendOnly: boolean;
  noMeeting: boolean;
}

/**
 * Manual week to add (not from PDF)
 */
export interface ManualWeek {
  midweekDate: string;
  weekendDate: string;
}

/**
 * Options for schedule generation
 */
export interface GeneratorOptions {
  /** Skip weeks that already have schedules (based on date) */
  skipExistingWeeks?: string[];
  /** Scheduling options passed to engine */
  schedulingOptions?: SchedulingOptions;
  /** Output directory for schedule files */
  outputDir?: string;
  /** Preview mode - don't save files */
  preview?: boolean;
  /** Clear existing history for this month before generating */
  clearHistory?: boolean;
  /** Special notes for weeks (e.g., Memorial, Circuit Assembly) */
  weekNotes?: Map<string, WeekNote>;
  /** Manual weeks to add (e.g., Memorial week with only weekend) */
  manualWeeks?: ManualWeek[];
}

/**
 * Result of schedule generation
 */
export interface GeneratorResult {
  month: string;
  schedule: MonthlySchedule;
  results: SchedulingResult[];
  saved: boolean;
  outputPath?: string;
}

/**
 * Generate a monthly schedule from Hourglass PDFs
 */
export async function generateMonthlySchedule(
  midweekPdfPath: string,
  weekendPdfPath: string,
  month: string, // Format: "2026-02"
  options: GeneratorOptions = {}
): Promise<GeneratorResult> {
  console.log(`\nGenerating schedule for ${month}...`);

  // Parse PDFs
  console.log('Parsing PDFs...');
  const weeks = await parseHourglassPDFs(midweekPdfPath, weekendPdfPath);

  // Filter to requested month
  let monthWeeks = weeks.filter((w) => w.weekOf.startsWith(month));
  console.log(`Found ${monthWeeks.length} weeks in ${month}`);

  // Add manual weeks (e.g., Memorial with only weekend)
  if (options.manualWeeks?.length) {
    for (const manualWeek of options.manualWeeks) {
      // Check if this week already exists
      const exists = monthWeeks.some((w) => w.weekOf === manualWeek.midweekDate);
      if (!exists) {
        console.log(`Adding manual week: ${manualWeek.midweekDate}`);
        monthWeeks.push({
          weekOf: manualWeek.midweekDate,
          midweekDate: manualWeek.midweekDate,
          weekendDate: manualWeek.weekendDate,
          unavailableForAV: [],
          unavailableForMic: [],
        });
      }
    }
    // Sort weeks by date
    monthWeeks.sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  }

  // Skip specified weeks (e.g., Feb 6-8 already has schedule)
  let weeksToSchedule = monthWeeks;
  if (options.skipExistingWeeks?.length) {
    weeksToSchedule = monthWeeks.filter(
      (w) => !options.skipExistingWeeks!.includes(w.weekOf)
    );
    console.log(
      `Skipping ${monthWeeks.length - weeksToSchedule.length} weeks (already scheduled)`
    );
  }

  // Load history
  let history = loadHistory();

  // Clear history for this month if requested
  if (options.clearHistory) {
    console.log(`Clearing existing history for ${month}...`);
    clearMonthHistory(history, month);
  }

  // Generate schedules
  console.log('Generating schedules...');
  const results = scheduleMultipleWeeks(
    weeksToSchedule,
    history,
    options.schedulingOptions
  );

  // Collect all schedules (including skipped weeks if we have them)
  const allSchedules: WeeklySchedule[] = results.map((r) => r.schedule);

  // Apply week notes (Memorial, Circuit Assembly, etc.)
  if (options.weekNotes) {
    for (const schedule of allSchedules) {
      const weekNote = options.weekNotes.get(schedule.weekOf);
      if (weekNote) {
        if (weekNote.note) {
          schedule.note = weekNote.note;
        }
        if (weekNote.weekendOnly) {
          schedule.weekendOnly = true;
        }
        if (weekNote.noMeeting) {
          schedule.noMeeting = true;
        }
      }
    }
  }

  // Build monthly schedule
  const monthlySchedule: MonthlySchedule = {
    month,
    generated: new Date().toISOString(),
    weeks: allSchedules,
  };

  // Validate schedules
  console.log('Validating schedules...');
  let hasErrors = false;
  for (const schedule of allSchedules) {
    const errors = validateSchedule(schedule);
    if (errors.length > 0) {
      console.error(`Validation errors for ${schedule.weekOf}:`);
      errors.forEach((e) => console.error(`  - ${e}`));
      hasErrors = true;
    }
  }

  // Print summary
  printScheduleSummary(results);

  // Print warnings
  const allWarnings = results.flatMap((r) => r.warnings);
  if (allWarnings.length > 0) {
    console.log('\nWarnings:');
    allWarnings.forEach((w) => console.log(`  - ${w}`));
  }

  // Save if not preview mode
  let saved = false;
  let outputPath: string | undefined;

  if (!options.preview && !hasErrors) {
    outputPath = saveScheduleToFile(monthlySchedule, options.outputDir);
    saveHistory(history);
    saved = true;
    console.log(`\nSchedule saved to: ${outputPath}`);
    console.log('History updated.');
  } else if (options.preview) {
    console.log('\nPreview mode - no files saved.');
  } else if (hasErrors) {
    console.log('\nSchedule NOT saved due to validation errors.');
  }

  return {
    month,
    schedule: monthlySchedule,
    results,
    saved,
    outputPath,
  };
}

/**
 * Save schedule to JSON file
 */
function saveScheduleToFile(
  schedule: MonthlySchedule,
  outputDir?: string
): string {
  const dir = outputDir || 'schedules';
  const filePath = path.resolve(dir, `${schedule.month}.json`);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2));

  return filePath;
}

/**
 * Print schedule summary to console
 */
function printScheduleSummary(results: SchedulingResult[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('GENERATED SCHEDULE');
  console.log('='.repeat(70));

  for (const result of results) {
    const { schedule } = result;
    const formatted = formatScheduleForDisplay(schedule);

    console.log(`\nWeek of ${schedule.weekOf} (${schedule.midweekDate} & ${schedule.weekendDate})`);
    console.log('-'.repeat(50));

    for (const [position, name] of Object.entries(formatted)) {
      const displayName = positionDisplayNames[position as keyof typeof positionDisplayNames] || position;
      console.log(`  ${displayName.padEnd(22)} ${name}`);
    }

    if (result.conflicts.length > 0) {
      console.log('\n  Conflicts:');
      result.conflicts.forEach((c) => console.log(`    - ${c}`));
    }
  }

  console.log('\n' + '='.repeat(70));
}

/**
 * Load an existing schedule from file
 */
export function loadScheduleFromFile(month: string, dir?: string): MonthlySchedule | null {
  const filePath = path.resolve(dir || 'schedules', `${month}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as MonthlySchedule;
}

/**
 * Check if a schedule already exists for a month
 */
export function scheduleExists(month: string, dir?: string): boolean {
  const filePath = path.resolve(dir || 'schedules', `${month}.json`);
  return fs.existsSync(filePath);
}

/**
 * Get list of all generated schedules
 */
export function listGeneratedSchedules(dir?: string): string[] {
  const scheduleDir = dir || 'schedules';

  if (!fs.existsSync(scheduleDir)) {
    return [];
  }

  return fs
    .readdirSync(scheduleDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
}

// Re-export for convenience
export { loadHistory, saveHistory } from './history.js';
export { scheduleWeek, validateSchedule, formatScheduleForDisplay } from './engine.js';
