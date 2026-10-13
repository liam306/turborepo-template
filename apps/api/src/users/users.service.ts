import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import sharp from 'sharp';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { AuthService } from '../auth/auth.service';
import { account, session, user } from '@repo/database';
import {
  IAvatarUploadResponse,
  IMessageResponse,
  IUserProfile,
  IUserSession,
  SupportedLocale,
  ThemeMode,
  UserRole,
} from '@repo/types';
import { parseUserAgent } from '@repo/utils';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly authService: AuthService,
    private readonly i18n: I18nService,
  ) {}

  async getProfile(userId: string, lang = 'vi'): Promise<IUserProfile> {
    const dbUser = await this.dbService.db.query.user.findFirst({
      where: and(eq(user.id, userId), isNull(user.deletedAt)),
    });

    if (!dbUser) {
      const msg = this.i18n.t('common.errors.userNotFound', { lang });
      throw new NotFoundException(msg);
    }

    const accounts = await this.dbService.db.query.account.findMany({
      where: eq(account.userId, userId),
    });

    const providers = accounts.map((acc) => acc.providerId);
    const hasPassword = accounts.some(
      (acc) => acc.providerId === 'credential' && Boolean(acc.password),
    );

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      emailVerified: dbUser.emailVerified,
      image: dbUser.image,
      role: (dbUser.role as UserRole) || 'user',
      theme: (dbUser.theme as ThemeMode) || 'system',
      locale: (dbUser.locale as SupportedLocale) || 'vi',
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
      hasPassword,
      providers,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    lang = 'vi',
  ): Promise<IUserProfile> {
    const existing = await this.dbService.db.query.user.findFirst({
      where: and(eq(user.id, userId), isNull(user.deletedAt)),
    });

    if (!existing) {
      const msg = this.i18n.t('common.errors.userNotFound', { lang });
      throw new NotFoundException(msg);
    }

    const updateData: Partial<typeof user.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.theme !== undefined) {
      updateData.theme = dto.theme;
    }

    if (dto.locale !== undefined) {
      updateData.locale = dto.locale;
    }

    await this.dbService.db
      .update(user)
      .set(updateData)
      .where(eq(user.id, userId));

    return this.getProfile(userId, lang);
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
    lang = 'vi',
  ): Promise<IAvatarUploadResponse> {
    if (!file || !file.buffer) {
      const msg = this.i18n.t('common.errors.invalidImageFile', { lang });
      throw new BadRequestException(msg);
    }

    // Process & optimize with sharp: resize 512x512, webp format, quality 85, strip metadata
    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await sharp(file.buffer)
        .rotate() // auto-orient based on EXIF before stripping
        .resize(512, 512, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();
    } catch {
      const msg = this.i18n.t('common.errors.invalidImageFile', { lang });
      throw new BadRequestException(msg);
    }

    const key = `avatars/${userId}/${Date.now()}.webp`;
    const uploadResult = await this.storageService.upload(
      key,
      optimizedBuffer,
      {
        contentType: 'image/webp',
      },
    );

    const avatarUrl =
      uploadResult.url ||
      this.storageService.resolvePublicUrl(key) ||
      `/storage/${key}`;

    await this.dbService.db
      .update(user)
      .set({ image: avatarUrl, updatedAt: new Date() })
      .where(eq(user.id, userId));

    return {
      avatarUrl,
      message: this.i18n.t('common.users.avatarUpdated', { lang }),
    };
  }

  async setPassword(
    userId: string,
    dto: SetPasswordDto,
    lang = 'vi',
  ): Promise<IMessageResponse> {
    const profile = await this.getProfile(userId, lang);

    if (profile.hasPassword) {
      const msg = this.i18n.t('common.errors.passwordAlreadySet', { lang });
      throw new BadRequestException(msg);
    }

    await this.authService.auth.api.setPassword({
      body: {
        newPassword: dto.newPassword,
        userId,
      },
    });

    return {
      message: this.i18n.t('common.users.passwordSet', { lang }),
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    headers: Headers | Record<string, string | string[] | undefined>,
    lang = 'vi',
  ): Promise<IMessageResponse> {
    const profile = await this.getProfile(userId, lang);

    if (!profile.hasPassword) {
      const msg = this.i18n.t('common.errors.passwordNotSet', { lang });
      throw new BadRequestException(msg);
    }

    try {
      await this.authService.auth.api.changePassword({
        body: {
          currentPassword: dto.currentPassword,
          newPassword: dto.newPassword,
          revokeOtherSessions: true,
        },
        headers,
      });
    } catch {
      const msg = this.i18n.t('common.errors.incorrectCurrentPassword', {
        lang,
      });
      throw new BadRequestException(msg);
    }

    return {
      message: this.i18n.t('common.users.passwordChanged', { lang }),
    };
  }

  async deleteUserData(userId: string, lang = 'vi'): Promise<IMessageResponse> {
    const existing = await this.dbService.db.query.user.findFirst({
      where: and(eq(user.id, userId), isNull(user.deletedAt)),
    });

    if (!existing) {
      const msg = this.i18n.t('common.errors.userNotFound', { lang });
      throw new NotFoundException(msg);
    }

    await this.dbService.db.transaction(async (_tx) => {
      // TODO(template): Insert table cleanups for your custom application tables here.
      // Example:
      // await _tx.delete(notes).where(eq(notes.userId, userId));
      // Also clean up any user-uploaded files or object storage assets if required.
    });

    return {
      message: this.i18n.t('common.users.userDataDeleted', { lang }),
    };
  }

  async restoreUser(userId: string, lang = 'vi'): Promise<IMessageResponse> {
    const existing = await this.dbService.db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!existing) {
      const msg = this.i18n.t('common.errors.userNotFound', { lang });
      throw new NotFoundException(msg);
    }

    await this.dbService.db
      .update(user)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(user.id, userId));

    return {
      message: this.i18n.t('common.users.userRestored', { lang }),
    };
  }

  async deleteAccount(
    userId: string,
    dto: DeleteAccountDto,
    headers: Headers | Record<string, string | string[] | undefined>,
    lang = 'vi',
  ): Promise<IMessageResponse> {
    const profile = await this.getProfile(userId, lang);

    // If account has password, require and verify password before deletion
    if (profile.hasPassword) {
      if (!dto?.password) {
        const msg = this.i18n.t('common.errors.passwordRequiredForDeletion', {
          lang,
        });
        throw new BadRequestException(msg);
      }

      try {
        await this.authService.auth.api.changePassword({
          body: {
            currentPassword: dto.password,
            newPassword: dto.password,
            revokeOtherSessions: true,
          },
          headers,
        });
      } catch {
        const msg = this.i18n.t('common.errors.incorrectCurrentPassword', {
          lang,
        });
        throw new BadRequestException(msg);
      }
    }

    // Attempt avatar removal from storage if exists
    if (profile.image) {
      try {
        const urlObj = new URL(profile.image);
        const storageKey = urlObj.pathname.startsWith('/')
          ? urlObj.pathname.slice(1)
          : urlObj.pathname;
        await this.storageService.delete(storageKey);
      } catch {
        // Non-blocking if storage cleanup fails
      }
    }

    // Revoke all active sessions and soft delete user in a single transaction
    await this.dbService.db.transaction(async (tx) => {
      await tx.delete(session).where(eq(session.userId, userId));
      await tx
        .update(user)
        .set({ deletedAt: new Date() })
        .where(eq(user.id, userId));
    });

    return {
      message: this.i18n.t('common.users.accountDeleted', { lang }),
    };
  }

  async getSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<IUserSession[]> {
    const activeSessions = await this.dbService.db.query.session.findMany({
      where: and(eq(session.userId, userId), gt(session.expiresAt, new Date())),
      orderBy: desc(session.createdAt),
    });

    return activeSessions.map((s) => {
      const parsed = parseUserAgent(s.userAgent);
      return {
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        deviceType: parsed.deviceType,
        browser: parsed.browser,
        os: parsed.os,
        isCurrent: Boolean(currentSessionId && s.id === currentSessionId),
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      };
    });
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    lang = 'vi',
  ): Promise<IMessageResponse> {
    const targetSession = await this.dbService.db.query.session.findFirst({
      where: and(eq(session.id, sessionId), eq(session.userId, userId)),
    });

    if (!targetSession) {
      const msg = this.i18n.t('common.errors.sessionNotFound', { lang });
      throw new NotFoundException(msg);
    }

    await this.dbService.db.delete(session).where(eq(session.id, sessionId));

    return {
      message: this.i18n.t('common.users.sessionRevoked', { lang }),
    };
  }

  async revokeOtherSessions(
    userId: string,
    currentSessionId?: string,
    lang = 'vi',
  ): Promise<IMessageResponse> {
    if (!currentSessionId) {
      await this.dbService.db.delete(session).where(eq(session.userId, userId));
    } else {
      await this.dbService.db
        .delete(session)
        .where(
          and(eq(session.userId, userId), ne(session.id, currentSessionId)),
        );
    }

    return {
      message: this.i18n.t('common.users.otherSessionsRevoked', { lang }),
    };
  }
}
