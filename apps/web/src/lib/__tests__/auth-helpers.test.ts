import { describe, expect, it } from 'vitest';
import { getUserRole, isAdminRole, mapAuthErrorMessage } from '../auth-helpers';

describe('auth-helpers', () => {
  describe('getUserRole', () => {
    it('returns role when user object has valid admin or user role', () => {
      expect(getUserRole({ role: 'admin' })).toBe('admin');
      expect(getUserRole({ role: 'user' })).toBe('user');
    });

    it('falls back to user role for invalid, unknown, or missing role', () => {
      expect(getUserRole({ role: 'moderator' })).toBe('user');
      expect(getUserRole({})).toBe('user');
      expect(getUserRole(null)).toBe('user');
      expect(getUserRole('admin')).toBe('user');
    });
  });

  describe('isAdminRole', () => {
    it('checks if role is admin', () => {
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('user')).toBe(false);
    });
  });

  describe('mapAuthErrorMessage', () => {
    const mockTranslate = (key: string) => `translated:${key}`;

    it('translates recognized auth error code or message', () => {
      const result = mapAuthErrorMessage(
        { code: 'INVALID_EMAIL_OR_PASSWORD' },
        mockTranslate,
      );
      expect(result).toBe('translated:invalidCredentials');
    });

    it('returns error.message if no auth translation key matched but message string exists', () => {
      const result = mapAuthErrorMessage(
        { message: 'Custom server error' },
        mockTranslate,
      );
      expect(result).toBe('Custom server error');
    });

    it('falls back to default translated error message', () => {
      const result = mapAuthErrorMessage({}, mockTranslate);
      expect(result).toBe('translated:errorDefault');
    });
  });
});
