import { describe, expect, it } from 'vitest';
import {
  ApiClientError,
  buildQueryString,
  extractApiErrorMessage,
  getAuthErrorTranslationKey,
  unwrapFetchResponse,
} from '../api';

describe('api utils', () => {
  describe('buildQueryString', () => {
    it('returns empty string when no params are given', () => {
      expect(buildQueryString({})).toBe('');
    });

    it('builds query string omitting null, undefined, and empty string', () => {
      const qs = buildQueryString({
        page: 1,
        limit: 20,
        search: '',
        filter: null,
        sort: undefined,
        active: true,
      });
      expect(qs).toBe('?page=1&limit=20&active=true');
    });
  });

  describe('extractApiErrorMessage', () => {
    it('returns fallback when error is empty', () => {
      expect(extractApiErrorMessage(null, 'Default')).toBe('Default');
      expect(extractApiErrorMessage(undefined, 'Default')).toBe('Default');
    });

    it('returns string error directly', () => {
      expect(extractApiErrorMessage('Direct error')).toBe('Direct error');
    });

    it('extracts error from message property', () => {
      expect(extractApiErrorMessage({ message: 'Server message' })).toBe(
        'Server message',
      );
    });

    it('joins array validation error messages', () => {
      expect(
        extractApiErrorMessage({
          message: ['email must be valid', 'password too weak'],
        }),
      ).toBe('email must be valid, password too weak');
      expect(
        extractApiErrorMessage({
          errors: ['field 1 error', 'field 2 error'],
        }),
      ).toBe('field 1 error, field 2 error');
    });
  });

  describe('getAuthErrorTranslationKey', () => {
    it('returns null on empty error', () => {
      expect(getAuthErrorTranslationKey(null)).toBeNull();
    });

    it('maps known credential errors to keys', () => {
      expect(
        getAuthErrorTranslationKey({ code: 'INVALID_EMAIL_OR_PASSWORD' }),
      ).toBe('invalidCredentials');
      expect(getAuthErrorTranslationKey('Invalid credentials')).toBe(
        'invalidCredentials',
      );
      expect(
        getAuthErrorTranslationKey({ message: 'User already exists' }),
      ).toBe('userExists');
      expect(getAuthErrorTranslationKey({ code: 'EMAIL_NOT_VERIFIED' })).toBe(
        'emailNotVerified',
      );
      expect(getAuthErrorTranslationKey({ code: 'INVALID_OTP' })).toBe(
        'otpInvalid',
      );
      expect(getAuthErrorTranslationKey({ code: 'OTP_EXPIRED' })).toBe(
        'otpExpired',
      );
      expect(
        getAuthErrorTranslationKey({
          message: 'Password must be at least 8 chars',
        }),
      ).toBe('passwordMinLength');
      expect(getAuthErrorTranslationKey({ code: 'USER_NOT_FOUND' })).toBe(
        'userNotFound',
      );
    });

    it('returns null for unrecognized errors', () => {
      expect(
        getAuthErrorTranslationKey({ message: 'Unknown error' }),
      ).toBeNull();
    });
  });

  describe('unwrapFetchResponse', () => {
    it('unwraps successful API response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 1 },
          message: 'Success',
        }),
      } as unknown as Response;

      const result = await unwrapFetchResponse<{ id: number }>(mockResponse);
      expect(result.data).toEqual({ id: 1 });
      expect(result.message).toBe('Success');
    });

    it('throws ApiClientError when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad request payload' }),
      } as unknown as Response;

      await expect(unwrapFetchResponse(mockResponse)).rejects.toThrow(
        ApiClientError,
      );
    });

    it('throws ApiClientError when success is explicitly false', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          data: null,
          message: 'Operation failed',
        }),
      } as unknown as Response;

      await expect(unwrapFetchResponse(mockResponse)).rejects.toThrow(
        ApiClientError,
      );
    });
  });
});
