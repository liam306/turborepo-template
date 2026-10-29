'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SupportedLocale } from '@repo/types';
import { setClientCookie } from '@/lib/cookies';
import { useUpdateProfile } from '@/hooks/queries';

export function useChangeLanguage(currentLocale: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const updateProfileMutation = useUpdateProfile();

  const changeLanguage = (nextLocale: SupportedLocale) => {
    if (nextLocale === currentLocale) return;
    setClientCookie('NEXT_LOCALE', nextLocale);
    updateProfileMutation.mutate({ locale: nextLocale });
    startTransition(() => {
      router.refresh();
    });
  };

  return {
    changeLanguage,
    isPending,
  };
}
