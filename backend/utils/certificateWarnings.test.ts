import assert from 'node:assert/strict';
import test from 'node:test';
import { getCertificateDateWarnings } from './certificateWarnings';

const now = new Date('2026-10-02T00:00:00Z');

test('warns for any unusually short validity, not only one day', () => {
  for (const days of [1, 2, 7, 30, 89]) {
    const issued = new Date(now);
    const expiry = new Date(now.getTime() + days * 86_400_000);
    assert.match(getCertificateDateWarnings(issued, expiry, now).join(' '), /короткий/);
  }
  assert.equal(getCertificateDateWarnings(now, new Date(now.getTime() + 90 * 86_400_000), now).length, 0);
});

test('warns for very long or already expired certificates', () => {
  assert.match(getCertificateDateWarnings(now, new Date('2032-01-01T00:00:00Z'), now).join(' '), /длинный/);
  assert.match(getCertificateDateWarnings(new Date('2024-01-01T00:00:00Z'), new Date('2025-01-01T00:00:00Z'), now).join(' '), /истёк/);
});
