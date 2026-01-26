import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDateTimeES } from './parseDateTimeES';

describe('parseDateTimeES', () => {
  // Mock system time to a fixed date: Monday, Jan 1, 2024 10:00 AM
  const MOCK_NOW = new Date(2024, 0, 1, 10, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers({ now: MOCK_NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects "hoy" correctly', () => {
    const result = parseDateTimeES('reunión hoy', MOCK_NOW);
    expect(result).not.toBeNull();
    expect(result?.detected_start.getDate()).toBe(1);
    expect(result?.confidence).toBe('high');
  });

  it('detects "mañana" correctly', () => {
    const result = parseDateTimeES('entrega mañana', MOCK_NOW);
    expect(result).not.toBeNull();
    expect(result?.detected_start.getDate()).toBe(2);
    expect(result?.confidence).toBe('high');
  });

  it('detects specific date "15/02"', () => {
    const result = parseDateTimeES('cita el 15/02', MOCK_NOW);
    expect(result).not.toBeNull();
    expect(result?.detected_start.getDate()).toBe(15);
    expect(result?.detected_start.getMonth()).toBe(1); // February is 1
    expect(result?.confidence).toBe('high');
  });

  it('detects time "20:00"', () => {
    const result = parseDateTimeES('cena hoy a las 20:00', MOCK_NOW);
    expect(result).not.toBeNull();
    expect(result?.has_time).toBe(true);
    expect(result?.detected_start.getHours()).toBe(20);
    expect(result?.detected_start.getMinutes()).toBe(0);
  });

  it('detects day of week "viernes"', () => {
    // Jan 1 2024 is Monday. Friday should be Jan 5.
    const result = parseDateTimeES('fiesta el viernes', MOCK_NOW);
    expect(result).not.toBeNull();
    expect(result?.detected_start.getDay()).toBe(5); // Friday
    expect(result?.confidence).toBe('medium');
  });

  it('returns null for text without date', () => {
    const result = parseDateTimeES('comprar leche y pan', MOCK_NOW);
    expect(result).toBeNull();
  });
});