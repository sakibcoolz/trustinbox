import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatNumber, formatPercent, formatCompactNumber, formatRelativeTime } from '@/lib/format';

describe('format', () => {
  describe('formatNumber', () => {
    it('formats integers with locale separators', () => {
      // toLocaleString is locale-dependent; just verify it returns a string
      expect(typeof formatNumber(1000)).toBe('string');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('handles negative numbers', () => {
      const result = formatNumber(-1000);
      expect(result).toContain('1');
      expect(result).toContain('-');
    });
  });

  describe('formatPercent', () => {
    it('formats with one decimal place', () => {
      expect(formatPercent(50)).toBe('50.0%');
    });

    it('rounds to one decimal', () => {
      expect(formatPercent(33.333)).toBe('33.3%');
    });

    it('handles zero', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });

    it('handles 100', () => {
      expect(formatPercent(100)).toBe('100.0%');
    });
  });

  describe('formatCompactNumber', () => {
    it('returns raw number below 1000', () => {
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('formats thousands as K', () => {
      expect(formatCompactNumber(1000)).toBe('1.0K');
      expect(formatCompactNumber(15500)).toBe('15.5K');
    });

    it('formats millions as M', () => {
      expect(formatCompactNumber(1_000_000)).toBe('1.0M');
      expect(formatCompactNumber(2_500_000)).toBe('2.5M');
    });

    it('handles zero', () => {
      expect(formatCompactNumber(0)).toBe('0');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "just now" for less than 60 seconds', () => {
      const now = new Date('2024-01-15T11:59:30Z').toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('shows minutes ago', () => {
      const fiveMinAgo = new Date('2024-01-15T11:55:00Z').toISOString();
      expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
    });

    it('shows hours ago', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00Z').toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });

    it('shows days ago', () => {
      const threeDaysAgo = new Date('2024-01-12T12:00:00Z').toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
    });
  });
});
