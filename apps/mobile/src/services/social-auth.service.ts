import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import i18n from '@/i18n';
import { API_BASE_URL } from './apiClient';
import type { IAuthResponse } from '@repo/types';

const client = createAuthClient({
  baseURL: `${API_BASE_URL}/auth`,
  plugins: [expoClient({ storage: SecureStore, storagePrefix: 'app_oauth' })],
});

export async function signInGoogle(): Promise<IAuthResponse> {
  const headers = { 'x-lang': i18n.language || 'vi' };
  const result = await client.signIn.social({
    provider: 'google',
    callbackURL: Linking.createURL('/'),
    fetchOptions: { headers },
  });
  if (result.error)
    throw new Error(result.error.message || i18n.t('auth.authFailed'));
  // Bridge the Expo plugin's cookie session to the existing bearer API client.
  const session = await client.getSession({ fetchOptions: { headers } });
  if (session.error || !session.data?.session.token) {
    throw new Error(session.error?.message || i18n.t('auth.authFailed'));
  }
  return { token: session.data.session.token };
}

export async function clearSocialAuthSession(): Promise<void> {
  try {
    await client.signOut({
      fetchOptions: { headers: { 'x-lang': i18n.language || 'vi' } },
    });
  } finally {
    // A failed network request must not leave a reusable local OAuth cookie.
    await SecureStore.deleteItemAsync('app_oauth_cookie');
    await SecureStore.deleteItemAsync('app_oauth_session_data');
  }
}
