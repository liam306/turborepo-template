import type { SupportedLocale } from '@repo/types';
import enMessages from '../../messages/en.json';
import viMessages from '../../messages/vi.json';

const fallbackDictionaries = {
  en: enMessages.common,
  vi: viMessages.common,
} as const;

export type ClientFallbackErrorKey = 'networkError' | 'unexpectedError';

export function getClientFallbackErrorMessage(
  key: ClientFallbackErrorKey,
  locale?: string,
): string {
  const resolvedLocale: SupportedLocale = locale === 'vi' ? 'vi' : 'en';
  return fallbackDictionaries[resolvedLocale][key];
}
