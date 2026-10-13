import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { colorScheme } from 'nativewind';
import type { ThemeMode } from '@repo/types';
import { useUserStore } from './useUserStore';
import { userService } from '@/services/user.service';

interface IThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => void;
}

export const useThemeStore = create<IThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      initializeTheme: () => {
        const mode = get().themeMode;
        colorScheme.set(mode);
      },
      setThemeMode: async (mode: ThemeMode) => {
        set({ themeMode: mode });
        colorScheme.set(mode);

        const { token, profile, setProfile } = useUserStore.getState();
        if (profile) {
          setProfile({ ...profile, theme: mode });
        }
        if (token) {
          try {
            await userService.updateProfile({ theme: mode });
          } catch {
            // Silently ignore background sync network error
          }
        }
      },
    }),
    {
      name: 'app_theme_settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          colorScheme.set(state.themeMode);
        }
      },
    },
  ),
);
