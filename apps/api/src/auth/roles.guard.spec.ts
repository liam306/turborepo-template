import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockDbService: any;
  let mockUserFindFirst: jest.Mock;
  const mockI18n = {
    t: jest.fn((key: string) => key),
  } as any;

  beforeEach(() => {
    reflector = new Reflector();
    mockUserFindFirst = jest.fn();
    mockDbService = {
      db: {
        query: {
          user: {
            findFirst: mockUserFindFirst,
          },
        },
      },
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
    mockUserFindFirst.mockResolvedValueOnce({ role: 'admin' });
    const context = createMockContext({ id: 'u_admin', role: 'admin' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('blocks user when route requires admin', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    mockUserFindFirst.mockResolvedValueOnce({ role: 'user' });
    const context = createMockContext({ id: 'u_user', role: 'user' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
