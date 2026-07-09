import {
  getSampleRate,
  getSentryEnvironment,
  getSentryRelease,
  isSentryEnabled,
  sanitizeSentryEvent,
} from './sentry.shared';

if (isSentryEnabled()) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: true,
      environment: getSentryEnvironment(),
      release: getSentryRelease(),
      sendDefaultPii: false,
      tracesSampleRate: getSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
        process.env.NODE_ENV === 'production' ? 0.02 : 0.2,
      ),
      beforeSend: sanitizeSentryEvent,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
      ],
      replaysSessionSampleRate: getSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
        0,
      ),
      replaysOnErrorSampleRate: getSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
        process.env.NODE_ENV === 'production' ? 0.1 : 1,
      ),
    });
  });
}

export function onRouterTransitionStart(...args: unknown[]) {
  if (!isSentryEnabled()) return;

  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.captureRouterTransitionStart(
      ...(args as Parameters<typeof Sentry.captureRouterTransitionStart>),
    );
  });
}
