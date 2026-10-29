import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from 'zustand/middleware';
import type { ThemeMode } from '@repo/types';
import { setClientCookie } from '@/lib/cookies';

export const THEME_COOKIE_NAME = 'APP_THEME';

interface IThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useThemeStore = create<IThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (newTheme: ThemeMode) => {
        set({ theme: newTheme });
        setClientCookie(THEME_COOKIE_NAME, newTheme);
      },
    }),
    {
      name: 'theme',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : memoryStorage,
      ),
    },
  ),
);
