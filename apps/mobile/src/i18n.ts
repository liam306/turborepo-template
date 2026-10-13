/* eslint-disable import/no-named-as-default-member */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedLocale } from '@repo/types';
import en from './locales/en.json';
import vi from './locales/vi.json';

const deviceLocales = Localization.getLocales();
const deviceLanguage = deviceLocales[0]?.languageCode;
const defaultLocale: SupportedLocale = deviceLanguage === 'vi' ? 'vi' : 'en';

export const STORAGE_KEY_LOCALE = 'app_user_locale';

export const resources = {
  en: { translation: en },
  vi: { translation: vi },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLocale,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export async function loadSavedLocale(): Promise<SupportedLocale> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_LOCALE);
    if (saved === 'vi' || saved === 'en') {
      if (i18n.language !== saved) {
        await i18n.changeLanguage(saved);
      }
      return saved;
    }
  } catch {
    // Fall back to default on storage read error
  }
  return defaultLocale;
}

export async function saveUserLocale(locale: SupportedLocale): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LOCALE, locale);
    await i18n.changeLanguage(locale);
  } catch {
    await i18n.changeLanguage(locale);
  }
}

export default i18n;
