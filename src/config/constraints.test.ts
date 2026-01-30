import { describe, it, expect } from 'vitest';
import {
  isPositionBlockedByConstraint,
  isPositionBlockedByRestriction,
  getAvailablePositionsForBrother,
  meetingPartConstraints,
} from './constraints';

describe('constraints', () => {
  describe('meetingPartConstraints', () => {
    it('should have no_av for midweek chairman', () => {
      expect(meetingPartConstraints.midweek_chairman).toBe('no_av');
    });

    it('should have no_av for cbs_chairman', () => {
      expect(meetingPartConstraints.cbs_chairman).toBe('no_av');
    });

    it('should have no_av for wt_conductor', () => {
      expect(meetingPartConstraints.wt_conductor).toBe('no_av');
    });

    it('should have no_mic for spiritual_gems', () => {
      expect(meetingPartConstraints.spiritual_gems).toBe('no_mic');
    });

    it('should have no_mic for bible_reading', () => {
      expect(meetingPartConstraints.bible_reading).toBe('no_mic');
    });
  });

  describe('isPositionBlockedByConstraint', () => {
    it('should block all positions for no_av constraint', () => {
      expect(isPositionBlockedByConstraint('audio', 'no_av')).toBe(true);
      expect(isPositionBlockedByConstraint('video', 'no_av')).toBe(true);
      expect(isPositionBlockedByConstraint('rightMic', 'no_av')).toBe(true);
      expect(isPositionBlockedByConstraint('auditorium', 'no_av')).toBe(true);
    });

    it('should only block mic positions for no_mic constraint', () => {
      expect(isPositionBlockedByConstraint('rightMic', 'no_mic')).toBe(true);
      expect(isPositionBlockedByConstraint('leftMic', 'no_mic')).toBe(true);
      expect(isPositionBlockedByConstraint('audio', 'no_mic')).toBe(false);
      expect(isPositionBlockedByConstraint('video', 'no_mic')).toBe(false);
    });

    it('should not block any positions for none constraint', () => {
      expect(isPositionBlockedByConstraint('audio', 'none')).toBe(false);
      expect(isPositionBlockedByConstraint('rightMic', 'none')).toBe(false);
    });
  });

  describe('isPositionBlockedByRestriction', () => {
    it('should block entrance positions for no_entrance restriction', () => {
      expect(isPositionBlockedByRestriction('entrance1', 'no_entrance')).toBe(true);
      expect(isPositionBlockedByRestriction('entrance2', 'no_entrance')).toBe(true);
      expect(isPositionBlockedByRestriction('audio', 'no_entrance')).toBe(false);
    });

    it('should block auditorium for no_auditorium restriction', () => {
      expect(isPositionBlockedByRestriction('auditorium', 'no_auditorium')).toBe(true);
      expect(isPositionBlockedByRestriction('audio', 'no_auditorium')).toBe(false);
    });

    it('should block audio/video/avAssistant for Xian restrictions', () => {
      expect(isPositionBlockedByRestriction('audio', 'no_audio')).toBe(true);
      expect(isPositionBlockedByRestriction('video', 'no_video')).toBe(true);
      expect(isPositionBlockedByRestriction('avAssistant', 'no_av_assistant')).toBe(true);
    });
  });

  describe('getAvailablePositionsForBrother', () => {
    it('should return all positions for brother with no restrictions', () => {
      const positions = getAvailablePositionsForBrother([], true);
      expect(positions).toHaveLength(9);
    });

    it('should exclude auditorium for non-elder/MS', () => {
      const positions = getAvailablePositionsForBrother([], false);
      expect(positions).not.toContain('auditorium');
      expect(positions).toHaveLength(8);
    });

    it('should exclude entrance for Zach (no_entrance restriction)', () => {
      const positions = getAvailablePositionsForBrother(['no_entrance'], false);
      expect(positions).not.toContain('entrance1');
      expect(positions).not.toContain('entrance2');
    });

    it('should only include mic positions for Xian', () => {
      const xianRestrictions = [
        'no_audio',
        'no_video',
        'no_av_assistant',
        'no_entrance',
      ] as const;
      const positions = getAvailablePositionsForBrother([...xianRestrictions], false);

      expect(positions).toContain('rightMic');
      expect(positions).toContain('leftMic');
      expect(positions).toContain('frontStage');
      expect(positions).not.toContain('audio');
      expect(positions).not.toContain('video');
      expect(positions).not.toContain('avAssistant');
      expect(positions).not.toContain('entrance1');
      expect(positions).not.toContain('entrance2');
      expect(positions).not.toContain('auditorium'); // Not elder/MS
    });
  });
});
