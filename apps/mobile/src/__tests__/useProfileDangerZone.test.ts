// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Alert } from 'react-native';
import { useProfileDangerZone } from '../hooks/useProfileDangerZone';
import { useUserStore } from '../stores/useUserStore';

vi.mock('expo-router', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/social-auth.service', () => ({
  clearSocialAuthSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue({}),
    },
  };
});

vi.mock('../hooks/queries', () => ({
  useDeleteUserData: () => ({
    mutate: vi.fn((_input, opts) => opts?.onSuccess?.()),
    isPending: false,
  }),
  useDeleteAccount: () => ({
    mutate: vi.fn((_input, opts) => opts?.onSuccess?.()),
    isPending: false,
  }),
  useSignOut: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

describe('useProfileDangerZone Hook (Seam 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({
      token: 'tok-active',
      profile: {
        id: 'u_1',
        name: 'User One',
        email: 'user@example.com',
        hasPassword: true,
      } as any,
      rememberMe: true,
      isHydrated: true,
    });
  });

  it('handleDeleteAccount opens password modal when account has password', () => {
    let alertButtons: any[] = [];
    vi.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons: any) => {
        alertButtons = buttons;
      },
    );

    const { result } = renderHook(() => useProfileDangerZone());

    act(() => {
      result.current.handleDeleteAccount();
    });

    expect(result.current.isPasswordModalVisible).toBe(false);

    // Confirm in the Alert dialog
    const deleteBtn = alertButtons.find((b) => b.style === 'destructive');
    expect(deleteBtn).toBeDefined();

    act(() => {
      deleteBtn.onPress();
    });

    expect(result.current.isPasswordModalVisible).toBe(true);
  });

  it('handleLogout clears local app storage and resets user store upon confirmation', async () => {
    let alertButtons: any[] = [];
    vi.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons: any) => {
        alertButtons = buttons;
      },
    );

    const { result } = renderHook(() => useProfileDangerZone());

    act(() => {
      result.current.handleLogout();
    });

    const confirmBtn = alertButtons.find((b) => b.style === 'destructive');
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      await confirmBtn.onPress();
    });

    expect(useUserStore.getState().token).toBeNull();
    expect(useUserStore.getState().profile).toBeNull();
  });
});
