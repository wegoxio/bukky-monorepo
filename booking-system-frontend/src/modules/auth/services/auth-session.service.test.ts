import { afterEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

function stubBrowser(cookie: string) {
  vi.stubGlobal('document', { cookie });
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
}

describe('auth-session CSRF cookie helpers', () => {
  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reads bukky_csrf from document.cookie', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME', 'bukky_csrf');
    stubBrowser('other=value; bukky_csrf=csrf-token');

    const { getCsrfTokenFromCookie } = await import('./auth-session.service');

    expect(getCsrfTokenFromCookie()).toBe('csrf-token');
  });

  it('does not fail during SSR when document does not exist', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME', 'bukky_csrf');

    const { getCsrfTokenFromCookie } = await import('./auth-session.service');

    expect(getCsrfTokenFromCookie()).toBeNull();
  });

  it('uses NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME', 'custom_csrf');
    stubBrowser('bukky_csrf=wrong; custom_csrf=right');

    const { getCsrfTokenFromCookie } = await import('./auth-session.service');

    expect(getCsrfTokenFromCookie()).toBe('right');
  });
});
