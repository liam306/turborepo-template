import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { IUserProfile } from '@repo/types';
import i18n from '@/i18n';

interface IUserState {
  token: string | null;
  profile: IUserProfile | null;
  rememberMe: boolean;
  isHydrated: boolean;
  setToken: (token: string | null) => void;
  setProfile: (profile: IUserProfile | null) => void;
  setRememberMe: (rememberMe: boolean) => void;
  updateProfileName: (name: string) => void;
  updateAvatarUrl: (url: string) => void;
  logout: () => void;
}

export const useUserStore = create<IUserState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      rememberMe: true,
      isHydrated: false,
      setToken: (token) => set({ token }),
      setProfile: (profile) => set({ profile }),
      setRememberMe: (rememberMe) => set({ rememberMe }),
      updateProfileName: (name) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, name } : null,
        })),
      updateAvatarUrl: (url) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, image: url } : null,
        })),
      logout: () => {
        const token = useUserStore.getState().token;
        if (token) {
          const baseUrl =
            process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
          const lang = i18n?.language || 'vi';
          axios
            .post(`${baseUrl}/auth/sign-out`, null, {
              headers: {
                Authorization: `Bearer ${token}`,
                'x-lang': lang,
                'Accept-Language': lang,
              },
            })
            .catch(() => {});
        }
        set({ token: null, profile: null });
      },
    }),
    {
      name: 'app_user_store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // If user unchecked "Remember Me", clear session on cold start
        if (state.rememberMe === false) {
          state.token = null;
          state.profile = null;
        }
        state.isHydrated = true;
      },
    },
  ),
);
