import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDateTimeES } from './parseDateTimeES';
import { deriveStatus } from './stateMachine';
import { matchAgainstCalendar } from './matcher';
import { USER_PHRASES, MOCK_NOW } from './fixtures/userPhrases';
import { PotentialEvent } from './types';

describe('Regression Tests - User Phrases', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: MOCK_NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  USER_PHRASES.forEach((testCase, index) => {
    describe(`Case ${index + 1}: ${testCase.description}`, () => {
      it('should parse correctly', () => {
        const result = parseDateTimeES(testCase.input);
        
        if (testCase.expectedParsed) {
          expect(result).not.toBeNull();
          expect(result?.has_time).toBe(testCase.expectedHasTime);
          expect(result?.confidence).toBe(testCase.expectedConfidence);
        } else {
          expect(result).toBeNull();
        }
      });

      if (testCase.expectedParsed) {
        it('should derive correct status', () => {
          const parsed = parseDateTimeES(testCase.input);
          expect(parsed).not.toBeNull();

          const potentialEvent: PotentialEvent = {
            raw_record_id: 1,
            summary: testCase.input,
            detected_start: parsed!.detected_start,
            detected_end: parsed!.detected_end,
            has_time: parsed!.has_time,
            confidence: parsed!.confidence,
            semantic_hash: 'test-hash',
            keywords: [],
            status: 'pending',
            created_at: MOCK_NOW,
            updated_at: MOCK_NOW
          };

          const matchResult = matchAgainstCalendar(potentialEvent, [], 48);
          const status = deriveStatus(MOCK_NOW, potentialEvent, matchResult, 48);

          expect(status).toBe(testCase.expectedStatus);
        });
      }
    });
  });

  describe('Parser Edge Cases', () => {
    it('should handle year rollover for dd/mm dates', () => {
      // If date is in the past, should roll to next year
      const result = parseDateTimeES('15/12 evento');
      expect(result).not.toBeNull();
      
      if (result) {
        // Dec 15 is before Jan 1, so should be next year
        expect(result.detected_start.getFullYear()).toBe(2024);
      }
    });

    it('should handle "a las 7" as 7 AM by default', () => {
      const result = parseDateTimeES('mañana a las 7 desayuno');
      expect(result).not.toBeNull();
      expect(result?.has_time).toBe(true);
      expect(result?.detected_start.getHours()).toBe(7);
    });

    it('should handle "a las 7 pm" as 19:00', () => {
      const result = parseDateTimeES('mañana a las 7 pm cena');
      expect(result).not.toBeNull();
      expect(result?.has_time).toBe(true);
      expect(result?.detected_start.getHours()).toBe(19);
    });

    it('should handle next occurrence of day of week', () => {
      // MOCK_NOW is Monday Jan 1
      const result = parseDateTimeES('viernes reunión');
      expect(result).not.toBeNull();
      
      if (result) {
        expect(result.detected_start.getDay()).toBe(5); // Friday
        expect(result.detected_start.getDate()).toBe(5); // Jan 5
      }
    });
  });

  describe('Matcher Edge Cases', () => {
    it('should match events within 3h window when has_time=true', () => {
      const potentialEvent: PotentialEvent = {
        raw_record_id: 1,
        summary: 'Reunión',
        detected_start: new Date(2024, 0, 2, 10, 0), // Jan 2, 10:00
        has_time: true,
        confidence: 'high',
        semantic_hash: 'hash1',
        keywords: ['reunion'],
        status: 'pending',
        created_at: MOCK_NOW,
        updated_at: MOCK_NOW
      };

      const calendarEvent = {
        summary: 'Reunión equipo',
        start: new Date(2024, 0, 2, 11, 30), // Jan 2, 11:30 (1.5h difference)
        is_all_day: false,
        semantic_hash: 'hash1',
        keywords: ['reunion', 'equipo'],
        source: 'ics' as const,
        imported_at: MOCK_NOW
      };

      const result = matchAgainstCalendar(potentialEvent, [calendarEvent], 48);
      expect(result.matched).toBe(true);
      expect(result.match_type).toBe('exact_hash');
    });

    it('should require 2+ keyword overlap for fuzzy match', () => {
      const potentialEvent: PotentialEvent = {
        raw_record_id: 1,
        summary: 'Reunión equipo proyecto',
        detected_start: new Date(2024, 0, 2, 10, 0),
        has_time: false,
        confidence: 'high',
        semantic_hash: 'hash1',
        keywords: ['reunion', 'equipo', 'proyecto'],
        status: 'pending',
        created_at: MOCK_NOW,
        updated_at: MOCK_NOW
      };

      const calendarEvent = {
        summary: 'Sync equipo semanal',
        start: new Date(2024, 0, 2, 10, 0),
        is_all_day: false,
        semantic_hash: 'hash2',
        keywords: ['sync', 'equipo', 'semanal'],
        source: 'ics' as const,
        imported_at: MOCK_NOW
      };

      const result = matchAgainstCalendar(potentialEvent, [calendarEvent], 48);
      // Only 'equipo' overlaps (1 keyword), should not match
      expect(result.matched).toBe(false);
    });
  });
});
