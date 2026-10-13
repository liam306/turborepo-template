import type { SupportedLocale } from '@repo/types';

export interface LanguageOption {
  code: SupportedLocale;
  label: string;
  shortLabel: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    code: 'vi',
    // i18n-audit-ignore: Language endonym is intentionally untranslated
    label: 'Tiếng Việt',
    shortLabel: 'VI',
    flag: '🇻🇳',
  },
  {
    code: 'en',
    // i18n-audit-ignore: Language endonym is intentionally untranslated
    label: 'English',
    shortLabel: 'EN',
    flag: '🇺🇸',
  },
] as const;
