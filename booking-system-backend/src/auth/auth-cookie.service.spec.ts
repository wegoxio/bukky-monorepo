import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthCookieService } from './auth-cookie.service';

type CookieCall = {
  name: string;
  value?: string;
  options: Record<string, unknown>;
};

function createResponseMock() {
  const cookieCalls: CookieCall[] = [];
  const clearCookieCalls: CookieCall[] = [];
  const response = {
    cookie: jest.fn((name: string, value: string, options: Record<string, unknown>) => {
      cookieCalls.push({ name, value, options });
      return response;
    }),
    clearCookie: jest.fn((name: string, options: Record<string, unknown>) => {
      clearCookieCalls.push({ name, options });
      return response;
    }),
  } as unknown as Response;

  return { response, cookieCalls, clearCookieCalls };
}

function createService(config: Record<string, unknown>) {
  return new AuthCookieService(new ConfigService(config));
}

function findCookieCall(calls: CookieCall[], name: string): CookieCall {
  const call = calls.find((item) => item.name === name);
  if (!call) {
    throw new Error(`Expected cookie call for ${name}`);
  }
  return call;
}

function findCookieClearCall(
  calls: CookieCall[],
  name: string,
  domain: string | undefined,
  path: string,
): CookieCall {
  const call = calls.find(
    (item) => item.name === name && item.options.domain === domain && item.options.path === path,
  );
  if (!call) {
    throw new Error(
      `Expected clearCookie call for ${name} domain=${domain ?? 'host-only'} path=${path}`,
    );
  }
  return call;
}

function createRequest(input: {
  cookies?: Record<string, string>;
  cookieHeader?: string;
  csrfHeader?: string;
}): Request {
  return {
    cookies: input.cookies ?? {},
    headers: input.cookieHeader ? { cookie: input.cookieHeader } : {},
    header: (name: string) =>
      name.toLowerCase() === 'x-csrf-token' ? input.csrfHeader : undefined,
  } as unknown as Request;
}

