import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { setClientCookie } from '../cookies';

describe('setClientCookie', () => {
  beforeEach(() => {
    (globalThis as any).document = { cookie: '' };
    (globalThis as any).window = {
      location: { protocol: 'http:' },
    };
  });

  afterEach(() => {
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  it('sets standard cookie with path, maxAge, and SameSite', () => {
    setClientCookie('theme', 'dark', {
      path: '/',
      maxAge: 3600,
      sameSite: 'Strict',
    });

    expect(document.cookie).toBe(
      'theme=dark; path=/; max-age=3600; SameSite=Strict',
    );
  });

  it('appends Secure flag when protocol is https', () => {
    (globalThis as any).window.location.protocol = 'https:';

    setClientCookie('locale', 'vi', { path: '/app' });

    expect(document.cookie).toBe(
      'locale=vi; path=/app; max-age=31536000; SameSite=Lax; Secure',
    );
  });

  it('does nothing when document is undefined', () => {
    delete (globalThis as any).document;
    expect(() => setClientCookie('test', '1')).not.toThrow();
  });
});
