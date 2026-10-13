import { ForbiddenException } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller';

jest.mock('better-auth/crypto', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_secret_password'),
}));

describe('BootstrapController', () => {
  let controller: BootstrapController;
  let mockConfigService: any;
  let mockDbService: any;
  let mockSelect: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockInsert: jest.Mock;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };

    mockSelect = jest.fn();
    mockUpdate = jest.fn();
    mockInsert = jest.fn();

    mockDbService = {
      db: {
        select: mockSelect,
        update: mockUpdate,
        insert: mockInsert,
      },
    };

    controller = new BootstrapController(mockConfigService, mockDbService, {
      t: jest.fn((key: string) => key),
    } as any);
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

    const chain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ id: 'existing_admin' }]),
    };
    mockSelect.mockReturnValue(chain);

    await expect(
      controller.bootstrap('correct-secret-token', {
        email: 'admin@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates new admin if token matches and no admin exists', async () => {
    mockConfigService.get.mockReturnValue('correct-secret-token');

    mockSelect.mockImplementation(() => ({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    }));

    const insertValuesMock = jest.fn().mockResolvedValue({});
    mockInsert.mockReturnValue({ values: insertValuesMock });

    const result = await controller.bootstrap('correct-secret-token', {
      email: 'admin@example.com',
      password: 'StrongPassword123!',
      name: 'Root Admin',
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('auth.bootstrap.success');
    expect(result.data.email).toBe('admin@example.com');
    expect(result.data.role).toBe('admin');
    expect(insertValuesMock).toHaveBeenCalledTimes(2); // user + account
  });
});
