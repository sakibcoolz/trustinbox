import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, setActiveSpCookie } from '@/lib/auth-cookies';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Forward to gateway
    const gwRes = await fetch(`${GATEWAY}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const gwBody = await gwRes.json();

    if (!gwRes.ok) {
      return NextResponse.json(
        { error: gwBody.error || 'Login failed' },
        { status: gwRes.status },
      );
    }

    const { accessToken, refreshToken, user } = gwBody;

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Invalid response from auth service' }, { status: 502 });
    }

    // Build response with user data only (no tokens in body)
    const res = NextResponse.json({ user });

    // Set httpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Also fetch service providers to determine active SP
    try {
      const spRes = await fetch(`${GATEWAY}/api/profile/service-providers`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (spRes.ok) {
        const spData = await spRes.json();
        const sps = spData.serviceProviders || spData || [];
        if (Array.isArray(sps) && sps.length === 1) {
          setActiveSpCookie(res, sps[0].id);
        }
      }
    } catch {
      // SP fetch failed — continue without setting active SP
    }

    return res;
  } catch (err) {
    console.error('[api/auth/login] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
