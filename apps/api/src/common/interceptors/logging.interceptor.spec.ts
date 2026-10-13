import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    loggerLogSpy = jest
      .spyOn((interceptor as any).logger, 'log')
      .mockImplementation(() => {});
    loggerWarnSpy = jest
      .spyOn((interceptor as any).logger, 'warn')
      .mockImplementation(() => {});
    loggerErrorSpy = jest
      .spyOn((interceptor as any).logger, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    req: Record<string, any>,
    res: Record<string, any>,
    type = 'http',
  ) => {
    return {
      getType: () => type,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response$: any): CallHandler => ({
    handle: () => response$,
  });

  it('should ignore non-http execution contexts', (done) => {
    const mockContext = createMockContext({}, {}, 'rpc');
    const mockHandler = createMockCallHandler(of('result'));

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(val).toBe('result');
        expect(loggerLogSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should skip documentation and storage paths', (done) => {
    const req = { url: '/docs', method: 'GET' };
    const res = { statusCode: 200 };
    const mockContext = createMockContext(req, res);
    const mockHandler = createMockCallHandler(of('docs-html'));

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => {
        expect(loggerLogSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should skip health check paths', (done) => {
    const req = { url: '/v1/health', method: 'GET' };
    const res = { statusCode: 200 };
    const mockContext = createMockContext(req, res);
    const mockHandler = createMockCallHandler(of({ status: 'ok' }));

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => {
        expect(loggerLogSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should log successful requests with sanitized body, ip, and user details', (done) => {
    const req = {
      method: 'POST',
      url: '/v1/users',
      originalUrl: '/v1/users',
      headers: {
        'user-agent': 'Jest-Agent',
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
      user: { id: 'usr_123' },
      body: {
        email: 'john@example.com',
        password: 'secretPassword123',
      },
    };
    const res = { statusCode: 201 };
    const mockContext = createMockContext(req, res);
    const mockHandler = createMockCallHandler(of({ id: 'usr_123' }));

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => {
        expect(loggerLogSpy).toHaveBeenCalledTimes(1);
        const loggedMsg = loggerLogSpy.mock.calls[0][0];
        expect(loggedMsg).toContain('[POST] /v1/users 201');
        expect(loggedMsg).toContain('IP: 192.168.1.1');
        expect(loggedMsg).toContain('User: usr_123');
        expect(loggedMsg).toContain('UA: Jest-Agent');
        expect(loggedMsg).toContain('"email":"john@example.com"');
        expect(loggedMsg).toContain('"password":"***"');
        done();
      },
    });
  });

  it('should log warning for 4xx errors', (done) => {
    const req = {
      method: 'GET',
      url: '/v1/items/999',
      headers: {},
      ip: '127.0.0.1',
    };
    const res = { statusCode: 200 };
    const mockContext = createMockContext(req, res);
    const error = new HttpException('Item not found', HttpStatus.NOT_FOUND);
    const mockHandler = createMockCallHandler(throwError(() => error));

    interceptor.intercept(mockContext, mockHandler).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
        const loggedMsg = loggerWarnSpy.mock.calls[0][0];
        expect(loggedMsg).toContain('404');
        expect(loggedMsg).toContain('Error: Item not found');
        done();
      },
    });
  });

  it('should log error for 500 server errors', (done) => {
    const req = {
      method: 'POST',
      url: '/v1/process',
      headers: {},
      ip: '127.0.0.1',
    };
    const res = { statusCode: 200 };
    const mockContext = createMockContext(req, res);
    const error = new Error('Database crash');
    const mockHandler = createMockCallHandler(throwError(() => error));

    interceptor.intercept(mockContext, mockHandler).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
        const loggedMsg = loggerErrorSpy.mock.calls[0][0];
        expect(loggedMsg).toContain('500');
        expect(loggedMsg).toContain('Database crash');
        done();
      },
    });
  });
});
