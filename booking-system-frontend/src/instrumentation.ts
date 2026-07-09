import { isSentryEnabled } from './sentry.shared';

export async function register() {
  if (!isSentryEnabled()) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(...args: unknown[]) {
  if (!isSentryEnabled()) return;

  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...(args as Parameters<typeof Sentry.captureRequestError>));
}
