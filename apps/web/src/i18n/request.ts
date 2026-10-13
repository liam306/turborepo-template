import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import type { SupportedLocale } from '@repo/types';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'vi'];
export const DEFAULT_FALLBACK_LOCALE: SupportedLocale = 'en';

export async function detectLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as
    SupportedLocale | undefined;

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  // Detect from browser Accept-Language header
  const headerList = await headers();
  const acceptLanguage = headerList.get('accept-language') || '';

  // Parse accept-language header: e.g. "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
  const preferredLocales = acceptLanguage.split(',').map((part) => {
    const [langCode] = part.trim().split(';');
    return langCode.split('-')[0].toLowerCase();
  });

  for (const lang of preferredLocales) {
    if (lang === 'vi') return 'vi';
    if (lang === 'en') return 'en';
  }

  return DEFAULT_FALLBACK_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await detectLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
