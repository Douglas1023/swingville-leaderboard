import path from 'path';

export interface SiteConfig {
  tournamentId: string;
  sponsorName: string;
  sponsorLogoUrl: string;
}

const DEFAULT_CONFIG: SiteConfig = {
  tournamentId:
    process.env.TRACKMAN_TOURNAMENT_ID ||
    'TXVsdGlSb3VuZFRvdXJuYW1lbnQKZGQ1MmNlNGMzLTc3NGQtNDljYS1hNGFiLWVmNWQ2ODM2YmE1ODpQdWJsaXNoZWQ=',
  sponsorName: 'Good Pilates',
  sponsorLogoUrl: '/good-pilates-logo.png',
};

const LOCAL_CONFIG_FILE = path.join(process.cwd(), 'data', 'config.json');

async function readLocalConfig(): Promise<SiteConfig | null> {
  try {
    const fs = await import('fs/promises');
    const raw = await fs.readFile(LOCAL_CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as SiteConfig;
  } catch {
    return null;
  }
}

async function writeLocalConfig(config: SiteConfig): Promise<void> {
  const fs = await import('fs/promises');
  await fs.mkdir(path.dirname(LOCAL_CONFIG_FILE), { recursive: true });
  await fs.writeFile(LOCAL_CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function getConfig(): Promise<SiteConfig> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv');
      const config = await kv.get<SiteConfig>('swingville:config');
      if (config) return config;
    } catch (e) {
      console.error('[Config] KV read failed:', e);
    }
  }
  const local = await readLocalConfig();
  return local ?? DEFAULT_CONFIG;
}

export async function saveConfig(config: SiteConfig): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv');
    await kv.set('swingville:config', config);
  } else {
    await writeLocalConfig(config);
  }
}
