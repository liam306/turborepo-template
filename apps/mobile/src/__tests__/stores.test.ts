import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { colorScheme } from 'nativewind';
import { useUserStore } from '../stores/useUserStore';
import { useThemeStore } from '../stores/useThemeStore';
import { clearEntireLocalApp } from '../stores/clearData';
import { clearSocialAuthSession } from '../services/social-auth.service';
import { userService } from '../services/user.service';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(null),
    removeItem: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('nativewind', () => ({
  colorScheme: {
    set: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/user.service', () => ({
  userService: {
    updateProfile: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/social-auth.service', () => ({
  clearSocialAuthSession: vi.fn().mockResolvedValue(undefined),
}));

describe('Mobile Stores & Data Cleansing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({
      token: null,
      profile: null,
      rememberMe: true,
      isHydrated: true,
    });
    useThemeStore.setState({
      themeMode: 'system',
    });
  });

  describe('useUserStore', () => {
    it('updates token and profile data', () => {
      useUserStore.getState().setToken('tok-123');
      expect(useUserStore.getState().token).toBe('tok-123');

      const mockProfile = {
        id: 'u-1',
        name: 'User One',
        email: 'u1@example.com',
        emailVerified: true,
        image: null,
        role: 'user' as const,
        theme: 'system' as const,
        locale: 'vi' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        hasPassword: true,
        providers: ['credential'],
      };

      useUserStore.getState().setProfile(mockProfile);
      expect(useUserStore.getState().profile?.name).toBe('User One');

      useUserStore.getState().updateProfileName('New Name');
      expect(useUserStore.getState().profile?.name).toBe('New Name');

      useUserStore
        .getState()
        .updateAvatarUrl('https://cdn.example.com/avatar.webp');
      expect(useUserStore.getState().profile?.image).toBe(
        'https://cdn.example.com/avatar.webp',
      );
    });

    it('logout posts sign-out and resets token and profile', () => {
      useUserStore.setState({
        token: 'active-token',
        profile: { id: 'u-1' } as any,
      });

      useUserStore.getState().logout();

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/sign-out'),
        null,
        expect.objectContaining({
          headers: { Authorization: 'Bearer active-token' },
        }),
      );
      expect(useUserStore.getState().token).toBeNull();
      expect(useUserStore.getState().profile).toBeNull();
    });
  });

  describe('useThemeStore', () => {
    it('sets theme mode and synchronizes with nativewind and backend profile', async () => {
      useUserStore.setState({
        token: 'auth-token',
        profile: { id: 'u-1', theme: 'system' } as any,
      });

      await useThemeStore.getState().setThemeMode('dark');

      expect(useThemeStore.getState().themeMode).toBe('dark');
      expect(colorScheme.set).toHaveBeenCalledWith('dark');
      expect(useUserStore.getState().profile?.theme).toBe('dark');
      expect(userService.updateProfile).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('initializeTheme sets color scheme from current store state', () => {
      useThemeStore.setState({ themeMode: 'light' });
      useThemeStore.getState().initializeTheme();
      expect(colorScheme.set).toHaveBeenCalledWith('light');
    });
  });

  describe('clearEntireLocalApp', () => {
    it('clears social auth and logs out of user store', async () => {
      useUserStore.setState({
        token: 'active-token',
        profile: { id: 'u-1' } as any,
      });

      await clearEntireLocalApp();

      expect(clearSocialAuthSession).toHaveBeenCalled();
      expect(useUserStore.getState().token).toBeNull();
      expect(useUserStore.getState().profile).toBeNull();
    });
  });
});
