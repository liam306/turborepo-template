import axios, { AxiosError } from 'axios';
import type {
  ISendVerificationEmailDto,
  IForgetPasswordDto,
  IVerifyEmailOtpDto,
  ISendOtpDto,
  IResetPasswordDto,
} from '@repo/types';

export type {
  ISendVerificationEmailDto,
  IForgetPasswordDto,
  IVerifyEmailOtpDto,
  ISendOtpDto,
  IResetPasswordDto,
};
import { API_BASE_URL } from '../api-client';

function getClientLocale(): string {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  return 'en';
}

const authAxios = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

authAxios.interceptors.request.use((config) => {
  const locale = getClientLocale();
  config.headers.set('x-lang', locale);
  config.headers.set('Accept-Language', locale);
  return config;
});

authAxios.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string; errors?: unknown }>) => {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(errorMessage));
  },
);

export const authApi = {
  sendVerificationEmail: (data: ISendVerificationEmailDto) =>
    authAxios.post<{ status: boolean }>('/send-verification-email', data),

  verifyEmail: (token: string) =>
    authAxios.get<{ status: boolean }>(
      `/verify-email?token=${encodeURIComponent(token)}`,
    ),

  verifyEmailOtp: (data: IVerifyEmailOtpDto) =>
    authAxios.post<{ status: boolean }>('/email-otp/verify-email', data),

  sendVerificationOtp: (data: ISendOtpDto) =>
    authAxios.post<{ status: boolean }>('/email-otp/send-verification-otp', {
      type: 'email-verification',
      ...data,
    }),

  forgetPassword: (data: IForgetPasswordDto) =>
    authAxios.post<{ success: boolean }>(
      '/email-otp/request-password-reset',
      data,
    ),

  resetPassword: (data: IResetPasswordDto) =>
    authAxios.post<{ success: boolean }>('/email-otp/reset-password', data),
};
