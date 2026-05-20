import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface TournamentConfig {
  tournamentId: string;
  sponsorName: string;
  sponsorLogoUrl: string;
}

const LOCAL_CONFIG_PATH = path.join(process.cwd(), 'tournament-config.json');

export const DEFAULT_CONFIG: TournamentConfig = {
  tournamentId:
    process.env.TRACKMAN_TOURNAMENT_ID ||
    'TXVsdGlSb3VuZFRvdXJuYW1lbnQKZGQ1MmNlNGMzLTc3NGQtNDljYS1hNGFiLWVmNWQ2ODM2YmE1ODpQdWJsaXNoZWQ=',
  sponsorName: 'Good Pilates',
  sponsorLogoUrl: '/good-pilates-logo.png',
};

export async function getConfig(): Promise<TournamentConfig> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return readBlobConfig();
  }
  return readLocalConfig();
}

async function readBlobConfig(): Promise<TournamentConfig> {
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: 'swingville/config.json' });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url, { cache: 'no-store' });
      if (res.ok) return res.json();
    }
  } catch (e) {
    console.error('[Config] Blob read failed:', e);
  }
  return { ...DEFAULT_CONFIG };
}

async function readLocalConfig(): Promise<TournamentConfig> {
  if (existsSync(LOCAL_CONFIG_PATH)) {
    try {
      const data = await fs.readFile(LOCAL_CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {}
  }
  return { ...DEFAULT_CONFIG };
}

export async function saveConfig(
  config: TournamentConfig,
  logoFile?: File
): Promise<TournamentConfig> {
  let logoUrl = config.sponsorLogoUrl;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');

    if (logoFile && logoFile.size > 0) {
      const { list, del } = await import('@vercel/blob');
      const ext = logoFile.name.split('.').pop() || 'webp';
      const newPath = `swingville/sponsor-logo.${ext}`;

      const { url } = await put(newPath, logoFile, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      logoUrl = url;

      // Delete any old logo files with a different extension
      const { blobs: oldLogos } = await list({ prefix: 'swingville/sponsor-logo' });
      const stale = oldLogos.filter(b => b.pathname !== newPath);
      if (stale.length > 0) {
        await del(stale.map(b => b.url));
      }
    }

    const updated = { ...config, sponsorLogoUrl: logoUrl };
    await put('swingville/config.json', JSON.stringify(updated), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return updated;
  } else {
    // Local dev: write to disk
    if (logoFile && logoFile.size > 0) {
      const ext = logoFile.name.split('.').pop() || 'webp';
      const dest = path.join(process.cwd(), 'public', `sponsor-logo.${ext}`);
      await fs.writeFile(dest, Buffer.from(await logoFile.arrayBuffer()));
      logoUrl = `/sponsor-logo.${ext}`;
    }

    const updated = { ...config, sponsorLogoUrl: logoUrl };
    await fs.writeFile(LOCAL_CONFIG_PATH, JSON.stringify(updated, null, 2));
    return updated;
  }
}
