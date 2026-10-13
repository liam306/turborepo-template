import { create, AxiosError } from 'axios';
import i18n from '@/i18n';
import { useUserStore } from '@/stores/useUserStore';
import { API_BASE_URL } from './apiClient';
import type { IAuthResponse } from '@repo/types';

export const authAxios = create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

authAxios.interceptors.request.use((config) => {
  const token = useUserStore.getState().token;
  const lang = i18n.language || 'vi';

  config.headers.set('x-lang', lang);
  config.headers.set('Accept-Language', lang);

  if (token && !config.headers.get('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

authAxios.interceptors.response.use(
  (response) => {
    const newToken =
      (response.headers['set-auth-token'] as string) ||
      (response.headers['Set-Auth-Token'] as string);
    if (newToken) {
      useUserStore.getState().setToken(newToken);
    }
    return response;
  },
  (error: AxiosError<{ message?: string; error?: { message?: string } }>) => {
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error?.message ||
      error.message ||
      i18n.t('common.unexpectedError');
    return Promise.reject(new Error(errorMessage));
  },
);

export interface ISignInEmailDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ISignUpEmailDto {
  email: string;
  password: string;
  name: string;
}

export interface ISocialAuthDto {
  provider: string;
  idToken: string;
}

export interface IVerifyEmailOtpDto {
  email: string;
  otp: string;
}

export interface ISendOtpDto {
  email: string;
  type?: string;
}

export interface IRequestPasswordResetDto {
  email: string;
}

export interface IResetPasswordDto {
  email: string;
  otp: string;
  password: string;
}

export const authService = {
  signInEmail: async (data: ISignInEmailDto): Promise<IAuthResponse> => {
    const res = await authAxios.post<IAuthResponse>('/sign-in/email', data);
    return res.data;
  },

  signUpEmail: async (data: ISignUpEmailDto): Promise<IAuthResponse> => {
    const res = await authAxios.post<IAuthResponse>('/sign-up/email', data);
    return res.data;
  },

  signInSocial: async (data: ISocialAuthDto): Promise<IAuthResponse> => {
    const res = await authAxios.post<IAuthResponse>('/sign-in/social', {
      provider: data.provider,
      idToken: { token: data.idToken },
    });
    return res.data;
  },

  verifyEmailOtp: async (
    data: IVerifyEmailOtpDto,
  ): Promise<{ status: boolean }> => {
    const res = await authAxios.post<{ status: boolean }>(
      '/email-otp/verify-email',
      data,
    );
    return res.data;
  },

  sendVerificationOtp: async (
    data: ISendOtpDto,
  ): Promise<{ status: boolean }> => {
    const res = await authAxios.post<{ status: boolean }>(
      '/email-otp/send-verification-otp',
      {
        type: 'email-verification',
        ...data,
      },
    );
    return res.data;
  },

  requestPasswordReset: async (
    data: IRequestPasswordResetDto,
  ): Promise<{ status: boolean }> => {
    const res = await authAxios.post<{ status: boolean }>(
      '/email-otp/request-password-reset',
      data,
    );
    return res.data;
  },

  resetPassword: async (
    data: IResetPasswordDto,
  ): Promise<{ status: boolean }> => {
    const res = await authAxios.post<{ status: boolean }>(
      '/email-otp/reset-password',
      data,
    );
    return res.data;
  },

  signOut: async (): Promise<void> => {
    try {
      await authAxios.post('/sign-out');
    } catch {
      // Ignore network errors during sign-out
    }
  },
};
