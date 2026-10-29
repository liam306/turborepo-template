'use client';

import React, { useState, useMemo } from 'react';
import { ShieldCheck, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { paginateItems } from '@repo/utils';
import {
  useUserSessions,
  useRevokeSession,
  useRevokeOtherSessions,
} from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DebouncedSearchInput } from '@/components/ui/debounced-search-input';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { SessionItem } from './SessionItem';

interface SessionsTabProps {
  onSuccessMsg: (msg: string) => void;
  onErrorMsg: (msg: string) => void;
}

export function SessionsTab({ onSuccessMsg, onErrorMsg }: SessionsTabProps) {
  const t = useTranslations('profile');
  const common = useTranslations('common');

  const { data: sessions = [], isLoading, isError } = useUserSessions();
  const revokeSessionMutation = useRevokeSession();
  const revokeOtherSessionsMutation = useRevokeOtherSessions();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [showRevokeOthersConfirm, setShowRevokeOthersConfirm] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter((s) => {
      const matchDevice = s.deviceType?.toLowerCase().includes(q);
      const matchBrowser = s.browser?.toLowerCase().includes(q);
      const matchOs = s.os?.toLowerCase().includes(q);
      const matchIp = s.ipAddress?.toLowerCase().includes(q);
      return matchDevice || matchBrowser || matchOs || matchIp;
    });
  }, [sessions, searchQuery]);

  const { data: pagedSessions, meta } = useMemo(() => {
    return paginateItems(filteredSessions, page, limit);
  }, [filteredSessions, page, limit]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleConfirmRevokeSingle = () => {
    if (!sessionToRevoke) return;
    const targetId = sessionToRevoke;
    setRevokingId(targetId);
    setSessionToRevoke(null);

    revokeSessionMutation.mutate(targetId, {
      onSuccess: (res) => {
        setRevokingId(null);
        onSuccessMsg(res?.message || t('revokeSuccess'));
      },
      onError: (err) => {
        setRevokingId(null);
        onErrorMsg(err instanceof Error ? err.message : t('errorOccurred'));
      },
    });
  };

  const handleConfirmRevokeOthers = () => {
    setShowRevokeOthersConfirm(false);
    revokeOtherSessionsMutation.mutate(undefined, {
      onSuccess: (res) => {
        onSuccessMsg(res?.message || t('revokeOthersSuccess'));
      },
      onError: (err) => {
        onErrorMsg(err instanceof Error ? err.message : t('errorOccurred'));
      },
    });
  };

  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('sessionsTitle')}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('sessionsDesc')}
          </p>
        </div>

        {hasOtherSessions && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRevokeOthersConfirm(true)}
            disabled={revokeOtherSessionsMutation.isPending}
            className="shrink-0 h-8 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
          >
            {revokeOtherSessionsMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
            )}
            {t('revokeOtherSessions')}
          </Button>
        )}
      </div>

      {/* Content section */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{t('errorOccurred')}</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {t('noSessions')}
        </div>
      ) : (
        <div className="space-y-3">
          <DebouncedSearchInput
            onSearch={handleSearch}
            placeholder={t('searchSessions')}
            className="h-8"
          />

          {pagedSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {common('noData')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {pagedSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  onRevoke={(id) => setSessionToRevoke(id)}
                  isRevoking={revokingId === session.id}
                />
              ))}
            </div>
          )}

          {filteredSessions.length > 0 ? (
            <PaginationControls
              meta={meta}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              pageSizeOptions={[5, 10, 20]}
            />
          ) : null}
        </div>
      )}

      {/* Confirm dialog for revoking single session */}
      <ConfirmDialog
        open={Boolean(sessionToRevoke)}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
        title={t('revokeConfirmTitle')}
        description={t('revokeConfirmDesc')}
        confirmLabel={t('revokeSession')}
        cancelLabel={common('cancel')}
        variant="destructive"
        onConfirm={handleConfirmRevokeSingle}
      />

      {/* Confirm dialog for revoking all other sessions */}
      <ConfirmDialog
        open={showRevokeOthersConfirm}
        onOpenChange={setShowRevokeOthersConfirm}
        title={t('revokeOtherConfirmTitle')}
        description={t('revokeOtherConfirmDesc')}
        confirmLabel={t('revokeOtherSessions')}
        cancelLabel={common('cancel')}
        variant="destructive"
        onConfirm={handleConfirmRevokeOthers}
      />
    </div>
  );
}
