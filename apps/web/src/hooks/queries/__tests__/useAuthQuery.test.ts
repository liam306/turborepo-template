import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useSignInEmail,
  useSignUpEmail,
  useSignOut,
  useSignInSocial,
} from '../useAuthQuery';
import { authClient } from '@/lib/auth-client';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
      social: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    clear: vi.fn(),
  })),
  useMutation: vi.fn((options) => ({
    mutateAsync: options.mutationFn,
    mutate: options.mutationFn,
    options,
  })),
}));

describe('useAuthQuery (Seam 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useSignInEmail calls authClient.signIn.email', async () => {
    const mockRes = { data: { user: { id: '1' } }, error: null };
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce(mockRes as any);

    const hook = useSignInEmail();
    const payload = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
      callbackURL: 'http://localhost:3000/dashboard',
    };

    const res = await hook.mutateAsync(payload);

    expect(authClient.signIn.email).toHaveBeenCalledWith(payload);
    expect(res).toEqual(mockRes.data);
  });

  it('useSignUpEmail calls authClient.signUp.email', async () => {
    const mockRes = { data: { user: { id: '2' } }, error: null };
    vi.mocked(authClient.signUp.email).mockResolvedValueOnce(mockRes as any);

    const hook = useSignUpEmail();
    const payload = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      callbackURL: 'http://localhost:3000/verify-email',
    };

    const res = await hook.mutateAsync(payload);

    expect(authClient.signUp.email).toHaveBeenCalledWith(payload);
    expect(res).toEqual(mockRes.data);
  });

  it('useSignInSocial calls authClient.signIn.social', async () => {
    const mockRes = { data: { url: 'http://example.com' }, error: null };
    vi.mocked(authClient.signIn.social).mockResolvedValueOnce(mockRes as any);

    const hook = useSignInSocial();
    const payload = {
      provider: 'google' as const,
      callbackURL: 'http://localhost:3000/dashboard',
    };

    const res = await hook.mutateAsync(payload);

    expect(authClient.signIn.social).toHaveBeenCalledWith(payload);
    expect(res).toEqual(mockRes.data);
  });

  it('useSignOut calls authClient.signOut', async () => {
    vi.mocked(authClient.signOut).mockResolvedValueOnce({} as any);

    const hook = useSignOut();
    await hook.mutateAsync();

    expect(authClient.signOut).toHaveBeenCalled();
  });
});
