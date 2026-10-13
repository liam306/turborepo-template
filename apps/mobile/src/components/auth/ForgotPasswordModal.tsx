import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, KeyRound, Lock, Mail } from 'lucide-react-native';
import { useRequestPasswordReset, useResetPassword } from '@/hooks/queries';
import { OtpInput } from '../ui/OtpInput';
import { cn } from '@/lib/utils';
import {
  getAuthErrorTranslationKey,
  extractApiErrorMessage,
} from '@repo/utils';

interface IForgotPasswordModalProps {
  visible: boolean;
  isDark: boolean;
  initialEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ForgotPasswordModal({
  visible,
  isDark,
  initialEmail = '',
  onClose,
  onSuccess,
}: IForgotPasswordModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { mutateAsync: requestReset, isPending: requesting } =
    useRequestPasswordReset();
  const { mutateAsync: resetPassword, isPending: resetting } =
    useResetPassword();
  const loading = requesting || resetting;

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.appName'), t('auth.email'));
      return;
    }

    try {
      await requestReset({ email: email.trim() });
      setStep('reset');
    } catch (err: unknown) {
      const key = getAuthErrorTranslationKey(err);
      const message = key
        ? t(`auth.${key}`)
        : extractApiErrorMessage(err, t('auth.authFailed'));
      Alert.alert(t('common.appName'), message);
    }
  };

  const handleResetPassword = async () => {
    if (otp.trim().length < 6) {
      Alert.alert(t('common.appName'), t('auth.otpPlaceholder'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('common.appName'), t('profile.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.appName'), t('profile.passwordMismatch'));
      return;
    }

    try {
      await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        password: newPassword,
      });

      Alert.alert(t('common.appName'), t('auth.resetSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => {
            onClose();
            onSuccess();
          },
        },
      ]);
    } catch (err: unknown) {
      const key = getAuthErrorTranslationKey(err);
      const message = key
        ? t(`auth.${key}`)
        : extractApiErrorMessage(err, t('auth.authFailed'));
      Alert.alert(t('common.appName'), message);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View
          className={cn(
            'rounded-t-3xl border-t p-6 shadow-xl',
            isDark
              ? 'border-slate-800 bg-slate-900'
              : 'border-slate-200 bg-white',
          )}
        >
          <View className="flex-row items-center justify-between pb-4">
            <View className="flex-row items-center gap-2">
              <KeyRound size={20} color="#0284c7" />
              <Text
                className={cn(
                  'text-base font-bold',
                  isDark ? 'text-white' : 'text-slate-900',
                )}
              >
                {step === 'email'
                  ? t('auth.forgotTitle')
                  : t('auth.resetTitle')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <Text
            className={cn(
              'mb-4 text-xs',
              isDark ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {step === 'email'
              ? t('auth.forgotSubtitle')
              : t('auth.resetSubtitle')}
          </Text>

          {step === 'email' ? (
            <View className="space-y-4">
              <View
                className={cn(
                  'flex-row items-center rounded-2xl border px-3.5 py-3',
                  isDark
                    ? 'border-slate-800 bg-slate-800/60'
                    : 'border-slate-200 bg-slate-50',
                )}
              >
                <Mail size={18} color="#94a3b8" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor="#94a3b8"
                  className={cn(
                    'ml-2.5 flex-1 text-sm',
                    isDark ? 'text-white' : 'text-slate-900',
                  )}
                />
              </View>

              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={loading}
                className="flex-row items-center justify-center rounded-2xl bg-blue-600 py-3.5 shadow-lg shadow-blue-500/25 active:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    {t('auth.sendOtpBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-3">
              <View className="mb-2">
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  isDark={isDark}
                  disabled={loading}
                />
              </View>

              <View
                className={cn(
                  'flex-row items-center rounded-2xl border px-3.5 py-2.5',
                  isDark
                    ? 'border-slate-800 bg-slate-800/60'
                    : 'border-slate-200 bg-slate-50',
                )}
              >
                <Lock size={16} color="#94a3b8" />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder={t('auth.newPassword')}
                  placeholderTextColor="#94a3b8"
                  className={cn(
                    'ml-2.5 flex-1 text-sm',
                    isDark ? 'text-white' : 'text-slate-900',
                  )}
                />
              </View>

              <View
                className={cn(
                  'flex-row items-center rounded-2xl border px-3.5 py-2.5',
                  isDark
                    ? 'border-slate-800 bg-slate-800/60'
                    : 'border-slate-200 bg-slate-50',
                )}
              >
                <Lock size={16} color="#94a3b8" />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder={t('auth.confirmPassword')}
                  placeholderTextColor="#94a3b8"
                  className={cn(
                    'ml-2.5 flex-1 text-sm',
                    isDark ? 'text-white' : 'text-slate-900',
                  )}
                />
              </View>

              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading}
                className="mt-2 flex-row items-center justify-center rounded-2xl bg-blue-600 py-3.5 shadow-lg shadow-blue-500/25 active:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    {t('auth.resetBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
