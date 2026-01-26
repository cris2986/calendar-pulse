// ICS file parser

import { CalendarEvent } from '@/core/types';
import { extractKeywords } from '@/core/normalize';
import { generateSemanticHash } from '@/core/hash';

export async function parseICSFile(fileContent: string): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  const lines = fileContent.split(/\r?\n/);
  
  let currentEvent: Partial<CalendarEvent> | null = null;
  let currentField = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle line continuation
    while (i + 1 < lines.length && lines[i + 1].startsWith(' ')) {
      i++;
      line += lines[i].trim();
    }
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = { source: 'ics' as const, imported_at: new Date() };
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary && currentEvent.start) {
        const keywords = extractKeywords(currentEvent.summary);
        const semanticHash = await generateSemanticHash(
          currentEvent.start,
          !currentEvent.is_all_day,
          currentEvent.summary
        );
        
        events.push({
          ...currentEvent,
          keywords,
          semantic_hash: semanticHash,
          is_all_day: currentEvent.is_all_day ?? false
        } as CalendarEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const field = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        if (field.startsWith('SUMMARY')) {
          currentEvent.summary = value;
        } else if (field.startsWith('DTSTART')) {
          const isAllDay = field.includes('VALUE=DATE') && !field.includes('DATE-TIME');
          currentEvent.start = parseICSDate(value);
          currentEvent.is_all_day = isAllDay;
        } else if (field.startsWith('DTEND')) {
          currentEvent.end = parseICSDate(value);
        } else if (field.startsWith('UID')) {
          currentEvent.external_id = value;
        }
      }
    }
  }
  
  return events;
}

function parseICSDate(dateStr: string): Date {
  // Handle both DATE and DATE-TIME formats
  // YYYYMMDD or YYYYMMDDTHHmmssZ
  const cleaned = dateStr.replace(/[-:]/g, '');
  
  if (cleaned.length === 8) {
    // DATE format: YYYYMMDD
    const year = parseInt(cleaned.substring(0, 4));
    const month = parseInt(cleaned.substring(4, 6)) - 1;
    const day = parseInt(cleaned.substring(6, 8));
    return new Date(year, month, day);
  } else {
    // DATE-TIME format: YYYYMMDDTHHmmss
    const year = parseInt(cleaned.substring(0, 4));
    const month = parseInt(cleaned.substring(4, 6)) - 1;
    const day = parseInt(cleaned.substring(6, 8));
    const hour = parseInt(cleaned.substring(9, 11));
    const minute = parseInt(cleaned.substring(11, 13));
    const second = parseInt(cleaned.substring(13, 15));
    return new Date(year, month, day, hour, minute, second);
  }
}
