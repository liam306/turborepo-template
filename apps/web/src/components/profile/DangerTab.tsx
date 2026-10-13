'use client';

import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface DangerTabProps {
  onDeleteData: () => void;
  isDeletingData: boolean;
  onRequestDeleteAccount: () => void;
  isDeletingAccount: boolean;
  enableDataReset?: boolean;
}

export function DangerTab({
  onDeleteData,
  isDeletingData,
  onRequestDeleteAccount,
  isDeletingAccount,
  enableDataReset = false,
}: DangerTabProps) {
  const t = useTranslations('profile');

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-4">
        {/* Delete Data */}
        {enableDataReset && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-foreground">
                {t('deleteData')}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t('deleteDataDesc')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingData}
              onClick={onDeleteData}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0 text-xs"
            >
              {isDeletingData ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                t('deleteDataBtn')
              )}
            </Button>
          </div>
        )}

        {/* Delete Account */}
        <div className="border-t border-destructive/15 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-destructive">
              {t('deleteAccount')}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('deleteAccountDesc')}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeletingAccount}
            onClick={onRequestDeleteAccount}
            className="shrink-0 gap-1.5 text-xs"
          >
            <Trash2 className="h-3 w-3" />
            {t('deleteAccountBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
