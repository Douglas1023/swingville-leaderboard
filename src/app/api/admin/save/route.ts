import { NextRequest, NextResponse } from 'next/server';
import { saveConfig } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { tournamentId, sponsorLogoUrl } = await req.json();

    if (!tournamentId?.trim()) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }

    await saveConfig({
      tournamentId: tournamentId.trim(),
      sponsorLogoUrl: sponsorLogoUrl || '/sponsors/good-pilates.png',
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Admin Save]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
