// Event matching logic

import { CalendarEvent, MatchResult, PotentialEvent } from './types';
import { extractKeywords } from './normalize';

export function matchAgainstCalendar(
  potential: PotentialEvent,
  calendarEvents: CalendarEvent[],
  windowHours: number = 24
): MatchResult {
  // Filter events within time window
  const windowMs = windowHours * 60 * 60 * 1000;
  const potentialTime = potential.detected_start.getTime();
  
  const candidateEvents = calendarEvents.filter(event => {
    const eventTime = event.start.getTime();
    const diff = Math.abs(eventTime - potentialTime);
    
    // Adjust window based on has_time
    const effectiveWindow = potential.has_time ? 3 * 60 * 60 * 1000 : windowMs;
    return diff <= effectiveWindow;
  });
  
  // Try exact hash match first
  for (const event of candidateEvents) {
    if (event.semantic_hash === potential.semantic_hash) {
      return {
        matched: true,
        match_type: 'exact_hash',
        matched_event: event
      };
    }
  }
  
  // Try keyword overlap (same day + at least 2 keywords)
  for (const event of candidateEvents) {
    const sameDay = isSameDay(potential.detected_start, event.start);
    if (sameDay) {
      const overlap = countKeywordOverlap(potential.keywords, event.keywords);
      if (overlap >= 2) {
        return {
          matched: true,
          match_type: 'keyword_overlap',
          matched_event: event
        };
      }
    }
  }
  
  return { matched: false, match_type: 'none' };
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function countKeywordOverlap(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  return keywords2.filter(kw => set1.has(kw)).length;
}
