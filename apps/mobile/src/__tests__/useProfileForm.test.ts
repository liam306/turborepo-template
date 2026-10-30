// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Alert } from 'react-native';
import { useProfileForm } from '../hooks/useProfileForm';
import { useUserStore } from '../stores/useUserStore';

const { mockRequestPermissions, mockLaunchLibrary } = vi.hoisted(() => ({
  mockRequestPermissions: vi.fn(),
  mockLaunchLibrary: vi.fn(),
}));

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: mockRequestPermissions,
  launchImageLibraryAsync: mockLaunchLibrary,
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

vi.mock('../services/social-auth.service', () => ({
  clearSocialAuthSession: vi.fn().mockResolvedValue(undefined),
  signInGoogle: vi.fn().mockResolvedValue({ token: 'mock-token' }),
}));

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

const mockUpdateProfileMutate = vi.fn();
const mockUploadAvatarMutate = vi.fn();
const mockSetPasswordMutate = vi.fn();
const mockChangePasswordMutate = vi.fn();

vi.mock('@/hooks/queries', () => ({
  useUserProfile: vi.fn(() => ({
    data: {
      id: 'usr_1',
      name: 'John Doe',
      email: 'john@example.com',
      image: null,
      hasPassword: true,
      role: 'user',
      locale: 'en',
      theme: 'system',
      providers: ['credential'],
    },
  })),
  useUpdateProfile: () => ({
    mutate: mockUpdateProfileMutate,
    isPending: false,
  }),
  useUploadAvatar: () => ({
    mutate: mockUploadAvatarMutate,
    isPending: false,
  }),
  useSetPassword: () => ({
    mutate: mockSetPasswordMutate,
    isPending: false,
  }),
  useChangePassword: () => ({
    mutate: mockChangePasswordMutate,
    isPending: false,
  }),
}));

vi.mock('../hooks/useProfileDangerZone', () => ({
  useProfileDangerZone: () => ({
    handleDeleteAccount: vi.fn(),
    handleDeleteUserData: vi.fn(),
    isDeletingAccount: false,
    isDeletingUserData: false,
  }),
}));

