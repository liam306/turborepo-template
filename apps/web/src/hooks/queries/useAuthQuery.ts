import { useMutation } from '@tanstack/react-query';
import {
  authApi,
  type ISendVerificationEmailDto,
  type IForgetPasswordDto,
  type IResetPasswordDto,
  type IVerifyEmailOtpDto,
  type ISendOtpDto,
} from '@/lib/api';

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
