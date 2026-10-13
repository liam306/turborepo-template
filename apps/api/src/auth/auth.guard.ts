import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { eq } from 'drizzle-orm';
import { user } from '@repo/database';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from './auth.types';
import type { UserRole } from '@repo/types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private dbService: DatabaseService,
    private i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let lang = 'vi';
    try {
      if (typeof context.getType === 'function') {
        lang = I18nContext.current(context)?.lang || 'vi';
      }
    } catch {
      // ignore context error in non-http or test mocks
    }
    if (request?.headers?.['x-lang']) {
      lang = request.headers['x-lang'];
    } else if (request?.query?.lang) {
      lang = request.query.lang;
    }

    const headers = new Headers();

    if (request?.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        }
      }
    }

    if (!headers.has('authorization') && request?.query?.token) {
      headers.set('authorization', `Bearer ${request.query.token}`);
    }

    try {
      const session = await this.authService.auth.api.getSession({
        headers,
      });

      if (!session || !session.user) {
        throw new UnauthorizedException(
          this.i18n.t('common.errors.invalidSession', { lang }),
        );
      }

      if (this.dbService?.db?.query?.user) {
        const dbUser = await this.dbService.db.query.user.findFirst({
          where: eq(user.id, session.user.id),
          columns: {
            role: true,
            bannedAt: true,
            bannedUntil: true,
            bannedReason: true,
            deletedAt: true,
          },
        });

        if (dbUser?.deletedAt) {
          throw new ForbiddenException({
            code: 'ACCOUNT_DELETED',
            message: this.i18n.t('common.errors.accountDeleted', { lang }),
          });
        }

        if (dbUser?.bannedAt) {
          const now = new Date();
          if (!dbUser.bannedUntil || new Date(dbUser.bannedUntil) > now) {
            throw new ForbiddenException({
              code: 'USER_BANNED',
              message: this.i18n.t('common.errors.userBanned', {
                lang,
                args: { reason: dbUser.bannedReason || 'Account suspended' },
              }),
            });
          }
        }

        if (dbUser?.role) {
          (session.user as AuthUser).role = dbUser.role as UserRole;
        }
      }

      request.user = session.user;
      request.session = session.session;
      return true;
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new UnauthorizedException(
        this.i18n.t('common.errors.invalidSession', { lang }),
      );
    }
  }
}
