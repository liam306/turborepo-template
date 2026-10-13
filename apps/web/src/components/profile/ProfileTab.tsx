'use client';

import React, { useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { IUserProfile } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileTabProps {
  profile?: IUserProfile;
  name: string;
  onNameChange: (value: string) => void;
  onUpdateName: (e: React.FormEvent) => void;
  isUpdatingName: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingAvatar: boolean;
}

export function ProfileTab({
  profile,
  name,
  onNameChange,
  onUpdateName,
  isUpdatingName,
  onFileSelect,
  isUploadingAvatar,
}: ProfileTabProps) {
  const t = useTranslations('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative group shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-border shadow-sm bg-muted/40 flex items-center justify-center">
            {profile?.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.image}
                alt={profile.name || t('avatar')}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-primary">
                {/* i18n-audit-ignore: Brand monogram fallback is intentionally untranslated */}
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'US'}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={isUploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed"
            aria-label={t('changeAvatar')}
          >
            {isUploadingAvatar ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileSelect}
          />
        </div>

        {/* Personal Details Form */}
        <form onSubmit={onUpdateName} className="flex-1 w-full space-y-4">
          <div className="grid gap-1.5">
            <Label
              htmlFor="profile-email"
              className="text-xs text-muted-foreground"
            >
              {t('email')}
            </Label>
            <Input
              id="profile-email"
              value={profile?.email || ''}
              disabled
              className="bg-muted text-muted-foreground h-9 text-xs"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-name" className="text-xs">
              {t('name')}
            </Label>
            <div className="flex gap-2">
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="h-9 text-xs"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingName || name === profile?.name}
                className="shrink-0 h-9 text-xs"
              >
                {isUpdatingName ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t('saveName')
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
