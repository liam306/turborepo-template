import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nContext, I18nService } from 'nestjs-i18n';
import type { UserRole } from '@repo/types';
import { ROLES_KEY } from './roles.decorator';
import { DatabaseService } from '../database/database.service';
import { eq } from 'drizzle-orm';
import { user } from '@repo/database';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dbService: DatabaseService,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let lang = 'en';
    try {
      if (typeof context.getType === 'function') {
        lang = I18nContext.current(context)?.lang || 'en';
      }
    } catch {
      // ignore context error in non-http or test mocks
    }
    if (request?.headers?.['x-lang']) {
      lang = request.headers['x-lang'];
    } else if (request?.query?.lang) {
      lang = request.query.lang;
    }

    const currentUser = request.user;

    if (!currentUser || !currentUser.id) {
      throw new ForbiddenException({
        code: 'UNAUTHORIZED_NO_USER',
        message: this.i18n.t('common.errors.unauthorized', { lang }),
      });
    }

    // Lấy role mới nhất từ database
    const dbUser = await this.dbService.db.query.user.findFirst({
      where: eq(user.id, currentUser.id),
      columns: {
        role: true,
      },
    });

    const userRole = (dbUser?.role as UserRole) || currentUser.role || 'user';

    if (userRole === 'admin') {
      return true;
    }

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: this.i18n.t('common.forbidden', { lang }),
      });
    }

    return true;
  }
}
