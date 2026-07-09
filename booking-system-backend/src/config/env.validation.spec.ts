import { validateEnv } from './env.validation';

function buildValidEnv(overrides: Record<string, unknown> = {}) {
  return {
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'booking',
    DB_PASSWORD: 'booking-password',
    DB_NAME: 'booking',
    JWT_SECRET: 'a-secure-jwt-secret-for-tests',
    APP_PUBLIC_URL: 'http://localhost:3000',
    CORS_ORIGINS: 'http://localhost:3000',
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('rejects Turnstile enabled without a secret key', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      expect(() =>
        validateEnv(
          buildValidEnv({
            TURNSTILE_ENABLED: 'true',
            TURNSTILE_SECRET_KEY: '',
          }),
        ),
      ).toThrow('Variables de entorno invalidas.');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('accepts Turnstile enabled with a secret key', () => {
    const env = validateEnv(
      buildValidEnv({
        TURNSTILE_ENABLED: 'true',
        TURNSTILE_SECRET_KEY: 'turnstile-secret',
      }),
    );

    expect(env.TURNSTILE_ENABLED).toBe(true);
    expect(env.TURNSTILE_SECRET_KEY).toBe('turnstile-secret');
  });

  it('normalizes empty optional S3 asset URLs', () => {
    const env = validateEnv(
      buildValidEnv({
        AWS_S3_PUBLIC_BASE_URL: '',
        MAIL_ASSET_BASE_URL: '',
      }),
    );

    expect(env.AWS_S3_PUBLIC_BASE_URL).toBeUndefined();
    expect(env.MAIL_ASSET_BASE_URL).toBeUndefined();
  });

  it('rejects CloudFront URLs for public S3 assets', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      expect(() =>
        validateEnv(
          buildValidEnv({
            AWS_S3_PUBLIC_BASE_URL: 'https://d111111abcdef8.cloudfront.net',
          }),
        ),
      ).toThrow('Variables de entorno invalidas.');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
