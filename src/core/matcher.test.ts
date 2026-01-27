import { describe, it, expect } from 'vitest';
import { matchAgainstCalendar } from './matcher';
import { CalendarEvent, PotentialEvent } from './types';

describe('matchAgainstCalendar', () => {
  const baseDate = new Date(2024, 0, 1, 10, 0, 0);
  
  const potential: PotentialEvent = {
    raw_record_id: 1,
    summary: 'Reunión equipo',
    detected_start: baseDate,
    has_time: true,
    confidence: 'high',
    semantic_hash: 'hash123',
    keywords: ['reunion', 'equipo'],
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date()
  };

  it('matches exact hash', () => {
    const calendarEvents: CalendarEvent[] = [{
      summary: 'Reunión equipo',
      start: baseDate,
      is_all_day: false,
      semantic_hash: 'hash123',
      keywords: ['reunion', 'equipo'],
      source: 'ics',
      imported_at: new Date()
    }];

    const result = matchAgainstCalendar(potential, calendarEvents);
    expect(result.matched).toBe(true);
    expect(result.match_type).toBe('exact_hash');
  });

  it('matches keyword overlap on same day', () => {
    const calendarEvents: CalendarEvent[] = [{
      summary: 'Sync Equipo Semanal',
      start: baseDate, // Same time
      is_all_day: false,
      semantic_hash: 'different_hash',
      keywords: ['sync', 'equipo', 'semanal', 'reunion'], // Overlap: equipo, reunion (if normalized)
      source: 'ics',
      imported_at: new Date()
    }];

    // Note: 'reunion' and 'equipo' are in potential.keywords
    // We need to ensure the calendar event has enough overlap.
    // potential: ['reunion', 'equipo']
    // calendar: ['sync', 'equipo', 'semanal', 'reunion']
    // Overlap: 'equipo', 'reunion' -> 2 matches.

    const result = matchAgainstCalendar(potential, calendarEvents);
    expect(result.matched).toBe(true);
    expect(result.match_type).toBe('keyword_overlap');
  });

  it('does not match if time difference is too large', () => {
    const differentTime = new Date(baseDate);
    differentTime.setHours(15); // 5 hours later

    const calendarEvents: CalendarEvent[] = [{
      summary: 'Reunión equipo',
      start: differentTime,
      is_all_day: false,
      semantic_hash: 'hash123', // Even with same hash, if outside window it might fail filter first?
      // The matcher filters by window first.
      keywords: ['reunion', 'equipo'],
      source: 'ics',
      imported_at: new Date()
    }];

    // Window for has_time=true is 3 hours. 5 hours > 3 hours.
    const result = matchAgainstCalendar(potential, calendarEvents);
    expect(result.matched).toBe(false);
  });
});
