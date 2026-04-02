import { NextRequest, NextResponse } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const body = await req.text();
  if (action === 'revoke') {
    return gatewayResponse('/api/team/invitations/revoke', 'POST', body);
  }
  if (action === 'accept') {
    return gatewayResponse('/api/team/invitations/accept', 'POST', body);
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
