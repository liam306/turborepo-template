'use client';

import React, { useState } from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader } from '@/components/dashboard/Header';
import { AuthGuard } from '@/components/dashboard/AuthGuard';
import { DashboardHeaderProvider } from '@/context/DashboardHeaderContext';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <DashboardHeaderProvider>
        <div className="fixed inset-0 flex overflow-hidden bg-background">
          {/* Desktop Collapsible Sidebar */}
          <div className="hidden md:flex h-full">
            <DashboardSidebar />
          </div>

          {/* Mobile Drawer Backdrop */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          {/* Mobile Sidebar */}
          <div
            className={cn(
              'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card transition-transform duration-300 md:hidden',
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <DashboardSidebar
              collapsed={false}
              showCollapseButton={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <DashboardHeader
              onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
            />
            <main
              id="dashboard-main"
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-h-0"
            >
              <div className="w-full min-w-0 max-w-full">{children}</div>
            </main>
          </div>
        </div>
      </DashboardHeaderProvider>
    </AuthGuard>
  );
}
