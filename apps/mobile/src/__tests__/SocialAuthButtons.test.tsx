// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Platform } from 'react-native';
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons';

const { mockAppleSignIn, mockSignInGoogle, mockSignInSocial } = vi.hoisted(
  () => ({
    mockAppleSignIn: vi.fn(),
    mockSignInGoogle: vi.fn(),
    mockSignInSocial: vi.fn(),
  }),
);

vi.mock('@/hooks/queries', () => ({
  useSignInGoogle: () => ({
    mutateAsync: mockSignInGoogle,
    isPending: false,
  }),
  useSignInSocial: () => ({
    mutateAsync: mockSignInSocial,
    isPending: false,
  }),
}));

vi.mock('expo-apple-authentication', () => ({
  signInAsync: mockAppleSignIn,
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
}));

describe('SocialAuthButtons Component', () => {
  const defaultProps = {
    isDark: false,
    onSuccess: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Platform.OS = 'web';
  });

  afterEach(() => {
    cleanup();
  });

  describe('Google Authentication', () => {
    it('triggers Google OAuth and calls onSuccess when successful', async () => {
      mockSignInGoogle.mockResolvedValueOnce({ token: 'mock-google-token' });

      const { getByText } = render(<SocialAuthButtons {...defaultProps} />);
      const googleBtn = getByText(/Google/i);
      fireEvent.click(googleBtn);

      await waitFor(() => {
        expect(mockSignInGoogle).toHaveBeenCalledTimes(1);
        expect(defaultProps.onSuccess).toHaveBeenCalledWith({
          token: 'mock-google-token',
        });
        expect(defaultProps.onError).not.toHaveBeenCalled();
      });
    });

    it('calls onError when Google OAuth fails', async () => {
      mockSignInGoogle.mockRejectedValueOnce(new Error('User closed browser'));

      const { getByText } = render(<SocialAuthButtons {...defaultProps} />);
      const googleBtn = getByText(/Google/i);
      fireEvent.click(googleBtn);

      await waitFor(() => {
        expect(mockSignInGoogle).toHaveBeenCalledTimes(1);
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'User closed browser',
        );
        expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Apple Authentication (iOS)', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('renders Apple button on iOS and completes login with identityToken', async () => {
      mockAppleSignIn.mockResolvedValueOnce({
        identityToken: 'mock-apple-identity-token',
        authorizationCode: 'auth-code',
        fullName: null,
        email: null,
        realUserStatus: 1,
        state: null,
        user: 'apple-user-id',
      });
      mockSignInSocial.mockResolvedValueOnce({ token: 'mock-backend-jwt' });

      const { getByText } = render(<SocialAuthButtons {...defaultProps} />);
      const appleBtn = getByText(/Apple/i);
      fireEvent.click(appleBtn);

      await waitFor(() => {
        expect(mockAppleSignIn).toHaveBeenCalledWith({
          requestedScopes: [0, 1],
        });
        expect(mockSignInSocial).toHaveBeenCalledWith({
          provider: 'apple',
          idToken: 'mock-apple-identity-token',
        });
        expect(defaultProps.onSuccess).toHaveBeenCalledWith({
          token: 'mock-backend-jwt',
        });
        expect(defaultProps.onError).not.toHaveBeenCalled();
      });
    });

    it('silently ignores cancellation without calling onError (ERR_REQUEST_CANCELED)', async () => {
      const cancelError: any = new Error('User canceled');
      cancelError.code = 'ERR_REQUEST_CANCELED';
      mockAppleSignIn.mockRejectedValueOnce(cancelError);

      const { getByText } = render(<SocialAuthButtons {...defaultProps} />);
      const appleBtn = getByText(/Apple/i);
      fireEvent.click(appleBtn);

      await waitFor(() => {
        expect(mockAppleSignIn).toHaveBeenCalledTimes(1);
        expect(defaultProps.onError).not.toHaveBeenCalled();
        expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      });
    });

    it('does not trigger backend social auth if identityToken is missing', async () => {
      mockAppleSignIn.mockResolvedValueOnce({
        identityToken: null,
        authorizationCode: 'auth-code',
        fullName: null,
        email: null,
        realUserStatus: 1,
        state: null,
        user: 'apple-user-id',
      });

      const { getByText } = render(<SocialAuthButtons {...defaultProps} />);
      const appleBtn = getByText(/Apple/i);
      fireEvent.click(appleBtn);

      await waitFor(() => {
        expect(mockAppleSignIn).toHaveBeenCalledTimes(1);
        expect(mockSignInSocial).not.toHaveBeenCalled();
        expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      });
    });

    it('calls onError when Apple sign in encounters a provider error', async () => {
      const providerError: any = new Error('Apple authorization failed');
      providerError.code = 'ERR_FAILED';
      mockAppleSignIn.mockRejectedValueOnce(providerError);

      const { getByText } = render(<SocialAuthButtons {...defaultProps} />);
      const appleBtn = getByText(/Apple/i);
      fireEvent.click(appleBtn);

      await waitFor(() => {
        expect(mockAppleSignIn).toHaveBeenCalledTimes(1);
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Apple authorization failed',
        );
      });
    });
  });
});
