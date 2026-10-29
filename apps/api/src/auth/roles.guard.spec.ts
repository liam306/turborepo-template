import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { usersRepository } from '@repo/database';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockDbService: any;
  let mockUserFindById: jest.SpyInstance;
  const mockI18n = {
    t: jest.fn((key: string) => key),
  } as any;

  beforeEach(() => {
    reflector = new Reflector();
    mockUserFindById = jest.spyOn(usersRepository, 'findById');
    mockDbService = {
      db: {},
    };
    guard = new RolesGuard(reflector, mockDbService, mockI18n);
  });

  const createMockContext = (user: any): ExecutionContext => {
    const request = { user, headers: {} };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('allows access when no roles are required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ id: 'u1', role: 'user' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('allows admin to access admin routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    mockUserFindById.mockResolvedValueOnce({
      id: 'u_admin',
      role: 'admin',
    } as any);
    const context = createMockContext({ id: 'u_admin', role: 'admin' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('blocks user when route requires admin', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    mockUserFindById.mockResolvedValueOnce({
      id: 'u_user',
      role: 'user',
    } as any);
    const context = createMockContext({ id: 'u_user', role: 'user' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
