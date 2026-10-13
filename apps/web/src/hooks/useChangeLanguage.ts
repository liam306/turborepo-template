'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SupportedLocale } from '@repo/types';
import { setClientCookie } from '@/lib/cookies';
import { userApi } from '@/lib/api/user.api';

export function useChangeLanguage(currentLocale: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const changeLanguage = (nextLocale: SupportedLocale) => {
    if (nextLocale === currentLocale) return;
    setClientCookie('NEXT_LOCALE', nextLocale);
    userApi.updateProfile({ locale: nextLocale }).catch(() => {});
    startTransition(() => {
      router.refresh();
    });
  };

  return {
    changeLanguage,
    isPending,
  };
}
