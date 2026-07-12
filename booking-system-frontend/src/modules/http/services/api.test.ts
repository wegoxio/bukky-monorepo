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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function importApi() {
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test/api');
  vi.stubEnv('NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME', 'bukky_csrf');
  vi.stubEnv('NEXT_PUBLIC_AUTH_CSRF_HEADER_NAME', 'x-csrf-token');
  return import('./api');
}

describe('apiFetch CSRF handling', () => {
  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('adds x-csrf-token and credentials include on POST', async () => {
    stubBrowser('bukky_csrf=csrf-token');
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const { apiFetch } = await importApi();

    await apiFetch('/demo', { method: 'POST', body: JSON.stringify({ ok: true }) });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/demo',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-csrf-token': 'csrf-token',
        }),
      }),
    );
  });

  it('does not add x-csrf-token on GET when no cookie exists', async () => {
    stubBrowser('');
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const { apiFetch } = await importApi();

    await apiFetch('/demo', { method: 'GET' });

    const firstCall = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const init = firstCall[1];
    expect(init.credentials).toBe('include');
    expect(init.headers).not.toHaveProperty('x-csrf-token');
  });

  it('adds x-csrf-token to refresh', async () => {
    stubBrowser('bukky_csrf=csrf-token');
    const fetchMock = vi.fn(async () => jsonResponse(200, { access_token: 'access-token' }));
    vi.stubGlobal('fetch', fetchMock);

    const { refreshAccessTokenWithStoredRefreshToken } = await importApi();

    await refreshAccessTokenWithStoredRefreshToken();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/auth/refresh',
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        headers: {
          'x-csrf-token': 'csrf-token',
        },
      }),
    );
  });

  it('does not create an infinite refresh loop when refresh returns 401', async () => {
    stubBrowser('bukky_csrf=csrf-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }));
    vi.stubGlobal('fetch', fetchMock);

    const { apiFetch } = await importApi();

    await expect(apiFetch('/protected', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.example.test/api/auth/refresh');
  });
});
