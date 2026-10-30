import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

function createRequest(url: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(url, 'http://localhost:3000'));
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

describe('proxy middleware', () => {
  it('passes static and internal assets without redirection', () => {
    const internalPaths = [
      'http://localhost:3000/_next/static/chunk.js',
      'http://localhost:3000/api/health',
      'http://localhost:3000/static/logo.svg',
      'http://localhost:3000/favicon.ico',
    ];

    for (const url of internalPaths) {
      const res = proxy(createRequest(url));
      expect(res.headers.get('location')).toBeNull();
      expect(res.status).toBe(200);
    }
  });

  it('redirects unauthenticated user from protected route to login with redirect param', () => {
    const res = proxy(createRequest('http://localhost:3000/dashboard'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?redirect=%2Fdashboard');
  });

  it('allows unauthenticated user to access public routes', () => {
    const publicPaths = [
      'http://localhost:3000/',
      'http://localhost:3000/login',
      'http://localhost:3000/verify-email',
      'http://localhost:3000/forgot-password',
      'http://localhost:3000/reset-password',
    ];

    for (const url of publicPaths) {
      const res = proxy(createRequest(url));
      expect(res.headers.get('location')).toBeNull();
      expect(res.status).toBe(200);
    }
  });

  it('redirects authenticated user with better-auth.session_token away from /login to /dashboard', () => {
    const req = createRequest('http://localhost:3000/login', {
      'better-auth.session_token': 'valid-token',
    });
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('redirects authenticated user with __Secure-better-auth.session_token away from /login', () => {
    const req = createRequest('http://localhost:3000/login', {
      '__Secure-better-auth.session_token': 'secure-token',
    });
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('allows authenticated user to access protected routes', () => {
    const req = createRequest('http://localhost:3000/dashboard', {
      'better-auth.session_token': 'valid-token',
    });
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });
});
