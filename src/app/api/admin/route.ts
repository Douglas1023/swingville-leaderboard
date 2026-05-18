import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';

export async function GET() {
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const tournamentId = (formData.get('tournamentId') as string)?.trim();
    const sponsorName = (formData.get('sponsorName') as string)?.trim() ?? '';
    const logoFile = formData.get('logo') as File | null;

    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
    }

    const current = await getConfig();
    const updated = await saveConfig(
      { tournamentId, sponsorName, sponsorLogoUrl: current.sponsorLogoUrl },
      logoFile && logoFile.size > 0 ? logoFile : undefined
    );

    return NextResponse.json({ ok: true, config: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Admin API] Save failed:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
