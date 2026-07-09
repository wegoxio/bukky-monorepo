import * as Sentry from '@sentry/nextjs';
import {
  getSampleRate,
  getSentryEnvironment,
  getSentryRelease,
  isSentryEnabled,
  sanitizeSentryEvent,
} from './sentry.shared';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: isSentryEnabled(),
  environment: getSentryEnvironment(),
  release: getSentryRelease(),
  sendDefaultPii: false,
  tracesSampleRate: getSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    process.env.NODE_ENV === 'production' ? 0.02 : 0.2,
  ),
  beforeSend: sanitizeSentryEvent,
});
