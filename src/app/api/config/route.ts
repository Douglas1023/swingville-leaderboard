import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getConfig();
  return NextResponse.json(config, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
