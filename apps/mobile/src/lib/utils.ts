import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { buildAssetUrl, getLocalizedText } from '@repo/utils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { getLocalizedText };

/**
 * Resolves an asset path or object key into an absolute URL using EXPO_PUBLIC_STORAGE_URL.
 * If pathOrKey is already an absolute URL (http, https, blob, data, file), returns it unchanged.
 */
export function resolveAssetUrl(
  pathOrKey?: string | null,
  fallbackBaseUrl = 'http://localhost:8317/app',
): string | null {
  const storageBase = process.env.EXPO_PUBLIC_STORAGE_URL || fallbackBaseUrl;
  return buildAssetUrl(pathOrKey, storageBase);
}
