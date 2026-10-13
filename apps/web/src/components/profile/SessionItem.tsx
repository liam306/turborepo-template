'use client';

import React from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  HelpCircle,
  CheckCircle2,
  LogOut,
  Globe,
  Clock,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { IUserSession } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SessionItemProps {
  session: IUserSession;
  onRevoke: (sessionId: string) => void;
  isRevoking?: boolean;
}

export function SessionItem({
  session,
  onRevoke,
  isRevoking,
}: SessionItemProps) {
  const t = useTranslations('profile');

  const getDeviceIcon = () => {
    switch (session.deviceType) {
      case 'desktop':
        return <Laptop className="h-5 w-5 text-muted-foreground" />;
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-muted-foreground" />;
      case 'tablet':
        return <Tablet className="h-5 w-5 text-muted-foreground" />;
      default:
        return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 p-3.5 rounded-xl border transition-colors',
        session.isCurrent
          ? 'border-primary/30 bg-primary/[0.03] dark:bg-primary/[0.06]'
          : 'border-border bg-card hover:bg-muted/30',
      )}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div
          className={cn(
            'p-2 rounded-lg shrink-0 mt-0.5',
            session.isCurrent
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {getDeviceIcon()}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground truncate">
              {session.browser} • {session.os}
            </span>
            {session.isCurrent && (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium py-0 px-2 h-5 gap-1 shrink-0"
              >
                <CheckCircle2 className="h-3 w-3" />
                {t('currentDevice')}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            {session.ipAddress && (
              <span className="flex items-center gap-1 shrink-0">
                <Globe className="h-3 w-3" />
                {session.ipAddress}
              </span>
            )}
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" />
              {t('lastActive')}:{' '}
              {formatDate(session.lastActiveAt || session.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {!session.isCurrent && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRevoke(session.id)}
          disabled={isRevoking}
          className="shrink-0 h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
        >
          {isRevoking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <LogOut className="h-3.5 w-3.5 mr-1" />
              {t('revokeSession')}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
