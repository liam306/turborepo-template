'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from 'react';
import type { ThemeMode } from '@repo/types';
import { useUpdateProfile } from '@/hooks/queries';
import { useThemeStore, THEME_COOKIE_NAME } from '@/stores';

export { THEME_COOKIE_NAME };

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function subscribeSystemTheme(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getSystemThemeSnapshot(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getServerSystemThemeSnapshot(): 'light' | 'dark' {
  return 'light';
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: ThemeProviderProps) {
  const { theme, setTheme: setStoreTheme } = useThemeStore();
  const updateProfileMutation = useUpdateProfile();

  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    getServerSystemThemeSnapshot,
  );

  const currentTheme = theme || defaultTheme;
  const resolvedTheme: 'light' | 'dark' =
    currentTheme === 'system' ? systemTheme : currentTheme;

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setStoreTheme(newTheme);
      updateProfileMutation.mutate({ theme: newTheme });
    },
    [setStoreTheme, updateProfileMutation],
  );

  // Synchronize <html> root class with resolved theme
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme: currentTheme, resolvedTheme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
