'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarUserMenu } from '@/components/dashboard/SidebarUserMenu';
import { useSidebarStore } from '@/stores';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showCollapseButton?: boolean;
}

export function DashboardSidebar({
  collapsed: controlledCollapsed,
  onToggleCollapse,
  showCollapseButton = true,
}: SidebarProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { isCollapsed: storeCollapsed, toggleCollapsed } = useSidebarStore();

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : storeCollapsed;

  const toggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      toggleCollapsed();
    }
  };

  const navItems = [
    {
      title: t('overview'),
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
  ];

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-72',
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-border',
          isCollapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        <Link
          href="/dashboard"
          className="flex h-14 items-center justify-center overflow-hidden"
        >
          <Logo size={isCollapsed ? 48 : 96} />
        </Link>
      </div>

      {/* Nav List */}
      <TooltipProvider delayDuration={150}>
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  item.active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  isCollapsed && 'justify-center px-0',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>
      </TooltipProvider>

      {/* Collapse Toggle */}
      {showCollapseButton && (
        <div className="border-t border-border p-2">
          <button
            onClick={toggle}
            className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Footer User Menu */}
      <div className="border-t border-border p-3">
        <SidebarUserMenu isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}
