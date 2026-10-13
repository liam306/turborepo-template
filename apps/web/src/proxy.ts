import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next.js internals, static files, and API routes pass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check Better Auth session token in cookies
  // Better Auth cookie names can be:
  // - 'better-auth.session_token'
  // - '__Secure-better-auth.session_token' (when using HTTPS)
  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || (path !== '/' && pathname.startsWith(path)),
  );

  // If visiting public path with active session -> redirect to /dashboard (except landing page '/')
  if (sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If visiting protected route without session -> redirect to /login
  if (!sessionToken && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
