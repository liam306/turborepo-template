import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { user, account } from '@repo/database';
import { hashPassword } from 'better-auth/crypto';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { DatabaseService } from '../database/database.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';

@ApiTags('Admin Bootstrap')
@Controller('admin/bootstrap')
export class BootstrapController {
  constructor(
    private readonly configService: ConfigService,
    private readonly dbService: DatabaseService,
    private readonly i18n: I18nService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'One-time bootstrap endpoint to initialize the first Admin',
  })
  @ApiHeader({
    name: 'x-admin-bootstrap-token',
    description: 'Secret token configured via ADMIN_BOOTSTRAP_TOKEN env var',
    required: true,
  })
  @ApiBody({ type: BootstrapAdminDto })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Disabled, invalid token, or bootstrap already completed',
  })
  async bootstrap(
    @Headers('x-admin-bootstrap-token') clientToken: string | undefined,
    @Body() dto: BootstrapAdminDto,
  ) {
    const lang = I18nContext.current()?.lang ?? 'vi';
    const configuredToken = this.configService.get<string>(
      'ADMIN_BOOTSTRAP_TOKEN',
    );

    if (!configuredToken || configuredToken.trim().length === 0) {
      throw new ForbiddenException({
        code: 'BOOTSTRAP_DISABLED',
        message: this.i18n.t('auth.bootstrap.disabled', { lang }),
      });
    }

    if (!clientToken) {
      throw new ForbiddenException({
        code: 'MISSING_BOOTSTRAP_TOKEN',
        message: this.i18n.t('auth.bootstrap.missingToken', { lang }),
      });
    }

    const clientBuf = Buffer.from(clientToken);
    const configBuf = Buffer.from(configuredToken);

    if (
      clientBuf.length !== configBuf.length ||
      !crypto.timingSafeEqual(clientBuf, configBuf)
    ) {
      throw new ForbiddenException({
        code: 'INVALID_BOOTSTRAP_TOKEN',
        message: this.i18n.t('auth.bootstrap.invalidToken', { lang }),
      });
    }

    const [existingAdmin] = await this.dbService.db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, 'admin'))
      .limit(1);

    if (existingAdmin) {
      throw new ForbiddenException({
        code: 'BOOTSTRAP_ALREADY_COMPLETED',
        message: this.i18n.t('auth.bootstrap.alreadyCompleted', { lang }),
      });
    }

    const email = dto.email.trim().toLowerCase();
    const hashedPassword = await hashPassword(dto.password);

    const [existingUser] = await this.dbService.db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    let targetUserId: string;

    if (existingUser) {
      targetUserId = existingUser.id;
      await this.dbService.db
        .update(user)
        .set({
          role: 'admin',
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, existingUser.id));

      const [existingAccount] = await this.dbService.db
        .select({ id: account.id })
        .from(account)
        .where(eq(account.userId, existingUser.id))
        .limit(1);

      if (existingAccount) {
        await this.dbService.db
          .update(account)
          .set({
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(account.id, existingAccount.id));
      } else {
        await this.dbService.db.insert(account).values({
          id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          accountId: existingUser.id,
          providerId: 'credential',
          userId: existingUser.id,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      targetUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await this.dbService.db.insert(user).values({
        id: targetUserId,
        name: dto.name?.trim() || 'Admin',
        email,
        emailVerified: true,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.dbService.db.insert(account).values({
        id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        accountId: targetUserId,
        providerId: 'credential',
        userId: targetUserId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      success: true,
      message: this.i18n.t('auth.bootstrap.success', { lang }),
      data: {
        userId: targetUserId,
        email,
        role: 'admin',
      },
    };
  }
}
