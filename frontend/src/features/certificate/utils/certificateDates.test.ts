import { describe, expect, it } from 'vitest';
import {
  formatCertificateDate,
  toCertificateDateInputValue,
} from './certificateDates';

describe('certificateDates', () => {
  it('keeps a date-only value as the same calendar day', () => {
    expect(formatCertificateDate('2026-07-13')).toBe('13.07.2026');
    expect(toCertificateDateInputValue('2026-07-13')).toBe('2026-07-13');
  });

  it('restores the Moscow calendar date from the stored issue boundary', () => {
    const startOfMoscowDay = '2026-07-12T21:00:00.000Z';

    expect(formatCertificateDate(startOfMoscowDay)).toBe('13.07.2026');
    expect(toCertificateDateInputValue(startOfMoscowDay)).toBe('2026-07-13');
  });

  it('restores the Moscow calendar date from the stored expiry boundary', () => {
    const endOfMoscowDay = '2026-07-13T20:59:59.999Z';

    expect(formatCertificateDate(endOfMoscowDay)).toBe('13.07.2026');
    expect(toCertificateDateInputValue(endOfMoscowDay)).toBe('2026-07-13');
  });

  it('uses safe fallbacks for missing and invalid values', () => {
    expect(formatCertificateDate(null)).toBe('—');
    expect(toCertificateDateInputValue('invalid')).toBe('');
  });
});
