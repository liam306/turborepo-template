import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IApiResponse, IPaginatedResponse } from '@repo/types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  IApiResponse<T> | IPaginatedResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<IApiResponse<T> | IPaginatedResponse<unknown>> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    // Skip wrapping for swagger docs, bull-board, static assets, health probes, or SSE streams
    const path = req?.url || '';
    const acceptHeader = req?.headers?.['accept'] || '';
    if (
      path.startsWith('/docs') ||
      path.startsWith('/bull-board') ||
      path.startsWith('/storage') ||
      path.includes('/health') ||
      path.includes('/notifications/stream') ||
      acceptHeader.includes('text/event-stream')
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((result) => {
        // If result is already structured
        if (result && typeof result === 'object') {
          // If already has both data and pagination
          if ('data' in result && 'pagination' in result) {
            return {
              success: true,
              message: result.message,
              data: result.data,
              pagination: result.pagination,
            } as IPaginatedResponse<unknown>;
          }

          // If result explicitly has success and data
          if ('success' in result && 'data' in result) {
            return result as IApiResponse<T>;
          }

          // If result is an object with message and data
          if ('message' in result && 'data' in result) {
            return {
              success: true,
              message: result.message,
              data: result.data,
            } as IApiResponse<T>;
          }

          // If result is an object with only message: { message: '...' }
          if (
            'message' in result &&
            typeof result.message === 'string' &&
            Object.keys(result).length === 1
          ) {
            return {
              success: true,
              message: result.message,
              data: null as unknown as T,
            } as IApiResponse<T>;
          }
        }

        // Default single item or array without pagination wrapper
        return {
          success: true,
          data: result,
        } as IApiResponse<T>;
      }),
    );
  }
}
