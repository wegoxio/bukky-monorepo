import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

type RequestWithRoute = Request & {
  route?: {
    path?: string;
  };
};

@Injectable()
export class HttpPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpPerformanceInterceptor.name);

  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const enabled = this.configService.get<boolean>('PERFORMANCE_LOG_ENABLED', true);

    if (!enabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithRoute>();
    const response = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    const method = request.method;
    const routePath =
      request.route?.path ??
      request.originalUrl?.split('?')[0] ??
      request.url?.split('?')[0] ??
      'unknown';

    return next.handle().pipe(
      tap(() => {
        this.logRequest({
          method,
          routePath,
          statusCode: response.statusCode,
          startedAt,
        });
      }),
      catchError((error: unknown) => {
        this.logRequest({
          method,
          routePath,
          statusCode: response.statusCode >= 400 ? response.statusCode : 500,
          startedAt,
          failed: true,
        });
        return throwError(() => error);
      }),
    );
  }

  private logRequest(input: {
    method: string;
    routePath: string;
    statusCode: number;
    startedAt: bigint;
    failed?: boolean;
  }) {
    const durationMs = Number(process.hrtime.bigint() - input.startedAt) / 1e6;
    const slowThresholdMs = this.configService.get<number>('PERFORMANCE_SLOW_REQUEST_MS', 750);
    const logAll = this.configService.get<boolean>('PERFORMANCE_LOG_ALL_REQUESTS', false);
    const isSlow = durationMs >= slowThresholdMs;

    if (!logAll && !isSlow && !input.failed) {
      return;
    }

    const payload = {
      method: input.method,
      route: input.routePath,
      statusCode: input.statusCode,
      durationMs: Math.round(durationMs),
      slow: isSlow,
      failed: Boolean(input.failed),
    };

    if (input.failed || input.statusCode >= 500) {
      this.logger.warn(payload);
      return;
    }

    if (isSlow) {
      this.logger.warn(payload);
      return;
    }

    this.logger.log(payload);
  }
}
