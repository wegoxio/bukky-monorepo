import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { setupSwagger } from './swagger';
import type { Express } from 'express';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

const PORT = Number(process.env.PORT ?? 8080);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV', 'development') === 'production';

  const allowedOrigins = configService
    .get<string[]>('CORS_ORIGINS', ['http://localhost:3000'])
    .map(normalizeOrigin);
  const allowedOriginSet = new Set(allowedOrigins);

  const corsAllowCredentials = configService.get<boolean>('CORS_ALLOW_CREDENTIALS', true);
  const corsAllowedHeaders = configService.get<string[]>('CORS_ALLOWED_HEADERS', [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
  ]);
  const corsAllowedMethods = configService.get<string[]>('CORS_ALLOWED_METHODS', [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ]);
  const corsMaxAgeSeconds = configService.get<number>('CORS_MAX_AGE_SECONDS', 600);

  if (isProduction && allowedOriginSet.size === 0) {
    throw new Error('CORS_ORIGINS no puede estar vacio en produccion.');
  }

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', configService.get<number>('TRUST_PROXY_HOPS', 1));
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  );

  app.setGlobalPrefix('api');
  const corsOptions: CorsOptions = {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(origin);
      if (allowedOriginSet.has(normalized)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origen no permitido por CORS: ${origin}`), false);
    },
    methods: corsAllowedMethods,
    credentials: corsAllowCredentials,
    allowedHeaders: corsAllowedHeaders,
    optionsSuccessStatus: 204,
    maxAge: corsMaxAgeSeconds,
  };

  app.enableCors(corsOptions);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);

  await app.listen(PORT, '0.0.0.0');
}
void bootstrap();
