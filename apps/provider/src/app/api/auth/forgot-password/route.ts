import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const gatewayRes = await fetch(`${GATEWAY}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await gatewayRes.json().catch(() => ({}));

    if (!gatewayRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to send reset email' },
        { status: gatewayRes.status },
      );
    }

    return NextResponse.json({ success: true, message: data.message || 'Reset email sent' });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
