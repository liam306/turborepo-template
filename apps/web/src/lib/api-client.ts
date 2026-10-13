import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  AxiosError,
} from 'axios';
import { getClientFallbackErrorMessage } from './api-errors';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getClientLocale(): string {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  return 'en';
}

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const locale = getClientLocale();
  config.headers.set('x-lang', locale);
  config.headers.set('Accept-Language', locale);
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    // Backend wraps everything with TransformInterceptor:
    // { success: true, data: T } or { success: true, data: T[], pagination: IPaginatedMeta }
    const resData = response.data;
    if (resData && typeof resData === 'object' && 'data' in resData) {
      if ('pagination' in resData) {
        // Return both data and pagination (IPaginatedResponse)
        return {
          data: resData.data,
          pagination: resData.pagination,
          meta: resData.pagination, // For backward compatibility with existing code expecting meta
        } as unknown as typeof response;
      }
      if (resData.data === null || resData.data === undefined) {
        if ('message' in resData && typeof resData.message === 'string') {
          return { message: resData.message } as unknown as typeof response;
        }
      }
      return resData.data;
    }
    return resData;
  },
  (error: AxiosError<{ message?: string; errors?: unknown }>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isPublicPath =
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/verify-email') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password');

      if (!isPublicPath) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Axios interceptor executes outside React component tree
        window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
      }
    }

    const locale = getClientLocale();
    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error';
    const fallbackMessage = isNetworkError
      ? getClientFallbackErrorMessage('networkError', locale)
      : getClientFallbackErrorMessage('unexpectedError', locale);
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

export async function apiClient<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await axiosInstance.request<T>({
    url,
    ...config,
  });
  return response as unknown as T;
}
