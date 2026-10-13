import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { IApiErrorResponse } from '@repo/types';

interface HttpExceptionResponsePayload {
  message?: string | string[];
  error?: string;
  errors?: Record<string, string[]> | string[];
  code?: string;
  limit?: number | null;
  remaining?: number | null;
  resetAt?: string | null;
  [key: string]: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly i18nService: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const i18n = I18nContext.current(host);
    const lang =
      i18n?.lang ||
      (request.headers['x-lang'] as string) ||
      (request.query?.lang as string) ||
      'en';

    const translate = (key: string): string => {
      if (i18n) {
        return i18n.t(key);
      }
      return this.i18nService.t(key, { lang });
    };

    const path = request?.url || '';
    if (
      path.startsWith('/docs') ||
      path.startsWith('/bull-board') ||
      path.includes('/health')
    ) {
      if (exception instanceof HttpException) {
        return response
          .status(exception.getStatus())
          .json(exception.getResponse());
      }
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: translate('common.errors.internalError'),
      });
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = translate('common.errors.internalError');
    let errors: Record<string, string[]> | string[] | undefined = undefined;
    let code: string | undefined = undefined;
    let limit: number | null | undefined = undefined;
    let remaining: number | null | undefined = undefined;
    let resetAt: string | null | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as HttpExceptionResponsePayload;
        if (Array.isArray(resObj.message)) {
          // Typically class-validator messages
          errors = resObj.message;
          message = translate('common.errors.invalidData');
        } else if (typeof resObj.message === 'string') {
          if (
            resObj.message === 'common.errors.invalidData' ||
            resObj.code === 'VALIDATION_FAILED'
          ) {
            message = translate('common.errors.invalidData');
          } else {
            message = resObj.message;
          }
        } else if (typeof resObj.error === 'string') {
          message = resObj.error;
        }

        if (resObj.errors) {
          errors = resObj.errors;
        }

        if (typeof resObj.code === 'string') {
          code = resObj.code;
        }
        if (resObj.limit !== undefined) {
          limit = resObj.limit;
        }
        if (resObj.remaining !== undefined) {
          remaining = resObj.remaining;
        }
        if (resObj.resetAt !== undefined) {
          resetAt = resObj.resetAt;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction
        ? translate('common.errors.internalError')
        : exception.message || message;
    } else {
      this.logger.error(`Unknown Exception: ${JSON.stringify(exception)}`);
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Sentry.captureException(exception);
    }

    const errorPayload: IApiErrorResponse = {
      success: false,
      message,
      statusCode: status,
      errors,
      timestamp: new Date().toISOString(),
      path: request?.url,
      code,
      limit,
      remaining,
      resetAt,
    };

    response.status(status).json(errorPayload);
  }
}
