const SCHEDULER_STALE_AFTER_MS = 26 * 60 * 60 * 1000;
const SCHEDULER_STARTUP_GRACE_MS = 5 * 60 * 1000;
const processStartedAt = Date.now();

let certificateLifecycleLastAttemptAt: Date | null = null;
let certificateLifecycleLastSuccessAt: Date | null = null;
let certificateLifecycleLastErrorAt: Date | null = null;

export type SchedulerSnapshot = {
  lastAttemptAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
};

export function markCertificateLifecycleSuccess(now = new Date()) {
  certificateLifecycleLastAttemptAt = now;
  certificateLifecycleLastSuccessAt = now;
  certificateLifecycleLastErrorAt = null;
}

export function markCertificateLifecycleFailure(now = new Date()) {
  certificateLifecycleLastAttemptAt = now;
  certificateLifecycleLastErrorAt = now;
}

export function evaluateSchedulerHealth(
  snapshot: SchedulerSnapshot,
  startedAt: number,
  now = new Date(),
) {
  if (!snapshot.lastAttemptAt) {
    const starting = now.getTime() - startedAt < SCHEDULER_STARTUP_GRACE_MS;
    return {
      status: starting ? 'starting' : 'failed',
      lastAttemptAt: null,
      lastSuccessAt: null,
    };
  }

  if (snapshot.lastErrorAt) {
    return {
      status: 'failed',
      lastAttemptAt: snapshot.lastAttemptAt.toISOString(),
      lastSuccessAt: snapshot.lastSuccessAt?.toISOString() ?? null,
    };
  }

  const stale =
    !snapshot.lastSuccessAt ||
    now.getTime() - snapshot.lastSuccessAt.getTime() > SCHEDULER_STALE_AFTER_MS;

  return {
    status: stale ? 'stale' : 'ok',
    lastAttemptAt: snapshot.lastAttemptAt.toISOString(),
    lastSuccessAt: snapshot.lastSuccessAt?.toISOString() ?? null,
  };
}

export function getCertificateLifecycleHealth(now = new Date()) {
  return evaluateSchedulerHealth(
    {
      lastAttemptAt: certificateLifecycleLastAttemptAt,
      lastSuccessAt: certificateLifecycleLastSuccessAt,
      lastErrorAt: certificateLifecycleLastErrorAt,
    },
    processStartedAt,
    now,
  );
}
