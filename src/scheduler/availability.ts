/**
 * Availability Checker
 *
 * Determines which brothers are available for each AV position
 * based on meeting parts, privileges, and individual restrictions.
 */

import type { AVPosition, Brother } from '../types';
import type { WeeklyMeetingData } from '../parser/index.js';
import { brothers, getActiveBrothers } from '../config/brothers.js';
import {
  allAVPositions,
  privilegedPositions,
  restrictionToPositions,
  micPositions,
  videoEligibleBrotherIds,
} from '../config/constraints.js';

/**
 * Result of availability check for a specific position
 */
export interface AvailabilityResult {
  position: AVPosition;
  availableBrothers: Brother[];
  unavailableBrothers: Array<{
    brother: Brother;
    reason: string;
  }>;
}

/**
 * Check if a brother can be assigned to a specific position
 * based on their individual restrictions
 */
function canBrotherDoPosition(brother: Brother, position: AVPosition): boolean {
  for (const restriction of brother.restrictions) {
    // Skip mic_once_monthly - handled separately by history
    if (restriction === 'mic_once_monthly') continue;

    const blockedPositions = restrictionToPositions[restriction];
    if (blockedPositions.includes(position)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a brother has the required privilege for a position
 */
function hasBrotherRequiredPrivilege(
  brother: Brother,
  position: AVPosition
): boolean {
  if (!privilegedPositions.includes(position)) {
    return true; // No privilege requirement
  }

  // Auditorium requires Elder or MS
  return (
    brother.privilege === 'elder' || brother.privilege === 'ministerial_servant'
  );
}

/**
 * Check if a name matches a brother (handles various name formats)
 */
/**
 * Strip accents/diacritics from a string (e.g., Peñera → Penera)
 */
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function doesNameMatchBrother(name: string, brother: Brother): boolean {
  const normalizedName = stripAccents(name.toLowerCase().trim());
  const fullName = stripAccents(brother.fullName.toLowerCase());
  const firstName = stripAccents(brother.firstName.toLowerCase());
  const lastName = stripAccents(brother.lastName.toLowerCase());

  // Direct match
  if (normalizedName === fullName) return true;

  // "LastName, FirstName" format (PDF format)
  if (normalizedName.includes(',')) {
    const parts = normalizedName.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      const pdfLastName = parts[0];
      const pdfFirstName = parts[1].split(' ')[0]; // Remove middle initials

      // Check if both parts match
      if (
        pdfLastName === lastName &&
        pdfFirstName.startsWith(firstName.substring(0, 3))
      ) {
        return true;
      }
      // Handle nicknames: "Randino" for "Randy", "Rafael" for "Raffy"
      if (pdfLastName === lastName) {
        const nicknameMap: Record<string, string[]> = {
          randy: ['randino'],
          raffy: ['rafael'],
          matt: ['matthew'],
          melky: ['melquisidecks'],
          gally: ['sir galahad'],
          john: ['john lawrence'],
          mike: ['mike dandel'],
          dandel: ['mike dandel'],
        };
        const nicknames = nicknameMap[firstName] || [];
        if (
          nicknames.some(
            (n) => pdfFirstName.includes(n) || n.includes(pdfFirstName)
          )
        ) {
          return true;
        }
      }
    }
  }

  // Check if name contains both first and last name
  if (normalizedName.includes(firstName) && normalizedName.includes(lastName)) {
    return true;
  }

  return false;
}

/**
 * Get the reason why a brother is unavailable for a position
 */
function getUnavailabilityReason(
  brother: Brother,
  position: AVPosition,
  week: WeeklyMeetingData
): string | null {
  // Check if unavailable due to meeting part (no AV at all)
  const isUnavailableForAV = week.unavailableForAV.some((name) =>
    doesNameMatchBrother(name, brother)
  );

  if (isUnavailableForAV) {
    return 'Has meeting part with no-AV constraint';
  }

  // Check if unavailable for mic positions due to meeting part
  if (micPositions.includes(position)) {
    const isUnavailableForMic = week.unavailableForMic.some((name) =>
      doesNameMatchBrother(name, brother)
    );

    if (isUnavailableForMic) {
      return 'Has meeting part with no-mic constraint';
    }
  }

  // Check individual restrictions
  if (!canBrotherDoPosition(brother, position)) {
    const restriction = brother.restrictions.find((r) => {
      if (r === 'mic_once_monthly') return false;
      return restrictionToPositions[r].includes(position);
    });
    return `Individual restriction: ${restriction}`;
  }

  // Check privilege requirements
  if (!hasBrotherRequiredPrivilege(brother, position)) {
    return 'Position requires Elder or MS privilege';
  }

  // Check video position restriction (specific elders only)
  if (position === 'video' && !videoEligibleBrotherIds.includes(brother.id)) {
    return 'Video position restricted to specific elders';
  }

  return null; // Available
}

/**
 * Get all brothers available for a specific position in a given week
 */
export function getAvailableBrothersForPosition(
  position: AVPosition,
  week: WeeklyMeetingData
): AvailabilityResult {
  const activeBrothers = getActiveBrothers();
  const available: Brother[] = [];
  const unavailable: Array<{ brother: Brother; reason: string }> = [];

  for (const brother of activeBrothers) {
    const reason = getUnavailabilityReason(brother, position, week);

    if (reason) {
      unavailable.push({ brother, reason });
    } else {
      available.push(brother);
    }
  }

  return {
    position,
    availableBrothers: available,
    unavailableBrothers: unavailable,
  };
}

/**
 * Get availability for all positions in a given week
 */
export function getAllPositionAvailability(
  week: WeeklyMeetingData
): Map<AVPosition, AvailabilityResult> {
  const results = new Map<AVPosition, AvailabilityResult>();

  for (const position of allAVPositions) {
    results.set(position, getAvailableBrothersForPosition(position, week));
  }

  return results;
}

/**
 * Check if a specific brother is available for a specific position
 */
export function isBrotherAvailableForPosition(
  brotherId: string,
  position: AVPosition,
  week: WeeklyMeetingData
): { available: boolean; reason?: string } {
  const brother = brothers.find((b) => b.id === brotherId);

  if (!brother) {
    return { available: false, reason: 'Brother not found' };
  }

  if (!brother.active) {
    return { available: false, reason: 'Brother is inactive' };
  }

  const reason = getUnavailabilityReason(brother, position, week);

  if (reason) {
    return { available: false, reason };
  }

  return { available: true };
}

/**
 * Get brothers who can potentially fill multiple positions
 * Useful for finding "versatile" brothers when scheduling is tight
 */
export function getVersatileBrothers(
  week: WeeklyMeetingData,
  minPositions: number = 5
): Brother[] {
  const activeBrothers = getActiveBrothers();
  const versatile: Brother[] = [];

  for (const brother of activeBrothers) {
    let availableCount = 0;

    for (const position of allAVPositions) {
      const reason = getUnavailabilityReason(brother, position, week);
      if (!reason) {
        availableCount++;
      }
    }

    if (availableCount >= minPositions) {
      versatile.push(brother);
    }
  }

  return versatile;
}

/**
 * Normalize a name from PDF format to match our brother config
 * Handles variations like "Sullano, Jayr P." -> "Jayr Sullano"
 */
export function normalizeName(name: string): string {
  // If name contains comma, it's likely "LastName, FirstName" format
  if (name.includes(',')) {
    const parts = name.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      // Remove middle initials and suffixes
      const firstName = parts[1].split(' ')[0];
      return `${firstName} ${parts[0]}`;
    }
  }
  return name;
}