describe('AuthCookieService', () => {
  it('keeps SameSite=lax by default in production', () => {
    const { response, cookieCalls } = createResponseMock();
    const service = createService({
      NODE_ENV: 'production',
    });

    service.setAuthCookies(
      response,
      'refresh-token',
      new Date('2026-01-01T00:00:00Z'),
      'csrf-token',
    );

    expect(findCookieCall(cookieCalls, 'bukky_refresh').options).toMatchObject({
      sameSite: 'lax',
      secure: true,
    });
    expect(findCookieCall(cookieCalls, 'bukky_csrf').options).toMatchObject({
      sameSite: 'lax',
      secure: true,
    });
  });

  it('keeps SameSite=lax and secure=false by default in development', () => {
    const { response, cookieCalls } = createResponseMock();
    const service = createService({
      NODE_ENV: 'development',
    });

    service.setAuthCookies(
      response,
      'refresh-token',
      new Date('2026-01-01T00:00:00Z'),
      'csrf-token',
    );

    expect(findCookieCall(cookieCalls, 'bukky_refresh').options).toMatchObject({
      sameSite: 'lax',
      secure: false,
    });
    expect(findCookieCall(cookieCalls, 'bukky_csrf').options).toMatchObject({
      sameSite: 'lax',
      secure: false,
    });
  });

  it('rejects SameSite=none when secure cookies are disabled', () => {
    expect(() =>
      createService({
        NODE_ENV: 'production',
        AUTH_REFRESH_COOKIE_SAME_SITE: 'none',
        AUTH_REFRESH_COOKIE_SECURE: false,
      }),
    ).toThrow('AUTH_REFRESH_COOKIE_SAME_SITE=none requiere AUTH_REFRESH_COOKIE_SECURE=true');
  });

  it('creates refresh and CSRF cookies with separate domains and paths', () => {
    const { response, cookieCalls } = createResponseMock();
    const service = createService({
      NODE_ENV: 'production',
      AUTH_REFRESH_COOKIE_DOMAIN: 'api.bukky.wegox.io',
      AUTH_CSRF_COOKIE_DOMAIN: 'bukky.wegox.io',
      AUTH_REFRESH_COOKIE_PATH: '/api/auth',
      AUTH_CSRF_COOKIE_PATH: '/',
      AUTH_REFRESH_COOKIE_SAME_SITE: 'lax',
      AUTH_REFRESH_COOKIE_SECURE: true,
    });

    service.setAuthCookies(
      response,
      'refresh-token',
      new Date('2026-01-01T00:00:00Z'),
      'csrf-token',
    );

    const refreshCookie = findCookieCall(cookieCalls, 'bukky_refresh');
    expect(refreshCookie.value).toBe('refresh-token');
    expect(refreshCookie.options).toMatchObject({
      domain: 'api.bukky.wegox.io',
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'lax',
      secure: true,
    });

    const csrfCookie = findCookieCall(cookieCalls, 'bukky_csrf');
    expect(csrfCookie.value).toBe('csrf-token');
    expect(csrfCookie.options).toMatchObject({
      domain: 'bukky.wegox.io',
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });

  it('omits domain when optional domains are empty', () => {
    const { response, cookieCalls } = createResponseMock();
    const service = createService({
      NODE_ENV: 'development',
      AUTH_REFRESH_COOKIE_DOMAIN: '   ',
      AUTH_CSRF_COOKIE_DOMAIN: '',
    });

    service.setAuthCookies(
      response,
      'refresh-token',
      new Date('2026-01-01T00:00:00Z'),
      'csrf-token',
    );

    expect(cookieCalls.find((call) => call.name === 'bukky_refresh')?.options).not.toHaveProperty(
      'domain',
    );
    expect(cookieCalls.find((call) => call.name === 'bukky_csrf')?.options).not.toHaveProperty(
      'domain',
    );
  });

  it('clears refresh with refresh domain and CSRF with CSRF domain plus legacy refresh domain', () => {
    const { response, clearCookieCalls } = createResponseMock();
    const service = createService({
      NODE_ENV: 'production',
      AUTH_REFRESH_COOKIE_DOMAIN: 'api.bukky.wegox.io',
      AUTH_CSRF_COOKIE_DOMAIN: 'bukky.wegox.io',
      AUTH_REFRESH_COOKIE_PATH: '/api/auth',
      AUTH_CSRF_COOKIE_PATH: '/',
      AUTH_REFRESH_COOKIE_SAME_SITE: 'lax',
      AUTH_REFRESH_COOKIE_SECURE: true,
    });

    service.clearAuthCookies(response);

    expect(
      findCookieClearCall(clearCookieCalls, 'bukky_refresh', 'api.bukky.wegox.io', '/api/auth')
        .options,
    ).toMatchObject({
      httpOnly: true,
    });
    expect(
      findCookieClearCall(clearCookieCalls, 'bukky_csrf', 'bukky.wegox.io', '/').options,
    ).toMatchObject({
      httpOnly: false,
    });
    expect(
      findCookieClearCall(clearCookieCalls, 'bukky_csrf', 'api.bukky.wegox.io', '/').options,
    ).toMatchObject({
      httpOnly: false,
    });
  });

  it('accepts CSRF header when duplicate CSRF cookies exist and one matches', () => {
    const service = createService({
      NODE_ENV: 'development',
      AUTH_CSRF_COOKIE_NAME: 'bukky_csrf',
    });

    const req = createRequest({
      cookies: {
        bukky_csrf: 'legacy-token',
      },
      cookieHeader: 'bukky_csrf=legacy-token; bukky_csrf=current-token',
      csrfHeader: 'current-token',
    });

    expect(() => service.assertCsrfToken(req)).not.toThrow();
  });

  it('rejects CSRF validation without header', () => {
    const service = createService({ NODE_ENV: 'development' });

    expect(() =>
      service.assertCsrfToken(
        createRequest({
          cookies: { bukky_csrf: 'csrf-token' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects CSRF validation without cookie', () => {
    const service = createService({ NODE_ENV: 'development' });

    expect(() =>
      service.assertCsrfToken(
        createRequest({
          csrfHeader: 'csrf-token',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects CSRF validation with different cookie and header values', () => {
    const service = createService({ NODE_ENV: 'development' });

    expect(() =>
      service.assertCsrfToken(
        createRequest({
          cookies: { bukky_csrf: 'cookie-token' },
          csrfHeader: 'header-token',
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
