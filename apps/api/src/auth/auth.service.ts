import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, emailOTP } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import * as schema from '@repo/database';
import { AuthSession, AuthUser } from './auth.types';
import { EnvVars } from '../config/env.validation';

export interface IBetterAuthSession {
  user: AuthUser;
  session: AuthSession;
}

export interface IBetterAuthClient {
  handler: (request: Request, response?: unknown) => Promise<Response>;
  api: {
    getSession: (context: {
      headers: Headers;
    }) => Promise<IBetterAuthSession | null>;
    setPassword: (context: {
      body: { newPassword: string; userId: string };
    }) => Promise<unknown>;
    changePassword: (context: {
      body: {
        currentPassword: string;
        newPassword: string;
        revokeOtherSessions?: boolean;
      };
      headers?: Headers | Record<string, string | string[] | undefined>;
    }) => Promise<unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

@Injectable()
export class AuthService implements OnModuleInit {
  public auth!: IBetterAuthClient;

  constructor(
    private readonly dbService: DatabaseService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<EnvVars, true>,
  ) {}

  onModuleInit() {
    const baseURL =
      this.configService.get('BETTER_AUTH_URL', { infer: true }) ||
      'http://localhost:4000';
    const secret = this.configService.get('BETTER_AUTH_SECRET', {
      infer: true,
    });
    if (!secret) {
      throw new Error('BETTER_AUTH_SECRET is required but not configured.');
    }

    const cookieDomain = this.configService.get('COOKIE_DOMAIN', {
      infer: true,
    });

    const googleClientId = this.configService.get('GOOGLE_CLIENT_ID', {
      infer: true,
    });
    const googleClientSecret = this.configService.get('GOOGLE_CLIENT_SECRET', {
      infer: true,
    });

    const appleClientId = this.configService.get('APPLE_CLIENT_ID', {
      infer: true,
    });
    const appleClientSecret = this.configService.get('APPLE_CLIENT_SECRET', {
      infer: true,
    });

    const rawCorsOrigins =
      this.configService.get('CORS_ORIGINS', { infer: true }) || '';
    const trustedOrigins = rawCorsOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const mobileOrigins = this.configService.get('AUTH_TRUSTED_ORIGINS', {
      infer: true,
    });
    trustedOrigins.push(
      ...mobileOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    );

    if (!this.dbService.db) {
      throw new Error(
        'DatabaseService.db is undefined during AuthService initialization.',
      );
    }

    this.auth = betterAuth({
      baseURL,
      basePath: '/auth',
      secret,
      trustedOrigins,
      session: {
        expiresIn: 30 * 24 * 60 * 60, // 30 days default / persistent session
        updateAge: 24 * 60 * 60, // 1 day sliding refresh window
      },
      advanced: {
        ...(cookieDomain
          ? {
              crossSubDomainCookies: {
                enabled: true,
                domain: cookieDomain,
              },
            }
          : {}),
        defaultCookieAttributes: {
          sameSite: 'lax',
          secure: baseURL.startsWith('https://'),
        },
      },
      database: drizzleAdapter(this.dbService.db, {
        provider: 'pg',
        schema: {
          user: schema.user,
          session: schema.session,
          account: schema.account,
          verification: schema.verification,
        },
      }),
      user: {
        additionalFields: {
          role: {
            type: 'string',
            required: false,
            defaultValue: 'user',
            input: false,
          },
          theme: {
            type: 'string',
            required: false,
            defaultValue: 'system',
            input: false,
          },
          locale: {
            type: 'string',
            required: false,
            defaultValue: 'vi',
            input: false,
          },
          bannedAt: {
            type: 'date',
            required: false,
            input: false,
          },
          bannedReason: {
            type: 'string',
            required: false,
            input: false,
          },
          bannedUntil: {
            type: 'date',
            required: false,
            input: false,
          },
          deletedAt: {
            type: 'date',
            required: false,
            input: false,
          },
        },
      },
      plugins: [
        expo(),
        bearer(),
        emailOTP({
          sendVerificationOTP: async ({ email, otp, type }, request) => {
            const lang =
              request?.headers?.get?.('x-lang') ||
              request?.headers
                ?.get?.('accept-language')
                ?.split(',')?.[0]
                ?.trim() ||
              'vi';
            if (type === 'forget-password') {
              await this.mailService.sendPasswordResetOtp(email, otp, lang);
            } else {
              await this.mailService.sendVerificationOtp(email, otp, lang);
            }
          },
          otpLength: 6,
          expiresIn: 300,
          sendVerificationOnSignUp: true,
          allowedAttempts: 3,
        }),
      ],
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }, request) => {
          const lang =
            request?.headers?.get?.('x-lang') ||
            request?.headers
              ?.get?.('accept-language')
              ?.split(',')?.[0]
              ?.trim() ||
            'vi';
          await this.mailService.sendPasswordResetLink(user.email, url, lang);
        },
      },
      emailVerification: {
        sendVerificationEmail: async ({ user, token }, request) => {
          const lang =
            request?.headers?.get?.('x-lang') ||
            request?.headers
              ?.get?.('accept-language')
              ?.split(',')?.[0]
              ?.trim() ||
            'vi';
          await this.mailService.sendVerificationOtp(user.email, token, lang);
        },
        autoSignInAfterVerification: true,
      },
      account: {
        accountLinking: {
          enabled: true,
          trustedProviders: ['google', 'apple'],
        },
      },
      socialProviders: {
        ...(googleClientId && googleClientSecret
          ? {
              google: {
                clientId: googleClientId,
                clientSecret: googleClientSecret,
              },
            }
          : {}),
        ...(appleClientId && appleClientSecret
          ? {
              apple: {
                clientId: appleClientId,
                clientSecret: appleClientSecret,
              },
            }
          : {}),
      },
    }) as unknown as IBetterAuthClient;
  }
}
