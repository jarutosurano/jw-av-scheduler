/**
 * Client-safe eligibility logic for AV position assignment.
 *
 * Pure functions (no Node.js imports) that determine which brothers
 * are eligible for each AV position. Works in the browser.
 */

import type { AVPosition, Brother } from '../types';
import {
  allAVPositions,
  restrictionToPositions,
  privilegedPositions,
  micPositions,
  videoEligibleBrotherIds,
} from '../config/constraints';

interface UnavailabilityInfo {
  /** Brother IDs unavailable for ALL AV (no_av constraint from meeting parts) */
  noAV: string[];
  /** Brother IDs unavailable for mic positions (no_mic constraint from meeting parts) */
  noMic: string[];
}

/**
 * Get brothers eligible for a specific AV position in a given week.
 *
 * Filters based on:
 * - Meeting part constraints (noAV, noMic)
 * - Individual restrictions (no_audio, no_video, etc.)
 * - Privilege requirements (auditorium = Elder/MS only)
 * - Video eligibility (specific brothers only)
 * - Already assigned to another position this week (no duplicates)
 */
export function getEligibleBrothers(
  position: AVPosition,
  brothers: Brother[],
  unavailability: UnavailabilityInfo,
  currentAssignments: Record<AVPosition, string | null>,
  /** The position we're computing for — brothers assigned to THIS position are still eligible */
  selfPosition?: AVPosition
): Brother[] {
  // Brothers already assigned to OTHER positions this week
  const assignedIds = new Set<string>();
  for (const [pos, brotherId] of Object.entries(currentAssignments)) {
    if (brotherId && pos !== (selfPosition ?? position)) {
      assignedIds.add(brotherId);
    }
  }

  return brothers.filter((brother) => {
    if (!brother.active) return false;

    // Already assigned to another position this week
    if (assignedIds.has(brother.id)) return false;

    // Meeting part: no AV at all
    if (unavailability.noAV.includes(brother.id)) return false;

    // Meeting part: no mic
    if (
      micPositions.includes(position) &&
      unavailability.noMic.includes(brother.id)
    ) {
      return false;
    }

    // Individual restrictions
    for (const restriction of brother.restrictions) {
      if (restriction === 'mic_once_monthly') continue; // Not enforced client-side
      const blocked = restrictionToPositions[restriction];
      if (blocked.includes(position)) return false;
    }

    // Privilege: auditorium requires Elder or MS
    if (privilegedPositions.includes(position)) {
      if (
        brother.privilege !== 'elder' &&
        brother.privilege !== 'ministerial_servant'
      ) {
        return false;
      }
    }

    // Video: only specific brothers
    if (position === 'video' && !videoEligibleBrotherIds.includes(brother.id)) {
      return false;
    }

    return true;
  });
}

/**
 * Get AV positions a specific brother is eligible for in a given week.
 *
 * Only returns positions that are either unassigned or already assigned to this brother.
 * This is the inverse of getEligibleBrothers (brother -> positions instead of position -> brothers).
 */
export function getEligiblePositionsForBrother(
  brotherId: string,
  brothers: Brother[],
  unavailability: UnavailabilityInfo,
  currentAssignments: Record<AVPosition, string | null>
): AVPosition[] {
  const brother = brothers.find((b) => b.id === brotherId);
  if (!brother || !brother.active) return [];

  return allAVPositions.filter((position) => {
    // Position must be unassigned or already held by this brother
    const currentHolder = currentAssignments[position];
    if (currentHolder && currentHolder !== brotherId) return false;

    // Meeting part: no AV at all
    if (unavailability.noAV.includes(brotherId)) return false;

    // Meeting part: no mic
    if (
      micPositions.includes(position) &&
      unavailability.noMic.includes(brotherId)
    ) {
      return false;
    }

    // Individual restrictions
    for (const restriction of brother.restrictions) {
      if (restriction === 'mic_once_monthly') continue;
      const blocked = restrictionToPositions[restriction];
      if (blocked.includes(position)) return false;
    }

    // Privilege: auditorium requires Elder or MS
    if (privilegedPositions.includes(position)) {
      if (
        brother.privilege !== 'elder' &&
        brother.privilege !== 'ministerial_servant'
      ) {
        return false;
      }
    }

    // Video: only specific brothers
    if (position === 'video' && !videoEligibleBrotherIds.includes(brotherId)) {
      return false;
    }

    return true;
  });
}
