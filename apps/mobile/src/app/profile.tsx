import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, Stack, Redirect } from 'expo-router';
import { ArrowLeft, LogOut, Shield } from 'lucide-react-native';
import { ProfileAvatarCard } from '@/components/profile/ProfileAvatarCard';
import { ProfileInfoCard } from '@/components/profile/ProfileInfoCard';
import { ProfilePreferencesCard } from '@/components/profile/ProfilePreferencesCard';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';
import { ProfileDangerZoneCard } from '@/components/profile/ProfileDangerZoneCard';
import { useProfileForm } from '@/hooks/useProfileForm';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const {
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
    handleDeleteData,
    handleDeleteAccount,
    handleLogout,
    isUpdatingProfile,
    isUploadingAvatar,
    isChangingPassword,
    isDeletingData,
    isDeletingAccount,
    isPasswordModalVisible,
    passwordInput,
    setPasswordInput,
    handleConfirmPasswordDelete,
    handleCancelPasswordDelete,
  } = useProfileForm();

  if (isHydrated && !token) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('profile.title'),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft size={22} color="#0f172a" />
            </TouchableOpacity>
          ),
          headerRight: () =>
            token ? (
              <TouchableOpacity onPress={handleLogout} className="p-2">
                <LogOut size={20} color="#ef4444" />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 space-y-6">
        {!token && (
          <View className="mb-4 rounded-3xl border border-blue-200 bg-blue-50/80 p-5 dark:border-blue-900/40 dark:bg-blue-950/30">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-blue-600">
                <Shield size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('auth.loginToSync')}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  {t('auth.loginToSyncDesc')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/auth')}
              className="mt-4 items-center justify-center rounded-2xl bg-blue-600 py-3 shadow-md shadow-blue-500/20 active:bg-blue-700"
            >
              <Text className="text-xs font-bold text-white">
                {t('auth.signInBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Avatar Section */}
        <ProfileAvatarCard
          image={userProfile?.image || profile?.image}
          name={userProfile?.name || profile?.name}
          email={userProfile?.email || profile?.email}
          isUploading={isUploadingAvatar}
          onPickAvatar={handlePickAndUploadAvatar}
        />

        {/* Profile Info */}
        <ProfileInfoCard
          name={name}
          onNameChange={setCustomName}
          onSave={handleSaveProfile}
          isSaving={isUpdatingProfile}
        />

        {/* Preferences */}
        <ProfilePreferencesCard
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
        />

        {/* Security / Password */}
        <ProfileSecurityCard
          hasPassword={profile?.hasPassword}
          currentPassword={currentPassword}
          onCurrentPasswordChange={setCurrentPassword}
          newPassword={newPassword}
          onNewPasswordChange={setNewPassword}
          confirmPassword={confirmPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSavePassword={handleSavePassword}
          isSaving={isChangingPassword}
        />

        {/* Danger Zone */}
        <ProfileDangerZoneCard
          onDeleteData={handleDeleteData}
          isDeletingData={isDeletingData}
          onDeleteAccount={handleDeleteAccount}
          isDeletingAccount={isDeletingAccount}
          isPasswordModalVisible={isPasswordModalVisible}
          passwordInput={passwordInput}
          onPasswordInputChange={setPasswordInput}
          onConfirmPasswordDelete={handleConfirmPasswordDelete}
          onCancelPasswordDelete={handleCancelPasswordDelete}
        />

        <View className="h-10" />
      </ScrollView>
    </>
  );
}
