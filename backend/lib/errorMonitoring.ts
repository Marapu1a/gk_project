import * as Sentry from '@sentry/node';
import type { FastifyBaseLogger } from 'fastify';

type OperationalContext = Record<string, string | number | boolean | null | undefined>;

let logger: FastifyBaseLogger | null = null;
let sentryEnabled = false;

export function initializeErrorMonitoring() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });

  sentryEnabled = true;
  return true;
}

export function setOperationalLogger(nextLogger: FastifyBaseLogger) {
  logger = nextLogger;
}

export function reportOperationalFailure(
  operation: string,
  error: unknown,
  context: OperationalContext = {},
  requestLogger?: FastifyBaseLogger,
) {
  const activeLogger = requestLogger ?? logger;
  activeLogger?.error({ err: error, operation, ...context }, `${operation} failed`);

  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    scope.setTag('operation', operation);
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) scope.setTag(key, String(value));
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

export function reportOperationalWarning(
  operation: string,
  message: string,
  context: OperationalContext = {},
  requestLogger?: FastifyBaseLogger,
) {
  const activeLogger = requestLogger ?? logger;
  activeLogger?.warn({ operation, ...context }, message);

  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    scope.setTag('operation', operation);
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) scope.setTag(key, String(value));
    }
    Sentry.captureMessage(message);
  });
}

export function isErrorMonitoringEnabled() {
  return sentryEnabled;
}
