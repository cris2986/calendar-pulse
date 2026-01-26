// Deterministic Spanish date/time parser

import { ParsedDateTime, Confidence } from './types';

const DAYS_OF_WEEK = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function parseDateTimeES(text: string): ParsedDateTime | null {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const now = new Date();
  
  let detectedDate: Date | null = null;
  let hasTime = false;
  let confidence: Confidence = 'medium';
  
  // Try relative dates first
  if (/\bhoy\b/.test(normalized)) {
    detectedDate = new Date(now);
    confidence = 'high';
  } else if (/\bmanana\b/.test(normalized)) {
    detectedDate = new Date(now);
    detectedDate.setDate(detectedDate.getDate() + 1);
    confidence = 'high';
  } else if (/\bpasado\s+manana\b/.test(normalized)) {
    detectedDate = new Date(now);
    detectedDate.setDate(detectedDate.getDate() + 2);
    confidence = 'high';
  }
  
  // Try day of week
  if (!detectedDate) {
    for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
      const dayName = DAYS_OF_WEEK[i];
      const regex = new RegExp(`\\b${dayName}\\b`);
      if (regex.test(normalized)) {
        detectedDate = getNextDayOfWeek(now, i);
        confidence = 'medium';
        break;
      }
    }
  }
  
  // Try dd/mm or dd-mm format
  if (!detectedDate) {
    const dateMatch = normalized.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      detectedDate = new Date(now.getFullYear(), month, day);
      if (detectedDate < now) {
        detectedDate.setFullYear(detectedDate.getFullYear() + 1);
      }
      confidence = 'high';
    }
  }
  
  // Try "el 15" format
  if (!detectedDate) {
    const dayMatch = normalized.match(/\bel\s+(\d{1,2})\b/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      detectedDate = new Date(now.getFullYear(), now.getMonth(), day);
      if (detectedDate < now) {
        detectedDate.setMonth(detectedDate.getMonth() + 1);
      }
      confidence = 'medium';
    }
  }
  
  if (!detectedDate) {
    return null; // No date found
  }
  
  // Try to extract time
  const timeMatch = normalized.match(/\b(\d{1,2}):(\d{2})\b/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    detectedDate.setHours(hours, minutes, 0, 0);
    hasTime = true;
    confidence = 'high';
  } else {
    // Try "a las X" format
    const hourMatch = normalized.match(/\ba\s+las?\s+(\d{1,2})\b/);
    if (hourMatch) {
      let hours = parseInt(hourMatch[1]);
      // Check for am/pm
      if (/\bpm\b/.test(normalized) && hours < 12) {
        hours += 12;
      }
      detectedDate.setHours(hours, 0, 0, 0);
      hasTime = true;
      confidence = 'high';
    } else if (/\ben\s+la\s+(manana|tarde|noche)\b/.test(normalized)) {
      // Ambiguous time ranges
      if (/manana/.test(normalized)) {
        detectedDate.setHours(9, 0, 0, 0);
      } else if (/tarde/.test(normalized)) {
        detectedDate.setHours(15, 0, 0, 0);
      } else if (/noche/.test(normalized)) {
        detectedDate.setHours(20, 0, 0, 0);
      }
      hasTime = true;
      confidence = 'low'; // Ambiguous
    }
  }
  
  // Set default time if no time detected
  if (!hasTime) {
    detectedDate.setHours(0, 0, 0, 0);
  }
  
  return {
    detected_start: detectedDate,
    detected_end: undefined,
    has_time: hasTime,
    confidence,
    raw_text: text
  };
}

function getNextDayOfWeek(from: Date, targetDay: number): Date {
  const result = new Date(from);
  result.setHours(0, 0, 0, 0);
  const currentDay = result.getDay();
  let daysUntilTarget = (targetDay - currentDay + 7) % 7;
  // If it's the same day, go to next week
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7;
  }
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}
