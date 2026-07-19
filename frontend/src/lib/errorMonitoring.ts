import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export function captureFrontendException(
  error: unknown,
  context: {
    operation: string;
    method?: string;
    endpoint?: string;
    statusCode?: number;
    requestId?: string;
  },
) {
  if (!dsn) return;

  Sentry.withScope((scope) => {
    scope.setTag('operation', context.operation);
    if (context.method) scope.setTag('http.method', context.method);
    if (context.statusCode) scope.setTag('http.status_code', String(context.statusCode));
    if (context.requestId) scope.setTag('request_id', context.requestId);
    if (context.endpoint) scope.setContext('api', { endpoint: context.endpoint });
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

export const errorMonitoringEnabled = Boolean(dsn);
