import { UsersController } from './users.controller';
import { AuthUser, AuthSession } from '../auth/auth.types';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: Record<string, jest.Mock>;

  const mockUser: AuthUser = {
    id: 'user_1',
    name: 'User One',
    email: 'user1@example.com',
    emailVerified: true,
  };

  const mockSession: AuthSession = {
    id: 'sess_1',
    userId: 'user_1',
    token: 'tok_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(),
  };

  beforeEach(() => {
    mockUsersService = {
      getProfile: jest.fn().mockResolvedValue({ id: 'user_1' }),
      updateProfile: jest.fn().mockResolvedValue({ id: 'user_1', name: 'New' }),
      uploadAvatar: jest
        .fn()
        .mockResolvedValue({ avatarUrl: 'https://cdn/1.webp' }),
      setPassword: jest.fn().mockResolvedValue({ message: 'Password set' }),
      changePassword: jest
        .fn()
        .mockResolvedValue({ message: 'Password changed' }),
      deleteUserData: jest.fn().mockResolvedValue({ message: 'Data deleted' }),
      deleteAccount: jest
        .fn()
        .mockResolvedValue({ message: 'Account deleted' }),
      restoreUser: jest.fn().mockResolvedValue({ message: 'User restored' }),
      getSessions: jest.fn().mockResolvedValue([{ id: 'sess_1' }]),
      revokeOtherSessions: jest
        .fn()
        .mockResolvedValue({ message: 'Sessions revoked' }),
      revokeSession: jest
        .fn()
        .mockResolvedValue({ message: 'Session revoked' }),
    };

    controller = new UsersController(mockUsersService as any);
  });

  it('delegates getProfile with user id and fallback locale', async () => {
    await controller.getProfile(mockUser, undefined);
    expect(mockUsersService.getProfile).toHaveBeenCalledWith('user_1', 'vi');
  });

  it('delegates updateProfile with dto and locale', async () => {
    const dto = { name: 'Updated' };
    await controller.updateProfile(mockUser, dto, 'en');
    expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
      'user_1',
      dto,
      'en',
    );
  });

  it('delegates uploadAvatar with uploaded file', async () => {
    const file = { buffer: Buffer.from('') } as Express.Multer.File;
    await controller.uploadAvatar(mockUser, file, 'vi');
    expect(mockUsersService.uploadAvatar).toHaveBeenCalledWith(
      'user_1',
      file,
      'vi',
    );
  });

  it('delegates setPassword', async () => {
    const dto = { newPassword: 'Password123' };
    await controller.setPassword(mockUser, dto, 'en');
    expect(mockUsersService.setPassword).toHaveBeenCalledWith(
      'user_1',
      dto,
      'en',
    );
  });

  it('delegates changePassword with headers', async () => {
    const dto = { currentPassword: 'Old', newPassword: 'New' };
    const headers = { 'x-lang': 'en' };
    await controller.changePassword(mockUser, dto, headers);
    expect(mockUsersService.changePassword).toHaveBeenCalledWith(
      'user_1',
      dto,
      headers,
      'en',
    );
  });

  it('delegates deleteUserData and deleteAccount', async () => {
    await controller.deleteUserData(mockUser, 'vi');
    expect(mockUsersService.deleteUserData).toHaveBeenCalledWith(
      'user_1',
      'vi',
    );

    const headers = { 'x-lang': 'vi' };
    await controller.deleteAccount(mockUser, {}, headers);
    expect(mockUsersService.deleteAccount).toHaveBeenCalledWith(
      'user_1',
      {},
      headers,
      'vi',
    );
  });

  it('delegates restoreUser by target user id', async () => {
    await controller.restoreUser('target_user', 'vi');
    expect(mockUsersService.restoreUser).toHaveBeenCalledWith(
      'target_user',
      'vi',
    );
  });

  it('delegates getSessions and session revocations', async () => {
    await controller.getSessions(mockUser, mockSession);
    expect(mockUsersService.getSessions).toHaveBeenCalledWith(
      'user_1',
      'sess_1',
    );

    await controller.revokeOtherSessions(mockUser, mockSession, 'vi');
    expect(mockUsersService.revokeOtherSessions).toHaveBeenCalledWith(
      'user_1',
      'sess_1',
      'vi',
    );

    await controller.revokeSession(mockUser, 'sess_target', 'en');
    expect(mockUsersService.revokeSession).toHaveBeenCalledWith(
      'user_1',
      'sess_target',
      'en',
    );
  });
});
