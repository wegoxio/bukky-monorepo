import type { Event } from '@sentry/nextjs';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrf-token',
  'csrf',
  'csrf_token',
  'password',
  'current_password',
  'new_password',
  'token',
  'access_token',
  'refresh_token',
  'challenge_token',
  'recovery_code',
  'captcha_token',
  'email',
  'customer_email',
  'phone',
  'customer_phone',
  'notes',
]);

export function isSentryEnabled(): boolean {
  const enabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED?.trim().toLowerCase();
  return enabled !== 'false' && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function getSentryEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development'
  );
}

export function getSentryRelease(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim() ||
    process.env.SENTRY_RELEASE?.trim() ||
    undefined
  );
}

export function getSampleRate(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(parsed, 1));
}

function sanitizeValue(value: unknown, keyHint?: string): unknown {
  if (keyHint && SENSITIVE_KEYS.has(keyHint.toLowerCase())) {
    return '[Filtered]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sanitizeValue(item, key),
    ]),
  );
}

export function sanitizeSentryEvent<TEvent extends Event>(event: TEvent): TEvent | null {
  event.user = event.user?.id ? { id: event.user.id } : undefined;

  if (event.request) {
    event.request.headers = sanitizeValue(event.request.headers) as typeof event.request.headers;
    event.request.cookies = undefined;
    event.request.data = sanitizeValue(event.request.data) as typeof event.request.data;
    event.request.query_string = sanitizeValue(
      event.request.query_string,
    ) as typeof event.request.query_string;
  }

  event.extra = sanitizeValue(event.extra) as typeof event.extra;
  event.contexts = sanitizeValue(event.contexts) as typeof event.contexts;

  return event;
}
