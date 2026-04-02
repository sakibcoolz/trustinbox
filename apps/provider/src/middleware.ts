import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/invite',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // If authenticated and trying to hit login/register, redirect to home
    const authStatus = request.cookies.get('auth-status')?.value;
    if (authStatus === '1' && (pathname === '/auth/login' || pathname === '/auth/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Allow static assets, API proxy, and GraphQL proxy
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon') || pathname === '/graphql') {
    return NextResponse.next();
  }

  // Check for auth cookies (httpOnly accessToken is the source of truth)
  const hasToken = request.cookies.get('accessToken')?.value;
  const authStatus = request.cookies.get('auth-status')?.value;
  if (!hasToken && !authStatus) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
