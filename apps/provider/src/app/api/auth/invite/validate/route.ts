import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  try {
    const gatewayRes = await fetch(`${GATEWAY}/api/auth/invitations/${encodeURIComponent(token)}/validate`);
    const data = await gatewayRes.json().catch(() => ({}));

    if (!gatewayRes.ok) {
      return NextResponse.json(
        { valid: false, error: data.error || 'Invalid invitation' },
        { status: gatewayRes.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ valid: false, error: 'Failed to validate' }, { status: 500 });
  }
}
