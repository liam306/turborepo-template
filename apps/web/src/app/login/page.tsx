'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import {
  mapAuthErrorMessage,
  getUserRole,
  isAdminRole,
} from '@/lib/auth-helpers';
import { useSendVerificationEmail } from '@/hooks/queries';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field-error';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Logo } from '@/components/ui/Logo';
import { VerifyOtpDialog } from '@/components/auth/VerifyOtpDialog';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);

  const clearValidationErrors = () => {
    setNameError('');
    setEmailError('');
    setPasswordError('');
  };

  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectTo =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';

  const { mutateAsync: sendVerificationEmail, isPending: resending } =
    useSendVerificationEmail();

  const handleResendVerification = async () => {
    if (!email) return;
    try {
      await sendVerificationEmail({
        email,
        callbackURL: `${window.location.origin}/verify-email`,
      });
      setSuccessMsg(t('resendSuccess'));
      setErrorMsg('');
    } catch {
      setErrorMsg(t('errorDefault'));
    }
  };

  const handleCredentialAuth = async (e: React.SubmitEvent) => {
    e.preventDefault();
    clearValidationErrors();

    let hasErr = false;
    const isValidEmail = (val: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

    if (isSignUp && !name.trim()) {
      setNameError(t('nameRequired'));
      hasErr = true;
    }
    if (!email.trim()) {
      setEmailError(t('emailRequired'));
      hasErr = true;
    } else if (!isValidEmail(email.trim())) {
      setEmailError(t('emailInvalid'));
      hasErr = true;
    }
    if (!password) {
      setPasswordError(t('passwordRequired'));
      hasErr = true;
    } else if (isSignUp && password.length < 8) {
      setPasswordError(t('passwordMinLength'));
      hasErr = true;
    }

    if (hasErr) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setCanResend(false);

    try {
      if (isSignUp) {
        const res = await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL: `${window.location.origin}/verify-email`,
        });

        if (res.error) {
          setErrorMsg(mapAuthErrorMessage(res.error, t));
        } else {
          setShowOtpDialog(true);
        }
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
          rememberMe,
          callbackURL: `${window.location.origin}${redirectTo}`,
        });

        if (res.error) {
          if (
            res.error.message?.includes('verify') ||
            res.error.status === 403 ||
            (res.error as any).code === 'EMAIL_NOT_VERIFIED'
          ) {
            setErrorMsg(t('emailNotVerified'));
            setCanResend(true);
          } else {
            setErrorMsg(mapAuthErrorMessage(res.error, t));
          }
        } else {
          const userRole = getUserRole(res.data?.user);
          const destination =
            !rawRedirect && isAdminRole(userRole) ? '/admin' : redirectTo;
          window.location.href = destination;
        }
      }
    } catch (err: unknown) {
      setErrorMsg(mapAuthErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google') => {
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}${redirectTo}`,
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('errorDefault'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t('backToHome')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher currentLocale={locale} />
            <ThemeSwitcher />
          </div>
        </div>

        <div className="text-center">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            {isSignUp ? t('signupTitle') : t('loginTitle')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSignUp ? t('signupSubtitle') : t('loginSubtitle')}
          </p>
        </div>

        {/* Social Logins */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialAuth('google')}
            className="w-full h-11 justify-center gap-3 font-semibold"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {t('continueGoogle')}
          </Button>
        </div>

        <div className="flex items-center">
          <div className="flex-1 border-t border-border" />
          <span className="shrink-0 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            {t('orWithEmail')}
          </span>
          <div className="flex-1 border-t border-border" />
        </div>

        {errorMsg && (
          <div className="space-y-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
            <p>{errorMsg}</p>
            {canResend && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowOtpDialog(true)}
                  className="font-semibold text-primary underline hover:opacity-80"
                >
                  {t('otpTitle')}
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="font-semibold text-primary underline hover:opacity-80 disabled:opacity-50"
                >
                  {resending ? tCommon('processing') : t('resendVerification')}
                </button>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <form noValidate onSubmit={handleCredentialAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <Label className="mb-1 block">{t('fullName')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder={t('fullNamePlaceholder')}
                  className="pl-9"
                  error={!!nameError}
                />
              </div>
              <FieldError error={nameError} />
            </div>
          )}

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

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>{t('password')}</Label>
              {!isSignUp && (
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t('forgotPasswordLink')}
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('passwordPlaceholder')}
                className="pl-9"
                error={!!passwordError}
              />
            </div>
            <FieldError error={passwordError} />
          </div>

          {!isSignUp && (
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
              />
              <Label
                htmlFor="remember-me"
                className="text-xs font-normal text-muted-foreground cursor-pointer select-none"
              >
                {t('rememberMe')}
              </Label>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-semibold"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading
              ? tCommon('processing')
              : isSignUp
                ? t('signUpButton')
                : t('signInButton')}
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              clearValidationErrors();
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="font-semibold text-primary hover:underline"
          >
            {isSignUp ? t('signInNow') : t('signUpFree')}
          </button>
        </div>
      </div>

      <VerifyOtpDialog
        open={showOtpDialog}
        email={email}
        onOpenChange={setShowOtpDialog}
        onSuccess={() => {
          setShowOtpDialog(false);
          setSuccessMsg(t('otpSuccess'));
          setTimeout(() => {
            window.location.href = redirectTo;
          }, 1500);
        }}
      />
    </div>
  );
}
