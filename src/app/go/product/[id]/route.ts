import type { NextRequest } from 'next/server';
import { handleOutbound } from '@/lib/server/outbound';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return handleOutbound(request, 'product', (await params).id);
}

export const HEAD = GET;
