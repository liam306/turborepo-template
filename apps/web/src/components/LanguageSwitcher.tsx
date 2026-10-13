'use client';

import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { LANGUAGE_OPTIONS } from '@/config/languages';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  currentLocale?: string;
  className?: string;
}

export function LanguageSwitcher({
  currentLocale: propLocale,
  className,
}: LanguageSwitcherProps) {
  const hookLocale = useLocale();
  const t = useTranslations('common');
  const currentLocale = propLocale || hookLocale;
  const { changeLanguage, isPending } = useChangeLanguage(currentLocale);

  const currentOption = LANGUAGE_OPTIONS.find(
    (opt) => opt.code === currentLocale,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer',
            className,
          )}
          title={t('language')}
          aria-label={t('selectLanguage')}
        >
          <Globe className="h-3.5 w-3.5 text-slate-500" />
          <span className="uppercase">
            {currentOption?.shortLabel || currentLocale}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LANGUAGE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.code}
            disabled={isPending}
            onClick={() => changeLanguage(opt.code)}
            className={cn(
              'flex items-center justify-between gap-2 text-xs cursor-pointer',
              currentLocale === opt.code && 'font-semibold text-primary',
            )}
          >
            <div className="flex items-center gap-2">
              <span>{opt.flag}</span>
              <span>{opt.label}</span>
            </div>
            {currentLocale === opt.code && (
              <Check className="h-3.5 w-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
