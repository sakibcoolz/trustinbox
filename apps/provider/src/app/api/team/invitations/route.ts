import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function GET(req: NextRequest) {
  return gatewayResponse(`/api/team/invitations${req.nextUrl.search}`);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return gatewayResponse('/api/team/invitations', 'POST', body);
}
