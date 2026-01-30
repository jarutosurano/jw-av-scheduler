#!/usr/bin/env node
/**
 * CLI tool for generating AV schedules
 *
 * Usage:
 *   pnpm generate --pdf midweek.pdf weekend.pdf --month 2026-02
 *   pnpm generate --pdf midweek.pdf weekend.pdf --month 2026-02 --cleanup
 *   pnpm generate --pdf midweek.pdf weekend.pdf --month 2026-02 --preview
 *   pnpm generate --pdf midweek.pdf weekend.pdf --month 2026-02 --skip 2026-02-06
 */

import { parseArgs } from 'node:util';
import fs from 'node:fs';
import { generateMonthlySchedule } from '../scheduler/generator.js';
import { detectMeetingType, extractPDFText } from '../parser/pdf-extractor.js';

interface CliOptions {
  pdf: string[];
  month: string;
  cleanup: boolean;
  preview: boolean;
  skip: string[];
  note: string[];
  weekendOnly: string[];
  noMeeting: string[];
  addWeek: string[];
  clearHistory: boolean;
  help: boolean;
}

interface WeekNote {
  date: string;
  note: string;
  weekendOnly: boolean;
  noMeeting: boolean;
}

function printHelp(): void {
  console.log(`
JW AV Scheduler - Generate AV assignments from Hourglass PDFs

Usage:
  pnpm generate --pdf <midweek.pdf> <weekend.pdf> --month <YYYY-MM> [options]

Options:
  --pdf           Path to Hourglass PDF files (midweek and weekend)
  --month         Target month in YYYY-MM format (e.g., 2026-02)
  --skip          Skip weeks entirely (exclude from schedule)
  --note          Add note to a week (format: DATE:NOTE, e.g., --note 2026-04-03:Memorial)
  --weekend-only  Mark week as weekend-only (no midweek meeting, e.g., --weekend-only 2026-04-03)
  --no-meeting    Mark week as having no meetings (e.g., Circuit Assembly: --no-meeting 2026-04-10)
  --add-week      Add a manual week (format: MIDWEEK:WEEKEND, e.g., --add-week 2026-04-03:2026-04-05)
  --cleanup       Delete PDF files after generation
  --preview       Preview schedule without saving
  --clear-history Clear history for this month before generating
  --help          Show this help message

Examples:
  pnpm generate --pdf midweek_2026-02.pdf weekend_2026-02.pdf --month 2026-02
  pnpm generate --pdf mid.pdf wknd.pdf --month 2026-04 --skip 2026-04-10 --note 2026-04-03:Memorial --weekend-only 2026-04-03
  pnpm generate --pdf midweek.pdf weekend.pdf --month 2026-02 --preview
`);
}

