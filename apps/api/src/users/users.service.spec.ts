import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { UsersService } from './users.service';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { AuthService } from '../auth/auth.service';
import { usersRepository, type UserRecord } from '@repo/database';

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: any;
  let mockStorageService: any;
  let mockAuthService: any;
  let mockI18n: any;

  beforeEach(async () => {
    mockDb = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockDb);
      }),
    };

    mockStorageService = {
      upload: jest.fn().mockResolvedValue({
        url: 'https://cdn.example.com/avatars/user-1/123.webp',
      }),
      resolvePublicUrl: jest
        .fn()
        .mockReturnValue('https://cdn.example.com/avatars/user-1/123.webp'),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    mockAuthService = {
      auth: {
        api: {
          setPassword: jest.fn().mockResolvedValue({}),
          changePassword: jest.fn().mockResolvedValue({}),
        },
      },
    };

    mockI18n = {
      t: jest.fn().mockImplementation((key) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DatabaseService,
          useValue: { db: mockDb },
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: I18nService,
          useValue: mockI18n,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('throws NotFoundException if user not found', async () => {
      jest.spyOn(usersRepository, 'findById').mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns user profile with hasPassword and providers', async () => {
      jest.spyOn(usersRepository, 'findById').mockResolvedValue({
        id: 'u-1',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        emailVerified: true,
        image: 'https://cdn.example.com/avatar.webp',
        role: 'user',
        theme: 'dark',
        locale: 'vi',
        bannedAt: null,
        bannedReason: null,
        bannedUntil: null,
        deletedAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      });

      jest.spyOn(usersRepository, 'findAccountsByUserId').mockResolvedValue([
        {
          id: 'acc-1',
          accountId: 'u-1',
          providerId: 'google',
          userId: 'u-1',
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'acc-2',
          accountId: 'u-1',
          providerId: 'credential',
          userId: 'u-1',
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
          password: 'hashedpassword',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getProfile('u-1');

      expect(result.id).toBe('u-1');
      expect(result.hasPassword).toBe(true);
      expect(result.providers).toEqual(['google', 'credential']);
    });
  });

  describe('setPassword', () => {
    it('throws BadRequestException if user already has password', async () => {
      jest.spyOn(service, 'getProfile').mockResolvedValue({
        id: 'u-1',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        emailVerified: true,
        image: null,
        role: 'user',
        theme: 'system',
        locale: 'vi',
        createdAt: '',
        updatedAt: '',
        hasPassword: true,
        providers: ['credential'],
      });

      await expect(
        service.setPassword('u-1', { newPassword: 'StrongPassword123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets password for oauth user successfully', async () => {
      jest.spyOn(service, 'getProfile').mockResolvedValue({
        id: 'u-1',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        emailVerified: true,
        image: null,
        role: 'user',
        theme: 'system',
        locale: 'vi',
        createdAt: '',
        updatedAt: '',
        hasPassword: false,
        providers: ['google'],
      });

      const res = await service.setPassword('u-1', {
        newPassword: 'StrongPassword123',
      });

      expect(mockAuthService.auth.api.setPassword).toHaveBeenCalledWith({
        body: {
          newPassword: 'StrongPassword123',
          userId: 'u-1',
        },
      });
      expect(res.message).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('updates name, theme, and locale', async () => {
      const existingUser: UserRecord = {
        id: 'u-1',
        name: 'Old Name',
        email: 'a@example.com',
        emailVerified: true,
        image: null,
        role: 'user',
        theme: 'system',
        locale: 'vi',
        bannedAt: null,
        bannedReason: null,
        bannedUntil: null,
        deletedAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      };

      jest.spyOn(usersRepository, 'findById').mockResolvedValue(existingUser);
      jest.spyOn(usersRepository, 'findAccountsByUserId').mockResolvedValue([]);
      const updateSpy = jest.spyOn(usersRepository, 'update').mockResolvedValue({
        ...existingUser,
        name: 'New Name',
        theme: 'dark',
        locale: 'en',
      });

      const updated = await service.updateProfile('u-1', {
        name: 'New Name',
        theme: 'dark',
        locale: 'en',
      });

      expect(updateSpy).toHaveBeenCalledWith(
        mockDb,
        'u-1',
        expect.objectContaining({
          name: 'New Name',
          theme: 'dark',
          locale: 'en',
        }),
      );
      expect(updated.id).toBe('u-1');
    });
  });

  describe('deleteUserData', () => {
    it('throws NotFoundException if user does not exist', async () => {
      jest.spyOn(usersRepository, 'findById').mockResolvedValue(null);

      await expect(service.deleteUserData('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('runs the application data reset extension hook in a transaction', async () => {
      jest.spyOn(usersRepository, 'findById').mockResolvedValue({
        id: 'u-1',
        name: 'User',
        email: 'user@example.com',
        emailVerified: true,
        image: null,
        role: 'user',
        theme: 'system',
        locale: 'vi',
        bannedAt: null,
        bannedReason: null,
        bannedUntil: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.deleteUserData('u-1', 'vi');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(res.message).toBeDefined();
    });
  });

  describe('deleteAccount', () => {
    it('throws BadRequestException if account has password but no password provided', async () => {
      jest.spyOn(usersRepository, 'findById').mockResolvedValue({
        id: 'u-1',
        name: 'User',
        email: 'user@example.com',
        emailVerified: true,
        image: null,
        role: 'user',
        theme: 'system',
        locale: 'vi',
        bannedAt: null,
        bannedReason: null,
        bannedUntil: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      jest.spyOn(usersRepository, 'findAccountsByUserId').mockResolvedValue([
        {
          id: 'acc-1',
          accountId: 'u-1',
          providerId: 'credential',
          userId: 'u-1',
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
          password: 'hashed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await expect(
        service.deleteAccount('u-1', { password: '' }, {}, 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully deletes user account and records', async () => {
      jest.spyOn(usersRepository, 'findById').mockResolvedValue({
        id: 'u-1',
        name: 'User',
        email: 'user@example.com',
        emailVerified: true,
        image: 'https://cdn.example.com/avatar.webp',
        role: 'user',
        theme: 'system',
        locale: 'vi',
        bannedAt: null,
        bannedReason: null,
        bannedUntil: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      jest.spyOn(usersRepository, 'findAccountsByUserId').mockResolvedValue([]);
      const deleteSessionsSpy = jest
        .spyOn(usersRepository, 'deleteSessionsByUserId')
        .mockResolvedValue(undefined);
      const softDeleteSpy = jest
        .spyOn(usersRepository, 'softDelete')
        .mockResolvedValue(null);

      const res = await service.deleteAccount('u-1', {}, {}, 'vi');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(deleteSessionsSpy).toHaveBeenCalledWith(mockDb, 'u-1');
      expect(softDeleteSpy).toHaveBeenCalledWith(mockDb, 'u-1');
      expect(res.message).toBeDefined();
    });
  });

  describe('restoreUser', () => {
    it('throws NotFoundException when user not found', async () => {
      jest.spyOn(usersRepository, 'findById').mockResolvedValue(null);
      await expect(service.restoreUser('not-found')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('successfully restores soft-deleted user', async () => {
      jest.spyOn(usersRepository, 'findById').mockResolvedValue({
        id: 'u-1',
        name: 'User',
        email: 'user@example.com',
        emailVerified: true,
        image: null,
        role: 'user',
        theme: 'system',
        locale: 'vi',
        bannedAt: null,
        bannedReason: null,
        bannedUntil: null,
        deletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const restoreSpy = jest
        .spyOn(usersRepository, 'restore')
        .mockResolvedValue(null);

      const res = await service.restoreUser('u-1', 'vi');
      expect(restoreSpy).toHaveBeenCalledWith(mockDb, 'u-1');
      expect(res.message).toBeDefined();
    });
  });

  describe('getSessions', () => {
    it('returns active sessions with device info and marks current session', async () => {
      jest.spyOn(usersRepository, 'findActiveSessionsByUserId').mockResolvedValue([
        {
          id: 's-1',
          userId: 'u-1',
          token: 'tok-1',
          ipAddress: '127.0.0.1',
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          createdAt: new Date('2026-03-01T10:00:00.000Z'),
          updatedAt: new Date('2026-03-01T10:00:00.000Z'),
          expiresAt: new Date('2026-04-01T10:00:00.000Z'),
        },
        {
          id: 's-2',
          userId: 'u-1',
          token: 'tok-2',
          ipAddress: '192.168.1.1',
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
          createdAt: new Date('2026-03-02T10:00:00.000Z'),
          updatedAt: new Date('2026-03-02T10:00:00.000Z'),
          expiresAt: new Date('2026-04-02T10:00:00.000Z'),
        },
      ]);

      const result = await service.getSessions('u-1', 's-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('s-1');
      expect(result[0].isCurrent).toBe(true);
      expect(result[0].browser).toBe('Chrome');
      expect(result[0].os).toBe('macOS');
      expect(result[0].deviceType).toBe('desktop');

      expect(result[1].id).toBe('s-2');
      expect(result[1].isCurrent).toBe(false);
      expect(result[1].browser).toBe('Safari');
      expect(result[1].os).toBe('iOS');
      expect(result[1].deviceType).toBe('mobile');
    });
  });

  describe('revokeSession', () => {
    it('throws NotFoundException if session does not exist', async () => {
      jest.spyOn(usersRepository, 'findSessionByIdAndUserId').mockResolvedValue(null);

      await expect(
        service.revokeSession('u-1', 's-nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes session successfully', async () => {
      jest.spyOn(usersRepository, 'findSessionByIdAndUserId').mockResolvedValue({
        id: 's-1',
        userId: 'u-1',
        token: 'tok-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        ipAddress: null,
        userAgent: null,
      });
      const deleteSpy = jest
        .spyOn(usersRepository, 'deleteSession')
        .mockResolvedValue(undefined);

      const res = await service.revokeSession('u-1', 's-1');

      expect(deleteSpy).toHaveBeenCalledWith(mockDb, 's-1');
      expect(res.message).toBeDefined();
    });
  });

  describe('revokeOtherSessions', () => {
    it('deletes other sessions successfully', async () => {
      const deleteSpy = jest
        .spyOn(usersRepository, 'deleteOtherSessions')
        .mockResolvedValue(undefined);

      const res = await service.revokeOtherSessions('u-1', 's-1');

      expect(deleteSpy).toHaveBeenCalledWith(mockDb, 'u-1', 's-1');
      expect(res.message).toBeDefined();
    });
  });
});
