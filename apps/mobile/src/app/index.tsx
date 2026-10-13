import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, Redirect } from 'expo-router';
import {
  Zap,
  ShieldCheck,
  Palette,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { Logo } from '@/components/ui/Logo';
import { useUserStore } from '@/stores/useUserStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { cn } from '@/lib/utils';

export default function IndexScreen() {
  const { t } = useTranslation();
  const token = useUserStore((state) => state.token);
  const isHydrated = useUserStore((state) => state.isHydrated);
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark';

  // If user is already authenticated and store is hydrated, redirect to main app tabs
  if (isHydrated && token) {
    return <Redirect href="/(tabs)" />;
  }

  const features = [
    {
      icon: Zap,
      title: t('auth.landing.featureFast'),
      desc: t('auth.landing.featureFastDesc'),
      color: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      icon: ShieldCheck,
      title: t('auth.landing.featureAuth'),
      desc: t('auth.landing.featureAuthDesc'),
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      icon: Palette,
      title: t('auth.landing.featureModern'),
      desc: t('auth.landing.featureModernDesc'),
      color: 'bg-amber-500/10 text-amber-500',
    },
  ];

  return (
    <SafeAreaView
      className={cn('flex-1', isDark ? 'bg-slate-950' : 'bg-slate-50')}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="px-6 py-8"
      >
        {/* Brand Header */}
        <Logo size="md" />

        {/* Hero Section */}
        <View className="mt-12 items-center text-center">
          <View className="flex-row items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5">
            <Sparkles size={14} color="#0284c7" />
            <Text className="text-xs font-semibold text-primary">
              {t('auth.landing.badge')}
            </Text>
          </View>

          <Text
            className={cn(
              'mt-6 text-center text-3xl font-black leading-tight tracking-tight',
              isDark ? 'text-white' : 'text-slate-900',
            )}
          >
            {t('auth.landing.title')}
          </Text>

          <Text
            className={cn(
              'mt-4 text-center text-sm leading-6',
              isDark ? 'text-slate-400' : 'text-slate-600',
            )}
          >
            {t('auth.landing.subtitle')}
          </Text>
        </View>

        {/* Features List */}
        <View className="mt-10 gap-3.5">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <View
                key={index}
                className={cn(
                  'flex-row items-center gap-4 rounded-2xl border p-4 shadow-xs',
                  isDark
                    ? 'border-slate-800 bg-slate-900/60'
                    : 'border-slate-200/80 bg-white',
                )}
              >
                <View
                  className={cn(
                    'h-12 w-12 items-center justify-center rounded-xl',
                    feat.color,
                  )}
                >
                  <Icon size={24} color="#0284c7" />
                </View>
                <View className="flex-1">
                  <Text
                    className={cn(
                      'text-base font-bold',
                      isDark ? 'text-white' : 'text-slate-900',
                    )}
                  >
                    {feat.title}
                  </Text>
                  <Text
                    className={cn(
                      'mt-0.5 text-xs',
                      isDark ? 'text-slate-400' : 'text-slate-500',
                    )}
                  >
                    {feat.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View className="mt-10 gap-3">
          <TouchableOpacity
            onPress={() => router.push('/auth')}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 shadow-md shadow-primary/25 active:bg-primary/90"
          >
            <Text className="text-base font-bold text-white">
              {t('auth.landing.getStarted')}
            </Text>
            <ArrowRight size={18} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/auth')}
            className={cn(
              'items-center justify-center rounded-2xl border py-4',
              isDark
                ? 'border-slate-800 bg-slate-900/40'
                : 'border-slate-200 bg-white',
            )}
          >
            <Text
              className={cn(
                'text-base font-semibold',
                isDark ? 'text-slate-300' : 'text-slate-700',
              )}
            >
              {t('auth.landing.signIn')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
