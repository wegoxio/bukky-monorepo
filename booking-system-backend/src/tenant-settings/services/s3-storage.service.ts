import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type UploadObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

@Injectable()
export class S3StorageService {
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string | null;
  private readonly region: string | null;
  private readonly publicBaseUrl: string | null;
  private readonly forcePathStyle: boolean;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION')?.trim() || null;
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET')?.trim() || null;
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const sessionToken = this.configService.get<string>('AWS_SESSION_TOKEN');
    this.forcePathStyle = this.envBool(this.configService.get('AWS_S3_FORCE_PATH_STYLE'), false);

    this.region = region;
    this.bucketName = bucketName;
    this.publicBaseUrl = this.resolvePublicBaseUrl();

    if (!region || !bucketName || !accessKeyId || !secretAccessKey) {
      this.s3Client = null;
      return;
    }

    this.s3Client = new S3Client({
      region,
      forcePathStyle: this.forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
    });
  }

  async uploadObject(input: UploadObjectInput): Promise<string> {
    this.ensureConfigured();
    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: this.bucketName!,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentDisposition: 'inline',
        CacheControl: 'public, max-age=31536000, immutable',
        ServerSideEncryption: 'AES256',
      }),
    );

    return this.buildPublicObjectUrl(input.key);
  }

  async deleteObject(key: string): Promise<void> {
    if (!key) return;
    this.ensureConfigured();
    await this.s3Client!.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      }),
    );
  }

  buildPublicObjectUrl(key: string): string {
    const publicBaseUrl = this.getPublicBaseUrl();
    if (!publicBaseUrl) {
      throw new ServiceUnavailableException(
        'S3 public URL is not configured. Set AWS_REGION and AWS_S3_BUCKET.',
      );
    }

    return `${publicBaseUrl}/${this.encodeS3KeyForUrl(key)}`;
  }

  getPublicBaseUrl(): string | null {
    return this.publicBaseUrl;
  }

  private resolvePublicBaseUrl(): string | null {
    const configuredBaseUrl = this.configService.get<string>('AWS_S3_PUBLIC_BASE_URL')?.trim();
    if (configuredBaseUrl) {
      return this.normalizePublicBaseUrl(configuredBaseUrl, 'AWS_S3_PUBLIC_BASE_URL');
    }

    if (!this.bucketName || !this.region) {
      return null;
    }

    if (this.forcePathStyle) {
      return `https://s3.${this.region}.amazonaws.com/${this.bucketName}`;
    }

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;
  }

  private ensureConfigured(): void {
    if (!this.s3Client || !this.bucketName || !this.region) {
      throw new ServiceUnavailableException(
        'S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
      );
    }
  }

  private normalizePublicBaseUrl(value: string, variableName: string): string {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new ServiceUnavailableException(`${variableName} must be a valid absolute URL.`);
    }

    if (parsed.protocol !== 'https:') {
      throw new ServiceUnavailableException(`${variableName} must use https.`);
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname.endsWith('.cloudfront.net')) {
      throw new ServiceUnavailableException(
        `${variableName} must point directly to S3. CloudFront URLs are intentionally not allowed for public assets.`,
      );
    }

    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.search = '';
    parsed.hash = '';

    return parsed.toString().replace(/\/+$/, '');
  }

  private encodeS3KeyForUrl(key: string): string {
    return key
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  private envBool(value: unknown, defaultValue = false): boolean {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string' && typeof value !== 'number') return defaultValue;
    const normalized = `${value}`.trim().toLowerCase();
    return ['true', '1', 'yes'].includes(normalized);
  }
}
