import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSchedulerHealth } from './monitoringState';

const STARTED_AT = Date.UTC(2026, 6, 19, 10, 0, 0);

test('scheduler is starting during startup grace period', () => {
  const health = evaluateSchedulerHealth(
    { lastAttemptAt: null, lastSuccessAt: null, lastErrorAt: null },
    STARTED_AT,
    new Date(STARTED_AT + 60_000),
  );

  assert.equal(health.status, 'starting');
});

test('scheduler reports the last failed attempt', () => {
  const failedAt = new Date(STARTED_AT + 10_000);
  const health = evaluateSchedulerHealth(
    { lastAttemptAt: failedAt, lastSuccessAt: null, lastErrorAt: failedAt },
    STARTED_AT,
    new Date(STARTED_AT + 20_000),
  );

  assert.equal(health.status, 'failed');
  assert.equal(health.lastAttemptAt, failedAt.toISOString());
});

test('scheduler becomes stale after 26 hours without success', () => {
  const successAt = new Date(STARTED_AT + 1_000);
  const health = evaluateSchedulerHealth(
    { lastAttemptAt: successAt, lastSuccessAt: successAt, lastErrorAt: null },
    STARTED_AT,
    new Date(successAt.getTime() + 26 * 60 * 60 * 1000 + 1),
  );

  assert.equal(health.status, 'stale');
});

test('scheduler is healthy after a recent successful run', () => {
  const successAt = new Date(STARTED_AT + 1_000);
  const health = evaluateSchedulerHealth(
    { lastAttemptAt: successAt, lastSuccessAt: successAt, lastErrorAt: null },
    STARTED_AT,
    new Date(successAt.getTime() + 60 * 60 * 1000),
  );

  assert.equal(health.status, 'ok');
});
