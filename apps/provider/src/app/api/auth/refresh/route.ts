import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, clearAuthCookies } from '@/lib/auth-cookies';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    // Read refresh token from cookie
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      const res = NextResponse.json({ error: 'No refresh token' }, { status: 401 });
      clearAuthCookies(res);
      return res;
    }

    const gwRes = await fetch(`${GATEWAY}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const gwBody = await gwRes.json();

    if (!gwRes.ok || !gwBody.accessToken) {
      const res = NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      clearAuthCookies(res);
      return res;
    }

    const res = NextResponse.json({ success: true });
    setAuthCookies(res, gwBody.accessToken, gwBody.refreshToken || refreshToken);
    return res;
  } catch (err) {
    console.error('[api/auth/refresh] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
