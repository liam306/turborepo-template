import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  function createMockContext(url: string, acceptHeader = ''): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          url,
          headers: {
            accept: acceptHeader,
          },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  function createMockHandler(data: unknown): CallHandler {
    return {
      handle: () => of(data),
    };
  }

  describe('skip conditions', () => {
    it.each([
      ['/docs/swagger'],
      ['/bull-board/queues'],
      ['/storage/avatars/1.webp'],
      ['/health'],
      ['/notifications/stream'],
    ])('skips wrapping for exempt route: %s', async (url) => {
      const ctx = createMockContext(url);
      const rawData = { custom: 'raw-data' };
      const handler = createMockHandler(rawData);

      const result = await lastValueFrom(interceptor.intercept(ctx, handler));
      expect(result).toBe(rawData);
    });

    it('skips wrapping for text/event-stream accept header', async () => {
      const ctx = createMockContext('/events', 'text/event-stream');
      const rawData = 'event: message\ndata: ping\n\n';
      const handler = createMockHandler(rawData);

      const result = await lastValueFrom(interceptor.intercept(ctx, handler));
      expect(result).toBe(rawData);
    });
  });

  describe('response transformations', () => {
    it('wraps paginated result', async () => {
      const ctx = createMockContext('/users');
      const paginatedInput = {
        data: [{ id: '1' }],
        pagination: { page: 1, limit: 10, total: 1 },
        message: 'Loaded',
      };
      const handler = createMockHandler(paginatedInput);

      const result = await lastValueFrom(interceptor.intercept(ctx, handler));
      expect(result).toEqual({
        success: true,
        message: 'Loaded',
        data: [{ id: '1' }],
        pagination: { page: 1, limit: 10, total: 1 },
      });
    });

    it('preserves response when success and data already exist', async () => {
      const ctx = createMockContext('/auth/me');
      const input = { success: true, data: { name: 'Alice' } };
      const handler = createMockHandler(input);

      const result = await lastValueFrom(interceptor.intercept(ctx, handler));
      expect(result).toEqual(input);
    });

    it('wraps object with message and data', async () => {
      const ctx = createMockContext('/items');
      const input = { message: 'Item created', data: { id: 10 } };
      const handler = createMockHandler(input);

      const result = await lastValueFrom(interceptor.intercept(ctx, handler));
      expect(result).toEqual({
        success: true,
        message: 'Item created',
        data: { id: 10 },
      });
    });

    it('wraps object with only message', async () => {
      const ctx = createMockContext('/logout');
      const input = { message: 'Logged out successfully' };
      const handler = createMockHandler(input);

      const result = await lastValueFrom(interceptor.intercept(ctx, handler));
      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully',
        data: null,
      });
    });

    it('wraps raw primitive or plain payload in standard envelope', async () => {
      const ctx = createMockContext('/status');
      const input = 'ok';
      const handler = createMockHandler(input);

      const result = await lastValueFrom(interceptor.intercept(ctx, handler));
      expect(result).toEqual({
        success: true,
        data: 'ok',
      });
    });
  });
});
