// Integration test environment setup (Better Auth is NOT mocked here)
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ||
  'integration_secret_test_key_at_least_32_characters_long!';
process.env.BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || 'http://localhost:4000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/app_db';
process.env.CORS_ORIGINS =
  process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8081';
process.env.DOCS_PASSWORD =
  process.env.DOCS_PASSWORD || 'test_docs_password_secure';
process.env.AUTH_TRUSTED_ORIGINS =
  process.env.AUTH_TRUSTED_ORIGINS || 'starter://,starter-dev://';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

jest.setTimeout(30000);
