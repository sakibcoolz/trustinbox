import { NextResponse } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

const IS_PROD = process.env.NODE_ENV === 'production';

// 15 minutes for access token
const ACCESS_MAX_AGE = 15 * 60;
// 7 days for refresh token
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

const COOKIE_BASE: Partial<ResponseCookie> = {
  path: '/',
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax',
};

export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  res.cookies.set('accessToken', accessToken, {
    ...COOKIE_BASE,
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookies.set('refreshToken', refreshToken, {
    ...COOKIE_BASE,
    maxAge: REFRESH_MAX_AGE,
  });
  // Non-httpOnly so middleware and client JS can check auth state
  res.cookies.set('auth-status', '1', {
    path: '/',
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(res: NextResponse) {
  for (const name of ['accessToken', 'refreshToken', 'auth-status', 'activeSpId']) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
}

export function setActiveSpCookie(res: NextResponse, spId: string) {
  res.cookies.set('activeSpId', spId, {
    ...COOKIE_BASE,
    maxAge: REFRESH_MAX_AGE,
  });
}
