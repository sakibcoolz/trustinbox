import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const gwRes = await fetch(`${GATEWAY}/api/profile/service-providers`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!gwRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch service providers' },
        { status: gwRes.status },
      );
    }

    const data = await gwRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[api/auth/service-providers] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
