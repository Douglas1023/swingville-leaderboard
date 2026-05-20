import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export async function GET() {
  const config = await getConfig();
  return NextResponse.json(config);
}