function parseCliArgs(): CliOptions {
  const { values, positionals } = parseArgs({
    options: {
      pdf: { type: 'string', multiple: true },
      month: { type: 'string' },
      skip: { type: 'string', multiple: true },
      note: { type: 'string', multiple: true },
      'weekend-only': { type: 'string', multiple: true },
      'no-meeting': { type: 'string', multiple: true },
      'add-week': { type: 'string', multiple: true },
      cleanup: { type: 'boolean', default: false },
      preview: { type: 'boolean', default: false },
      'clear-history': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  return {
    pdf: values.pdf || positionals,
    month: values.month || '',
    skip: values.skip || [],
    note: values.note || [],
    weekendOnly: values['weekend-only'] || [],
    noMeeting: values['no-meeting'] || [],
    addWeek: values['add-week'] || [],
    cleanup: values.cleanup || false,
    preview: values.preview || false,
    clearHistory: values['clear-history'] || false,
    help: values.help || false,
  };
}

/**
 * Manual week to add
 */
interface ManualWeek {
  midweekDate: string;
  weekendDate: string;
}

/**
 * Parse note options into structured data
 */
function parseNotes(notes: string[], weekendOnlyDates: string[], noMeetingDates: string[]): Map<string, WeekNote> {
  const result = new Map<string, WeekNote>();

  // Process notes (format: DATE:NOTE)
  for (const noteStr of notes) {
    const colonIndex = noteStr.indexOf(':');
    if (colonIndex > 0) {
      const date = noteStr.substring(0, colonIndex);
      const note = noteStr.substring(colonIndex + 1);
      result.set(date, {
        date,
        note,
        weekendOnly: weekendOnlyDates.includes(date),
        noMeeting: noMeetingDates.includes(date),
      });
    }
  }

  // Process weekend-only dates that might not have notes
  for (const date of weekendOnlyDates) {
    if (!result.has(date)) {
      result.set(date, {
        date,
        note: '',
        weekendOnly: true,
        noMeeting: false,
      });
    }
  }

  // Process no-meeting dates that might not have notes
  for (const date of noMeetingDates) {
    if (!result.has(date)) {
      result.set(date, {
        date,
        note: '',
        weekendOnly: false,
        noMeeting: true,
      });
    } else {
      // Update existing entry to mark as no meeting
      const existing = result.get(date)!;
      existing.noMeeting = true;
    }
  }

  return result;
}

/**
 * Parse manual week options (format: MIDWEEK:WEEKEND)
 */
function parseManualWeeks(addWeeks: string[]): ManualWeek[] {
  const result: ManualWeek[] = [];

  for (const weekStr of addWeeks) {
    const colonIndex = weekStr.indexOf(':');
    if (colonIndex > 0) {
      const midweekDate = weekStr.substring(0, colonIndex);
      const weekendDate = weekStr.substring(colonIndex + 1);
      result.push({ midweekDate, weekendDate });
    }
  }

  return result;
}

/**
 * Identify which PDF is midweek and which is weekend
 */
async function identifyPDFs(
  pdfPaths: string[]
): Promise<{ midweek: string; weekend: string }> {
  let midweek: string | null = null;
  let weekend: string | null = null;

  for (const pdfPath of pdfPaths) {
    const result = await extractPDFText(pdfPath);
    const type = detectMeetingType(result.text);

    if (type === 'midweek' && !midweek) {
      midweek = pdfPath;
    } else if (type === 'weekend' && !weekend) {
      weekend = pdfPath;
    }
  }

  if (!midweek) {
    throw new Error('Could not identify midweek PDF');
  }
  if (!weekend) {
    throw new Error('Could not identify weekend PDF');
  }

  return { midweek, weekend };
}

/**
 * Delete PDF files after generation
 */
function cleanupPDFs(pdfPaths: string[]): void {
  for (const pdfPath of pdfPaths) {
    try {
      fs.unlinkSync(pdfPath);
      console.log(`Deleted: ${pdfPath}`);
    } catch (error) {
      console.warn(`Failed to delete ${pdfPath}:`, error);
    }
  }
}

async function main(): Promise<void> {
  const options = parseCliArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.month) {
    console.error('Error: --month is required');
    printHelp();
    process.exit(1);
  }

  if (options.pdf.length < 2) {
    console.error('Error: Two PDF files are required (midweek and weekend)');
    printHelp();
    process.exit(1);
  }

  console.log('JW AV Scheduler');
  console.log('================');
  console.log(`Month: ${options.month}`);
  console.log(`PDFs: ${options.pdf.join(', ')}`);
  if (options.skip.length > 0) {
    console.log(`Skipping weeks: ${options.skip.join(', ')}`);
  }
  console.log(`Mode: ${options.preview ? 'Preview' : 'Generate'}`);
  console.log('');

  try {
    // Identify which PDF is which
    console.log('Identifying PDF types...');
    const { midweek, weekend } = await identifyPDFs(options.pdf);
    console.log(`  Midweek: ${midweek}`);
    console.log(`  Weekend: ${weekend}`);

    // Parse special week notes and manual weeks
    const weekNotes = parseNotes(options.note, options.weekendOnly, options.noMeeting);
    const manualWeeks = parseManualWeeks(options.addWeek);

    // Generate schedule
    const result = await generateMonthlySchedule(midweek, weekend, options.month, {
      skipExistingWeeks: options.skip,
      preview: options.preview,
      clearHistory: options.clearHistory,
      weekNotes,
      manualWeeks,
    });

    // Summary
    console.log(`\nGenerated ${result.schedule.weeks.length} week(s)`);

    // Cleanup PDFs if requested
    if (options.cleanup && result.saved) {
      console.log('\nCleaning up PDF files...');
      cleanupPDFs(options.pdf);
    }

    // Exit with appropriate code
    const hasConflicts = result.results.some((r) => r.conflicts.length > 0);
    if (hasConflicts) {
      console.log('\nWarning: Schedule has conflicts. Please review.');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
