import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { UsersService } from './users.service';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { AuthService } from '../auth/auth.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: any;
  let mockStorageService: any;
  let mockAuthService: any;
  let mockI18n: any;

  beforeEach(async () => {
    mockDb = {
      query: {
        user: {
          findFirst: jest.fn(),
        },
        account: {
          findMany: jest.fn(),
        },
        session: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({}),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      }),
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback({
          delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue({}),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue({}),
            }),
          }),
        });
      }),
    };

    mockStorageService = {
      upload: jest.fn().mockResolvedValue({
        url: 'https://cdn.example.com/avatars/user-1/123.webp',
      }),
      resolvePublicUrl: jest
        .fn()
        .mockReturnValue('https://cdn.example.com/avatars/user-1/123.webp'),
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
  });

  describe('getProfile', () => {
    it('throws NotFoundException if user not found', async () => {
      mockDb.query.user.findFirst.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns user profile with hasPassword and providers', async () => {
      mockDb.query.user.findFirst.mockResolvedValue({
        id: 'u-1',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        emailVerified: true,
        image: 'https://cdn.example.com/avatar.webp',
        theme: 'dark',
        locale: 'vi',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      });

      mockDb.query.account.findMany.mockResolvedValue([
        { providerId: 'google' },
        { providerId: 'credential', password: 'hashedpassword' },
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
      mockDb.query.user.findFirst.mockResolvedValue({
        id: 'u-1',
        name: 'Old Name',
        email: 'a@example.com',
        emailVerified: true,
        image: null,
        theme: 'system',
        locale: 'vi',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      });
      mockDb.query.account.findMany.mockResolvedValue([]);

      const updated = await service.updateProfile('u-1', {
        name: 'New Name',
        theme: 'dark',
        locale: 'en',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(updated.id).toBe('u-1');
    });
  });

  describe('deleteUserData', () => {
    it('throws NotFoundException if user does not exist', async () => {
      mockDb.query.user.findFirst.mockResolvedValue(null);

      await expect(service.deleteUserData('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('runs the application data reset extension hook in a transaction', async () => {
      mockDb.query.user.findFirst.mockResolvedValue({ id: 'u-1' });

      const res = await service.deleteUserData('u-1', 'vi');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(res.message).toBeDefined();
    });
  });

  describe('deleteAccount', () => {
    it('throws BadRequestException if account has password but no password provided', async () => {
      mockDb.query.user.findFirst.mockResolvedValue({
        id: 'u-1',
        name: 'User',
        email: 'user@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockDb.query.account.findMany.mockResolvedValue([
        { providerId: 'credential', password: 'hashed' },
      ]);

      await expect(
        service.deleteAccount('u-1', { password: '' }, {}, 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully deletes user account and records', async () => {
      mockDb.query.user.findFirst.mockResolvedValue({
        id: 'u-1',
        name: 'User',
        email: 'user@example.com',
        image: 'https://cdn.example.com/avatar.webp',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockDb.query.account.findMany.mockResolvedValue([]);

      const res = await service.deleteAccount('u-1', {}, {}, 'vi');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(res.message).toBeDefined();
    });
  });

  describe('restoreUser', () => {
    it('throws NotFoundException when user not found', async () => {
      mockDb.query.user.findFirst.mockResolvedValue(null);
      await expect(service.restoreUser('not-found')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('successfully restores soft-deleted user', async () => {
      mockDb.query.user.findFirst.mockResolvedValue({
        id: 'u-1',
        deletedAt: new Date(),
      });
      const res = await service.restoreUser('u-1', 'vi');
      expect(mockDb.update).toHaveBeenCalled();
      expect(res.message).toBeDefined();
    });
  });

  describe('getSessions', () => {
    it('returns active sessions with device info and marks current session', async () => {
      mockDb.query.session.findMany.mockResolvedValue([
        {
          id: 's-1',
          userId: 'u-1',
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
      mockDb.query.session.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeSession('u-1', 's-nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes session successfully', async () => {
      mockDb.query.session.findFirst.mockResolvedValue({
        id: 's-1',
        userId: 'u-1',
      });

      const res = await service.revokeSession('u-1', 's-1');

      expect(mockDb.delete).toHaveBeenCalled();
      expect(res.message).toBeDefined();
    });
  });

  describe('revokeOtherSessions', () => {
    it('deletes other sessions successfully', async () => {
      const res = await service.revokeOtherSessions('u-1', 's-1');

      expect(mockDb.delete).toHaveBeenCalled();
      expect(res.message).toBeDefined();
    });
  });
});
