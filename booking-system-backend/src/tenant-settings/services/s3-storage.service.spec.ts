import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3StorageService } from './s3-storage.service';

function buildConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) => values[key] ?? defaultValue),
  } as unknown as ConfigService;
}

describe('S3StorageService', () => {
  it('builds direct virtual-hosted S3 URLs when no public base URL is configured', () => {
    const service = new S3StorageService(
      buildConfig({
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'bukky-public-assets-prod',
        AWS_ACCESS_KEY_ID: 'access-key',
        AWS_SECRET_ACCESS_KEY: 'secret-key',
      }),
    );

    expect(service.getPublicBaseUrl()).toBe(
      'https://bukky-public-assets-prod.s3.us-east-1.amazonaws.com',
    );
    expect(service.buildPublicObjectUrl('tenants/tenant 1/assets/logo/logo final.png')).toBe(
      'https://bukky-public-assets-prod.s3.us-east-1.amazonaws.com/tenants/tenant%201/assets/logo/logo%20final.png',
    );
  });

  it('builds path-style public URLs when path style is explicitly enabled', () => {
    const service = new S3StorageService(
      buildConfig({
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'bukky.public.assets.prod',
        AWS_ACCESS_KEY_ID: 'access-key',
        AWS_SECRET_ACCESS_KEY: 'secret-key',
        AWS_S3_FORCE_PATH_STYLE: 'true',
      }),
    );

    expect(service.getPublicBaseUrl()).toBe(
      'https://s3.us-east-1.amazonaws.com/bukky.public.assets.prod',
    );
  });

  it('rejects CloudFront public asset URLs', () => {
    expect(
      () =>
        new S3StorageService(
          buildConfig({
            AWS_REGION: 'us-east-1',
            AWS_S3_BUCKET: 'bukky-public-assets-prod',
            AWS_ACCESS_KEY_ID: 'access-key',
            AWS_SECRET_ACCESS_KEY: 'secret-key',
            AWS_S3_PUBLIC_BASE_URL: 'https://d111111abcdef8.cloudfront.net',
          }),
        ),
    ).toThrow(ServiceUnavailableException);
  });
});
