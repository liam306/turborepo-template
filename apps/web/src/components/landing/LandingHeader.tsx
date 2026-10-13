'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useSession } from '@/lib/auth-client';

export function LandingHeader() {
  const t = useTranslations('landing');
  const locale = useLocale() as 'en' | 'vi';
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex h-14 items-center overflow-hidden">
            <Logo size={96} />
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher currentLocale={locale} />
          <ThemeSwitcher />

          {session?.user ? (
            <Button asChild size="sm">
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{t('openDashboard')}</span>
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t('ctaLogin')}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login" className="flex items-center gap-1.5">
                  <span>{t('ctaStart')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
