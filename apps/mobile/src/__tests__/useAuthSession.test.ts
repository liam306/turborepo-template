// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthSession } from '../hooks/useAuthSession';
import { useUserStore } from '../stores/useUserStore';
import * as apiClient from '../services/apiClient';
import * as analytics from '../services/analytics';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/analytics', () => ({
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
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

describe('useAuthSession Hook (Seam 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({
      token: null,
      profile: null,
      rememberMe: true,
      isHydrated: false,
    });
  });

  it('refreshes auth session on cold start when hydrated with active token and rememberMe=true', () => {
    const refreshSpy = vi
      .spyOn(apiClient, 'refreshAuthSession')
      .mockResolvedValue('new-token');

    useUserStore.setState({
      token: 'persisted-token',
      rememberMe: true,
      isHydrated: true,
    });

    renderHook(() => useAuthSession());

    expect(refreshSpy).toHaveBeenCalled();
  });

  it('logs out on cold start when hydrated with active token but rememberMe=false', () => {
    const logoutSpy = vi.spyOn(useUserStore.getState(), 'logout');
    const refreshSpy = vi.spyOn(apiClient, 'refreshAuthSession');

    useUserStore.setState({
      token: 'session-token',
      rememberMe: false,
      isHydrated: true,
    });

    renderHook(() => useAuthSession());

    expect(logoutSpy).toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('syncs user profile identification with PostHog analytics', () => {
    useUserStore.setState({
      token: 'tok-1',
      profile: {
        id: 'usr_123',
        name: 'Tester',
        email: 'test@example.com',
        role: 'user',
      } as any,
      isHydrated: true,
    });

    renderHook(() => useAuthSession());

    expect(analytics.identifyUser).toHaveBeenCalledWith('usr_123', {
      name: 'Tester',
      email: 'test@example.com',
      role: 'user',
    });
  });

  it('triggers session refresh when app transitions from background to foreground', () => {
    const refreshSpy = vi
      .spyOn(apiClient, 'refreshAuthSession')
      .mockResolvedValue('refreshed-token');

    let listener: ((status: AppStateStatus) => void) | undefined;
    vi.spyOn(AppState, 'addEventListener').mockImplementation(
      (_event, cb: any) => {
        listener = cb;
        return { remove: vi.fn() } as any;
      },
    );

    useUserStore.setState({
      token: 'active-tok',
      rememberMe: true,
      isHydrated: true,
    });

    renderHook(() => useAuthSession());

    // Simulate transition: background -> active
    listener?.('background');
    listener?.('active');

    expect(refreshSpy).toHaveBeenCalled();
  });

  it('cleans up AppState event listener on unmount', () => {
    const removeSpy = vi.fn();
    vi.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: removeSpy,
    } as any);

    const { unmount } = renderHook(() => useAuthSession());
    unmount();

    expect(removeSpy).toHaveBeenCalled();
  });
});
