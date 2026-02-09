/**
 * Assignment History Tracking
 *
 * Tracks past assignments to ensure fair rotation and
 * enforce special rules like Xian's mic-once-monthly limit.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { AVPosition, AssignmentHistory } from '../types';
import { micPositions, priorityBrotherIds } from '../config/constraints.js';
import { getBrotherById } from '../config/brothers.js';

/**
 * History data structure stored in JSON
 */
export interface HistoryData {
  assignments: AssignmentHistory[];
  lastUpdated: string | null;
}

/**
 * Brother assignment statistics
 */
export interface BrotherStats {
  brotherId: string;
  totalAssignments: number;
  byPosition: Record<AVPosition, number>;
  lastAssignment: string | null; // ISO date
  lastPositionAssigned: AVPosition | null;
}

const HISTORY_FILE = 'data/history.json';

/**
 * Load history data from JSON file
 */
export function loadHistory(): HistoryData {
  try {
    const filePath = path.resolve(HISTORY_FILE);
    if (!fs.existsSync(filePath)) {
      return { assignments: [], lastUpdated: null };
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as HistoryData;
  } catch (error) {
    console.warn('Failed to load history, starting fresh:', error);
    return { assignments: [], lastUpdated: null };
  }
}

/**
 * Save history data to JSON file
 */
export function saveHistory(history: HistoryData): void {
  const filePath = path.resolve(HISTORY_FILE);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  history.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
}

/**
 * Add an assignment to history
 */
export function addAssignment(
  history: HistoryData,
  brotherId: string,
  position: AVPosition,
  date: string
): void {
  history.assignments.push({
    brotherId,
    position,
    date,
  });
}

/**
 * Remove an assignment from history (for swapping)
 */
export function removeAssignment(
  history: HistoryData,
  brotherId: string,
  position: AVPosition,
  date: string
): void {
  const index = history.assignments.findIndex(
    (a) =>
      a.brotherId === brotherId && a.position === position && a.date === date
  );
  if (index !== -1) {
    history.assignments.splice(index, 1);
  }
}

/**
 * Get assignments for a specific month
 */
export function getAssignmentsForMonth(
  history: HistoryData,
  yearMonth: string // Format: "2026-02"
): AssignmentHistory[] {
  return history.assignments.filter((a) => a.date.startsWith(yearMonth));
}

/**
 * Get all assignments for a specific brother
 */
export function getAssignmentsForBrother(
  history: HistoryData,
  brotherId: string
): AssignmentHistory[] {
  return history.assignments.filter((a) => a.brotherId === brotherId);
}

/**
 * Get statistics for all brothers
 */
export function getAllBrotherStats(
  history: HistoryData
): Map<string, BrotherStats> {
  const stats = new Map<string, BrotherStats>();

  for (const assignment of history.assignments) {
    let brotherStats = stats.get(assignment.brotherId);

    if (!brotherStats) {
      brotherStats = {
        brotherId: assignment.brotherId,
        totalAssignments: 0,
        byPosition: {} as Record<AVPosition, number>,
        lastAssignment: null,
        lastPositionAssigned: null,
      };
      stats.set(assignment.brotherId, brotherStats);
    }

    brotherStats.totalAssignments++;
    brotherStats.byPosition[assignment.position] =
      (brotherStats.byPosition[assignment.position] || 0) + 1;

    // Track most recent assignment
    if (
      !brotherStats.lastAssignment ||
      assignment.date > brotherStats.lastAssignment
    ) {
      brotherStats.lastAssignment = assignment.date;
      brotherStats.lastPositionAssigned = assignment.position;
    }
  }

  return stats;
}

/**
 * Check if Xian can be assigned to mic this month
 * (max once per month)
 */
export function canXianDoMicThisMonth(
  history: HistoryData,
  yearMonth: string
): boolean {
  const xianId = 'xian-salazar';
  const monthAssignments = getAssignmentsForMonth(history, yearMonth);

  const xianMicAssignments = monthAssignments.filter(
    (a) => a.brotherId === xianId && micPositions.includes(a.position)
  );

  return xianMicAssignments.length === 0;
}

/**
 * Get the number of times Xian has done mic this month
 */
export function getXianMicCountThisMonth(
  history: HistoryData,
  yearMonth: string
): number {
  const xianId = 'xian-salazar';
  const monthAssignments = getAssignmentsForMonth(history, yearMonth);

  return monthAssignments.filter(
    (a) => a.brotherId === xianId && micPositions.includes(a.position)
  ).length;
}

/**
 * Calculate assignment score for fair rotation
 * Lower score = should be assigned next (fewer recent assignments)
 */
export function calculateAssignmentScore(
  history: HistoryData,
  brotherId: string,
  position: AVPosition,
  referenceDate: string,
  meetingPartCount: number = 0
): number {
  const brotherAssignments = getAssignmentsForBrother(history, brotherId);
  const positionAssignments = brotherAssignments.filter(
    (a) => a.position === position
  );

  // Base score: total assignments for this position
  let score = positionAssignments.length * 10;

  // Add recency penalty: more recent = higher score
  const recentAssignments = brotherAssignments.filter((a) => {
    const assignDate = new Date(a.date);
    const refDate = new Date(referenceDate);
    const diffDays =
      (refDate.getTime() - assignDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30; // Last 30 days (exclude future dates)
  });

  score += recentAssignments.length * 5;

  // Extra penalty if assigned last week
  const lastWeekAssignments = brotherAssignments.filter((a) => {
    const assignDate = new Date(a.date);
    const refDate = new Date(referenceDate);
    const diffDays =
      (refDate.getTime() - assignDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });

  score += lastWeekAssignments.length * 20;

  // Strongly deprioritize brothers who already have meeting parts this week
  // Brothers with no parts should always get AV before brothers with parts
  if (meetingPartCount > 0) {
    score += 200 + meetingPartCount * 50;
  }

  // Privilege-based scoring: MS and publishers get more AV than Elders
  // Elders have more meeting responsibilities, MS/publishers assist with AV
  const brother = getBrotherById(brotherId);
  if (brother) {
    if (brother.privilege === 'elder') {
      score += 25; // Deprioritize Elders for AV (they have more meeting parts)
    } else if (brother.privilege === 'ministerial_servant') {
      score -= 25; // Boost for MS (assistants, should do more AV)
    } else if (brother.privilege === 'publisher') {
      score -= 15; // Boost for publishers
    }
  }

  // Priority brothers (like Zach) should be assigned every week but rotate positions
  // Give bonus inversely proportional to how many times they've done this position
  if (priorityBrotherIds.includes(brotherId)) {
    const positionCount = positionAssignments.length;
    // More bonus for positions they haven't done much
    // This encourages rotation while still ensuring assignment
    score -= Math.max(15, 50 - positionCount * 15);
  }

  return score;
}

/**
 * Sort brothers by assignment score (lowest first = fairest choice)
 */
export function sortBrothersByFairness(
  brotherIds: string[],
  history: HistoryData,
  position: AVPosition,
  referenceDate: string,
  meetingPartCounts: Map<string, number> = new Map()
): string[] {
  return [...brotherIds].sort((a, b) => {
    const scoreA = calculateAssignmentScore(
      history,
      a,
      position,
      referenceDate,
      meetingPartCounts.get(a) || 0
    );
    const scoreB = calculateAssignmentScore(
      history,
      b,
      position,
      referenceDate,
      meetingPartCounts.get(b) || 0
    );
    return scoreA - scoreB;
  });
}

/**
 * Get brothers with the least assignments for a position
 */
export function getLeastAssignedBrothers(
  brotherIds: string[],
  history: HistoryData,
  position: AVPosition,
  limit: number = 3
): string[] {
  const sorted = sortBrothersByFairness(
    brotherIds,
    history,
    position,
    new Date().toISOString()
  );
  return sorted.slice(0, limit);
}

/**
 * Clear history for a specific month (useful for regenerating)
 */
export function clearMonthHistory(
  history: HistoryData,
  yearMonth: string
): void {
  history.assignments = history.assignments.filter(
    (a) => !a.date.startsWith(yearMonth)
  );
}
