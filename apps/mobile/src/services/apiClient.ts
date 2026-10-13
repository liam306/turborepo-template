import axios, {
  create,
  type AxiosInstance,
  type AxiosRequestConfig,
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import i18n from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
export const API_V1_URL = `${API_BASE_URL}/v1`;

export function getApiHeaders(customHeaders: Record<string, string> = {}) {
  const token = useUserStore.getState().token;
  const lang = i18n.language || 'vi';

  const headers: Record<string, string> = {
    'x-lang': lang,
    'Accept-Language': lang,
    ...customHeaders,
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export const axiosInstance: AxiosInstance = create({
  baseURL: API_V1_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Proactively or reactively refresh the auth session via Better Auth /auth/get-session
 */
export async function refreshAuthSession(): Promise<string | null> {
  const currentToken = useUserStore.getState().token;
  if (!currentToken) return null;

  try {
    const res = await axios.get(`${API_BASE_URL}/auth/get-session`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'x-lang': i18n.language || 'vi',
      },
    });

    const setAuthToken =
      (res.headers['set-auth-token'] as string) ||
      (res.headers['Set-Auth-Token'] as string);

    const newToken = setAuthToken || res.data?.session?.token || currentToken;

    if (newToken && newToken !== currentToken) {
      useUserStore.getState().setToken(newToken);
    }
    return newToken;
  } catch (err) {
    useUserStore.getState().logout();
    throw err;
  }
}

axiosInstance.interceptors.request.use((config) => {
  const token = useUserStore.getState().token;
  const lang = i18n.language || 'vi';

  config.headers.set('x-lang', lang);
  config.headers.set('Accept-Language', lang);

  if (token && !config.headers.get('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    // If backend returns new bearer token in header, update store immediately
    const newToken =
      (response.headers['set-auth-token'] as string) ||
      (response.headers['Set-Auth-Token'] as string);
    if (newToken) {
      useUserStore.getState().setToken(newToken);
    }

    const resData = response.data;
    if (resData && typeof resData === 'object' && 'data' in resData) {
      if ('pagination' in resData) {
        return {
          data: resData.data,
          pagination: resData.pagination,
          meta: resData.pagination,
        } as unknown as typeof response;
      }
      return resData.data;
    }
    return resData;
  },
  async (error: AxiosError<{ message?: string; errors?: unknown }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthRoute =
      originalRequest?.url?.includes('/auth/sign-in') ||
      originalRequest?.url?.includes('/auth/sign-up') ||
      originalRequest?.url?.includes('/auth/get-session');

    // Auto-refresh token on 401 Unauthorized
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      const currentToken = useUserStore.getState().token;
      if (!currentToken) {
        useUserStore.getState().logout();
        const fallbackMessage = i18n.t('common.authRequired');
        const errorMessage = error.response?.data?.message || fallbackMessage;
        const err = new Error(errorMessage) as Error & {
          status?: number;
          code?: string;
          limit?: number | null;
          remaining?: number | null;
          resetAt?: string | null;
          response?: unknown;
        };
        err.status = 401;
        err.code = (error.response?.data as any)?.code;
        err.limit = (error.response?.data as any)?.limit;
        err.remaining = (error.response?.data as any)?.remaining;
        err.resetAt = (error.response?.data as any)?.resetAt;
        err.response = error.response;
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshedToken = await refreshAuthSession();
        if (refreshedToken) {
          processQueue(null, refreshedToken);
          originalRequest.headers.set(
            'Authorization',
            `Bearer ${refreshedToken}`,
          );
          return axiosInstance(originalRequest);
        } else {
          processQueue(new Error(i18n.t('common.sessionRefreshFailed')), null);
          useUserStore.getState().logout();
        }
      } catch (refreshErr) {
        const refreshFallback = i18n.t('common.sessionRefreshFailed');
        const refreshError = new Error(
          (refreshErr as any)?.response?.data?.message || refreshFallback,
        );
        processQueue(refreshError, null);
        useUserStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error';
    const fallbackMessage = isNetworkError
      ? i18n.t('common.networkError')
      : i18n.t('common.unexpectedError');
    const errorMessage = error.response?.data?.message || fallbackMessage;
    const err = new Error(errorMessage) as Error & {
      status?: number;
      code?: string;
      limit?: number | null;
      remaining?: number | null;
      resetAt?: string | null;
      response?: unknown;
    };
    err.status = error.response?.status;
    err.code = (error.response?.data as any)?.code;
    err.limit = (error.response?.data as any)?.limit;
    err.remaining = (error.response?.data as any)?.remaining;
    err.resetAt = (error.response?.data as any)?.resetAt;
    err.response = error.response;
    return Promise.reject(err);
  },
);

export const apiClient = {
  get: async <T = unknown>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<{ data: T }> => {
    const res = await axiosInstance.get<T>(endpoint, config);
    return { data: res as unknown as T };
  },

  post: async <T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<{ data: T }> => {
    const res = await axiosInstance.post<T>(endpoint, body, config);
    return { data: res as unknown as T };
  },

  postFormData: async <T = unknown>(
    endpoint: string,
    formData: FormData,
    config?: AxiosRequestConfig,
  ): Promise<{ data: T }> => {
    const res = await axiosInstance.post<T>(endpoint, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return { data: res as unknown as T };
  },

  patch: async <T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<{ data: T }> => {
    const res = await axiosInstance.patch<T>(endpoint, body, config);
    return { data: res as unknown as T };
  },

  delete: async <T = unknown>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<{ data: T }> => {
    const res = await axiosInstance.delete<T>(endpoint, config);
    return { data: res as unknown as T };
  },
};
