import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, MailCheck } from 'lucide-react-native';
import { useVerifyEmailOtp, useSendVerificationOtp } from '@/hooks/queries';
import { OtpInput } from '../ui/OtpInput';
import { cn } from '@/lib/utils';
import {
  getAuthErrorTranslationKey,
  extractApiErrorMessage,
} from '@repo/utils';

interface IVerifyOtpModalProps {
  visible: boolean;
  email: string;
  isDark: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VerifyOtpModal({
  visible,
  email,
  isDark,
  onClose,
  onSuccess,
}: IVerifyOtpModalProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');

  const { mutateAsync: verifyOtp, isPending: loading } = useVerifyEmailOtp();
  const { mutateAsync: sendOtp, isPending: resending } =
    useSendVerificationOtp();

  const handleVerify = async () => {
    if (otp.trim().length < 6) {
      Alert.alert(t('common.appName'), t('auth.otpPlaceholder'));
      return;
    }

    try {
      await verifyOtp({ email: email.trim(), otp: otp.trim() });

      Alert.alert(t('common.appName'), t('auth.verifySuccess'), [
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

  const handleResend = async () => {
    try {
      await sendOtp({
        email: email.trim(),
        type: 'email-verification',
      });
      Alert.alert(t('common.appName'), t('auth.resendSuccess'));
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
              <MailCheck size={20} color="#0284c7" />
              <Text
                className={cn(
                  'text-base font-bold',
                  isDark ? 'text-white' : 'text-slate-900',
                )}
              >
                {t('auth.verifyEmailTitle')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <Text
            className={cn(
              'mb-4 text-xs text-slate-500',
              isDark ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {t('auth.verifyEmailSubtitle', { email })}
          </Text>

          <View className="mb-4">
            <OtpInput
              value={otp}
              onChange={setOtp}
              isDark={isDark}
              disabled={loading}
            />
          </View>

          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading}
            className="flex-row items-center justify-center rounded-2xl bg-blue-600 py-3.5 shadow-lg shadow-blue-500/25 active:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-sm font-bold text-white">
                {t('auth.verifyBtn')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending}
            className="mt-3 items-center py-2"
          >
            {resending ? (
              <ActivityIndicator size="small" color="#0284c7" />
            ) : (
              <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {t('auth.resendOtp')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
