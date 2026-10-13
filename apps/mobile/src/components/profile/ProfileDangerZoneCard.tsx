import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { AlertTriangle, Trash2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface ProfileDangerZoneCardProps {
  onDeleteData: () => void;
  isDeletingData: boolean;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
  enableDataReset?: boolean;
  isPasswordModalVisible?: boolean;
  passwordInput?: string;
  onPasswordInputChange?: (val: string) => void;
  onConfirmPasswordDelete?: () => void;
  onCancelPasswordDelete?: () => void;
}

export function ProfileDangerZoneCard({
  onDeleteData,
  isDeletingData,
  onDeleteAccount,
  isDeletingAccount,
  enableDataReset = false,
  isPasswordModalVisible = false,
  passwordInput = '',
  onPasswordInputChange,
  onConfirmPasswordDelete,
  onCancelPasswordDelete,
}: ProfileDangerZoneCardProps) {
  const { t } = useTranslation();

  return (
    <View className="bg-red-50/60 dark:bg-red-950/20 p-5 rounded-3xl border border-red-200 dark:border-red-900/50 space-y-4 mb-8">
      <View className="flex-row items-center space-x-2">
        <AlertTriangle size={18} color="#dc2626" />
        <Text className="font-semibold text-red-600 dark:text-red-400">
          {t('profile.dangerZoneTitle')}
        </Text>
      </View>
      <Text className="text-xs text-slate-500 dark:text-slate-400">
        {t('profile.dangerZoneSubtitle')}
      </Text>

      {/* Delete All Data */}
      {enableDataReset && (
        <View className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 space-y-2">
          <Text className="font-medium text-sm text-slate-800 dark:text-slate-200">
            {t('profile.deleteDataTitle')}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {t('profile.deleteDataDesc')}
          </Text>
          <TouchableOpacity
            onPress={onDeleteData}
            disabled={isDeletingData}
            className="bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800/80 p-3 rounded-xl items-center flex-row justify-center space-x-2 mt-2"
          >
            {isDeletingData ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <>
                <Trash2 size={16} color="#dc2626" />
                <Text className="text-red-600 dark:text-red-400 font-semibold text-xs">
                  {t('profile.deleteDataTitle')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Account */}
      <View className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-red-200 dark:border-red-900/40 space-y-2">
        <Text className="font-medium text-sm text-red-600 dark:text-red-400">
          {t('profile.deleteAccountTitle')}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {t('profile.deleteAccountDesc')}
        </Text>
        <TouchableOpacity
          onPress={onDeleteAccount}
          disabled={isDeletingAccount}
          className="bg-red-600 p-3 rounded-xl items-center flex-row justify-center space-x-2 mt-2"
        >
          {isDeletingAccount ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Trash2 size={16} color="#ffffff" />
              <Text className="text-white font-semibold text-xs">
                {t('profile.deleteAccountTitle')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Cross-platform Password Confirmation Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={onCancelPasswordDelete}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-slate-900 dark:text-white">
                {t('profile.deleteAccountPasswordTitle')}
              </Text>
              <TouchableOpacity
                onPress={onCancelPasswordDelete}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {t('profile.deleteAccountPasswordPrompt')}
            </Text>

            <TextInput
              secureTextEntry
              value={passwordInput}
              onChangeText={onPasswordInputChange}
              placeholder={t('auth.password')}
              placeholderTextColor="#94a3b8"
              autoFocus
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white"
            />

            <View className="flex-row space-x-3 pt-2">
              <TouchableOpacity
                onPress={onCancelPasswordDelete}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center justify-center"
              >
                <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirmPasswordDelete}
                disabled={isDeletingAccount}
                className="flex-1 py-3 rounded-xl bg-red-600 items-center justify-center"
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-xs font-semibold text-white">
                    {t('common.confirm')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
