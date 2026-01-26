// Main pipeline orchestrator

import { db } from '@/db/database';
import { parseDateTimeES } from '@/core/parseDateTimeES';
import { extractKeywords } from '@/core/normalize';
import { generateSemanticHash } from '@/core/hash';
import { matchAgainstCalendar } from '@/core/matcher';
import { deriveStatus } from '@/core/stateMachine';
import { PotentialEvent, RawRecord, ParsedDateTime } from '@/core/types';

/**
 * Extracts a clean summary from the content by removing date/time patterns
 * and limiting to the most relevant text
 */
function extractSummary(content: string, parsed: ParsedDateTime): string {
  let cleaned = content;
  
  // Remove common date/time patterns
  cleaned = cleaned.replace(/\b(hoy|mañana|pasado mañana)\b/gi, '');
  cleaned = cleaned.replace(/\b(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/gi, '');
  cleaned = cleaned.replace(/\b\d{1,2}[\/\-]\d{1,2}(\b|[\/\-]\d{2,4})/g, '');
  cleaned = cleaned.replace(/\b(el|la|los|las)\s+\d{1,2}\b/gi, '');
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}\b/g, '');
  cleaned = cleaned.replace(/\ba\s+las?\s+\d{1,2}\b/gi, '');
  cleaned = cleaned.replace(/\b(en\s+la\s+)?(mañana|tarde|noche)\b/gi, '');
  cleaned = cleaned.replace(/\b(am|pm)\b/gi, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // If nothing left, use original but limit to 50 chars
  if (cleaned.length < 3) {
    cleaned = content.slice(0, 50).trim();
  }
  
  // Limit to 50 characters for a clean summary
  if (cleaned.length > 50) {
    cleaned = cleaned.slice(0, 47) + '...';
  }
  
  return cleaned;
}

export async function processIncoming(
  content: string,
  source: RawRecord['source'] = 'paste'
): Promise<{ success: boolean; eventId?: number; error?: string }> {
  try {
    // 1. Save raw record
    const rawId = await db.rawRecords.add({
      content,
      source,
      created_at: new Date()
    });
    
    // 2. Parse date/time
    const parsed = parseDateTimeES(content);
    if (!parsed) {
      return { success: true }; // No date found, just saved raw
    }
    
    // 3. Extract keywords and generate hash
    const keywords = extractKeywords(content);
    const summary = extractSummary(content, parsed); // Smart summary extraction
    const semanticHash = await generateSemanticHash(
      parsed.detected_start,
      parsed.has_time,
      content
    );
    
    // 4. Check for duplicates
    const existing = await db.potentialEvents
      .where('semantic_hash')
      .equals(semanticHash)
      .and((event: PotentialEvent) => {
        const sameDay = event.detected_start.toDateString() === parsed.detected_start.toDateString();
        return sameDay;
      })
      .first();
    
    if (existing) {
      return { success: true, eventId: existing.id }; // Duplicate, skip
    }
    
    // 5. Get calendar events for matching
    const calendarEvents = await db.calendarEvents.toArray();
    
    // 6. Match against calendar
    const settings = await db.settings.get(1);
    const windowHours = settings?.window_hours ?? 48;
    const matchResult = matchAgainstCalendar(
      {
        raw_record_id: rawId,
        summary,
        detected_start: parsed.detected_start,
        detected_end: parsed.detected_end,
        has_time: parsed.has_time,
        confidence: parsed.confidence,
        semantic_hash: semanticHash,
        keywords,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      },
      calendarEvents,
      windowHours
    );
    
    // 7. Derive status
    const status = deriveStatus(
      new Date(),
      {
        raw_record_id: rawId,
        summary,
        detected_start: parsed.detected_start,
        detected_end: parsed.detected_end,
        has_time: parsed.has_time,
        confidence: parsed.confidence,
        semantic_hash: semanticHash,
        keywords,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      },
      matchResult,
      windowHours
    );
    
    // 8. Save potential event
    const eventId = await db.potentialEvents.add({
      raw_record_id: rawId,
      summary,
      detected_start: parsed.detected_start,
      detected_end: parsed.detected_end,
      has_time: parsed.has_time,
      confidence: parsed.confidence,
      semantic_hash: semanticHash,
      keywords,
      status,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return { success: true, eventId };
  } catch (error) {
    console.error('Error processing incoming:', error);
    return { success: false, error: String(error) };
  }
}
