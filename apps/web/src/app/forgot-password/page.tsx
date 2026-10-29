'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field-error';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useForgotPassword, useResetPassword } from '@/hooks/queries';
import { mapAuthErrorMessage } from '@/lib/auth-helpers';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [countdown, setCountdown] = useState(60);

  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();

  const loading =
    forgotPasswordMutation.isPending || resetPasswordMutation.isPending;
  const canResend = countdown <= 0;

  const activeMutationError =
    step === 'email'
      ? forgotPasswordMutation.error
      : resetPasswordMutation.error;
  const errorMsg = activeMutationError
    ? mapAuthErrorMessage(activeMutationError, t)
    : '';
  const successMsg = resetPasswordMutation.isSuccess
    ? t('resetPasswordSuccess')
    : '';

  // Redirect on reset success
  useEffect(() => {
    if (resetPasswordMutation.isSuccess) {
      const timer = setTimeout(() => {
        router.push('/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [resetPasswordMutation.isSuccess, router]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step !== 'reset' || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendOtp = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setEmailError('');
    forgotPasswordMutation.reset();

    const isValidEmail = (val: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

    if (!email.trim()) {
      setEmailError(t('emailRequired'));
      return;
    }
    if (!isValidEmail(email.trim())) {
      setEmailError(t('emailInvalid'));
      return;
    }

    forgotPasswordMutation.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          setStep('reset');
          setCountdown(60);
        },
      },
    );
  };

  const handleResendOtp = async () => {
    if (!email.trim() || !canResend || forgotPasswordMutation.isPending) return;
    forgotPasswordMutation.reset();
    forgotPasswordMutation.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          setCountdown(60);
        },
      },
    );
  };

  const handleResetPassword = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setPasswordError('');
    setConfirmPasswordError('');
    resetPasswordMutation.reset();

    let hasErr = false;
    if (otp.trim().length !== 6) {
      hasErr = true;
    }

    if (!password) {
      setPasswordError(t('passwordRequired'));
      hasErr = true;
    } else if (password.length < 8) {
      setPasswordError(t('passwordMinLength'));
      hasErr = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError(t('confirmPasswordRequired'));
      hasErr = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError(t('passwordMismatch'));
      hasErr = true;
    }

    if (hasErr) return;

    resetPasswordMutation.mutate({
      email: email.trim(),
      otp: otp.trim(),
      password,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="flex items-center justify-between">
          {step === 'reset' ? (
            <button
              type="button"
              onClick={() => {
                setStep('email');
                forgotPasswordMutation.reset();
                resetPasswordMutation.reset();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t('backToLogin')}
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t('backToLogin')}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <LanguageSwitcher currentLocale={locale} />
            <ThemeSwitcher />
          </div>
        </div>

        <div className="text-center">
          <div className="flex justify-center">
            {step === 'reset' ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
            ) : (
              <Logo size="lg" />
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            {step === 'email'
              ? t('forgotPasswordTitle')
              : t('resetPasswordTitle')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {step === 'email'
              ? t('forgotPasswordSubtitle')
              : t('otpSubtitle', { email })}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {step === 'email' ? (
          <form noValidate onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <Label className="mb-1 block">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder={t('emailPlaceholder')}
                  className="pl-9"
                  error={!!emailError}
                />
              </div>
              <FieldError error={emailError} />
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-11 font-semibold"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('sendOtpBtn')
              )}
            </Button>
          </form>
        ) : (
          <form noValidate onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Label className="block text-center">{t('otpTitle')}</Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (resetPasswordMutation.isError)
                    resetPasswordMutation.reset();
                }}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot
                    index={0}
                    className="h-12 w-11 rounded-lg border text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={1}
                    className="h-12 w-11 rounded-lg border text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={2}
                    className="h-12 w-11 rounded-lg border text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={3}
                    className="h-12 w-11 rounded-lg border text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={4}
                    className="h-12 w-11 rounded-lg border text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={5}
                    className="h-12 w-11 rounded-lg border text-lg font-bold"
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div>
              <Label className="mb-1 block">{t('newPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder={t('newPassword')}
                  className="pl-9"
                  error={!!passwordError}
                />
              </div>
              <FieldError error={passwordError} />
            </div>

            <div>
              <Label className="mb-1 block">{t('confirmPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError('');
                  }}
                  placeholder={t('confirmPassword')}
                  className="pl-9"
                  error={!!confirmPasswordError}
                />
              </div>
              <FieldError error={confirmPasswordError} />
            </div>

            <Button
              type="submit"
              disabled={loading || otp.trim().length !== 6}
              className="w-full h-11 font-semibold"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('resetPasswordButton')
              )}
            </Button>

            <div className="text-center pt-1">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={forgotPasswordMutation.isPending}
                  className="text-xs font-semibold text-primary underline hover:opacity-80 disabled:opacity-50"
                >
                  {forgotPasswordMutation.isPending
                    ? tCommon('processing')
                    : t('otpResend')}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('otpResendIn', { seconds: countdown })}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
