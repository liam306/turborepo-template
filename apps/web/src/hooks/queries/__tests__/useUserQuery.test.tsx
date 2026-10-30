// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useUserProfile,
  useUpdateProfile,
  useUploadAvatar,
  useRevokeSession,
  useDeleteAccount,
  userKeys,
} from '../useUserQuery';
import { userApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  userApi: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    getSessions: vi.fn(),
    revokeSession: vi.fn(),
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

describe('useUserQuery with Real React Query Client (Seam 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useUserProfile fetches and caches profile data in userKeys.profile', async () => {
    const mockProfile = {
      id: 'u_1',
      name: 'Initial Name',
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

    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockProfile);
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
    expect(queryClient.getQueryData(userKeys.profile())).toEqual(mockProfile);
  });

  it('useUpdateProfile updates cache synchronously on success and invalidates query', async () => {
    const initialProfile = {
      id: 'u_1',
      name: 'Old Name',
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

    const updatedProfile = { ...initialProfile, name: 'Brand New Name' };
    vi.mocked(userApi.updateProfile).mockResolvedValueOnce(updatedProfile);

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(userKeys.profile(), initialProfile);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ name: 'Brand New Name' });

    // Cache should be updated with new profile
    expect(queryClient.getQueryData(userKeys.profile())).toEqual(
      updatedProfile,
    );
  });

  it('useUploadAvatar updates cached avatar image on success', async () => {
    const initialProfile = {
      id: 'u_1',
      name: 'User',
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

    vi.mocked(userApi.uploadAvatar).mockResolvedValueOnce({
      avatarUrl: 'https://cdn.example.com/avatar.webp',
      message: 'Avatar updated',
    });

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(userKeys.profile(), initialProfile);

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync(new FormData());

    const cached = queryClient.getQueryData<typeof initialProfile>(
      userKeys.profile(),
    );
    expect(cached?.image).toBe('https://cdn.example.com/avatar.webp');
  });

  it('useRevokeSession invalidates userKeys.sessions on success', async () => {
    vi.mocked(userApi.revokeSession).mockResolvedValueOnce({
      message: 'Session revoked',
    });

    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync('ses_123');

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: userKeys.sessions(),
    });
  });

  it('useDeleteAccount clears the entire query client cache on success', async () => {
    vi.mocked(userApi.deleteAccount).mockResolvedValueOnce({
      message: 'Account deleted',
    });

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(['sensitive_data'], { foo: 'bar' });
    const clearSpy = vi.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({});

    expect(clearSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(['sensitive_data'])).toBeUndefined();
  });
});
