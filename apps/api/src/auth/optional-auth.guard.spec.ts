import { ExecutionContext } from '@nestjs/common';
import { usersRepository } from '@repo/database';
import { OptionalAuthGuard } from './optional-auth.guard';
import { AuthService } from './auth.service';

describe('OptionalAuthGuard', () => {
  let guard: OptionalAuthGuard;
  let authService: jest.Mocked<AuthService>;
  let mockDbService: any;
  let mockGetSession: jest.Mock;

  beforeEach(() => {
    mockGetSession = jest.fn();
    mockDbService = { db: {} };
    authService = {
      auth: {
        api: {
          getSession: mockGetSession,
        },
      },
    } as unknown as jest.Mocked<AuthService>;

    guard = new OptionalAuthGuard(authService, mockDbService);
    jest.clearAllMocks();
  });

  const createMockContext = (
    headers: Record<string, string | string[]> = {},
    query: Record<string, string> = {},
  ): { context: ExecutionContext; request: Record<string, any> } => {
    const request: Record<string, any> = { headers, query };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('allows access and leaves user undefined when session is absent', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const { context, request } = createMockContext();

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('populates user and session on request when valid session is found', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'usr_1', role: 'user' },
      session: { id: 'sess_1' },
    });
    jest.spyOn(usersRepository, 'findById').mockResolvedValueOnce({
      id: 'usr_1',
      role: 'admin',
      deletedAt: null,
      bannedAt: null,
    } as any);

    const { context, request } = createMockContext({
      authorization: 'Bearer valid_token',
    });

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(request.user.id).toBe('usr_1');
    expect(request.user.role).toBe('admin');
    expect(request.session.id).toBe('sess_1');
  });

  it('supports token in query parameter if authorization header is absent', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'usr_query' },
      session: { id: 'sess_query' },
    });
    jest.spyOn(usersRepository, 'findById').mockResolvedValueOnce(null);

    const { context, request } = createMockContext({}, { token: 'url_token' });

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(request.user.id).toBe('usr_query');
  });

  it('does not attach user if user account is soft deleted', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'usr_del' },
      session: { id: 'sess_del' },
    });
    jest.spyOn(usersRepository, 'findById').mockResolvedValueOnce({
      id: 'usr_del',
      deletedAt: new Date(),
    } as any);

    const { context, request } = createMockContext();

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('does not attach user if user is actively banned', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'usr_banned' },
      session: { id: 'sess_banned' },
    });
    jest.spyOn(usersRepository, 'findById').mockResolvedValueOnce({
      id: 'usr_banned',
      deletedAt: null,
      bannedAt: new Date(),
      bannedUntil: new Date(Date.now() + 1000000),
    } as any);

    const { context, request } = createMockContext();

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('gracefully handles error from getSession and returns true', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('Auth failure'));
    const { context, request } = createMockContext();

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(request.user).toBeUndefined();
  });
});
