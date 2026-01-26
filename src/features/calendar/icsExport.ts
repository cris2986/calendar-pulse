// ICS file export

import { PotentialEvent } from '@/core/types';

export function createICSForEvent(event: PotentialEvent): string {
  const now = new Date();
  const dtStamp = formatICSDate(now);
  const dtStart = event.has_time 
    ? formatICSDateTime(event.detected_start)
    : formatICSDate(event.detected_start);
  
  const dtEnd = event.detected_end
    ? (event.has_time ? formatICSDateTime(event.detected_end) : formatICSDate(event.detected_end))
    : (event.has_time 
        ? formatICSDateTime(new Date(event.detected_start.getTime() + 60 * 60 * 1000))
        : formatICSDate(new Date(event.detected_start.getTime() + 24 * 60 * 60 * 1000)));
  
  const uid = `${event.id}-${Date.now()}@eventauditor.local`;
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Event Auditor//PWA//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    event.has_time ? `DTSTART:${dtStart}` : `DTSTART;VALUE=DATE:${dtStart}`,
    event.has_time ? `DTEND:${dtEnd}` : `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${event.summary}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
}

export function downloadICS(event: PotentialEvent): void {
  const icsContent = createICSForEvent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `event-${event.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
