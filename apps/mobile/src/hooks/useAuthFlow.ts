import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useUserStore } from '@/stores/useUserStore';
import {
  extractApiErrorMessage,
  getAuthErrorTranslationKey,
} from '@repo/utils';
import { useSignInEmail, useSignUpEmail } from '@/hooks/queries';
import type { IAuthResponse } from '@repo/types';

export function useAuthFlow() {
  const { t } = useTranslation();
  const { setToken, setProfile, setRememberMe } = useUserStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMeLocal] = useState(true);

  const { mutateAsync: signInEmail, isPending: isSigningIn } = useSignInEmail();
  const { mutateAsync: signUpEmail, isPending: isSigningUp } = useSignUpEmail();
  const loading = isSigningIn || isSigningUp;

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleAuthSuccess = async (data: IAuthResponse) => {
    setRememberMe(rememberMe);
    const userToken = data.token;
    if (userToken) {
      setToken(userToken);
    }
    if (data.user) {
      setProfile({
        id: data.user.id,
        name: data.user.name || '',
        email: data.user.email || '',
        emailVerified: Boolean(data.user.emailVerified),
        image: data.user.image || null,
        role: data.user.role || 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hasPassword: true,
        providers: ['email'],
        theme: 'system',
        locale: 'vi',
      });
    }

    Alert.alert(t('common.appName'), t('auth.loginSuccess'), [
      { text: t('common.ok'), onPress: () => router.replace('/(tabs)') },
    ]);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        t('common.appName'),
        t('auth.email') + ', ' + t('auth.password'),
      );
      return;
    }
    if (isSignUp && !name.trim()) {
      Alert.alert(t('common.appName'), t('auth.name'));
      return;
    }

    try {
      if (isSignUp) {
        await signUpEmail({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        setShowVerifyModal(true);
      } else {
        const data = await signInEmail({
          email: email.trim(),
          password,
          rememberMe,
        });
        await handleAuthSuccess(data);
      }
    } catch (err: unknown) {
      const key = getAuthErrorTranslationKey(err);
      if (key === 'emailNotVerified') {
        setShowVerifyModal(true);
        return;
      }
      const message = key
        ? t(`auth.${key}`)
        : extractApiErrorMessage(err, t('auth.errorDefault'));
      Alert.alert(t('common.appName'), message);
    }
  };

  return {
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
  };
}
