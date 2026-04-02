import { NextRequest } from 'next/server';
import { gatewayResponse } from '@/lib/server-fetch';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  return gatewayResponse(`/api/v1/campaigns/${encodeURIComponent(id)}/${action}`, 'POST');
}
