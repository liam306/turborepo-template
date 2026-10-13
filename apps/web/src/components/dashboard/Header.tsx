'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useDashboardHeader } from '@/context/DashboardHeaderContext';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface DashboardHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function DashboardHeader({
  onToggleMobileSidebar,
}: DashboardHeaderProps) {
  const { headerContent } = useDashboardHeader();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 md:px-6 backdrop-blur">
      <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
        {onToggleMobileSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileSidebar}
            className="md:hidden shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {headerContent && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {headerContent}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
    </header>
  );
}
