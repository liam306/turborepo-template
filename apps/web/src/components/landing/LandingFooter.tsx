'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/ui/Logo';
import { BRAND } from '@repo/utils';

export function LandingFooter() {
  const t = useTranslations('landing');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/60 py-8">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo size={64} />
          <span className="text-xs text-muted-foreground">
            {t('footerDesc')}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {BRAND.copyright(currentYear)}
        </div>
      </div>
    </footer>
  );
}
