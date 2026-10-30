import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ConfigContext } from 'expo/config';
import appConfig from '../../app.config';

describe('app.config.ts environment configuration', () => {
  const originalEnv = { ...process.env };
  const mockContext = {
    config: {
      name: 'BaseName',
      slug: 'starter',
      version: '1.0.0',
    },
  } as ConfigContext;

  beforeEach(() => {
    delete process.env.APP_ENV;
    delete process.env.EAS_BUILD_PROFILE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to development configuration when environment is not set', () => {
    const config = appConfig(mockContext);
    expect(config.name).toBe('Starter (Dev)');
    expect(config.scheme).toBe('starter-dev');
    expect(config.ios?.bundleIdentifier).toBe('com.starter.app.dev');
    expect(config.android?.package).toBe('com.starter.app.dev');
  });

  it('resolves preview configuration when APP_ENV is preview', () => {
    process.env.APP_ENV = 'preview';
    const config = appConfig(mockContext);
    expect(config.name).toBe('Starter (Preview)');
    expect(config.scheme).toBe('starter-preview');
    expect(config.ios?.bundleIdentifier).toBe('com.starter.app.preview');
    expect(config.android?.package).toBe('com.starter.app.preview');
  });

  it('resolves production configuration when APP_ENV is production', () => {
    process.env.APP_ENV = 'production';
    const config = appConfig(mockContext);
    expect(config.name).toBe('Starter');
    expect(config.scheme).toBe('starter');
    expect(config.ios?.bundleIdentifier).toBe('com.starter.app');
    expect(config.android?.package).toBe('com.starter.app');
  });

  it('prefers APP_ENV over EAS_BUILD_PROFILE', () => {
    process.env.APP_ENV = 'production';
    process.env.EAS_BUILD_PROFILE = 'preview';
    const config = appConfig(mockContext);
    expect(config.name).toBe('Starter');
    expect(config.scheme).toBe('starter');
    expect(config.ios?.bundleIdentifier).toBe('com.starter.app');
  });

  it('falls back to EAS_BUILD_PROFILE when APP_ENV is unset', () => {
    process.env.EAS_BUILD_PROFILE = 'preview';
    const config = appConfig(mockContext);
    expect(config.name).toBe('Starter (Preview)');
    expect(config.scheme).toBe('starter-preview');
    expect(config.ios?.bundleIdentifier).toBe('com.starter.app.preview');
  });
});
