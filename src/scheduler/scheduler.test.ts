import { describe, it, expect, beforeEach } from 'vitest';
import type { WeeklyMeetingData } from '../parser/index.js';
import type { HistoryData } from './history.js';
import { getAvailableBrothersForPosition } from './availability.js';
import {
  loadHistory,
  addAssignment,
  canXianDoMicThisMonth,
  sortBrothersByFairness,
} from './history.js';
import { scheduleWeek, validateSchedule } from './engine.js';

// Mock week data for testing
const mockWeek: WeeklyMeetingData = {
  weekOf: '2026-02-13',
  midweekDate: '2026-02-13',
  weekendDate: '2026-02-15',
  midweekParts: [],
  weekendParts: [],
  wtConductor: 'Jonas Santiso',
  unavailableForAV: ['Quinol, Randino', 'Cabusas, Mike Dandel', 'Jonas Santiso'],
  unavailableForMic: [
    'Sullano, Jayr P.',
    'Nieva, Jared M.',
    'Mancuso, Matthew',
    'Villanueva, Sir Galahad',
    'Lucero, Herman',
  ],
};

describe('Availability', () => {
  it('should exclude brothers unavailable for AV', () => {
    const result = getAvailableBrothersForPosition('audio', mockWeek);

    // Randy Quinol should not be available (Midweek Chairman)
    const randyAvailable = result.availableBrothers.some(
      (b) => b.id === 'randy-quinol'
    );
    expect(randyAvailable).toBe(false);

    // Jonas Santiso should not be available (WT Conductor)
    const jonasAvailable = result.availableBrothers.some(
      (b) => b.id === 'jonas-santiso'
    );
    expect(jonasAvailable).toBe(false);
  });

  it('should exclude brothers unavailable for mic positions', () => {
    const result = getAvailableBrothersForPosition('rightMic', mockWeek);

    // Jayr Sullano should not be available for mic
    const jayrAvailable = result.availableBrothers.some(
      (b) => b.id === 'jayr-sullano'
    );
    expect(jayrAvailable).toBe(false);
  });

  it('should allow Xian only for mic positions', () => {
    const audioResult = getAvailableBrothersForPosition('audio', mockWeek);
    const micResult = getAvailableBrothersForPosition('rightMic', mockWeek);

    // Xian should NOT be available for audio
    const xianAudio = audioResult.availableBrothers.some(
      (b) => b.id === 'xian-salazar'
    );
    expect(xianAudio).toBe(false);

    // Xian SHOULD be available for mic (if not limited by meeting part)
    const xianMic = micResult.availableBrothers.some(
      (b) => b.id === 'xian-salazar'
    );
    expect(xianMic).toBe(true);
  });

  it('should restrict auditorium to elders and MS only', () => {
    const result = getAvailableBrothersForPosition('auditorium', mockWeek);

    // Zach Lucero (publisher) should not be available
    const zachAvailable = result.availableBrothers.some(
      (b) => b.id === 'zach-lucero'
    );
    expect(zachAvailable).toBe(false);

    // Herman Lucero (elder) should be available
    const hermanAvailable = result.availableBrothers.some(
      (b) => b.id === 'herman-lucero'
    );
    expect(hermanAvailable).toBe(true);
  });

  it('should exclude Zach from entrance positions', () => {
    const result = getAvailableBrothersForPosition('entrance1', mockWeek);

    const zachAvailable = result.availableBrothers.some(
      (b) => b.id === 'zach-lucero'
    );
    expect(zachAvailable).toBe(false);
  });
});

describe('History', () => {
  let history: HistoryData;

  beforeEach(() => {
    history = { assignments: [], lastUpdated: null };
  });

  it('should track Xian mic assignments per month', () => {
    // Initially Xian can do mic
    expect(canXianDoMicThisMonth(history, '2026-02')).toBe(true);

    // Add mic assignment
    addAssignment(history, 'xian-salazar', 'rightMic', '2026-02-13');

    // Now Xian cannot do mic this month
    expect(canXianDoMicThisMonth(history, '2026-02')).toBe(false);

    // But can still do mic next month
    expect(canXianDoMicThisMonth(history, '2026-03')).toBe(true);
  });

  it('should sort brothers by fairness', () => {
    // Add some history
    addAssignment(history, 'brother-a', 'audio', '2026-02-01');
    addAssignment(history, 'brother-a', 'audio', '2026-02-08');
    addAssignment(history, 'brother-b', 'audio', '2026-02-01');

    const sorted = sortBrothersByFairness(
      ['brother-a', 'brother-b', 'brother-c'],
      history,
      'audio',
      '2026-02-15'
    );

    // brother-c should be first (no assignments)
    expect(sorted[0]).toBe('brother-c');
    // brother-a should be last (most assignments)
    expect(sorted[2]).toBe('brother-a');
  });
});

describe('Scheduling Engine', () => {
  let history: HistoryData;

  beforeEach(() => {
    history = { assignments: [], lastUpdated: null };
  });

  it('should generate a complete schedule', () => {
    const result = scheduleWeek(mockWeek, history);

    // All positions should be assigned
    expect(result.schedule.assignments.audio).toBeTruthy();
    expect(result.schedule.assignments.video).toBeTruthy();
    expect(result.schedule.assignments.rightMic).toBeTruthy();
    expect(result.schedule.assignments.auditorium).toBeTruthy();
  });

  it('should not assign the same brother to multiple positions', () => {
    const result = scheduleWeek(mockWeek, history);

    const assignedBrothers = Object.values(result.schedule.assignments).filter(
      Boolean
    );
    const uniqueBrothers = new Set(assignedBrothers);

    expect(assignedBrothers.length).toBe(uniqueBrothers.size);
  });

  it('should pass validation', () => {
    const result = scheduleWeek(mockWeek, history);
    const errors = validateSchedule(result.schedule);

    expect(errors.length).toBe(0);
  });
});
