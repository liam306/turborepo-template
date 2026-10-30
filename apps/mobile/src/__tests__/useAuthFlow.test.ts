// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Alert } from 'react-native';
import { useAuthFlow } from '../hooks/useAuthFlow';
import { useUserStore } from '../stores/useUserStore';

vi.mock('expo-router', () => ({
  router: {
    replace: vi.fn(),
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../hooks/queries', () => ({
  useSignInEmail: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSignUpEmail: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('useAuthFlow Hook (Seam 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({
      token: null,
      profile: null,
      rememberMe: true,
      isHydrated: true,
    });
  });

  it('initializes with default login credentials state', () => {
    const { result } = renderHook(() => useAuthFlow());

    expect(result.current.isSignUp).toBe(false);
    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.rememberMe).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('triggers validation alert if email or password is empty on submit', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert');
    const { result } = renderHook(() => useAuthFlow());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(alertSpy).toHaveBeenCalled();
  });

  it('handleAuthSuccess updates store with received token and profile', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert');
    const { result } = renderHook(() => useAuthFlow());

    await act(async () => {
      await result.current.handleAuthSuccess({
        token: 'auth_token_xyz',
        user: {
          id: 'usr_xyz',
          name: 'Jane Doe',
          email: 'jane@example.com',
          emailVerified: true,
          role: 'user',
        },
      });
    });

    expect(useUserStore.getState().token).toBe('auth_token_xyz');
    expect(useUserStore.getState().profile?.name).toBe('Jane Doe');
    expect(alertSpy).toHaveBeenCalled();
  });
});
