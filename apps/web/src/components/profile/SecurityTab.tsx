'use client';

import React from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { IUserProfile } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';

export interface SecurityTabErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface SecurityTabProps {
  profile?: IUserProfile;
  currentPassword: string;
  onCurrentPasswordChange: (val: string) => void;
  newPassword: string;
  onNewPasswordChange: (val: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  errors?: SecurityTabErrors;
}

export function SecurityTab({
  profile,
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  onSubmit,
  isLoading,
  errors,
}: SecurityTabProps) {
  const t = useTranslations('profile');

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <h4 className="text-sm font-semibold text-foreground">
          {profile?.hasPassword ? t('changePassword') : t('setPassword')}
        </h4>
      </div>

      {profile?.hasPassword && (
        <div className="grid gap-1.5">
          <Label htmlFor="curr-pwd" className="text-xs">
            {t('currentPassword')}
          </Label>
          <Input
            id="curr-pwd"
            type="password"
            value={currentPassword}
            onChange={(e) => onCurrentPasswordChange(e.target.value)}
            placeholder="••••••••"
            className="h-9 text-xs"
            error={!!errors?.currentPassword}
          />
          <FieldError error={errors?.currentPassword} />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="new-pwd" className="text-xs">
          {t('newPassword')}
        </Label>
        <Input
          id="new-pwd"
          type="password"
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          placeholder="••••••••"
          className="h-9 text-xs"
          error={!!errors?.newPassword}
        />
        <FieldError error={errors?.newPassword} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="conf-pwd" className="text-xs">
          {t('confirmNewPassword')}
        </Label>
        <Input
          id="conf-pwd"
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          placeholder="••••••••"
          className="h-9 text-xs"
          error={!!errors?.confirmPassword}
        />
        <FieldError error={errors?.confirmPassword} />
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || !newPassword}
          className="h-9 text-xs min-w-28"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : profile?.hasPassword ? (
            t('updatePassword')
          ) : (
            t('savePassword')
          )}
        </Button>
      </div>
    </form>
  );
}
