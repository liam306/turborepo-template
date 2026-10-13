import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSocialAuthSession,
  signInGoogle,
} from '../services/social-auth.service';

const mocks = vi.hoisted(() => ({
  social: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock('better-auth/react', () => ({
  createAuthClient: () => ({
    signIn: { social: mocks.social },
    getSession: mocks.getSession,
    signOut: mocks.signOut,
  }),
}));
vi.mock('@better-auth/expo/client', () => ({ expoClient: vi.fn() }));
vi.mock('expo-secure-store', () => ({
  deleteItemAsync: mocks.deleteItemAsync,
}));
vi.mock('expo-linking', () => ({ createURL: () => 'starter-dev:///' }));
vi.mock('../services/apiClient', () => ({
  API_BASE_URL: 'http://localhost:4000',
}));
vi.mock('../i18n', () => ({
  default: { language: 'en', t: (key: string) => key },
}));

describe('Google OAuth session bridge', () => {
  beforeEach(() => vi.resetAllMocks());

  it('starts OAuth with locale and resolves the resulting bearer session', async () => {
    mocks.social.mockResolvedValue({ error: null });
    mocks.getSession.mockResolvedValue({
      data: { session: { token: 'session-token' } },
      error: null,
    });
    expect(await signInGoogle()).toEqual({ token: 'session-token' });
    expect(mocks.social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: 'starter-dev:///',
      fetchOptions: { headers: { 'x-lang': 'en' } },
    });
    expect(mocks.getSession).toHaveBeenCalledWith({
      fetchOptions: { headers: { 'x-lang': 'en' } },
    });
  });

  it('does not query a session after provider failure', async () => {
    mocks.social.mockResolvedValue({
      error: { message: 'Provider unavailable' },
    });
    await expect(signInGoogle()).rejects.toThrow('Provider unavailable');
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('rejects callbacks without a session', async () => {
    mocks.social.mockResolvedValue({ error: null });
    mocks.getSession.mockResolvedValue({ data: null, error: null });
    await expect(signInGoogle()).rejects.toThrow('auth.authFailed');
  });

  it('forwards locale when signing out the OAuth cookie session', async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await clearSocialAuthSession();
    expect(mocks.signOut).toHaveBeenCalledWith({
      fetchOptions: { headers: { 'x-lang': 'en' } },
    });
    expect(mocks.deleteItemAsync).toHaveBeenCalledWith('app_oauth_cookie');
    expect(mocks.deleteItemAsync).toHaveBeenCalledWith(
      'app_oauth_session_data',
    );
  });

  it('clears secure cookie storage even when offline logout fails', async () => {
    mocks.signOut.mockRejectedValue(new Error('Offline'));
    await expect(clearSocialAuthSession()).rejects.toThrow('Offline');
    expect(mocks.deleteItemAsync).toHaveBeenCalledWith('app_oauth_cookie');
    expect(mocks.deleteItemAsync).toHaveBeenCalledWith(
      'app_oauth_session_data',
    );
  });
});
