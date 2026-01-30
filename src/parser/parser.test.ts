import { describe, it, expect } from 'vitest';
import { detectMeetingType } from './pdf-extractor.js';
import { parseMidweekText } from './midweek-parser.js';
import { parseWeekendText } from './weekend-parser.js';

describe('PDF Extractor', () => {
  describe('detectMeetingType', () => {
    it('should detect midweek meeting', () => {
      const text = 'Midweek Meeting\nTREASURES FROM GOD\'S WORD\nEspirituwal na Hiyas';
      expect(detectMeetingType(text)).toBe('midweek');
    });

    it('should detect weekend meeting', () => {
      const text = 'Weekend Meeting\nWatchtower Reader\nHospitality';
      expect(detectMeetingType(text)).toBe('weekend');
    });

    it('should return unknown for unrecognized text', () => {
      const text = 'Random text without meeting indicators';
      expect(detectMeetingType(text)).toBe('unknown');
    });
  });
});

describe('Midweek Parser', () => {
  const sampleMidweekText = `
Midweek Meeting
February 6, 2026 | ISAIAS 30-32
Chairman
Villanueva, Sir Galahad
Song 8: Si Jehova ang Ating Kanlungan
Prayer
Sullano, Jayr P.
TREASURES FROM GOD'S WORD
1. Magtiwalang Poprotektahan Ka ni Jehova (10 min.)Penera, Abraham
2. Espirituwal na Hiyas (10 min.)Sapla, Edmer
3. Pagbabasa ng Bibliya (4 min.)Salazar, Xian
APPLY YOURSELF TO THE FIELD MINISTRY
4. Pagpapasimula ng Pakikipag-usap (4 min.)Nieva, Kathlyn Joyce / Villanueva, Honeylette
LIVING AS CHRISTIANS
Song 157
7. Video Clip (15 min.)Basanes, Melquisidecks
8. Pag-aaral ng Kongregasyon sa Bibliya (30 min.)Mancuso, Matthew / Quinol, Randino
Song 133
Prayer
Mondares, Rafael
`;

  it('should parse date correctly', () => {
    const meetings = parseMidweekText(sampleMidweekText);
    expect(meetings.length).toBeGreaterThan(0);
    expect(meetings[0].date).toBe('2026-02-06');
  });

  it('should extract chairman', () => {
    const meetings = parseMidweekText(sampleMidweekText);
    expect(meetings[0].chairman).toBe('Villanueva, Sir Galahad');
  });

  it('should extract spiritual gems', () => {
    const meetings = parseMidweekText(sampleMidweekText);
    expect(meetings[0].spiritualGems).toBe('Sapla, Edmer');
  });

  it('should extract bible reading', () => {
    const meetings = parseMidweekText(sampleMidweekText);
    expect(meetings[0].bibleReading).toBe('Salazar, Xian');
  });

  it('should extract CBS chairman and reader', () => {
    const meetings = parseMidweekText(sampleMidweekText);
    expect(meetings[0].cbsChairman).toBe('Mancuso, Matthew');
    expect(meetings[0].cbsReader).toBe('Quinol, Randino');
  });
});

describe('Weekend Parser', () => {
  const sampleWeekendText = `
Weekend Meeting
February 8, 2026
Kung Paano Tayo Nakikinabang sa Karunungan Mula sa Diyos
Opening PrayerSullano, Jayr P.
Quinol, Randino — Victoria Tagalog, Kitchener, ONChairmanSullano, Jayr P.
Watchtower ReaderMacasieb, Cezar
Closing PrayerVillanueva, Sir Galahad
Hospitality
`;

  it('should parse date correctly', () => {
    const meetings = parseWeekendText(sampleWeekendText);
    expect(meetings.length).toBeGreaterThan(0);
    expect(meetings[0].date).toBe('2026-02-08');
  });

  it('should extract public talk speaker', () => {
    const meetings = parseWeekendText(sampleWeekendText);
    expect(meetings[0].publicTalkSpeaker).toBe('Quinol, Randino');
  });

  it('should extract congregation', () => {
    const meetings = parseWeekendText(sampleWeekendText);
    expect(meetings[0].speakerCongregation).toBe('Victoria Tagalog, Kitchener, ON');
  });

  it('should extract chairman', () => {
    const meetings = parseWeekendText(sampleWeekendText);
    expect(meetings[0].chairman).toBe('Sullano, Jayr P.');
  });

  it('should extract WT reader', () => {
    const meetings = parseWeekendText(sampleWeekendText);
    expect(meetings[0].wtReader).toBe('Macasieb, Cezar');
  });
});
