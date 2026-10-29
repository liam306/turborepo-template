import { ForbiddenException } from '@nestjs/common';
import { usersRepository } from '@repo/database';
import { BootstrapController } from './bootstrap.controller';

jest.mock('better-auth/crypto', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_secret_password'),
}));

describe('BootstrapController', () => {
  let controller: BootstrapController;
  let mockConfigService: any;
  let mockDbService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };

    mockDbService = {
      db: {},
    };

    controller = new BootstrapController(mockConfigService, mockDbService, {
      t: jest.fn((key: string) => key),
    } as any);

    jest.clearAllMocks();
  });

  it('throws ForbiddenException if ADMIN_BOOTSTRAP_TOKEN is not configured', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    await expect(
      controller.bootstrap('some-token', {
        email: 'admin@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException if client token does not match', async () => {
    mockConfigService.get.mockReturnValue('correct-secret-token');

    await expect(
      controller.bootstrap('wrong-token', {
        email: 'admin@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException if an admin already exists', async () => {
    mockConfigService.get.mockReturnValue('correct-secret-token');
    jest.spyOn(usersRepository, 'findFirstAdmin').mockResolvedValue({
      id: 'existing_admin',
      role: 'admin',
    } as any);

    await expect(
      controller.bootstrap('correct-secret-token', {
        email: 'admin@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates new admin if token matches and no admin exists', async () => {
    mockConfigService.get.mockReturnValue('correct-secret-token');
    jest.spyOn(usersRepository, 'findFirstAdmin').mockResolvedValue(null);
    jest.spyOn(usersRepository, 'findByEmail').mockResolvedValue(null);
    const insertUserSpy = jest
      .spyOn(usersRepository, 'insert')
      .mockResolvedValue({ id: 'usr_new' } as any);
    const createAccountSpy = jest
      .spyOn(usersRepository, 'createAccount')
      .mockResolvedValue({ id: 'acc_new' } as any);

    const result = await controller.bootstrap('correct-secret-token', {
      email: 'admin@example.com',
      password: 'StrongPassword123!',
      name: 'Root Admin',
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('auth.bootstrap.success');
    expect(result.data.email).toBe('admin@example.com');
    expect(result.data.role).toBe('admin');
    expect(insertUserSpy).toHaveBeenCalled();
    expect(createAccountSpy).toHaveBeenCalled();
  });
});
