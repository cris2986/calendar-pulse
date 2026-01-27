// Core domain types for the event auditor

export type Confidence = 'high' | 'medium' | 'low';
export type Status = 'pending' | 'covered' | 'leak' | 'expired' | 'discarded';

export interface ParsedDateTime {
  detected_start: Date;
  detected_end?: Date;
  has_time: boolean; // 0 = no time, 1 = has time
  confidence: Confidence;
  raw_text: string;
}

export interface RawRecord {
  id?: number;
  content: string;
  source: 'paste' | 'share' | 'import' | 'manual';
  created_at: Date;
}

export interface PotentialEvent {
  id?: number;
  raw_record_id: number;
  summary: string;
  detected_start: Date;
  detected_end?: Date;
  has_time: boolean;
  confidence: Confidence;
  semantic_hash: string;
  keywords: string[];
  status: Status;
  created_at: Date;
  updated_at: Date;
}

export interface CalendarEvent {
  id?: number;
  external_id?: string;
  summary: string;
  start: Date;
  end?: Date;
  is_all_day: boolean;
  semantic_hash: string;
  keywords: string[];
  source: 'ics' | 'google' | 'manual';
  imported_at: Date;
}

export interface MatchResult {
  matched: boolean;
  match_type?: 'exact_hash' | 'keyword_overlap' | 'none';
  matched_event?: CalendarEvent;
}

export interface Settings {
  window_hours: 24 | 48;
  retention_days: 7 | 30 | 90;
  default_calendar_source: 'ics' | 'google' | 'none';
  notifications_enabled: boolean;
}
