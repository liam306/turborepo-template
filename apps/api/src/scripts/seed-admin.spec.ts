import { usersRepository } from '@repo/database';
import { generateSecurePassword, seedAdmin } from './seed-admin';

jest.mock('@repo/database', () => ({
  createDbClient: jest.fn(() => ({})),
  closeDbClient: jest.fn().mockResolvedValue(undefined),
  usersRepository: {
    findByEmail: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    createAccount: jest.fn(),
    updateAccount: jest.fn(),
    findAccountsByUserId: jest.fn(),
  },
}));

jest.mock('better-auth/crypto', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_secret_password'),
}));

describe('seed-admin', () => {
  const mockDb = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecurePassword', () => {
    it('generates random password of specified length', () => {
      const pwd = generateSecurePassword(24);
      expect(typeof pwd).toBe('string');
      expect(pwd.length).toBe(24);
    });

    it('defaults to 16 characters', () => {
      const pwd = generateSecurePassword();
      expect(pwd.length).toBe(16);
    });
  });

  describe('seedAdmin', () => {
    it('throws error when email format is invalid', async () => {
      await expect(
        seedAdmin(mockDb, { email: 'invalid-email', password: 'password123' }),
      ).rejects.toThrow(/Invalid email/);
    });

    it('creates new admin user and credential account when user does not exist', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValueOnce(null);
      (usersRepository.insert as jest.Mock).mockResolvedValueOnce({});
      (usersRepository.createAccount as jest.Mock).mockResolvedValueOnce({});

      const result = await seedAdmin(mockDb, {
        email: 'superadmin@example.com',
        name: 'Super Admin',
        password: 'AdminPassword123!',
      });

      expect(result.email).toBe('superadmin@example.com');
      expect(result.role).toBe('admin');
      expect(result.isExisting).toBe(false);

      expect(usersRepository.insert).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          email: 'superadmin@example.com',
          name: 'Super Admin',
          role: 'admin',
          emailVerified: true,
        }),
      );

      expect(usersRepository.createAccount).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          password: 'hashed_secret_password',
          providerId: 'credential',
        }),
      );
    });

    it('elevates existing user to admin and updates account password (rerun idempotency)', async () => {
      const existingUser = {
        id: 'usr_existing_123',
        name: 'Old User',
        email: 'existing@example.com',
        role: 'user',
      };
      const existingAccount = {
        id: 'acc_existing_123',
        userId: 'usr_existing_123',
        providerId: 'credential',
      };

      (usersRepository.findByEmail as jest.Mock).mockResolvedValueOnce(
        existingUser,
      );
      (usersRepository.update as jest.Mock).mockResolvedValueOnce({});
      (usersRepository.findAccountsByUserId as jest.Mock).mockResolvedValueOnce(
        [existingAccount],
      );
      (usersRepository.updateAccount as jest.Mock).mockResolvedValueOnce({});

      const result = await seedAdmin(mockDb, {
        email: 'existing@example.com',
        password: 'NewAdminPassword123!',
      });

      expect(result.userId).toBe('usr_existing_123');
      expect(result.role).toBe('admin');
      expect(result.isExisting).toBe(true);

      expect(usersRepository.update).toHaveBeenCalledWith(
        mockDb,
        'usr_existing_123',
        expect.objectContaining({
          role: 'admin',
          emailVerified: true,
        }),
      );

      expect(usersRepository.updateAccount).toHaveBeenCalledWith(
        mockDb,
        'acc_existing_123',
        expect.objectContaining({
          password: 'hashed_secret_password',
        }),
      );
    });

    it('creates credential account when elevating existing OAuth-only user', async () => {
      const oauthUser = {
        id: 'usr_oauth_user',
        name: 'Google User',
        email: 'google@example.com',
        role: 'user',
      };

      (usersRepository.findByEmail as jest.Mock).mockResolvedValueOnce(
        oauthUser,
      );
      (usersRepository.update as jest.Mock).mockResolvedValueOnce({});
      (usersRepository.findAccountsByUserId as jest.Mock).mockResolvedValueOnce(
        [],
      );
      (usersRepository.createAccount as jest.Mock).mockResolvedValueOnce({});

      const result = await seedAdmin(mockDb, {
        email: 'google@example.com',
      });

      expect(result.isExisting).toBe(true);
      expect(result.generatedPassword).toBeDefined();
      expect(usersRepository.createAccount).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: 'usr_oauth_user',
          providerId: 'credential',
          password: 'hashed_secret_password',
        }),
      );
    });
  });
});
