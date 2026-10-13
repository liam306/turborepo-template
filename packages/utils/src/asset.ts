/**
 * Resolves an asset path or object key into an absolute URL using storage base URL.
 * If pathOrKey is already an absolute URL (http, https, blob, data, file), returns it unchanged.
 */
export function buildAssetUrl(
  pathOrKey?: string | null,
  storageBaseUrl = 'http://localhost:8333/app',
): string | null {
  if (!pathOrKey || typeof pathOrKey !== 'string') return null;

  const trimmed = pathOrKey.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }

  const cleanBase = (storageBaseUrl || 'http://localhost:8333/app').replace(
    /\/+$/,
    '',
  );
  const cleanPath = trimmed.replace(/^\/+/, '');

  return `${cleanBase}/${cleanPath}`;
}
