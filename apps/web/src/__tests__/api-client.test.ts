import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axiosInstance, apiClient, getClientLocale } from '../lib/api-client';

describe('Web API Client & Error Envelope Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('determines active locale correctly from cookies or navigator', () => {
    const locale = getClientLocale();
    expect(['en', 'vi']).toContain(locale);
  });

  it('preserves entitlement error metadata (code, limit, remaining, resetAt)', async () => {
    axiosInstance.defaults.adapter = (async () => {
      const error = new Error('Request failed with status code 429') as any;
      error.isAxiosError = true;
      error.response = {
        status: 429,
        data: {
          success: false,
          code: 'QUOTA_EXHAUSTED',
          message: 'Gói của bạn đã hết lượt chấm bài viết trong ngày',
          limit: 3,
          remaining: 0,
          resetAt: '2026-10-12T00:00:00.000Z',
        },
      };
      throw error;
    }) as any;

    try {
      await apiClient('/v1/writing/submit');
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.status).toBe(429);
      expect(err.code).toBe('QUOTA_EXHAUSTED');
      expect(err.limit).toBe(3);
      expect(err.remaining).toBe(0);
      expect(err.resetAt).toBe('2026-10-12T00:00:00.000Z');
      expect(err.message).toBe(
        'Gói của bạn đã hết lượt chấm bài viết trong ngày',
      );
    }
  });

  describe.each([
    {
      locale: 'vi',
      expectedNetworkError:
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng',
      expectedUnexpectedError: 'Đã xảy ra lỗi không mong muốn',
    },
    {
      locale: 'en',
      expectedNetworkError:
        'Unable to connect to server. Please check your network connection',
      expectedUnexpectedError: 'An unexpected error occurred',
    },
  ])(
    'localized fallback errors for locale: $locale',
    ({ locale, expectedNetworkError, expectedUnexpectedError }) => {
      beforeEach(() => {
        (globalThis as any).document = {
          cookie: `NEXT_LOCALE=${locale}; path=/`,
        };
      });

      afterEach(() => {
        delete (globalThis as any).document;
      });

      it(`handles localized fallback error messages when backend returns no message in ${locale}`, async () => {
        axiosInstance.defaults.adapter = (async () => {
          const error: any = {
            isAxiosError: true,
            message: '',
            response: {
              status: 500,
              data: {},
            },
          };
          throw error;
        }) as any;

        try {
          await apiClient('/v1/test');
          expect.fail('Should have thrown an error');
        } catch (err: any) {
          expect(err.status).toBe(500);
          expect(err.message).toBe(expectedUnexpectedError);
        }
      });

      it(`localizes network disconnection errors in ${locale}`, async () => {
        axiosInstance.defaults.adapter = (async () => {
          const error: any = new Error('Network Error');
          error.isAxiosError = true;
          error.code = 'ERR_NETWORK';
          throw error;
        }) as any;

        try {
          await apiClient('/v1/network-fail');
          expect.fail('Should have thrown an error');
        } catch (err: any) {
          expect(err.message).toBe(expectedNetworkError);
        }
      });
    },
  );
});
