import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface TournamentConfig {
  tournamentId: string;
  sponsorLogoUrl: string;
}

const LOCAL_CONFIG_PATH = path.join(process.cwd(), 'tournament-config.json');

export const DEFAULT_CONFIG: TournamentConfig = {
  tournamentId:
    process.env.TRACKMAN_TOURNAMENT_ID ||
    'TXVsdGlSb3VuZFRvdXJuYW1lbnQKZGQ1MmNlNGMzLTc3NGQtNDljYS1hNGFiLWVmNWQ2ODM2YmE1ODpQdWJsaXNoZWQ=',
  sponsorLogoUrl: '/sponsors/good-pilates.png',
};

// Derive the blob store base URL from the token (no list() needed)
function getBlobBaseUrl(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const match = token.match(/vercel_blob_rw_([^_]+)/i);
  const storeId = match?.[1]?.toLowerCase() ?? '';
  return storeId ? `https://${storeId}.public.blob.vercel-storage.com` : '';
}

export async function getConfig(): Promise<TournamentConfig> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return readBlobConfig();
  }
  return readLocalConfig();
}

async function readBlobConfig(): Promise<TournamentConfig> {
  try {
    const baseUrl = getBlobBaseUrl();
    if (!baseUrl) return { ...DEFAULT_CONFIG };
    // Direct fetch — counts as a simple op, not an advanced op (no list())
    const res = await fetch(`${baseUrl}/swingville/config.json`, {
      next: { revalidate: 60 },
    });
    if (res.ok) return res.json();
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

export async function saveConfig(config: TournamentConfig): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    await put('swingville/config.json', JSON.stringify(config), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
  } else {
    await fs.writeFile(LOCAL_CONFIG_PATH, JSON.stringify(config, null, 2));
  }
}
