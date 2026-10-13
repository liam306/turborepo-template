import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Check } from 'lucide-react-native';
import { cn } from '@/lib/utils';

interface AuthCredentialsCardProps {
  isDark: boolean;
  isSignUp: boolean;
  name: string;
  onChangeName: (val: string) => void;
  email: string;
  onChangeEmail: (val: string) => void;
  password: string;
  onChangePassword: (val: string) => void;
  rememberMe: boolean;
  onToggleRememberMe: () => void;
  onForgotPassword: () => void;
  onSubmit: () => void;
  loading: boolean;
}

export function AuthCredentialsCard({
  isDark,
  isSignUp,
  name,
  onChangeName,
  email,
  onChangeEmail,
  password,
  onChangePassword,
  rememberMe,
  onToggleRememberMe,
  onForgotPassword,
  onSubmit,
  loading,
}: AuthCredentialsCardProps) {
  const { t } = useTranslation();

  return (
    <View
      className={cn(
        'rounded-3xl border p-5 shadow-sm space-y-4',
        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
      )}
    >
      {isSignUp && (
        <View>
          <Text
            className={cn(
              'mb-1 text-xs font-semibold',
              isDark ? 'text-slate-300' : 'text-slate-700',
            )}
          >
            {t('auth.name')} *
          </Text>
          <View
            className={cn(
              'flex-row items-center rounded-2xl border px-3.5 py-3',
              isDark
                ? 'border-slate-800 bg-slate-800/60'
                : 'border-slate-200 bg-slate-50',
            )}
          >
            <User size={18} color="#94a3b8" />
            <TextInput
              value={name}
              onChangeText={onChangeName}
              placeholder={t('auth.namePlaceholder')}
              placeholderTextColor="#94a3b8"
              className={cn(
                'ml-2.5 flex-1 text-sm',
                isDark ? 'text-white' : 'text-slate-900',
              )}
            />
          </View>
        </View>
      )}

      <View>
        <Text
          className={cn(
            'mb-1 text-xs font-semibold',
            isDark ? 'text-slate-300' : 'text-slate-700',
          )}
        >
          {t('auth.email')} *
        </Text>
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
            onChangeText={onChangeEmail}
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
      </View>

      <View>
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className={cn(
              'text-xs font-semibold',
              isDark ? 'text-slate-300' : 'text-slate-700',
            )}
          >
            {t('auth.password')} *
          </Text>
          {!isSignUp && (
            <TouchableOpacity onPress={onForgotPassword}>
              <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {t('auth.forgotPassword')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View
          className={cn(
            'flex-row items-center rounded-2xl border px-3.5 py-3',
            isDark
              ? 'border-slate-800 bg-slate-800/60'
              : 'border-slate-200 bg-slate-50',
          )}
        >
          <Lock size={18} color="#94a3b8" />
          <TextInput
            value={password}
            onChangeText={onChangePassword}
            secureTextEntry
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor="#94a3b8"
            className={cn(
              'ml-2.5 flex-1 text-sm',
              isDark ? 'text-white' : 'text-slate-900',
            )}
          />
        </View>
      </View>

      {!isSignUp && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleRememberMe}
          className="flex-row items-center gap-2 pt-1 pb-1"
        >
          <View
            className={cn(
              'h-5 w-5 rounded-md items-center justify-center border',
              rememberMe
                ? 'border-blue-600 bg-blue-600'
                : isDark
                  ? 'border-slate-700 bg-slate-800'
                  : 'border-slate-300 bg-white',
            )}
          >
            {rememberMe && <Check size={12} color="#ffffff" strokeWidth={3} />}
          </View>
          <Text
            className={cn(
              'text-xs font-medium',
              isDark ? 'text-slate-300' : 'text-slate-600',
            )}
          >
            {t('auth.rememberMe')}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={loading}
        className="mt-2 flex-row items-center justify-center rounded-2xl bg-blue-600 py-3.5 shadow-lg shadow-blue-500/25 active:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-sm font-bold text-white">
            {isSignUp ? t('auth.signUpBtn') : t('auth.signInBtn')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
