// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useUserProfile,
  useUpdateProfile,
  useUploadAvatar,
  useDeleteAccount,
  userKeys,
} from '../hooks/queries/useUserQuery';
import { userService } from '../services/user.service';

vi.mock('../services/user.service', () => ({
  userService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    setPassword: vi.fn(),
    changePassword: vi.fn(),
    deleteUserData: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, Wrapper };
}

describe('Mobile useUserQuery with Real React Query Client (Seam 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useUserProfile fetches and caches profile data', async () => {
    const mockProfile = {
      id: 'm_1',
      name: 'Mobile User',
      email: 'm1@example.com',
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

    vi.mocked(userService.getProfile).mockResolvedValueOnce(mockProfile);
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
    expect(queryClient.getQueryData(userKeys.profile())).toEqual(mockProfile);
  });

  it('useUpdateProfile updates profile cache on success', async () => {
    const initialProfile = {
      id: 'm_1',
      name: 'Old Name',
      email: 'm1@example.com',
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

    const updatedProfile = { ...initialProfile, name: 'Updated Mobile Name' };
    vi.mocked(userService.updateProfile).mockResolvedValueOnce(updatedProfile);

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(userKeys.profile(), initialProfile);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ name: 'Updated Mobile Name' });

    expect(queryClient.getQueryData(userKeys.profile())).toEqual(
      updatedProfile,
    );
  });

  it('useUploadAvatar invalidates profile query on success', async () => {
    vi.mocked(userService.uploadAvatar).mockResolvedValueOnce({
      avatarUrl: 'https://cdn.example.com/mobile-avatar.webp',
    });

    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync(new FormData());

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: userKeys.profile(),
    });
  });

  it('useDeleteAccount clears the query client cache on success', async () => {
    vi.mocked(userService.deleteAccount).mockResolvedValueOnce({
      message: 'Account deleted',
    });

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(['cached_key'], { value: 123 });
    const clearSpy = vi.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({});

    expect(clearSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(['cached_key'])).toBeUndefined();
  });
});
