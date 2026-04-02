import { NextRequest, NextResponse } from 'next/server';
import { setActiveSpCookie } from '@/lib/auth-cookies';

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text) {
      return NextResponse.json({ error: 'spId is required' }, { status: 400 });
    }
    const { spId } = JSON.parse(text);

    if (!spId) {
      return NextResponse.json({ error: 'spId is required' }, { status: 400 });
    }

    const res = NextResponse.json({ success: true });
    setActiveSpCookie(res, spId);
    return res;
  } catch (err) {
    console.error('[api/auth/active-sp] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
