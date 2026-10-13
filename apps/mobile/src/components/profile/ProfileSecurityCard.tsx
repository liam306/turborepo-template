import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Shield } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface ProfileSecurityCardProps {
  hasPassword?: boolean;
  currentPassword: string;
  onCurrentPasswordChange: (text: string) => void;
  newPassword: string;
  onNewPasswordChange: (text: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (text: string) => void;
  onSavePassword: () => void;
  isSaving: boolean;
}

export function ProfileSecurityCard({
  hasPassword,
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  onSavePassword,
  isSaving,
}: ProfileSecurityCardProps) {
  const { t } = useTranslation();

  return (
    <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <View className="flex-row items-center space-x-2">
        <Shield size={18} color="#059669" />
        <Text className="font-semibold text-slate-800 dark:text-slate-200">
          {t('profile.securityTitle')}
        </Text>
      </View>

      <Text className="text-xs text-slate-500">
        {hasPassword ? t('profile.hasPassword') : t('profile.noPassword')}
      </Text>

      {hasPassword && (
        <TextInput
          value={currentPassword}
          onChangeText={onCurrentPasswordChange}
          placeholder={t('profile.currentPassword')}
          secureTextEntry
          className="w-full bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
        />
      )}

      <TextInput
        value={newPassword}
        onChangeText={onNewPasswordChange}
        placeholder={t('profile.newPassword')}
        secureTextEntry
        className="w-full bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
      />

      <TextInput
        value={confirmPassword}
        onChangeText={onConfirmPasswordChange}
        placeholder={t('profile.confirmNewPassword')}
        secureTextEntry
        className="w-full bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
      />

      <TouchableOpacity
        onPress={onSavePassword}
        disabled={isSaving}
        className="bg-emerald-600 p-3.5 rounded-2xl items-center shadow-sm"
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text className="text-white font-medium text-sm">
            {hasPassword
              ? t('profile.changePassword')
              : t('profile.setPassword')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
