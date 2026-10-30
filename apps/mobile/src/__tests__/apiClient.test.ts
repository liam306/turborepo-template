import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  getApiHeaders,
  axiosInstance,
  apiClient,
  refreshAuthSession,
} from '../services/apiClient';
import { useUserStore } from '../stores/useUserStore';
import i18n from '../i18n';
import enLocale from '../locales/en.json';
import viLocale from '../locales/vi.json';

vi.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'vi' }],
}));
vi.mock('expo-constants', () => ({
  default: { expoConfig: {} },
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Mobile apiClient & Locale Headers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('injects x-lang and Accept-Language headers', () => {
    const headers = getApiHeaders({ 'Custom-Header': 'test-val' });
    expect(headers['x-lang']).toBeDefined();
    expect(headers['Accept-Language']).toBeDefined();
    expect(headers['Custom-Header']).toBe('test-val');
  });

  it('preserves error envelope metadata on failed requests', async () => {
    axiosInstance.defaults.adapter = (async () => {
      const error: any = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            success: false,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Yêu cầu vượt quá giới hạn cho phép',
            limit: 10,
            remaining: 0,
            resetAt: null,
          },
        },
      };
      throw error;
    }) as any;

    try {
      await apiClient.get('/users/me');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(429);
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(err.limit).toBe(10);
      expect(err.remaining).toBe(0);
      expect(err.message).toBe('Yêu cầu vượt quá giới hạn cho phép');
    }
  });

  it('guarantees key parity between en and vi mobile translation dictionaries', () => {
    const enKeys = Object.keys(enLocale).sort();
    const viKeys = Object.keys(viLocale).sort();
    expect(enKeys).toEqual(viKeys);
  });

  describe('Localized Fallback Errors', () => {
    it.each(['vi', 'en'] as const)(
      'localizes network errors to active locale %s without leaking raw Axios text',
      async (locale) => {
        await i18n.changeLanguage(locale);
        axiosInstance.defaults.adapter = (async () => {
          const error: any = new Error('Network Error');
          error.isAxiosError = true;
          error.code = 'ERR_NETWORK';
          throw error;
        }) as any;

        try {
          await apiClient.get('/users/me');
          expect.fail('Should have thrown');
        } catch (err: any) {
          const expected =
            locale === 'vi'
              ? viLocale.common.networkError
              : enLocale.common.networkError;
          expect(err.message).toBe(expected);
          expect(err.message).not.toBe('Network Error');
        }
      },
    );

    it.each(['vi', 'en'] as const)(
      'localizes unexpected HTTP errors to active locale %s when backend message missing',
      async (locale) => {
        await i18n.changeLanguage(locale);
        axiosInstance.defaults.adapter = (async () => {
          const error: any = new Error('Request failed with status code 500');
          error.isAxiosError = true;
          error.response = { status: 500, data: {} };
          throw error;
        }) as any;

        try {
          await apiClient.get('/users/me');
          expect.fail('Should have thrown');
        } catch (err: any) {
          const expected =
            locale === 'vi'
              ? viLocale.common.unexpectedError
              : enLocale.common.unexpectedError;
          expect(err.message).toBe(expected);
          expect(err.status).toBe(500);
          expect(err.message).not.toBe('Request failed with status code 500');
        }
      },
    );

    it('localizes unauthenticated 401 fallback to active locale', async () => {
      await i18n.changeLanguage('vi');
      axiosInstance.defaults.adapter = (async (config: any) => {
        const error: any = new Error('Request failed with status code 401');
        error.isAxiosError = true;
        error.config = config;
        error.response = { status: 401, data: {} };
        throw error;
      }) as any;

      try {
        await apiClient.get('/classes');
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).toBe(viLocale.common.authRequired);
        expect(err.status).toBe(401);
      }
    });
  });

  describe('Session Refresh & Concurrent 401 Handling (Seam 3)', () => {
    it('returns null and logs out when /auth/get-session returns null or empty session', async () => {
      useUserStore.setState({
        token: 'expired-token',
        profile: { id: 'u1' } as any,
      });
      const logoutSpy = vi.spyOn(useUserStore.getState(), 'logout');
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        data: null,
        headers: {},
      } as any);

      const refreshed = await refreshAuthSession();

      expect(refreshed).toBeNull();
      expect(logoutSpy).toHaveBeenCalled();
      expect(useUserStore.getState().token).toBeNull();
    });
  });
});
