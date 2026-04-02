import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, setActiveSpCookie } from '@/lib/auth-cookies';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let gatewayRes: Response;

    if (contentType.includes('multipart/form-data')) {
      // Forward multipart (with documents) as-is
      const formData = await req.formData();
      gatewayRes = await fetch(`${GATEWAY}/api/auth/register`, {
        method: 'POST',
        body: formData,
      });
    } else {
      // JSON registration
      const body = await req.json();
      gatewayRes = await fetch(`${GATEWAY}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    const data = await gatewayRes.json().catch(() => ({}));

    if (!gatewayRes.ok) {
      return NextResponse.json(
        { error: data.error || data.message || 'Registration failed' },
        { status: gatewayRes.status },
      );
    }

    // Set httpOnly auth cookies
    const res = NextResponse.json({ user: data.user });
    if (data.accessToken && data.refreshToken) {
      setAuthCookies(res, data.accessToken, data.refreshToken);
      // Auto-set first SP if available
      if (data.serviceProvider?.id) {
        setActiveSpCookie(res, data.serviceProvider.id);
      }
    }
    return res;
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
