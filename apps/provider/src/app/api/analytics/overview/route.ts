import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function GET(req: NextRequest) {
  return gatewayResponse(`/api/v1/analytics/overview${req.nextUrl.search}`);
}