describe('useProfileForm', () => {
  let alertSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});

    useUserStore.setState({
      token: 'valid-token',
      profile: {
        id: 'usr_1',
        name: 'John Doe',
        email: 'john@example.com',
        emailVerified: true,
        image: null,
        hasPassword: true,
        role: 'user',
        locale: 'en',
        theme: 'system',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        providers: ['credential'],
      },
    });
  });

  describe('Avatar Picker and Upload', () => {
    it('alerts permission denied when media library permission is not granted', async () => {
      mockRequestPermissions.mockResolvedValueOnce({
        granted: false,
        status: 'denied',
        canAskAgain: true,
        expires: 'never',
      });

      const { result } = renderHook(() => useProfileForm());

      await act(async () => {
        await result.current.handlePickAndUploadAvatar();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/Quyền truy cập bị từ chối|permission denied/i),
      );
      expect(mockUploadAvatarMutate).not.toHaveBeenCalled();
    });

    it('returns early when user cancels image picker', async () => {
      mockRequestPermissions.mockResolvedValueOnce({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      });
      mockLaunchLibrary.mockResolvedValueOnce({
        canceled: true,
        assets: null,
      });

      const { result } = renderHook(() => useProfileForm());

      await act(async () => {
        await result.current.handlePickAndUploadAvatar();
      });

      expect(mockUploadAvatarMutate).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('returns early when picker returns no assets', async () => {
      mockRequestPermissions.mockResolvedValueOnce({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      });
      mockLaunchLibrary.mockResolvedValueOnce({
        canceled: false,
        assets: [],
      });

      const { result } = renderHook(() => useProfileForm());

      await act(async () => {
        await result.current.handlePickAndUploadAvatar();
      });

      expect(mockUploadAvatarMutate).not.toHaveBeenCalled();
    });

    it('submits multipart FormData and handles upload success', async () => {
      mockRequestPermissions.mockResolvedValueOnce({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      });
      mockLaunchLibrary.mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/my-avatar.png',
            width: 500,
            height: 500,
          },
        ],
      });

      mockUploadAvatarMutate.mockImplementationOnce((_formData, options) => {
        options?.onSuccess?.({
          avatarUrl: 'https://cdn.example.com/new-avatar.webp',
        });
      });

      const { result } = renderHook(() => useProfileForm());

      await act(async () => {
        await result.current.handlePickAndUploadAvatar();
      });

      expect(mockUploadAvatarMutate).toHaveBeenCalledTimes(1);
      const passedFormData = mockUploadAvatarMutate.mock.calls[0][0];
      expect(passedFormData).toBeInstanceOf(FormData);
      expect(useUserStore.getState().profile?.image).toBe(
        'https://cdn.example.com/new-avatar.webp',
      );
      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/Cập nhật ảnh đại diện thành công|avatar/i),
      );
    });

    it('handles upload mutation error', async () => {
      mockRequestPermissions.mockResolvedValueOnce({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      });
      mockLaunchLibrary.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file:///path/avatar.jpg', width: 200, height: 200 }],
      });

      mockUploadAvatarMutate.mockImplementationOnce((_formData, options) => {
        options?.onError?.(new Error('Payload too large'));
      });

      const { result } = renderHook(() => useProfileForm());

      await act(async () => {
        await result.current.handlePickAndUploadAvatar();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        'Payload too large',
      );
    });
  });

  describe('Profile Name Updates', () => {
    it('alerts error when saving empty name', () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setCustomName('   ');
      });

      act(() => {
        result.current.handleSaveProfile();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/Vui lòng nhập họ và tên|name required/i),
      );
      expect(mockUpdateProfileMutate).not.toHaveBeenCalled();
    });

    it('submits updated name and updates user store on success', () => {
      mockUpdateProfileMutate.mockImplementationOnce((payload, options) => {
        options?.onSuccess?.({
          ...useUserStore.getState().profile,
          name: payload.name,
        });
      });

      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setCustomName('Alice Wonderland');
      });

      act(() => {
        result.current.handleSaveProfile();
      });

      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        { name: 'Alice Wonderland' },
        expect.any(Object),
      );
      expect(useUserStore.getState().profile?.name).toBe('Alice Wonderland');
      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/Cập nhật hồ sơ thành công|profile updated/i),
      );
    });
  });

  describe('Password Setup and Change', () => {
    it('validates current password when account already has password', () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setNewPassword('ValidPassword123');
        result.current.setConfirmPassword('ValidPassword123');
      });

      act(() => {
        result.current.handleSavePassword();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(
          /Vui lòng nhập mật khẩu hiện tại|current password/i,
        ),
      );
      expect(mockChangePasswordMutate).not.toHaveBeenCalled();
    });

    it('validates minimum password length', () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setCurrentPassword('oldpass123');
        result.current.setNewPassword('short');
        result.current.setConfirmPassword('short');
      });

      act(() => {
        result.current.handleSavePassword();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/Mật khẩu phải có ít nhất 8 ký tự|8 characters/i),
      );
    });

    it('validates password mismatch', () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setCurrentPassword('oldpass123');
        result.current.setNewPassword('ValidPassword123');
        result.current.setConfirmPassword('MismatchPassword123');
      });

      act(() => {
        result.current.handleSavePassword();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(
          /Mật khẩu xác nhận không khớp|password mismatch/i,
        ),
      );
    });

    it('calls changePasswordMutation when account has password', () => {
      mockChangePasswordMutate.mockImplementationOnce((_payload, options) => {
        options?.onSuccess?.({ message: 'Password changed successfully' });
      });

      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setCurrentPassword('oldpass123');
        result.current.setNewPassword('ValidPassword123');
        result.current.setConfirmPassword('ValidPassword123');
      });

      act(() => {
        result.current.handleSavePassword();
      });

      expect(mockChangePasswordMutate).toHaveBeenCalledWith(
        {
          currentPassword: 'oldpass123',
          newPassword: 'ValidPassword123',
        },
        expect.any(Object),
      );
      expect(result.current.newPassword).toBe('');
      expect(result.current.confirmPassword).toBe('');
      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        'Password changed successfully',
      );
    });

    it('calls setPasswordMutation when account does not have password', () => {
      useUserStore.setState({
        profile: {
          ...useUserStore.getState().profile!,
          hasPassword: false,
        },
      });

      mockSetPasswordMutate.mockImplementationOnce((_payload, options) => {
        options?.onSuccess?.({ message: 'Password set' });
      });

      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setNewPassword('ValidPassword123');
        result.current.setConfirmPassword('ValidPassword123');
      });

      act(() => {
        result.current.handleSavePassword();
      });

      expect(mockSetPasswordMutate).toHaveBeenCalledWith(
        { newPassword: 'ValidPassword123' },
        expect.any(Object),
      );
      expect(mockChangePasswordMutate).not.toHaveBeenCalled();
    });
  });
});
