// Deterministic Spanish date/time parser - Comprehensive version

import { ParsedDateTime, Confidence } from './types';

const DAYS_OF_WEEK = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DAYS_OF_WEEK_ACCENTED = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const MONTHS_ES: Record<string, number> = {
  // Full names
  'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
  // Abbreviations (3 letters)
  'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
  // Alternative abbreviations
  'sept': 8, 'setiembre': 8, 'set': 8
};

export function parseDateTimeES(text: string, referenceDate?: Date): ParsedDateTime | null {
  // Normalize: lowercase, remove accents, but keep original for title extraction
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const now = referenceDate || new Date();

  let detectedDate: Date | null = null;
  let hasTime = false;
  let confidence: Confidence = 'medium';

  // ============================================
  // DATE PARSING - Try multiple formats
  // ============================================

  // 1. Relative dates (highest priority)
  if (/\bhoy\b/.test(normalized)) {
    detectedDate = new Date(now);
    confidence = 'high';
  } else if (/\bmanana\b/.test(normalized) && !/\ben\s+la\s+manana\b/.test(normalized)) {
    // "mañana" but not "en la mañana"
    detectedDate = new Date(now);
    detectedDate.setDate(detectedDate.getDate() + 1);
    confidence = 'high';
  } else if (/\bpasado\s*manana\b/.test(normalized)) {
    detectedDate = new Date(now);
    detectedDate.setDate(detectedDate.getDate() + 2);
    confidence = 'high';
  }

  // 2. "próximo/esta/este + día de la semana" (e.g., "próximo lunes", "este viernes")
  if (!detectedDate) {
    for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
      const dayName = DAYS_OF_WEEK[i];
      // Match: "próximo viernes", "este viernes", "el viernes", just "viernes"
      const regex = new RegExp(`(?:(?:el|proximo|proxima|este|esta)\\s+)?\\b${dayName}\\b`);
      if (regex.test(normalized)) {
        detectedDate = getNextDayOfWeek(now, i);
        confidence = 'medium';
        break;
      }
    }
  }

  // 3. Full date formats: "dd de mes de yyyy", "dd de mes yyyy", "dd mes yyyy", "dd mes"
  if (!detectedDate) {
    const monthNames = Object.keys(MONTHS_ES).join('|');

    // "4 de febrero de 2026", "04 de feb 2026", "4 febrero 2026", "04 feb"
    const fullDateRegex = new RegExp(
      `\\b(\\d{1,2})\\s*(?:de\\s+)?(${monthNames})(?:\\s*(?:de|del)?\\s*(\\d{4}))?\\b`
    );
    const dateMatch = normalized.match(fullDateRegex);

    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = MONTHS_ES[dateMatch[2]];
      const year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
      detectedDate = new Date(year, month, day, 0, 0, 0, 0);

      // If no year specified and date is in the past, advance to next year
      if (!dateMatch[3] && detectedDate.getTime() < now.getTime()) {
        detectedDate.setFullYear(detectedDate.getFullYear() + 1);
      }
      confidence = 'high';
    }
  }

  // 4. Numeric formats: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, dd/mm, dd-mm
  if (!detectedDate) {
    const numericDateRegex = /\b(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?\b/;
    const numMatch = normalized.match(numericDateRegex);
    if (numMatch) {
      const day = parseInt(numMatch[1]);
      const month = parseInt(numMatch[2]) - 1;
      let year = numMatch[3] ? parseInt(numMatch[3]) : now.getFullYear();

      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      detectedDate = new Date(year, month, day, 0, 0, 0, 0);

      // If no year specified and date is in the past, advance to next year
      if (!numMatch[3] && detectedDate.getTime() < now.getTime()) {
        detectedDate.setFullYear(detectedDate.getFullYear() + 1);
      }
      confidence = 'high';
    }
  }

  // 5. ISO format: yyyy-mm-dd
  if (!detectedDate) {
    const isoMatch = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);
      detectedDate = new Date(year, month, day, 0, 0, 0, 0);
      confidence = 'high';
    }
  }

  // 6. "el día 15", "el 15", "día 15"
  if (!detectedDate) {
    const dayOnlyMatch = normalized.match(/\bel\s+(\d{1,2})\b/);
    if (dayOnlyMatch) {
      const day = parseInt(dayOnlyMatch[1]);
      if (day >= 1 && day <= 31) {
        detectedDate = new Date(now.getFullYear(), now.getMonth(), day);
        if (detectedDate.getTime() < now.getTime()) {
          detectedDate.setMonth(detectedDate.getMonth() + 1);
        }
        confidence = 'medium'; // Medium confidence with "el X" format
      }
    }
  }

  // 7. "en X días", "dentro de X días"
  if (!detectedDate) {
    const inDaysMatch = normalized.match(/(?:en|dentro\s+de)\s+(\d+)\s+dias?/);
    if (inDaysMatch) {
      const daysAhead = parseInt(inDaysMatch[1]);
      detectedDate = new Date(now);
      detectedDate.setDate(detectedDate.getDate() + daysAhead);
      confidence = 'high';
    }
  }

  // 8. "la próxima semana", "la semana que viene"
  if (!detectedDate) {
    if (/(?:la\s+)?proxima\s+semana|semana\s+que\s+viene/.test(normalized)) {
      detectedDate = new Date(now);
      detectedDate.setDate(detectedDate.getDate() + 7);
      confidence = 'low';
    }
  }

  if (!detectedDate) {
    return null; // No date found
  }

  // ============================================
  // TIME PARSING - Try multiple formats
  // ============================================

  // 1. Time with AM/PM in various formats:
  //    "10:15 a. m.", "10:15 a.m.", "10:15 am", "10:15 AM"
  //    "10:15 p. m.", "10:15 p.m.", "10:15 pm", "10:15 PM"
  const timeAmPmRegex = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?\b/i;
  const timeAmPmMatch = normalized.match(timeAmPmRegex);

  // 2. Time with "hs" suffix: "15:30 hs", "15:30hs", "15:30 hrs"
  const timeHsRegex = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:hs?|hrs?)\.?\b/;
  const timeHsMatch = normalized.match(timeHsRegex);

  // 3. Time with "horas": "a las 15 horas", "15 horas"
  const timeHorasRegex = /\b(\d{1,2})(?::(\d{2}))?\s*horas?\b/;
  const timeHorasMatch = normalized.match(timeHorasRegex);

  // 4. "a las HH:MM" or "a la HH:MM"
  const aLasTimeRegex = /\ba\s+las?\s+(\d{1,2})(?::(\d{2}))?\b/;
  const aLasMatch = normalized.match(aLasTimeRegex);

  // 5. Simple time format: "HH:MM" or "HH:MM:SS"
  const simpleTimeRegex = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/;
  const simpleTimeMatch = normalized.match(simpleTimeRegex);

  // 6. Hour only with context: "a las 3", "a las 15"
  const hourOnlyRegex = /\ba\s+las?\s+(\d{1,2})\b/;
  const hourOnlyMatch = normalized.match(hourOnlyRegex);

  // Process time matches in order of specificity
  if (timeAmPmMatch) {
    let hours = parseInt(timeAmPmMatch[1]);
    const minutes = parseInt(timeAmPmMatch[2]);
    const isPM = timeAmPmMatch[4].toLowerCase() === 'p';

    // Convert to 24h format
    if (isPM && hours < 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }

    detectedDate.setHours(hours, minutes, 0, 0);
    hasTime = true;
    confidence = 'high';
  } else if (timeHsMatch) {
    const hours = parseInt(timeHsMatch[1]);
    const minutes = parseInt(timeHsMatch[2]);
    detectedDate.setHours(hours, minutes, 0, 0);
    hasTime = true;
    confidence = 'high';
  } else if (timeHorasMatch) {
    const hours = parseInt(timeHorasMatch[1]);
    const minutes = timeHorasMatch[2] ? parseInt(timeHorasMatch[2]) : 0;
    detectedDate.setHours(hours, minutes, 0, 0);
    hasTime = true;
    confidence = 'high';
  } else if (aLasMatch) {
    let hours = parseInt(aLasMatch[1]);
    const minutes = aLasMatch[2] ? parseInt(aLasMatch[2]) : 0;

    // Check for PM indicator in text
    if (/\bp\.?\s*m\.?\b/.test(normalized) && hours < 12) {
      hours += 12;
    }
    // Heuristic: if hour is 1-6 without AM/PM indicator, likely PM
    if (hours >= 1 && hours <= 6 && !/\ba\.?\s*m\.?\b/.test(normalized)) {
      // Check context for time of day hints
      if (/tarde|noche/.test(normalized)) {
        hours += 12;
      }
    }

    detectedDate.setHours(hours, minutes, 0, 0);
    hasTime = true;
    confidence = 'high';
  } else if (simpleTimeMatch) {
    const hours = parseInt(simpleTimeMatch[1]);
    const minutes = parseInt(simpleTimeMatch[2]);

    // Validate reasonable time
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      detectedDate.setHours(hours, minutes, 0, 0);
      hasTime = true;
      confidence = 'high';
    }
  } else if (hourOnlyMatch) {
    let hours = parseInt(hourOnlyMatch[1]);

    // Check for AM/PM context
    if (/\bp\.?\s*m\.?\b/.test(normalized) && hours < 12) {
      hours += 12;
    } else if (/tarde/.test(normalized) && hours < 12) {
      hours += 12;
    } else if (/noche/.test(normalized) && hours < 12 && hours !== 12) {
      hours += 12;
    }

    detectedDate.setHours(hours, 0, 0, 0);
    hasTime = true;
    confidence = 'medium';
  } else if (/\ben\s+la\s+(manana|tarde|noche)\b/.test(normalized)) {
    // Time of day without specific hour
    if (/manana/.test(normalized)) {
      detectedDate.setHours(9, 0, 0, 0);
    } else if (/tarde/.test(normalized)) {
      detectedDate.setHours(15, 0, 0, 0);
    } else if (/noche/.test(normalized)) {
      detectedDate.setHours(20, 0, 0, 0);
    }
    hasTime = true;
    confidence = 'low';
  } else if (/\b(mediodia|medio\s*dia)\b/.test(normalized)) {
    detectedDate.setHours(12, 0, 0, 0);
    hasTime = true;
    confidence = 'medium';
  } else if (/\b(medianoche|media\s*noche)\b/.test(normalized)) {
    detectedDate.setHours(0, 0, 0, 0);
    hasTime = true;
    confidence = 'medium';
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

// Helper to extract potential event title from text
export function extractEventTitle(text: string): string {
  const normalized = text.toLowerCase();

  // Common patterns for event titles
  const patterns = [
    // Reservations: "reserva *XXXXX*", "reserva XXXXX"
    /reserva\s*[*]?(\d+)[*]?/i,
    // "viaje de X a Y", "Santiago a Concón"
    /([a-záéíóúñ]+)\s+a\s+([a-záéíóúñ]+)/i,
    // Medical: "atención en XXXX", "cita en XXXX"
    /(?:atencion|cita|consulta|hora)\s+(?:en|con)\s+([^,.\n]+)/i,
    // "su cita con Dr. XXX"
    /(?:cita|hora|consulta)\s+con\s+(?:dr\.?|dra\.?)\s*([^,.\n]+)/i,
  ];

  // Try to extract from first line or key phrases
  const lines = text.split('\n').filter(l => l.trim());
  const firstLine = lines[0] || '';

  // If it's a reservation confirmation
  if (/reserva.*confirmada/i.test(normalized)) {
    // Look for route pattern "X a Y"
    const routeMatch = text.match(/\*([^*]+)\s+a\s+([^*]+)\*/);
    if (routeMatch) {
      return `Viaje ${routeMatch[1].trim()} a ${routeMatch[2].trim()}`;
    }
  }

  // If it's a medical appointment
  if (/atencion|cita|consulta|hora.*confirmada/i.test(normalized)) {
    const locationMatch = text.match(/en\s+([^,]+)/i);
    if (locationMatch) {
      return `Cita médica - ${locationMatch[1].trim()}`;
    }
    return 'Cita médica';
  }

  // Default: use first non-empty line, truncated
  const title = firstLine.replace(/[*_]/g, '').trim();
  return title.length > 50 ? title.substring(0, 47) + '...' : title || 'Evento';
}
