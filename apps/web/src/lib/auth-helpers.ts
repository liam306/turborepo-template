import type { UserRole } from '@repo/types';
import { getAuthErrorTranslationKey } from '@repo/utils';

export function getUserRole(user: unknown): UserRole {
  if (user && typeof user === 'object' && 'role' in user) {
    const role = (user as { role: unknown }).role;
    if (role === 'admin' || role === 'user') {
      return role;
    }
  }
  return 'user';
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin';
}

export function mapAuthErrorMessage(
  error: unknown,
  translate: (key: string) => string,
): string {
  const key = getAuthErrorTranslationKey(error);
  if (key) {
    try {
      const result = translate(key);
      if (result && result !== key) return result;
    } catch {
      // ignore
    }
  }
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, any>;
    if (errObj.message && typeof errObj.message === 'string') {
      return errObj.message;
    }
  }
  return translate('errorDefault');
}
