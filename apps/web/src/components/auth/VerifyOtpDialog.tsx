'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MailCheck, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVerifyEmailOtp, useSendVerificationOtp } from '@/hooks/queries';
import { mapAuthErrorMessage } from '@/lib/auth-helpers';

interface IVerifyOtpDialogProps {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function VerifyOtpDialog({
  open,
  email,
  onOpenChange,
  onSuccess,
}: IVerifyOtpDialogProps) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<HTMLInputElement>(null);

  const canResend = countdown <= 0;

  const { mutateAsync: verifyOtp, isPending: verifying } = useVerifyEmailOtp();
  const { mutateAsync: sendOtp, isPending: resending } =
    useSendVerificationOtp();

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Countdown timer for resend
  useEffect(() => {
    if (!open || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [open, countdown]);

  const handleVerify = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg(t('otpLengthError'));
      return;
    }

    setErrorMsg('');
    try {
      await verifyOtp({ email: email.trim(), otp: cleanOtp });
      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(mapAuthErrorMessage(err, t));
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setErrorMsg('');
    try {
      await sendOtp({ email: email.trim(), type: 'email-verification' });
      setCountdown(60);
    } catch (err: unknown) {
      setErrorMsg(mapAuthErrorMessage(err, t));
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setOtp('');
      setErrorMsg('');
      setCountdown(60);
    }
    onOpenChange(newOpen);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    if (errorMsg) setErrorMsg('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <MailCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {t('otpTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('otpSubtitle', { email })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive text-center">
              {errorMsg}
            </div>
          )}

          <div>
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              placeholder="••••••"
              className="h-14 text-center text-2xl font-bold tracking-[0.5em] font-mono"
              autoComplete="one-time-code"
            />
          </div>

          <Button
            type="submit"
            disabled={verifying || otp.trim().length !== 6}
            className="w-full h-11 font-semibold"
          >
            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {verifying ? tCommon('processing') : t('otpVerifyButton')}
          </Button>

          <div className="text-center pt-1">
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs font-semibold text-primary underline hover:opacity-80 disabled:opacity-50"
              >
                {resending ? tCommon('processing') : t('otpResend')}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t('otpResendIn', { seconds: countdown })}
              </span>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
