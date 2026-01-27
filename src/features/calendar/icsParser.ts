// ICS file parser - Enhanced for robustness

import { CalendarEvent } from '@/core/types';
import { extractKeywords } from '@/core/normalize';
import { generateSemanticHash } from '@/core/hash';

export async function parseICSFile(fileContent: string): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  const lines = fileContent.split(/\r?\n/);
  
  let currentEvent: Partial<CalendarEvent> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle line continuation (lines starting with space or tab)
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
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
        const fieldPart = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        // Extract field name (before any semicolon parameters)
        const field = fieldPart.split(';')[0];
        
        if (field === 'SUMMARY') {
          currentEvent.summary = unescapeICSValue(value);
        } else if (field === 'DTSTART') {
          const isAllDay = fieldPart.includes('VALUE=DATE') && !fieldPart.includes('DATE-TIME');
          currentEvent.start = parseICSDate(value);
          currentEvent.is_all_day = isAllDay;
        } else if (field === 'DTEND') {
          currentEvent.end = parseICSDate(value);
        } else if (field === 'UID') {
          currentEvent.external_id = value;
        }
        // Ignore other fields like LOCATION, DESCRIPTION for now
      }
    }
  }
  
  return events;
}

function parseICSDate(dateStr: string): Date {
  // Remove any timezone identifiers (Z, +00:00, etc.) for simplicity
  const cleaned = dateStr.replace(/[-:]/g, '').replace(/Z$/, '');
  
  if (cleaned.length === 8) {
    // DATE format: YYYYMMDD
    const year = parseInt(cleaned.substring(0, 4));
    const month = parseInt(cleaned.substring(4, 6)) - 1;
    const day = parseInt(cleaned.substring(6, 8));
    return new Date(year, month, day, 0, 0, 0, 0);
  } else if (cleaned.length >= 15) {
    // DATE-TIME format: YYYYMMDDTHHmmss
    const year = parseInt(cleaned.substring(0, 4));
    const month = parseInt(cleaned.substring(4, 6)) - 1;
    const day = parseInt(cleaned.substring(6, 8));
    const hour = parseInt(cleaned.substring(9, 11));
    const minute = parseInt(cleaned.substring(11, 13));
    const second = parseInt(cleaned.substring(13, 15));
    return new Date(year, month, day, hour, minute, second);
  }
  
  // Fallback: try native Date parsing
  return new Date(dateStr);
}

function unescapeICSValue(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}