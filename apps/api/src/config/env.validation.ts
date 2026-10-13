import { z } from 'zod';

const emptyStringToUndefined = z.preprocess((val) => {
  if (typeof val === 'string' && val.trim() === '') {
    return undefined;
  }
  return val;
}, z.string().optional());

export const envSchema = z
  .object({
    // Runtime environment
    NODE_ENV: z
      .enum(['development', 'staging', 'production', 'test'])
      .default('development'),

    // Server ports
    PORT: z.coerce.number().min(1).default(4000),
    API_PORT: z.coerce.number().min(1).optional(),

    // CORS Allowed Origins (Comma-separated)
    CORS_ORIGINS: z
      .string()
      .min(1)
      .default('http://localhost:3000,http://localhost:8081'),

    // Database (PostgreSQL)
    DATABASE_URL: z
      .string()
      .min(1)
      .default('postgres://postgres:postgres@localhost:5432/app_db'),
    POSTGRES_USER: emptyStringToUndefined,
    POSTGRES_PASSWORD: emptyStringToUndefined,
    POSTGRES_DB: emptyStringToUndefined,
    POSTGRES_PORT: z.coerce.number().min(1).optional(),

    // Cache & Queue (Redis)
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().min(1).default(6379),
    REDIS_PASSWORD: emptyStringToUndefined,

    // Better Auth Backend
    BETTER_AUTH_SECRET: z
      .string()
      .min(1)
      .default('repo_dev_secret_key_123456789'),
    BETTER_AUTH_URL: z.string().url().default('http://localhost:4000'),
    AUTH_TRUSTED_ORIGINS: z
      .string()
      .default('starter://,starter-dev://,starter-preview://'),
    COOKIE_DOMAIN: emptyStringToUndefined,

    // Docs & Bull Board Basic Auth
    ENABLE_DOCS: z.enum(['true', 'false']).default('true'),
    DOCS_USER: z.string().min(1).default('admin'),
    DOCS_PASSWORD: z.string().min(1).default('admin@secret'),

    // Admin Bootstrap
    ADMIN_BOOTSTRAP_TOKEN: emptyStringToUndefined,
    ADMIN_EMAIL: emptyStringToUndefined,
    ADMIN_NAME: emptyStringToUndefined,
    ADMIN_PASSWORD: emptyStringToUndefined,

    // Mail (Mailpit for local dev, or custom provider)
    MAIL_HOST: z.string().min(1).default('localhost'),
    MAIL_PORT: z.coerce.number().min(1).default(1025),
    MAIL_SECURE: z.enum(['true', 'false']).default('false'),
    MAIL_USER: emptyStringToUndefined,
    MAIL_PASS: emptyStringToUndefined,
    MAIL_FROM: z.string().min(1).default('Starter <noreply@example.local>'),

    // Mailpit UI & SMTP Ports (docker-compose only, optional)
    MAILPIT_SMTP_PORT: z.coerce.number().optional(),
    MAILPIT_UI_PORT: z.coerce.number().optional(),
    MAILPIT_UI_USER: z.string().optional(),
    MAILPIT_UI_PASS: z.string().optional(),

    // Storage (S3 / R2 / SeaweedFS)
    STORAGE_DRIVER: z.enum(['s3']).default('s3'),
    STORAGE_S3_ENDPOINT: emptyStringToUndefined,
    STORAGE_S3_REGION: z.string().min(1).default('us-east-1'),
    STORAGE_S3_BUCKET: z.string().min(1).default('app-storage'),
    STORAGE_S3_ACCESS_KEY_ID: emptyStringToUndefined,
    STORAGE_S3_SECRET_ACCESS_KEY: emptyStringToUndefined,
    STORAGE_S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((val) => val === 'true'),
    STORAGE_PUBLIC_URL_PREFIX: emptyStringToUndefined,

    // Sentry Error Tracking (Optional)
    SENTRY_DSN: emptyStringToUndefined,

    // OAuth (Optional)
    GOOGLE_CLIENT_ID: emptyStringToUndefined,
    GOOGLE_CLIENT_SECRET: emptyStringToUndefined,
    APPLE_CLIENT_ID: emptyStringToUndefined,
    APPLE_CLIENT_SECRET: emptyStringToUndefined,
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      const insecureAuthSecrets = [
        'repo_dev_secret_key_123456789',
        'dev_secret_key_change_me_in_prod',
        'mymate_super_secret_session_key_123456789',
        'mymate_monorepo_dev_secret_key_change_me_in_prod',
      ];
      if (
        !data.BETTER_AUTH_SECRET ||
        data.BETTER_AUTH_SECRET.length < 32 ||
        insecureAuthSecrets.includes(data.BETTER_AUTH_SECRET)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['BETTER_AUTH_SECRET'],
          message:
            'BETTER_AUTH_SECRET must be explicitly set and cannot use the development default in production',
        });
      }

      const insecureDocsPasswords = ['admin@secret', 'mymate@secret'];
      if (
        !data.DOCS_PASSWORD ||
        insecureDocsPasswords.includes(data.DOCS_PASSWORD)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DOCS_PASSWORD'],
          message:
            'DOCS_PASSWORD cannot use default placeholder password in production (Swagger and Bull Board)',
        });
      }
    }
  });

export type EnvVars = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): EnvVars {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => ` - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Startup aborted: Invalid environment variables.\n${errorDetails}`,
    );
  }

  return result.data;
}
