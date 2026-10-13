'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field-error';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import {
  useVerifyEmail,
  useVerifyEmailOtp,
  useSendVerificationOtp,
} from '@/hooks/queries';

function VerifyEmailContent() {
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const queryEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(queryEmail);
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >(() => (token ? 'loading' : 'idle'));
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(60);

  const canResend = countdown <= 0;

  const { mutate: verifyToken } = useVerifyEmail();
  const { mutateAsync: verifyOtp, isPending: verifyingOtp } =
    useVerifyEmailOtp();
  const { mutateAsync: sendOtp, isPending: resendingOtp } =
    useSendVerificationOtp();

  // Backward compatibility: If token is present, verify via token
  useEffect(() => {
    if (!token) return;

    verifyToken(token, {
      onSuccess: () => {
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      },
      onError: () => {
        setStatus('error');
        setErrorMsg(t('verifyEmailFailed'));
      },
    });
  }, [token, t, verifyToken, router]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (token || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [token, countdown]);

  const handleVerifyOtp = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setEmailError('');

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

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg(t('otpLengthError'));
      return;
    }

    setErrorMsg('');
    try {
      await verifyOtp({ email: email.trim(), otp: cleanOtp });
      setStatus('success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('otpInvalid'));
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim() || !canResend || resendingOtp) return;
    setErrorMsg('');
    try {
      await sendOtp({ email: email.trim(), type: 'email-verification' });
      setCountdown(60);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('errorDefault'));
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
      <div className="flex justify-center">
        <Logo size="lg" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-foreground">
        {t('verifyEmailTitle')}
      </h2>

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('verifyingEmail')}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4 py-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {t('verifyEmailSuccess')}
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4 py-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-7 w-7 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">{errorMsg}</p>
          <Button asChild size="sm">
            <Link href="/login">{t('backToLogin')}</Link>
          </Button>
        </div>
      )}

      {status === 'idle' && (
        <form
          noValidate
          onSubmit={handleVerifyOtp}
          className="space-y-4 text-left"
        >
          <p className="text-xs text-center text-muted-foreground">
            {email ? t('otpSubtitle', { email }) : t('otpPlaceholder')}
          </p>

          {errorMsg && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive text-center">
              {errorMsg}
            </div>
          )}

          {!queryEmail && (
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
          )}

          <div className="flex flex-col items-center gap-2">
            <Label className="mb-1 block text-center">{t('otpTitle')}</Label>
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (errorMsg) setErrorMsg('');
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

          <Button
            type="submit"
            disabled={verifyingOtp || otp.trim().length !== 6 || !email.trim()}
            className="w-full h-11 font-semibold"
          >
            {verifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {verifyingOtp ? tCommon('processing') : t('otpVerifyButton')}
          </Button>

          <div className="text-center pt-1">
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendingOtp}
                className="text-xs font-semibold text-primary underline hover:opacity-80 disabled:opacity-50"
              >
                {resendingOtp ? tCommon('processing') : t('otpResend')}
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
  );
}

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToLogin')}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLocale={locale} />
          <ThemeSwitcher />
        </div>
      </div>
      <Suspense fallback={<div>{tCommon('loading')}</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
