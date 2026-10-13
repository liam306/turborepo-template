import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { I18nService } from 'nestjs-i18n';

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
}));

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockI18nService: Partial<I18nService>;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/v1/users',
      headers: { 'x-lang': 'en' },
      query: {},
    };

    mockHost = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    mockI18nService = {
      t: jest.fn().mockImplementation((key, options) => {
        if (key === 'common.errors.internalError') {
          return options?.lang === 'vi'
            ? 'Đã xảy ra lỗi máy chủ nội bộ'
            : 'Internal server error occurred';
        }
        return key;
      }),
    };

    filter = new AllExceptionsFilter(mockI18nService as I18nService);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle HttpException normally', () => {
    const exception = new BadRequestException('Validation failed');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
      }),
    );
  });

  it('should expose Error.message in development environment', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Database password leak: secret123');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database password leak: secret123',
      }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
  });

  it('should sanitize Error.message in production environment', () => {
    process.env.NODE_ENV = 'production';
    const exception = new Error(
      'FATAL: connection to postgres failed at 10.0.0.5:5432',
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error occurred',
      }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
  });

  it('should sanitize Error.message in production with Vietnamese locale', () => {
    process.env.NODE_ENV = 'production';
    mockRequest.headers['x-lang'] = 'vi';
    const exception = new Error('FATAL: table "users" does not exist');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi máy chủ nội bộ',
      }),
    );
  });

  it('should return raw exception response and bypass Sentry for health endpoints', () => {
    mockRequest.url = '/v1/health/ready';
    const errorPayload = {
      status: 'error',
      service: 'app-api',
      checks: {
        database: { status: 'down', error: 'Connection refused' },
        redis: { status: 'up' },
      },
    };
    const exception = new BadRequestException(errorPayload);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(errorPayload);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('should preserve entitlement metadata (code, limit, remaining, resetAt)', () => {
    const exception = new BadRequestException({
      code: 'FEATURE_LIMIT_REACHED',
      message: 'Limit reached',
      limit: 5,
      remaining: 0,
      resetAt: '2026-10-11T00:00:00.000Z',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'FEATURE_LIMIT_REACHED',
        message: 'Limit reached',
        limit: 5,
        remaining: 0,
        resetAt: '2026-10-11T00:00:00.000Z',
      }),
    );
  });

  it('strips private metadata and preserves allowed metadata', () => {
    mockRequest.headers['x-lang'] = 'en';
    filter.catch(
      new BadRequestException({
        message: 'Payload too large',
        code: 'PAYLOAD_TOO_LARGE',
        limit: 10485760,
        connectionString: 'private-secret',
        internalSecret: 'do-not-leak',
      }),
      mockHost,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Payload too large',
        code: 'PAYLOAD_TOO_LARGE',
        limit: 10485760,
      }),
    );
    expect(mockResponse.json.mock.calls[0][0]).not.toHaveProperty(
      'connectionString',
    );
    expect(mockResponse.json.mock.calls[0][0]).not.toHaveProperty(
      'internalSecret',
    );
  });

  it('should localize validation errors and preserve structured field errors', () => {
    mockRequest.headers['x-lang'] = 'vi';
    mockI18nService.t = jest.fn().mockImplementation((key, options) => {
      if (key === 'common.errors.invalidData') {
        return options?.lang === 'vi'
          ? 'Dữ liệu không hợp lệ'
          : 'Invalid input data';
      }
      return key;
    });

    const exception = new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: 'common.errors.invalidData',
      errors: {
        email: ['email must be an email'],
      },
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_FAILED',
        message: 'Dữ liệu không hợp lệ',
        errors: {
          email: ['email must be an email'],
        },
      }),
    );
  });
});
