import { describe, expect, it } from 'vitest';
import {
  formatDecimalInput,
  normalizeDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from './decimalInput';

describe('decimalInput', () => {
  it('keeps a comma in the UI and accepts a dot as an alternative input', () => {
    expect(sanitizeDecimalInput('0,5')).toBe('0,5');
    expect(sanitizeDecimalInput('0.5')).toBe('0,5');
  });

  it('parses comma-separated values for calculations and API payloads', () => {
    expect(parseDecimalInput('12,75')).toBe(12.75);
  });

  it('normalizes empty and capped values', () => {
    expect(normalizeDecimalInput('')).toBe('0');
    expect(normalizeDecimalInput('3,75', { max: 2.5 })).toBe('2,5');
  });

  it('formats calculated values with a comma', () => {
    expect(formatDecimalInput(10.5)).toBe('10,5');
    expect(formatDecimalInput(10)).toBe('10');
  });

  it('rejects extra decimal places and repeated separators', () => {
    expect(sanitizeDecimalInput('1,234')).toBeNull();
    expect(sanitizeDecimalInput('1,2,3')).toBeNull();
  });
});
