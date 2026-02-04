// IndexedDB setup with Dexie

import Dexie, { Table } from 'dexie';
import { RawRecord, PotentialEvent, CalendarEvent, Settings } from '@/core/types';

export class EventAuditorDB extends Dexie {
  rawRecords!: Table<RawRecord, number>;
  potentialEvents!: Table<PotentialEvent, number>;
  calendarEvents!: Table<CalendarEvent, number>;
  settings!: Table<Settings & { id: number }, number>;

  constructor() {
    super('EventAuditorDB');
    
    this.version(1).stores({
      rawRecords: '++id, created_at, source',
      potentialEvents: '++id, raw_record_id, status, detected_start, semantic_hash, created_at, updated_at',
      calendarEvents: '++id, external_id, start, semantic_hash, source, imported_at',
      settings: 'id'
    });
    
    // Map to classes for proper typing
    this.rawRecords = this.table('rawRecords');
    this.potentialEvents = this.table('potentialEvents');
    this.calendarEvents = this.table('calendarEvents');
    this.settings = this.table('settings');
  }
}

export const db = new EventAuditorDB();

// Initialize default settings
export async function initializeSettings(): Promise<void> {
  try {
    // Request persistent storage
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`[DB] Storage persisted: ${isPersisted}`);
    }

    const existing = await db.settings.get(1);
    if (!existing) {
      await db.settings.add({
        id: 1,
        window_hours: 48,
        retention_days: 30,
        default_calendar_source: 'none',
        notifications_enabled: true
      });
    }
  } catch (error) {
    console.error('Failed to initialize settings:', error);
    throw new Error('Database initialization failed: ' + error);
  }
}

// Autopurge old records
export async function autopurge(): Promise<void> {
  try {
    const settings = await db.settings.get(1);
    if (!settings) return;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.retention_days);
    
    // Delete old raw records
    await db.rawRecords.where('created_at').below(cutoffDate).delete();
    
    // Delete old potential events
    await db.potentialEvents.where('created_at').below(cutoffDate).delete();
    
    // Delete old calendar cache (older than 24h)
    const cacheCutoff = new Date();
    cacheCutoff.setHours(cacheCutoff.getHours() - 24);
    await db.calendarEvents.where('imported_at').below(cacheCutoff).delete();
  } catch (error) {
    console.error('Autopurge failed:', error);
    // Don't throw - autopurge failure shouldn't block app startup
  }
}