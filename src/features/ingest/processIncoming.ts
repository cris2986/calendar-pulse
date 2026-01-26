// Main pipeline orchestrator

import { db } from '@/db/database';
import { parseDateTimeES } from '@/core/parseDateTimeES';
import { extractKeywords } from '@/core/normalize';
import { generateSemanticHash } from '@/core/hash';
import { matchAgainstCalendar } from '@/core/matcher';
import { deriveStatus } from '@/core/stateMachine';
import { PotentialEvent, RawRecord } from '@/core/types';

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
    
    // 2. Parse date/time (no reference date in production, uses current time)
    const parsed = parseDateTimeES(content);
    if (!parsed) {
      return { success: true }; // No date found, just saved raw
    }
    
    // 3. Extract keywords and generate hash
    const keywords = extractKeywords(content);
    // Extract a better summary: remove date/time patterns and trim
    let summary = content
      .replace(/\b\d{1,2}:\d{2}\b/g, '') // Remove times
      .replace(/\b\d{1,2}[\/\-]\d{1,2}\b/g, '') // Remove dates
      .replace(/\b(hoy|mañana|pasado mañana|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/gi, '')
      .trim()
      .slice(0, 100);
    
    if (!summary) {
      summary = content.slice(0, 100); // Fallback to first 100 chars
    }
    
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
      // Update the existing event's updated_at timestamp
      await db.potentialEvents.update(existing.id!, {
        updated_at: new Date()
      });
      return { success: true, eventId: existing.id }; // Duplicate, updated timestamp
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
    
    console.log('✅ Potential event created:', { eventId, summary, status, detected_start: parsed.detected_start });
    
    return { success: true, eventId };
  } catch (error) {
    console.error('Error processing incoming:', error);
    return { success: false, error: String(error) };
  }
}
