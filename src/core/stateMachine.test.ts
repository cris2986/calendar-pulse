import { describe, it, expect } from 'vitest';
import { deriveStatus } from './stateMachine';
import { PotentialEvent } from './types';

describe('deriveStatus', () => {
  const now = new Date(2024, 0, 1, 10, 0, 0); // Jan 1 10:00
  
  const baseEvent: PotentialEvent = {
    raw_record_id: 1,
    summary: 'Test Event',
    detected_start: new Date(now),
    has_time: true,
    confidence: 'high',
    semantic_hash: 'abc',
    keywords: [],
    status: 'pending',
    created_at: now,
    updated_at: now
  };

  it('returns "expired" if start time is in the past', () => {
    const pastEvent = { ...baseEvent, detected_start: new Date(2023, 11, 31) };
    const result = deriveStatus(now, pastEvent, { matched: false }, 48);
    expect(result).toBe('expired');
  });

  it('returns "covered" if matched', () => {
    // Future event
    const futureEvent = { ...baseEvent, detected_start: new Date(2024, 0, 2) };
    const result = deriveStatus(now, futureEvent, { matched: true }, 48);
    expect(result).toBe('covered');
  });

  it('returns "leak" if within window and not matched', () => {
    // 24 hours from now (within 48h window)
    const nearFutureEvent = { ...baseEvent, detected_start: new Date(2024, 0, 2, 10, 0) };
    const result = deriveStatus(now, nearFutureEvent, { matched: false }, 48);
    expect(result).toBe('leak');
  });

  it('returns "pending" if outside window', () => {
    // 72 hours from now (outside 48h window)
    const farFutureEvent = { ...baseEvent, detected_start: new Date(2024, 0, 4, 10, 0) };
    const result = deriveStatus(now, farFutureEvent, { matched: false }, 48);
    expect(result).toBe('pending');
  });
  
  it('returns "pending" if confidence is low even within window', () => {
    const lowConfEvent = { 
      ...baseEvent, 
      detected_start: new Date(2024, 0, 2, 10, 0),
      confidence: 'low' as const
    };
    const result = deriveStatus(now, lowConfEvent, { matched: false }, 48);
    expect(result).toBe('pending');
  });
});
