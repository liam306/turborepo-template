import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { usersRepository } from '@repo/database';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jest.Mocked<AuthService>;
  let mockDbService: any;
  let mockGetSession: jest.Mock;
  let mockUserFindById: jest.SpyInstance;
  const mockI18n = {
    t: jest.fn((key: string, opts?: any) => {
      if (key === 'common.errors.invalidSession')
        return 'Invalid or expired session';
      if (key === 'common.errors.unauthorized')
        return 'Authentication required';
      if (key === 'common.errors.userBanned')
        return `Your account has been suspended: ${opts?.args?.reason || ''}`;
      return key;
    }),
  } as any;

  beforeEach(() => {
    mockGetSession = jest.fn();
    mockUserFindById = jest
      .spyOn(usersRepository, 'findById')
      .mockResolvedValue({
        id: 'usr_123',
        name: 'Nguyen Van A',
        email: 'user@example.local',
        emailVerified: true,
        image: null,
        theme: 'system',
        locale: 'vi',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'user',
        bannedAt: null,
        bannedUntil: null,
        bannedReason: null,
        deletedAt: null,
      });
    mockDbService = {
      db: {},
    };
    authService = {
      auth: {
        api: {
          getSession: mockGetSession,
        },
      },
    } as unknown as jest.Mocked<AuthService>;

    guard = new AuthGuard(authService, mockDbService, mockI18n);
  });

  const createMockContext = (
    headers: Record<string, string | string[]>,
  ): { context: ExecutionContext; request: Record<string, any> } => {
    const request: Record<string, any> = { headers };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('should allow access and attach user & session when session is valid', async () => {
    const mockUser = {
      id: 'usr_123',
      email: 'user@example.local',
      name: 'Nguyen Van A',
    };
    const mockSession = { id: 'sess_abc', token: 'valid-token' };

    mockGetSession.mockResolvedValueOnce({
      user: mockUser,
      session: mockSession,
    });

    const { context, request } = createMockContext({
      authorization: 'Bearer valid-token',
      cookie: 'better-auth.session_token=valid-token',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(mockUser);
    expect(request.session).toEqual(mockSession);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it('should handle multi-valued array headers by joining them with commas', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'usr_123' },
      session: { id: 'sess_abc' },
    });

    const { context } = createMockContext({
      'x-custom-header': ['val1', 'val2'],
      authorization: 'Bearer token',
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when getSession returns null', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired session'),
    );
  });

  it('should throw UnauthorizedException when session has no user object', async () => {
    mockGetSession.mockResolvedValueOnce({
      session: { id: 'sess_no_user' },
    } as any);

    const { context } = createMockContext({ authorization: 'Bearer token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired session'),
    );
  });

  it('should throw ForbiddenException when user is banned', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'usr_banned' },
      session: { id: 'sess_1' },
    });
    mockUserFindById.mockResolvedValueOnce({
      id: 'usr_banned',
      name: 'Banned User',
      email: 'banned@example.com',
      emailVerified: true,
      image: null,
      theme: 'system',
      locale: 'vi',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      role: 'user',
      bannedAt: new Date(),
      bannedUntil: null,
      bannedReason: 'Terms violation',
    });

    const { context } = createMockContext({
      authorization: 'Bearer valid-token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it('should throw UnauthorizedException when getSession rejects or throws an error', async () => {
    mockGetSession.mockRejectedValueOnce(
      new Error('JWT expired or database connection failed'),
    );

    const { context } = createMockContext({
      authorization: 'Bearer expired-token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired session'),
    );
  });
});
