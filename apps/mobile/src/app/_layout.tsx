import '@/global.css';
import { loadSavedLocale } from '@/i18n';
import * as Sentry from '@sentry/react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTrackScreenViews } from '@/hooks/useTrackScreenViews';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { PostHogProvider } from '@/providers/PostHogProvider';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
  });
}

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { colorScheme } = useColorScheme();
  useAuthSession();
  useTrackScreenViews();

  const isDark = colorScheme === 'dark';

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
      </Stack>
      <Toast />
    </ThemeProvider>
  );
}

function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  useEffect(() => {
    async function prepare() {
      try {
        initializeTheme();
        await loadSavedLocale();
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, [initializeTheme]);

  if (!isReady) {
    return null;
  }

  return (
    <PostHogProvider>
      <ReactQueryProvider>
        <RootNavigator />
      </ReactQueryProvider>
    </PostHogProvider>
  );
}

export default Sentry.wrap(RootLayout);
