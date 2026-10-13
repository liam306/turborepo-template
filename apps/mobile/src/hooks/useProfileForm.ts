import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/useUserStore';
import { useThemeStore } from '@/stores/useThemeStore';
import {
  useUserProfile,
  useUpdateProfile,
  useUploadAvatar,
  useSetPassword,
  useChangePassword,
} from '@/hooks/queries';
import type { IAvatarUploadResponse, IUserProfile } from '@repo/types';
import { useProfileDangerZone } from './useProfileDangerZone';

export function useProfileForm() {
  const { t } = useTranslation();

  const {
    profile,
    token,
    isHydrated,
    updateProfileName,
    updateAvatarUrl,
    setProfile,
  } = useUserStore();
  const { themeMode, setThemeMode } = useThemeStore();

  const { data: userProfile } = useUserProfile(Boolean(token));
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();
  const setPasswordMutation = useSetPassword();
  const changePasswordMutation = useChangePassword();

  const dangerZone = useProfileDangerZone();

  const [customName, setCustomName] = useState<string | null>(null);
  const name = customName ?? userProfile?.name ?? profile?.name ?? '';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePickAndUploadAvatar = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(t('common.appName'), t('profile.permissionDenied'));
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return;
      }

      const localUri = pickerResult.assets[0].uri;
      const filename = localUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri: localUri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);

      uploadAvatarMutation.mutate(formData, {
        onSuccess: (res: IAvatarUploadResponse) => {
          updateAvatarUrl(res.avatarUrl);
          Alert.alert(t('common.appName'), t('profile.successAvatar'));
        },
        onError: (err: unknown) => {
          Alert.alert(
            t('common.appName'),
            err instanceof Error ? err.message : t('profile.errorOccurred'),
          );
        },
      });
    } catch (err: unknown) {
      Alert.alert(
        t('common.appName'),
        err instanceof Error ? err.message : t('profile.errorOccurred'),
      );
    }
  };

  const handleSaveProfile = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('common.appName'), t('profile.nameRequired'));
      return;
    }

    updateProfileMutation.mutate(
      { name: trimmed },
      {
        onSuccess: (updated: IUserProfile) => {
          setProfile(updated);
          updateProfileName(trimmed);
          Alert.alert(t('common.appName'), t('profile.successUpdate'));
        },
        onError: (err: unknown) => {
          Alert.alert(
            t('common.appName'),
            err instanceof Error ? err.message : t('profile.errorOccurred'),
          );
        },
      },
    );
  };

  const handleSavePassword = () => {
    if (profile?.hasPassword && !currentPassword) {
      Alert.alert(t('common.appName'), t('profile.currentPasswordRequired'));
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      Alert.alert(t('common.appName'), t('profile.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.appName'), t('profile.passwordMismatch'));
      return;
    }

    const hasPassword = profile?.hasPassword;

    if (hasPassword) {
      changePasswordMutation.mutate(
        { currentPassword, newPassword },
        {
          onSuccess: (res: { message?: string }) => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            Alert.alert(
              t('common.appName'),
              res.message || t('profile.successPassword'),
            );
          },
          onError: (err: unknown) => {
            Alert.alert(
              t('common.appName'),
              err instanceof Error ? err.message : t('profile.errorOccurred'),
            );
          },
        },
      );
    } else {
      setPasswordMutation.mutate(
        { newPassword },
        {
          onSuccess: (res: { message?: string }) => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            if (profile) {
              setProfile({ ...profile, hasPassword: true });
            }
            Alert.alert(
              t('common.appName'),
              res.message || t('profile.successPassword'),
            );
          },
          onError: (err: unknown) => {
            Alert.alert(
              t('common.appName'),
              err instanceof Error ? err.message : t('profile.errorOccurred'),
            );
          },
        },
      );
    }
  };

  return {
    profile,
    userProfile,
    token,
    isHydrated,
    themeMode,
    setThemeMode,
    name,
    setCustomName,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    handlePickAndUploadAvatar,
    handleSaveProfile,
    handleSavePassword,
    handleDeleteData: dangerZone.handleDeleteData,
    handleDeleteAccount: dangerZone.handleDeleteAccount,
    handleLogout: dangerZone.handleLogout,
    isUpdatingProfile: updateProfileMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    isChangingPassword:
      setPasswordMutation.isPending || changePasswordMutation.isPending,
    isDeletingData: dangerZone.isDeletingData,
    isDeletingAccount: dangerZone.isDeletingAccount,
    isPasswordModalVisible: dangerZone.isPasswordModalVisible,
    passwordInput: dangerZone.passwordInput,
    setPasswordInput: dangerZone.setPasswordInput,
    handleConfirmPasswordDelete: dangerZone.handleConfirmPasswordDelete,
    handleCancelPasswordDelete: dangerZone.handleCancelPasswordDelete,
  };
}
