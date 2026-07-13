import { describe, expect, it } from 'vitest';
import {
  formatDateRu,
  formatDateTimeRu,
  formatOptionalDateRu,
  formatTimeRu,
} from './dateFormat';

describe('dateFormat', () => {
  it('formats dates in the application timezone', () => {
    expect(formatDateRu('2026-07-13T12:00:00.000Z')).toBe('13.07.2026');
  });

  it('handles a timestamp crossing midnight in Moscow', () => {
    expect(formatDateTimeRu('2026-01-01T21:30:00.000Z')).toBe('02.01.2026, 00:30');
    expect(formatTimeRu('2026-01-01T21:30:00.000Z')).toBe('00:30');
  });

  it('uses a consistent fallback for missing and invalid values', () => {
    expect(formatDateRu(null)).toBe('—');
    expect(formatDateTimeRu('invalid')).toBe('—');
    expect(formatDateRu(undefined, '-')).toBe('-');
  });

  it('returns null when optional UI should hide a missing date', () => {
    expect(formatOptionalDateRu('')).toBeNull();
    expect(formatOptionalDateRu('2026-07-13')).toBe('13.07.2026');
  });

  it('keeps a calendar date independent of the browser timezone', () => {
    expect(formatDateRu('2026-01-01')).toBe('01.01.2026');
    expect(formatDateTimeRu('2026-01-01')).toBe('01.01.2026, 00:00');
  });

  it('rejects impossible calendar dates', () => {
    expect(formatDateRu('2026-02-29')).toBe('—');
    expect(formatDateRu('2024-02-29')).toBe('29.02.2024');
  });
});
