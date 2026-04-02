import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function GET() {
  return gatewayResponse('/api/profile');
}

export async function PATCH(req: NextRequest) {
  const body = await req.text();
  return gatewayResponse('/api/profile/update', 'PATCH', body);
}
