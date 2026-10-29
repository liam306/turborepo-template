import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/useUserStore';
import { useUserProfile } from '@/hooks/queries';
import { User, Settings } from 'lucide-react-native';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useUserStore((state) => state.token);
  const localProfile = useUserStore((state) => state.profile);
  const { data: serverProfile } = useUserProfile(Boolean(token));
  const profile = serverProfile || localProfile;

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="p-5">
        {/* Welcome Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('dashboard.welcome', {
              name: profile?.name || t('common.user'),
            })}
          </Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.subtitle')}
          </Text>
        </View>

        {/* User Card */}
        <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <View className="flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
              <User size={24} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                {profile?.name || t('common.user')}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                {profile?.email || ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800"
            >
              <Settings size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Card */}
        <View className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <Text className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            {t('dashboard.card1Title')}
          </Text>
          <Text className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            {t('dashboard.card1Desc')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
