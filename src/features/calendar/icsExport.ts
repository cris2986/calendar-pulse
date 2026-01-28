// ICS file export and calendar integration

import { PotentialEvent } from '@/core/types';

// Check if running in Capacitor (native Android)
function isCapacitor(): boolean {
  return typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== 'undefined';
}

export function createICSForEvent(event: PotentialEvent): string {
  const now = new Date();
  const dtStamp = formatICSDateTime(now);

  const dtStart = event.has_time
    ? formatICSDateTime(event.detected_start)
    : formatICSDate(event.detected_start);

  const dtEnd = event.detected_end
    ? (event.has_time ? formatICSDateTime(event.detected_end) : formatICSDate(event.detected_end))
    : (event.has_time
        ? formatICSDateTime(new Date(event.detected_start.getTime() + 60 * 60 * 1000))
        : formatICSDate(new Date(event.detected_start.getTime() + 24 * 60 * 60 * 1000)));

  const uid = `${event.id}-${Date.now()}@calendarpulse.app`;
  const summary = escapeICSValue(event.summary);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendar Pulse//PWA//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    event.has_time ? `DTSTART:${dtStart}` : `DTSTART;VALUE=DATE:${dtStart}`,
    event.has_time ? `DTEND:${dtEnd}` : `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${summary}`,
    `STATUS:CONFIRMED`,
    `TRANSP:OPAQUE`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

// Add event directly to calendar
export async function downloadICS(event: PotentialEvent): Promise<void> {
  const startTime = event.detected_start.getTime();
  const endTime = event.detected_end
    ? event.detected_end.getTime()
    : startTime + (event.has_time ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000);

  if (isCapacitor()) {
    // Native Android: Use content:// intent to add event directly to calendar
    addToCalendarAndroid(event.summary, startTime, endTime, event.has_time);
  } else {
    // Web: Try multiple approaches
    // 1. First try Google Calendar (most reliable for web)
    addToGoogleCalendar(event.summary, startTime, endTime, event.has_time);
  }
}

// Android: Use intent to add event to calendar
function addToCalendarAndroid(title: string, startTime: number, endTime: number, hasTime: boolean): void {
  // Android calendar intent URL scheme
  // This opens the native calendar app's "add event" screen
  const intentUrl = new URL('intent://');

  // Alternative: Use Google Calendar web URL which Android can handle
  // Or use a content:// URI for the calendar provider

  // Most reliable approach: Use webcal or Google Calendar URL
  // Android will offer to open with calendar app

  const calendarUrl = buildGoogleCalendarUrl(title, startTime, endTime, hasTime);

  // Try to open with calendar app
  window.location.href = calendarUrl;
}

// Google Calendar URL builder
function addToGoogleCalendar(title: string, startTime: number, endTime: number, hasTime: boolean): void {
  const url = buildGoogleCalendarUrl(title, startTime, endTime, hasTime);
  window.open(url, '_blank');
}

function buildGoogleCalendarUrl(title: string, startTime: number, endTime: number, hasTime: boolean): string {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', title);

  if (hasTime) {
    // With specific time
    url.searchParams.set('dates', `${formatGoogleDateTime(startDate)}/${formatGoogleDateTime(endDate)}`);
  } else {
    // All-day event
    url.searchParams.set('dates', `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`);
  }

  return url.toString();
}

// Format for Google Calendar with time (YYYYMMDDTHHmmssZ)
function formatGoogleDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Format for Google Calendar all-day (YYYYMMDD)
function formatGoogleDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatICSDateTime(date: Date): string {
  const dateStr = formatICSDate(date);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${dateStr}T${hour}${minute}${second}`;
}

function escapeICSValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
