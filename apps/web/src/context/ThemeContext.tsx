'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
} from 'react';
import type { ThemeMode } from '@repo/types';
import { userApi } from '@/lib/api';
import { setClientCookie } from '@/lib/cookies';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_COOKIE_NAME = 'APP_THEME';

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
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('theme') as ThemeMode | null;
        if (stored && ['system', 'light', 'dark'].includes(stored)) {
          return stored;
        }
      } catch {}
    }
    return defaultTheme;
  });

  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    getServerSystemThemeSnapshot,
  );

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? systemTheme : theme;

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    // Save cookie with 1 year expiry
    setClientCookie(THEME_COOKIE_NAME, newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch {}

    // Background sync to backend if session exists
    userApi.updateProfile({ theme: newTheme }).catch(() => {
      // Silently ignore if not logged in or backend offline
    });
  }, []);

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
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
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
