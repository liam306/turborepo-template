import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';
import { useSignInSocial, useSignInGoogle } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import type { IAuthResponse } from '@repo/types';

WebBrowser.maybeCompleteAuthSession();

interface ISocialAuthButtonsProps {
  isDark: boolean;
  onSuccess: (data: IAuthResponse) => void;
  onError: (error: string) => void;
}

export function SocialAuthButtons({
  isDark,
  onSuccess,
  onError,
}: ISocialAuthButtonsProps) {
  const { t } = useTranslation();
  const { mutateAsync: signInGoogleMutation, isPending: loadingGoogle } =
    useSignInGoogle();
  const { mutateAsync: signInSocial, isPending: loadingApple } =
    useSignInSocial();

  const handleGoogleAuth = async () => {
    try {
      const data = await signInGoogleMutation();
      onSuccess(data);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : t('auth.authFailed'));
    }
  };

  const handleAppleAuth = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const data = await signInSocial({
          provider: 'apple',
          idToken: credential.identityToken,
        });
        onSuccess(data);
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        onError(err.message || t('auth.authFailed'));
      }
    }
  };

  return (
    <View className="space-y-3">
      {/* Google Sign In */}
      <TouchableOpacity
        onPress={handleGoogleAuth}
        disabled={loadingGoogle || loadingApple}
        className={cn(
          'flex-row items-center justify-center rounded-2xl border py-3 px-4 shadow-sm active:opacity-80',
          isDark
            ? 'border-slate-800 bg-slate-800/80'
            : 'border-slate-200 bg-white',
          (loadingGoogle || loadingApple) && 'opacity-50',
        )}
      >
        {loadingGoogle ? (
          <ActivityIndicator
            size="small"
            color={isDark ? '#ffffff' : '#0f172a'}
          />
        ) : (
          <>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <Path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <Path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <Path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </Svg>
            <Text
              className={cn(
                'ml-3 text-xs font-semibold',
                isDark ? 'text-slate-200' : 'text-slate-700',
              )}
            >
              {t('auth.continueWithGoogle')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Apple Sign In - iOS Only */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          onPress={handleAppleAuth}
          disabled={loadingGoogle || loadingApple}
          className={cn(
            'flex-row items-center justify-center rounded-2xl py-3 px-4 shadow-sm active:opacity-80',
            isDark ? 'bg-white' : 'bg-black',
            (loadingGoogle || loadingApple) && 'opacity-50',
          )}
        >
          {loadingApple ? (
            <ActivityIndicator
              size="small"
              color={isDark ? '#000000' : '#ffffff'}
            />
          ) : (
            <>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path
                  fill={isDark ? '#000000' : '#ffffff'}
                  d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.6.69-1.12 1.83-.98 2.94 1.07.08 2.13-.56 2.79-1.28z"
                />
              </Svg>
              <Text
                className={cn(
                  'ml-3 text-xs font-semibold',
                  isDark ? 'text-black' : 'text-white',
                )}
              >
                {t('auth.continueWithApple')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
