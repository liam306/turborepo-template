import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Redirect } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';

export default function TabLayout() {
  const { t } = useTranslation();
  const token = useUserStore((state) => state.token);
  const isHydrated = useUserStore((state) => state.isHydrated);

  // If user store finished hydration and no token -> redirect to landing screen
  if (isHydrated && !token) {
    return <Redirect href="/" />;
  }

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" md="dashboard" />
        <NativeTabs.Trigger.Label>
          {t('tabs.dashboard')}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="person" />
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
