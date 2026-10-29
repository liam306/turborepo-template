import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Sun, Moon, Smartphone, Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { saveUserLocale } from '@/i18n';
import { useUpdateProfile } from '@/hooks/queries';
import { useUserStore } from '@/stores/useUserStore';
import type { SupportedLocale, ThemeMode } from '@repo/types';

interface ProfilePreferencesCardProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}

export function ProfilePreferencesCard({
  themeMode,
  onThemeModeChange,
}: ProfilePreferencesCardProps) {
  const { t, i18n } = useTranslation();
  const updateProfileMutation = useUpdateProfile();

  const handleLanguageChange = (code: SupportedLocale) => {
    saveUserLocale(code);
    if (useUserStore.getState().token) {
      updateProfileMutation.mutate({ locale: code });
    }
  };

  return (
    <>
      {/* Language Settings */}
      <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <View className="flex-row items-center space-x-2">
          <Globe size={18} color="#2563eb" />
          <Text className="font-semibold text-slate-800 dark:text-slate-200">
            {t('profile.language')}
          </Text>
        </View>

        <View className="flex-row items-center justify-between gap-2">
          {[
            { code: 'vi' as const, label: t('profile.langVi') },
            { code: 'en' as const, label: t('profile.langEn') },
          ].map(({ code, label }) => {
            const isSelected = (i18n.language || 'vi').startsWith(code);
            return (
              <TouchableOpacity
                key={code}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={label}
                onPress={() => handleLanguageChange(code)}
                className={cn(
                  'flex-1 flex-col items-center justify-center p-3 rounded-2xl border',
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
                )}
              >
                <Text
                  className={cn(
                    'text-xs font-medium',
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400',
                  )}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Theme Settings */}
      <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <View className="flex-row items-center space-x-2">
          <Sun size={18} color="#f59e0b" />
          <Text className="font-semibold text-slate-800 dark:text-slate-200">
            {t('profile.themeTitle')}
          </Text>
        </View>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {t('profile.themeSubtitle')}
        </Text>

        <View className="flex-row items-center justify-between gap-2">
          {(
            [
              {
                mode: 'system' as ThemeMode,
                label: t('common.themeSystem'),
                icon: Smartphone,
              },
              {
                mode: 'light' as ThemeMode,
                label: t('common.themeLight'),
                icon: Sun,
              },
              {
                mode: 'dark' as ThemeMode,
                label: t('common.themeDark'),
                icon: Moon,
              },
            ] as const
          ).map(({ mode, label, icon: Icon }) => {
            const isSelected = themeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => onThemeModeChange(mode)}
                className={cn(
                  'flex-1 flex-col items-center justify-center p-3 rounded-2xl border',
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
                )}
              >
                <Icon size={20} color={isSelected ? '#2563eb' : '#64748b'} />
                <Text
                  className={cn(
                    'text-xs mt-1.5 font-medium',
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400',
                  )}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}
