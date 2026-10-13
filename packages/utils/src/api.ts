import { IBaseListingQuery, IPagination } from '@repo/types';

/**
 * Builds standard URL query string from listing query params, omitting null/undefined values.
 */
export function buildQueryString(
  params: Partial<Record<string, unknown>> | IBaseListingQuery,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  }
  const str = query.toString();
  return str ? `?${str}` : '';
}

/**
 * Extracts a user-friendly error message from an unknown error or API error response.
 * Always prioritizes backend-provided message over generic fallback.
 */
export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage = 'Error occurred. Please try again.',
): string {
  if (!error) return fallbackMessage;

  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const errObj = error as Record<string, any>;

    // Case 1: Backend IApiErrorResponse or NestJS exception payload
    if (
      typeof errObj.message === 'string' &&
      errObj.message.trim().length > 0
    ) {
      return errObj.message;
    }

    // Case 2: Validation errors array from class-validator
    if (Array.isArray(errObj.message) && errObj.message.length > 0) {
      return errObj.message.join(', ');
    }

    if (Array.isArray(errObj.errors) && errObj.errors.length > 0) {
      return errObj.errors.join(', ');
    }

    // Case 3: Error instance
    if (typeof errObj.message === 'string') {
      return errObj.message;
    }
  }

  return fallbackMessage;
}

/**
 * Maps Better Auth or API auth errors to i18n translation key in auth.*
 */
export function getAuthErrorTranslationKey(error: unknown): string | null {
  if (!error) return null;
  let text = '';
  let code = '';

  if (typeof error === 'string') {
    text = error;
  } else if (typeof error === 'object') {
    const obj = error as Record<string, any>;
    code = String(obj.code || obj.status || '');
    text = String(obj.message || obj.error?.message || obj.error || '');
  }

  const lower = text.toLowerCase();
  const lowerCode = code.toLowerCase();

  if (
    lowerCode.includes('invalid_email_or_password') ||
    lower.includes('invalid email or password') ||
    lower.includes('invalid credentials') ||
    lower.includes('email hoặc mật khẩu')
  ) {
    return 'invalidCredentials';
  }
  if (
    lowerCode.includes('user_already_exists') ||
    lower.includes('user already exists') ||
    lower.includes('tài khoản với email này đã tồn tại')
  ) {
    return 'userExists';
  }
  if (
    lowerCode.includes('email_not_verified') ||
    lower.includes('email not verified') ||
    lower.includes('email chưa được xác thực')
  ) {
    return 'emailNotVerified';
  }
  if (
    lowerCode.includes('invalid_otp') ||
    lower.includes('invalid otp') ||
    lower.includes('mã xác thực không hợp lệ')
  ) {
    return 'otpInvalid';
  }
  if (
    lowerCode.includes('otp_expired') ||
    lower.includes('otp expired') ||
    lower.includes('mã xác thực đã hết hạn')
  ) {
    return 'otpExpired';
  }
  if (
    lowerCode.includes('password_too_short') ||
    lower.includes('password too short') ||
    lower.includes('password must be at least')
  ) {
    return 'passwordMinLength';
  }
  if (
    lowerCode.includes('user_not_found') ||
    lower.includes('user not found') ||
    lower.includes('không tìm thấy người dùng')
  ) {
    return 'userNotFound';
  }

  return null;
}

export class ApiClientError extends Error {
  statusCode?: number;
  errors?: Record<string, string[]> | string[];
  raw?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      errors?: Record<string, string[]> | string[];
      raw?: unknown;
    },
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = options?.statusCode;
    this.errors = options?.errors;
    this.raw = options?.raw;
  }
}

/**
 * Parses and unwraps standard Fetch API response conforming to IApiResponse<T> or IPaginatedResponse<T>.
 * Automatically throws ApiClientError with backend message on failure.
 */
export async function unwrapFetchResponse<T>(
  response: Response,
  fallbackErrorMessage?: string,
): Promise<{ data: T; message?: string; pagination?: IPagination }> {
  let json: Record<string, unknown> | null = null;
  try {
    json = (await response.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const errMsg = extractApiErrorMessage(
      json,
      fallbackErrorMessage || `Request failed with status ${response.status}`,
    );
    throw new ApiClientError(errMsg, {
      statusCode: response.status,
      errors: json?.errors as string[] | Record<string, string[]> | undefined,
      raw: json,
    });
  }

  if (json && typeof json === 'object') {
    // If response was wrapped with IApiResponse / IPaginatedResponse
    if ('data' in json && 'success' in json) {
      if (json.success === false) {
        const errMsg = extractApiErrorMessage(json, fallbackErrorMessage);
        throw new ApiClientError(errMsg, {
          statusCode: response.status,
          errors: json?.errors as
            string[] | Record<string, string[]> | undefined,
          raw: json,
        });
      }
      return {
        data: json.data as T,
        message: typeof json.message === 'string' ? json.message : undefined,
        pagination: json.pagination as IPagination | undefined,
      };
    }
  }

  // Fallback for unwrapped responses
  return {
    data: json as T,
  };
}
