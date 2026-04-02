import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function PATCH(req: NextRequest) {
  const body = await req.text();
  return gatewayResponse('/api/team/members/role', 'PATCH', body);
}

export async function DELETE(req: NextRequest) {
  const { memberId } = await req.json();
  return gatewayResponse(`/api/team/members/${encodeURIComponent(memberId)}`, 'DELETE');
}
