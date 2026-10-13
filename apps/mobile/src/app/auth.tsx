import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Logo } from '@/components/ui/Logo';
import { useThemeStore } from '@/stores/useThemeStore';
import { cn } from '@/lib/utils';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { VerifyOtpModal } from '@/components/auth/VerifyOtpModal';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { AuthCredentialsCard } from '@/components/auth/AuthCredentialsCard';
import { useAuthFlow } from '@/hooks/useAuthFlow';

export default function AuthScreen() {
  const { t } = useTranslation();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark';

  const {
    isSignUp,
    setIsSignUp,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    rememberMe,
    setRememberMeLocal,
    loading,
    showVerifyModal,
    setShowVerifyModal,
    showForgotModal,
    setShowForgotModal,
    handleAuthSuccess,
    handleSubmit,
  } = useAuthFlow();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={cn('flex-1', isDark ? 'bg-slate-950' : 'bg-slate-50')}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="p-6"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-8 mb-6 flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color={isDark ? '#94a3b8' : '#64748b'} />
          <Text
            className={cn(
              'text-sm font-semibold',
              isDark ? 'text-slate-400' : 'text-slate-600',
            )}
          >
            {t('common.close')}
          </Text>
        </TouchableOpacity>

        <View className="items-center my-6">
          <Logo size="xl" />
          <Text
            className={cn(
              'mt-4 text-2xl font-bold',
              isDark ? 'text-white' : 'text-slate-900',
            )}
          >
            {isSignUp ? t('auth.registerTitle') : t('auth.loginTitle')}
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-500 px-4">
            {isSignUp ? t('auth.registerSubtitle') : t('auth.loginSubtitle')}
          </Text>
        </View>

        {/* Social Logins */}
        <SocialAuthButtons
          isDark={isDark}
          onSuccess={handleAuthSuccess}
          onError={(err) => Alert.alert(t('common.appName'), err)}
        />

        <View className="flex-row items-center my-5">
          <View
            className={cn(
              'flex-1 border-t',
              isDark ? 'border-slate-800' : 'border-slate-200',
            )}
          />
          <Text className="px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
            {t('auth.orWithEmail')}
          </Text>
          <View
            className={cn(
              'flex-1 border-t',
              isDark ? 'border-slate-800' : 'border-slate-200',
            )}
          />
        </View>

        {/* Credentials Form Card */}
        <AuthCredentialsCard
          isDark={isDark}
          isSignUp={isSignUp}
          name={name}
          onChangeName={setName}
          email={email}
          onChangeEmail={setEmail}
          password={password}
          onChangePassword={setPassword}
          rememberMe={rememberMe}
          onToggleRememberMe={() => setRememberMeLocal(!rememberMe)}
          onForgotPassword={() => setShowForgotModal(true)}
          onSubmit={handleSubmit}
          loading={loading}
        />

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          className="mt-6 items-center py-2"
        >
          <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Verify Email OTP Modal */}
      <VerifyOtpModal
        visible={showVerifyModal}
        email={email}
        isDark={isDark}
        onClose={() => setShowVerifyModal(false)}
        onSuccess={() => {
          setIsSignUp(false);
          Alert.alert(t('common.appName'), t('auth.verifySuccess'));
        }}
      />

      {/* Forgot / Reset Password Modal */}
      <ForgotPasswordModal
        visible={showForgotModal}
        isDark={isDark}
        initialEmail={email}
        onClose={() => setShowForgotModal(false)}
        onSuccess={() => {
          setShowForgotModal(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}
