'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardHeaderContextType {
  headerContent: ReactNode | null;
  setHeaderContent: (content: ReactNode | null) => void;
}

const DashboardHeaderContext = createContext<
  DashboardHeaderContextType | undefined
>(undefined);

export function DashboardHeaderProvider({ children }: { children: ReactNode }) {
  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null);

  return (
    <DashboardHeaderContext.Provider
      value={{ headerContent, setHeaderContent }}
    >
      {children}
    </DashboardHeaderContext.Provider>
  );
}

export function useDashboardHeader() {
  const context = useContext(DashboardHeaderContext);
  if (!context) {
    throw new Error(
      'useDashboardHeader must be used within a DashboardHeaderProvider',
    );
  }
  return context;
}
