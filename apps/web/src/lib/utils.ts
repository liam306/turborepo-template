import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { buildAssetUrl, getLocalizedText } from '@repo/utils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { getLocalizedText };

/**
 * Resolves an asset path or object key into an absolute URL using NEXT_PUBLIC_STORAGE_URL.
 * If pathOrKey is already an absolute URL (http, https, blob, data), returns it unchanged.
 */
export function resolveAssetUrl(
  pathOrKey?: string | null,
  fallbackBaseUrl = 'http://localhost:8317/app',
): string | null {
  const storageBase =
    process.env.NEXT_PUBLIC_STORAGE_URL ||
    (typeof window !== 'undefined'
      ? (window as unknown as { __ENV?: { NEXT_PUBLIC_STORAGE_URL?: string } })
          ?.__ENV?.NEXT_PUBLIC_STORAGE_URL
      : undefined) ||
    fallbackBaseUrl;

  return buildAssetUrl(pathOrKey, storageBase);
}
