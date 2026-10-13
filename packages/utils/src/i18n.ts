/**
 * Returns localized string from an object with en/vi keys, matching active user locale.
 */
export function getLocalizedText(
  val?: string | { en?: string; vi?: string } | null,
  locale = 'vi',
  fallback = '',
): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val.trim() || fallback;
  const en = val.en?.trim();
  const vi = val.vi?.trim();
  if (locale === 'en') {
    return en || vi || fallback;
  }
  return vi || en || fallback;
}
