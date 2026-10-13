'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useTranslations } from 'next-intl';
import type { ThemeMode } from '@repo/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('common');

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: 'system',
      label: t('themeSystem'),
      icon: <Monitor className="h-3.5 w-3.5" />,
    },
    {
      mode: 'light',
      label: t('themeLight'),
      icon: <Sun className="h-3.5 w-3.5" />,
    },
    {
      mode: 'dark',
      label: t('themeDark'),
      icon: <Moon className="h-3.5 w-3.5" />,
    },
  ];

  const currentOption = options.find((o) => o.mode === theme) || options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          title={t('theme')}
          aria-label={t('theme')}
        >
          {currentOption.icon}
          <span>{currentOption.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.mode}
            onClick={() => setTheme(option.mode)}
            className={cn(
              'flex items-center gap-2 text-xs cursor-pointer',
              theme === option.mode && 'font-semibold text-primary',
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
