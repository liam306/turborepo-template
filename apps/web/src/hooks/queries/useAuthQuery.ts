import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  authApi,
  type ISendVerificationEmailDto,
  type IForgetPasswordDto,
  type IResetPasswordDto,
  type IVerifyEmailOtpDto,
  type ISendOtpDto,
} from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { userKeys } from './useUserQuery';

export function useSignInEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof authClient.signIn.email>[0]) => {
      const res = await authClient.signIn.email(data);
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useSignUpEmail() {
  return useMutation({
    mutationFn: async (data: Parameters<typeof authClient.signUp.email>[0]) => {
      const res = await authClient.signUp.email(data);
      if (res.error) throw res.error;
      return res.data;
    },
  });
}

export function useSignInSocial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Parameters<typeof authClient.signIn.social>[0],
    ) => {
      const res = await authClient.signIn.social(data);
      if (res?.error) throw res.error;
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useSendVerificationEmail() {
  return useMutation({
    mutationFn: (data: ISendVerificationEmailDto) =>
      authApi.sendVerificationEmail(data),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
  });
}

export function useVerifyEmailOtp() {
  return useMutation({
    mutationFn: (data: IVerifyEmailOtpDto) => authApi.verifyEmailOtp(data),
  });
}

export function useSendVerificationOtp() {
  return useMutation({
    mutationFn: (data: ISendOtpDto) => authApi.sendVerificationOtp(data),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: IForgetPasswordDto) => authApi.forgetPassword(data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: IResetPasswordDto) => authApi.resetPassword(data),
  });
}
