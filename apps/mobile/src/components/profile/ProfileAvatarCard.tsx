import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { User, Camera } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface ProfileAvatarCardProps {
  image?: string | null;
  name?: string | null;
  email?: string | null;
  isUploading: boolean;
  onPickAvatar: () => void;
}

export function ProfileAvatarCard({
  image,
  name,
  email,
  isUploading,
  onPickAvatar,
}: ProfileAvatarCardProps) {
  const { t } = useTranslation();

  return (
    <View className="items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <View className="relative">
        <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-100 dark:bg-slate-800 items-center justify-center">
          {image ? (
            <Image
              source={{ uri: image }}
              className="w-full h-full"
              contentFit="cover"
            />
          ) : (
            <User size={40} color="#94a3b8" />
          )}
        </View>
        <TouchableOpacity
          onPress={onPickAvatar}
          disabled={isUploading}
          className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-2 border-white shadow-md"
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Camera size={16} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
      <Text className="mt-3 font-semibold text-slate-800 dark:text-slate-200">
        {name || t('profile.title')}
      </Text>
      <Text className="text-xs text-slate-400 mt-0.5">{email}</Text>
    </View>
  );
}
