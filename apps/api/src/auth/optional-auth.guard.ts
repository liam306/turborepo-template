import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { usersRepository } from '@repo/database';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from './auth.types';
import type { UserRole } from '@repo/types';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private dbService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
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
        return true;
      }

      if (this.dbService?.db) {
        const dbUser = await usersRepository.findById(
          this.dbService.db,
          session.user.id,
          { includeDeleted: true },
        );

        if (dbUser?.deletedAt) {
          return true;
        }

        if (dbUser?.bannedAt) {
          const now = new Date();
          if (!dbUser.bannedUntil || new Date(dbUser.bannedUntil) > now) {
            return true;
          }
        }

        if (dbUser?.role) {
          (session.user as AuthUser).role = dbUser.role as UserRole;
        }
      }

      request.user = session.user;
      request.session = session.session;
      return true;
    } catch {
      return true;
    }
  }
}
