import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CERTIFICATE_SUSPENSION_MS,
  getCertificateSuspensionBoundary,
  getCertificateRegistryStatus,
} from './certificateLifecycle';

const expiresAt = new Date('2026-02-14T20:59:59.999Z');

test('certificate remains active through its expiration boundary', () => {
  assert.equal(getCertificateRegistryStatus(expiresAt, expiresAt), 'ACTIVE');
});

test('certificate is suspended immediately after expiration', () => {
  const now = new Date(expiresAt.getTime() + 1);
  assert.equal(getCertificateRegistryStatus(expiresAt, now), 'SUSPENDED');
});

test('certificate stays suspended for exactly 60 days', () => {
  const now = new Date(expiresAt.getTime() + CERTIFICATE_SUSPENSION_MS);
  assert.equal(getCertificateRegistryStatus(expiresAt, now), 'SUSPENDED');
});

test('certificate leaves the public specialist registry after 60 days', () => {
  const now = new Date(expiresAt.getTime() + CERTIFICATE_SUSPENSION_MS + 1);
  assert.equal(getCertificateRegistryStatus(expiresAt, now), 'GRACE_EXPIRED');
});

test('renewal and registry checks use the same 60 day boundary', () => {
  const now = new Date('2026-04-15T20:59:59.999Z');
  assert.equal(getCertificateSuspensionBoundary(now).getTime(), expiresAt.getTime());
});
