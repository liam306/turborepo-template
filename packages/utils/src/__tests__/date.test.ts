import { describe, expect, it } from 'vitest';
import {
  calculateDaysBetween,
  formatDate,
  formatDateVN,
  getTodayISO,
  isDateMatured,
  isDatePast,
  parseVNDateToISO,
} from '../date';

describe('date utils', () => {
  it('returns today date in YYYY-MM-DD format', () => {
    const today = getTodayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  describe('formatDate and formatDateVN', () => {
    it('returns empty string for empty input', () => {
      expect(formatDate('')).toBe('');
      expect(formatDateVN('')).toBe('');
    });

    it('returns raw string when parsing fails', () => {
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });

    it('formats date according to vi locale by default', () => {
      expect(formatDate('2026-03-15')).toBe('15/03/2026');
      expect(formatDateVN('2026-03-15')).toBe('15/03/2026');
    });

    it('formats date according to en locale', () => {
      expect(formatDate('2026-03-15', 'en')).toBe('03/15/2026');
    });

    it('supports custom pattern', () => {
      expect(formatDate('2026-03-15', 'vi', 'yyyy/MM/dd')).toBe('2026/03/15');
    });
  });

  describe('parseVNDateToISO', () => {
    it('returns empty string for empty input', () => {
      expect(parseVNDateToISO('')).toBe('');
    });

    it('returns raw string for invalid vn date format', () => {
      expect(parseVNDateToISO('invalid')).toBe('invalid');
    });

    it('converts DD/MM/YYYY into YYYY-MM-DD', () => {
      expect(parseVNDateToISO('15/03/2026')).toBe('2026-03-15');
      expect(parseVNDateToISO(' 01/12/2025 ')).toBe('2025-12-01');
    });
  });

  describe('calculateDaysBetween', () => {
    it('calculates days between two valid ISO dates', () => {
      expect(calculateDaysBetween('2026-01-01', '2026-01-10')).toBe(9);
    });

    it('returns 0 when start date is after end date', () => {
      expect(calculateDaysBetween('2026-01-10', '2026-01-01')).toBe(0);
    });

    it('returns 0 on invalid dates', () => {
      expect(calculateDaysBetween('bad', 'bad')).toBe(0);
    });
  });

  describe('isDatePast and isDateMatured', () => {
    it('determines if date is past compared to reference date', () => {
      expect(isDatePast('2026-01-01', '2026-01-02')).toBe(true);
      expect(isDatePast('2026-01-02', '2026-01-01')).toBe(false);
      expect(isDatePast('invalid')).toBe(false);
    });

    it('determines if date has matured compared to reference date', () => {
      expect(isDateMatured('2026-01-01', '2026-01-02')).toBe(true);
      expect(isDateMatured('2026-01-02', '2026-01-02')).toBe(true);
      expect(isDateMatured('2026-01-03', '2026-01-02')).toBe(false);
      expect(isDateMatured('invalid')).toBe(false);
    });
  });
});
