import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const gatewayRes = await fetch(`${GATEWAY}/api/auth/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      headers,
    });

    const data = await gatewayRes.json().catch(() => ({}));

    if (!gatewayRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to accept invitation' },
        { status: gatewayRes.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
