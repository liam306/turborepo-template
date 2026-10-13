'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Globe,
  Check,
  MoreVertical,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useSession, signOut } from '@/lib/auth-client';
import { useUserProfile } from '@/hooks/queries/useUserQuery';
import { useTheme } from '@/context/ThemeContext';
import { useIsMounted } from '@/hooks/useIsMounted';
import { ProfileModal } from '@/components/ProfileModal';
import { LANGUAGE_OPTIONS } from '@/config/languages';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@repo/types';

interface SidebarUserMenuProps {
  isCollapsed: boolean;
}

export function SidebarUserMenu({ isCollapsed }: SidebarUserMenuProps) {
  const tNav = useTranslations('navigation');
  const tCommon = useTranslations('common');
  const tDash = useTranslations('dashboard');
  const locale = useLocale();
  const { changeLanguage, isPending } = useChangeLanguage(locale);

  const { data: session } = useSession();
  const { data: profile } = useUserProfile(Boolean(session?.user));
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const themeOptions: {
    mode: ThemeMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      mode: 'light',
      label: tCommon('themeLight'),
      icon: <Sun className="h-3.5 w-3.5" />,
    },
    {
      mode: 'dark',
      label: tCommon('themeDark'),
      icon: <Moon className="h-3.5 w-3.5" />,
    },
    {
      mode: 'system',
      label: tCommon('themeSystem'),
      icon: <Monitor className="h-3.5 w-3.5" />,
    },
  ];

  if (!mounted) {
    return <div className="h-10 w-full rounded-xl bg-muted/40 animate-pulse" />;
  }

  // Logged out state
  if (!session?.user) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className={cn('w-full', isCollapsed && 'px-0 justify-center')}
      >
        <Link href="/login">
          <User className="h-4 w-4 shrink-0" />
          {!isCollapsed && (
            <span className="ml-2 truncate">{tDash('loginAction')}</span>
          )}
        </Link>
      </Button>
    );
  }

  const user = {
    ...session.user,
    name: profile?.name ?? session.user.name,
    email: profile?.email ?? session.user.email,
    image: profile?.image ?? session.user.image,
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-accent/60 outline-none',
              isCollapsed && 'justify-center p-1',
            )}
          >
            {/* Avatar */}
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40 flex items-center justify-center">
              {user.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.image}
                  alt={user.name || tCommon('user')}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {/* i18n-audit-ignore: Brand monogram fallback is intentionally untranslated */}
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </span>
              )}
            </div>

            {/* Name & Email info */}
            {!isCollapsed && (
              <div className="flex flex-1 flex-col overflow-hidden text-left leading-tight">
                <span className="truncate text-xs font-semibold text-foreground">
                  {user.name || user.email}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {user.email}
                </span>
              </div>
            )}

            {!isCollapsed && (
              <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align={isCollapsed ? 'center' : 'start'}
          sideOffset={8}
          className="w-56"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <p className="text-xs font-semibold text-foreground truncate">
                {user.name || tCommon('user')}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            {/* Account Settings */}
            <DropdownMenuItem
              onClick={() => setIsProfileOpen(true)}
              className="gap-2 text-xs cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{tNav('accountSettings')}</span>
            </DropdownMenuItem>

            {/* Appearance Submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 text-xs cursor-pointer">
                {theme === 'dark' ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : theme === 'light' ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Monitor className="h-3.5 w-3.5" />
                )}
                <span>{tNav('theme')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                {themeOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.mode}
                    onClick={() => setTheme(opt.mode)}
                    className={cn(
                      'gap-2 text-xs cursor-pointer',
                      theme === opt.mode && 'font-semibold text-primary',
                    )}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Language Submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 text-xs cursor-pointer">
                <Globe className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{tNav('language')}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-1">
                  {locale}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.code}
                    disabled={isPending}
                    onClick={() => changeLanguage(opt.code)}
                    className={cn(
                      'gap-2 text-xs cursor-pointer justify-between',
                      locale === opt.code && 'font-semibold text-primary',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{opt.flag}</span>
                      <span>{opt.label}</span>
                    </div>
                    {locale === opt.code && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = '/login';
            }}
            className="gap-2 text-xs cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{tCommon('logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
