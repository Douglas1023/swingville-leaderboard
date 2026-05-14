import { NextRequest, NextResponse } from 'next/server';
import { saveConfig, getConfig } from '@/lib/config';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const tournamentId = (formData.get('tournamentId') as string)?.trim();
  const sponsorName = (formData.get('sponsorName') as string)?.trim();
  const logoFile = formData.get('logo') as File | null;

  const current = await getConfig();
  let sponsorLogoUrl = current.sponsorLogoUrl;

  if (logoFile && logoFile.size > 0) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');
      const ext = logoFile.name.split('.').pop();
      const blob = await put(`sponsor-logo.${ext}`, logoFile, {
        access: 'public',
        addRandomSuffix: false,
      });
      sponsorLogoUrl = blob.url;
    } else {
      // Local dev: write to public/uploads/
      const fs = await import('fs/promises');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const ext = logoFile.name.split('.').pop();
      const filename = `sponsor-logo.${ext}`;
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      await fs.writeFile(path.join(uploadsDir, filename), buffer);
      sponsorLogoUrl = `/uploads/${filename}`;
    }
  }

  await saveConfig({ tournamentId, sponsorName, sponsorLogoUrl });
  return NextResponse.json({ success: true, sponsorLogoUrl });
}
