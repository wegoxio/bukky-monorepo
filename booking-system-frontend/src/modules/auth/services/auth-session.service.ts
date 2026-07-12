let inMemoryAccessToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME?.trim() || 'bukky_csrf';
const CSRF_STORAGE_KEY = `${CSRF_COOKIE_NAME}_current`;

function notifyTokenChange(nextToken: string | null): void {
  tokenListeners.forEach((listener) => listener(nextToken));
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStoredCsrfToken(): string | null {
  if (!canUseStorage()) return null;

  const stored = window.localStorage.getItem(CSRF_STORAGE_KEY)?.trim();
  return stored ? stored : null;
}

function writeStoredCsrfToken(token: string | null): void {
  if (!canUseStorage()) return;

  if (!token) {
    window.localStorage.removeItem(CSRF_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(CSRF_STORAGE_KEY, token);
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  notifyTokenChange(inMemoryAccessToken);
}

export function clearSessionTokens(): void {
  inMemoryAccessToken = null;
  writeStoredCsrfToken(null);
  notifyTokenChange(null);
}

export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie ? document.cookie.split(';') : [];
  let matchedToken: string | null = null;
  const encodedCookieName = encodeURIComponent(CSRF_COOKIE_NAME);

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (rawName !== CSRF_COOKIE_NAME && rawName !== encodedCookieName) continue;

    const rawValue = rawValueParts.join('=');
    const decoded = safeDecodeCookieValue(rawValue).trim();
    matchedToken = decoded || null;
  }

  return matchedToken;
}

function safeDecodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function syncCsrfTokenFromCookie(): string | null {
  const cookieToken = getCsrfTokenFromCookie();
  writeStoredCsrfToken(cookieToken);
  return cookieToken;
}

export function getCsrfToken(): string | null {
  const cookieToken = getCsrfTokenFromCookie();
  if (cookieToken) {
    writeStoredCsrfToken(cookieToken);
    return cookieToken;
  }

  return readStoredCsrfToken();
}

export function onAccessTokenChange(listener: (token: string | null) => void): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}
