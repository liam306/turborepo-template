import { useMutation } from '@tanstack/react-query';
import {
  authService,
  type ISignInEmailDto,
  type ISignUpEmailDto,
  type ISocialAuthDto,
  type IVerifyEmailOtpDto,
  type ISendOtpDto,
  type IRequestPasswordResetDto,
  type IResetPasswordDto,
} from '@/services/auth.service';
import { signInGoogle } from '@/services/social-auth.service';

export function useSignInGoogle() {
  return useMutation({
    mutationFn: () => signInGoogle(),
  });
}

export function useSignInEmail() {
  return useMutation({
    mutationFn: (data: ISignInEmailDto) => authService.signInEmail(data),
  });
}

export function useSignUpEmail() {
  return useMutation({
    mutationFn: (data: ISignUpEmailDto) => authService.signUpEmail(data),
  });
}

export function useSignInSocial() {
  return useMutation({
    mutationFn: (data: ISocialAuthDto) => authService.signInSocial(data),
  });
}

export function useVerifyEmailOtp() {
  return useMutation({
    mutationFn: (data: IVerifyEmailOtpDto) => authService.verifyEmailOtp(data),
  });
}

export function useSendVerificationOtp() {
  return useMutation({
    mutationFn: (data: ISendOtpDto) => authService.sendVerificationOtp(data),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (data: IRequestPasswordResetDto) =>
      authService.requestPasswordReset(data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: IResetPasswordDto) => authService.resetPassword(data),
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: () => authService.signOut(),
  });
}
