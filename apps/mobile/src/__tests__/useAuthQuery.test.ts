import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSignInGoogle } from '../hooks/queries/useAuthQuery';
import { signInGoogle } from '../services/social-auth.service';

vi.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'vi' }],
}));
vi.mock('expo-constants', () => ({
  default: { expoConfig: {} },
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/social-auth.service', () => ({
  signInGoogle: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options) => ({
    mutateAsync: options.mutationFn,
    mutate: options.mutationFn,
    options,
  })),
}));

describe('useAuthQuery mobile (Seam 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useSignInGoogle calls signInGoogle service', async () => {
    const mockAuthResponse = { token: 'google-token' };
    vi.mocked(signInGoogle).mockResolvedValueOnce(mockAuthResponse);

    const hook = useSignInGoogle();
    const result = await hook.mutateAsync();

    expect(signInGoogle).toHaveBeenCalled();
    expect(result).toEqual(mockAuthResponse);
  });
});
