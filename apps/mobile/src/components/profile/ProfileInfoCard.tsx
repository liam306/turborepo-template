import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface ProfileInfoCardProps {
  name: string;
  onNameChange: (text: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function ProfileInfoCard({
  name,
  onNameChange,
  onSave,
  isSaving,
}: ProfileInfoCardProps) {
  const { t } = useTranslation();

  return (
    <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <View className="flex-row items-center space-x-2">
        <User size={18} color="#2563eb" />
        <Text className="font-semibold text-slate-800 dark:text-slate-200">
          {t('profile.fullName')}
        </Text>
      </View>

      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder={t('profile.fullName')}
        className="w-full bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
      />

      <TouchableOpacity
        onPress={onSave}
        disabled={isSaving}
        className="bg-blue-600 p-3.5 rounded-2xl items-center shadow-sm"
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text className="text-white font-medium text-sm">
            {t('profile.saveChanges')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
