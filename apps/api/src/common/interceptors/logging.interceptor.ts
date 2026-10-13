import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { sanitizePayload } from '../helpers/sanitize.helper';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const targetUrl = req.originalUrl || req.url || '';
    if (
      targetUrl.startsWith('/docs') ||
      targetUrl.startsWith('/bull-board') ||
      targetUrl.startsWith('/storage') ||
      targetUrl.startsWith('/health') ||
      targetUrl.startsWith('/v1/health')
    ) {
      return next.handle();
    }

    const startTime = Date.now();
    const method = req.method;
    const clientIp = this.getClientIp(req);
    const userAgent = (req.headers?.['user-agent'] as string) || '-';
    const requestId = (req.headers?.['x-request-id'] as string) || undefined;
    const isProduction = process.env.NODE_ENV === 'production';

    const sanitizedBody =
      req.body &&
      typeof req.body === 'object' &&
      Object.keys(req.body).length > 0
        ? sanitizePayload(req.body)
        : undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode || 200;
          const userId = req.user?.id || 'anonymous';

          this.logRequest({
            isProduction,
            method,
            url: targetUrl,
            statusCode,
            duration,
            clientIp,
            userAgent,
            userId,
            requestId,
            body: sanitizedBody,
          });
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const statusCode =
            err?.status ||
            (typeof err?.getStatus === 'function' ? err.getStatus() : 500);
          const userId = req.user?.id || 'anonymous';
          const errorMessage = err?.message || 'Unknown error';

          this.logRequest({
            isProduction,
            method,
            url: targetUrl,
            statusCode,
            duration,
            clientIp,
            userAgent,
            userId,
            requestId,
            body: sanitizedBody,
            error: errorMessage,
          });
        },
      }),
    );
  }

  private getClientIp(req: Request): string {
    const rawForwarded = req.headers?.['x-forwarded-for'];
    if (typeof rawForwarded === 'string') {
      return rawForwarded.split(',')[0].trim();
    }
    if (Array.isArray(rawForwarded) && rawForwarded[0]) {
      return rawForwarded[0].trim();
    }
    return req.socket?.remoteAddress || req.ip || '-';
  }

  private logRequest(params: {
    isProduction: boolean;
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    clientIp: string;
    userAgent: string;
    userId: string;
    requestId?: string;
    body?: unknown;
    error?: string;
  }): void {
    const {
      isProduction,
      method,
      url,
      statusCode,
      duration,
      clientIp,
      userAgent,
      userId,
      requestId,
      body,
      error,
    } = params;

    if (isProduction) {
      const payload: Record<string, unknown> = {
        type: 'HTTP_REQUEST',
        method,
        url,
        statusCode,
        durationMs: duration,
        ip: clientIp,
        userAgent,
        userId,
      };

      if (requestId) payload.requestId = requestId;
      if (body) payload.body = body;
      if (error) payload.error = error;

      const jsonStr = JSON.stringify(payload);
      if (statusCode >= 500) {
        this.logger.error(jsonStr);
      } else if (statusCode >= 400) {
        this.logger.warn(jsonStr);
      } else {
        this.logger.log(jsonStr);
      }
    } else {
      const bodyPart = body ? ` - Body: ${JSON.stringify(body)}` : '';
      const errorPart = error ? ` - Error: ${error}` : '';
      const message = `[${method}] ${url} ${statusCode} +${duration}ms - IP: ${clientIp} - User: ${userId} - UA: ${userAgent}${bodyPart}${errorPart}`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    }
  }
}
