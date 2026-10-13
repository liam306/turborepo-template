import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import { clearAllLocalUserData, clearEntireLocalApp } from '@/stores/clearData';
import { useDeleteUserData, useDeleteAccount } from '@/hooks/queries';

export function useProfileDangerZone() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, logout } = useUserStore();

  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const deleteDataMutation = useDeleteUserData();
  const deleteAccountMutation = useDeleteAccount();

  const handleDeleteData = () => {
    Alert.alert(
      t('profile.deleteDataConfirmTitle'),
      t('profile.deleteDataConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteDataMutation.mutate(undefined, {
              onSuccess: async () => {
                await clearAllLocalUserData();
                Alert.alert(
                  t('common.appName'),
                  t('profile.deleteDataSuccess'),
                );
              },
              onError: (err: unknown) => {
                Alert.alert(
                  t('common.appName'),
                  err instanceof Error
                    ? err.message
                    : t('profile.errorOccurred'),
                );
              },
            });
          },
        },
      ],
    );
  };

  const performDeleteAccount = (password?: string) => {
    deleteAccountMutation.mutate(
      { password },
      {
        onSuccess: async () => {
          setIsPasswordModalVisible(false);
          setPasswordInput('');
          await clearEntireLocalApp();
          Alert.alert(t('common.appName'), t('profile.deleteAccountSuccess'), [
            {
              text: t('common.ok'),
              onPress: () => router.replace('/'),
            },
          ]);
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

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountConfirmTitle'),
      t('profile.deleteAccountConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            if (profile?.hasPassword) {
              setPasswordInput('');
              setIsPasswordModalVisible(true);
            } else {
              performDeleteAccount();
            }
          },
        },
      ],
    );
  };

  const handleConfirmPasswordDelete = () => {
    if (!passwordInput.trim()) {
      Alert.alert(
        t('common.appName'),
        t('profile.deleteAccountPasswordPrompt'),
      );
      return;
    }
    performDeleteAccount(passwordInput);
  };

  const handleCancelPasswordDelete = () => {
    setIsPasswordModalVisible(false);
    setPasswordInput('');
  };

  const handleLogout = () => {
    Alert.alert(t('common.appName'), t('profile.logoutPrompt'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        style: 'destructive',
        onPress: async () => {
          await clearEntireLocalApp();
          logout();
          router.replace('/');
        },
      },
    ]);
  };

  return {
    handleDeleteData,
    handleDeleteAccount,
    handleLogout,
    isDeletingData: deleteDataMutation.isPending,
    isDeletingAccount: deleteAccountMutation.isPending,
    isPasswordModalVisible,
    passwordInput,
    setPasswordInput,
    handleConfirmPasswordDelete,
    handleCancelPasswordDelete,
  };
}
