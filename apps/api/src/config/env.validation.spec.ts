import { envSchema, validate } from './env.validation';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Environment Validation', () => {
  it('rejects the actual root environment example auth secret in production', () => {
    const example = readFileSync(
      resolve(__dirname, '../../../../.env.example'),
      'utf8',
    );
    const secret = example.match(/^BETTER_AUTH_SECRET=(.*)$/m)?.[1];
    expect(secret).toBeDefined();
    expect(() =>
      validate({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: secret,
        DOCS_PASSWORD: 'secure_docs_password_for_production',
      }),
    ).toThrow('Startup aborted');
  });
  it('should export envSchema definition', () => {
    expect(envSchema).toBeDefined();
    expect(envSchema.shape.NODE_ENV).toBeDefined();
  });

  it('should validate and apply defaults for empty or minimal input', () => {
    const config = validate({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.CORS_ORIGINS).toBe(
      'http://localhost:3000,http://localhost:8081',
    );
    expect(config.DATABASE_URL).toBe(
      'postgres://postgres:postgres@localhost:5432/app_db',
    );
    expect(config.REDIS_HOST).toBe('localhost');
    expect(config.REDIS_PORT).toBe(6379);
    expect(config.REDIS_PASSWORD).toBeUndefined();
    expect(config.BETTER_AUTH_SECRET).toBe('repo_dev_secret_key_123456789');
    expect(config.BETTER_AUTH_URL).toBe('http://localhost:4000');
    expect(config.COOKIE_DOMAIN).toBeUndefined();
    expect(config.ENABLE_DOCS).toBe('true');
    expect(config.DOCS_USER).toBe('admin');
    expect(config.DOCS_PASSWORD).toBe('admin@secret');
    expect(config.MAIL_HOST).toBe('localhost');
    expect(config.MAIL_PORT).toBe(1025);
    expect(config.MAIL_SECURE).toBe('false');
    expect(config.STORAGE_DRIVER).toBe('s3');
    expect(config.STORAGE_S3_REGION).toBe('us-east-1');
    expect(config.STORAGE_S3_BUCKET).toBe('app-storage');
    expect(config.STORAGE_S3_FORCE_PATH_STYLE).toBe(false);
  });

  it('should coerce numbers and parse valid custom values', () => {
    const customConfig = {
      NODE_ENV: 'production',
      PORT: '5000',
      API_PORT: '5001',
      CORS_ORIGINS: 'https://example.com',
      DATABASE_URL: 'postgres://custom:custom@remote:5432/custom_db',
      REDIS_HOST: 'redis.internal',
      REDIS_PORT: '6380',
      REDIS_PASSWORD: 'redis-password',
      BETTER_AUTH_SECRET: 'super-secret-key-for-production-123456',
      BETTER_AUTH_URL: 'https://api.example.com',
      COOKIE_DOMAIN: '.example.com',
      DOCS_USER: 'superadmin',
      DOCS_PASSWORD: 'supersecretpassword',
      MAIL_HOST: 'smtp.sendgrid.net',
      MAIL_PORT: '587',
      MAIL_SECURE: 'false',
      MAIL_USER: 'smtp_user',
      MAIL_PASS: 'smtp_pass',
      MAIL_FROM: 'Starter <support@example.local>',
      STORAGE_DRIVER: 's3',
      STORAGE_S3_ENDPOINT: 'http://localhost:9000',
      STORAGE_S3_REGION: 'auto',
      STORAGE_S3_BUCKET: 'custom-bucket',
      STORAGE_S3_ACCESS_KEY_ID: 'access123',
      STORAGE_S3_SECRET_ACCESS_KEY: 'secret123',
      STORAGE_S3_FORCE_PATH_STYLE: 'true',
      STORAGE_PUBLIC_URL_PREFIX: 'https://cdn.example.com',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
    };

    const config = validate(customConfig);

    expect(config.NODE_ENV).toBe('production');
    expect(config.PORT).toBe(5000);
    expect(config.API_PORT).toBe(5001);
    expect(config.COOKIE_DOMAIN).toBe('.example.com');
    expect(config.REDIS_PORT).toBe(6380);
    expect(config.MAIL_PORT).toBe(587);
    expect(config.MAIL_SECURE).toBe('false');
    expect(config.STORAGE_DRIVER).toBe('s3');
    expect(config.STORAGE_S3_ENDPOINT).toBe('http://localhost:9000');
    expect(config.STORAGE_S3_REGION).toBe('auto');
    expect(config.STORAGE_S3_BUCKET).toBe('custom-bucket');
    expect(config.STORAGE_S3_ACCESS_KEY_ID).toBe('access123');
    expect(config.STORAGE_S3_SECRET_ACCESS_KEY).toBe('secret123');
    expect(config.STORAGE_S3_FORCE_PATH_STYLE).toBe(true);
    expect(config.STORAGE_PUBLIC_URL_PREFIX).toBe('https://cdn.example.com');
    expect(config.GOOGLE_CLIENT_ID).toBe('google-client-id');
  });

  it('should transform empty strings to undefined for optional fields', () => {
    const config = validate({
      GOOGLE_CLIENT_ID: '   ',
      GOOGLE_CLIENT_SECRET: '',
      APPLE_CLIENT_ID: '',
      REDIS_PASSWORD: '',
      MAIL_USER: '',
      MAIL_PASS: '',
      STORAGE_S3_ENDPOINT: '',
      STORAGE_S3_ACCESS_KEY_ID: '',
      STORAGE_S3_SECRET_ACCESS_KEY: '',
      STORAGE_PUBLIC_URL_PREFIX: '',
      ADMIN_BOOTSTRAP_TOKEN: '   ',
      ADMIN_PASSWORD: '',
      COOKIE_DOMAIN: '',
    });

    expect(config.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(config.COOKIE_DOMAIN).toBeUndefined();
    expect(config.GOOGLE_CLIENT_SECRET).toBeUndefined();
    expect(config.APPLE_CLIENT_ID).toBeUndefined();
    expect(config.REDIS_PASSWORD).toBeUndefined();
    expect(config.MAIL_USER).toBeUndefined();
    expect(config.MAIL_PASS).toBeUndefined();
    expect(config.STORAGE_S3_ENDPOINT).toBeUndefined();
    expect(config.STORAGE_S3_ACCESS_KEY_ID).toBeUndefined();
    expect(config.STORAGE_S3_SECRET_ACCESS_KEY).toBeUndefined();
    expect(config.STORAGE_PUBLIC_URL_PREFIX).toBeUndefined();
    expect(config.ADMIN_BOOTSTRAP_TOKEN).toBeUndefined();
    expect(config.ADMIN_PASSWORD).toBeUndefined();
  });

  it('should throw an error if NODE_ENV is invalid', () => {
    expect(() =>
      validate({
        NODE_ENV: 'invalid_env',
      }),
    ).toThrow('Startup aborted');
  });

  it('should throw an error if BETTER_AUTH_URL is not a valid URL', () => {
    expect(() =>
      validate({
        BETTER_AUTH_URL: 'not-a-valid-url',
      }),
    ).toThrow('Startup aborted');
  });

  it('should reject development default BETTER_AUTH_SECRET in production', () => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'repo_dev_secret_key_123456789',
        DOCS_PASSWORD: 'secure_password_123',
      }),
    ).toThrow('Startup aborted');
  });

  it('should reject placeholder DOCS_PASSWORD in production when docs enabled', () => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'secure_auth_secret_for_production_use',
        DOCS_PASSWORD: 'admin@secret',
      }),
    ).toThrow('Startup aborted');
  });

  it('should pass production validation with valid custom secrets', () => {
    const config = validate({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'secure_auth_secret_for_production_use',
      DOCS_PASSWORD: 'secure_docs_password_for_production',
    });
    expect(config.NODE_ENV).toBe('production');
  });

  it.each([
    'dev_secret_key_change_me_in_prod',
    'mymate_super_secret_session_key_123456789',
    'mymate_monorepo_dev_secret_key_change_me_in_prod',
    'short-secret',
  ])('rejects insecure production auth secret %s', (secret) => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: secret,
        DOCS_PASSWORD: 'secure_docs_password_for_production',
      }),
    ).toThrow('Startup aborted');
  });

  it('protects Bull Board even when Swagger is disabled', () => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        ENABLE_DOCS: 'false',
        BETTER_AUTH_SECRET: 'secure_auth_secret_for_production_use',
        DOCS_PASSWORD: 'admin@secret',
      }),
    ).toThrow('Startup aborted');
  });
});
