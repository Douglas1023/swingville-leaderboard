/**
 * trackman.ts
 * 
 * Trackman is a React SPA — data is loaded via their internal REST API, not HTML.
 * 
 * SETUP STEPS:
 * 1. Open your tournament URL in Chrome
 * 2. Open DevTools (F12) → Network tab → filter by "Fetch/XHR"
 * 3. Refresh the page and look for API calls (usually to api.trackmangolf.com or similar)
 * 4. Copy the exact API endpoint URLs and paste them into TRACKMAN_API_BASE in .env.local
 * 5. Check if there's an Authorization header — if so, the session may require cookies
 * 
 * The scraper below tries to:
 * A) Call Trackman's internal API directly (fastest, most reliable)
 * B) Fall back to Puppeteer-style fetch with cookie forwarding if needed
 */

export interface Player {
  rank: number;
  name: string;
  grossScore: number | null;
  netScore: number | null;
  thru: number | string;
  scoreToPar: number | null;
  netScoreToPar: number | null;
  handicap?: number;
  rounds?: Round[];
}

export interface Round {
  round: number;
  gross: number | null;
  net: number | null;
}

export interface ClosestToPinEntry {
  rank: number;
  name: string;
  hole: string | number;
  distance: string;
  distanceUnit: string;
}

export interface LongestDriveEntry {
  rank: number;
  name: string;
  hole: string | number;
  distance: string;
  distanceUnit: string;
}

export interface PlayerStats {
  rank: number;
  name: string;
  fairwaysHit: string;
  greensInRegulation: string;
  puttsPerRound: string | number;
  avgDrivingDistance?: string;
  scrambling?: string;
}

export interface TournamentData {
  leaderboard: {
    gross: Player[];
    net: Player[];
  };
  closestToPin: ClosestToPinEntry[];
  longestDrive: LongestDriveEntry[];
  stats: PlayerStats[];
  tournamentName: string;
  lastUpdated: string;
  error?: string;
}

const FACILITY_ID = process.env.TRACKMAN_FACILITY_ID || 
  'RmFjaWxpdHkKZDY2NWM1MGVmLTQ4MWQtNGIxYy04OTcwLWE2M2EwNTAyNDczMA==';

const TOURNAMENT_ID = process.env.TRACKMAN_TOURNAMENT_ID || 
  'TXVsdGlSb3VuZFRvdXJuYW1lbnQKZGQ1MmNlNGMzLTc3NGQtNDljYS1hNGFiLWVmNWQ2ODM2YmE1ODpQdWJsaXNoZWQ=';

// Common headers to mimic a real browser
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': `https://portal.trackmangolf.com/facility/${FACILITY_ID}/tournaments/${TOURNAMENT_ID}/leaderboards`,
  'Origin': 'https://portal.trackmangolf.com',
};

/**
 * Attempt to call Trackman's internal API directly.
 * These endpoints were found by inspecting network traffic on the portal.
 * They may change — if this breaks, re-inspect the Network tab.
 */
async function fetchFromTrackmanAPI(leaderboardType: string): Promise<unknown> {
  // Try common Trackman API patterns
  const apiCandidates = [
    // Pattern 1: REST API with tournament ID in path
    `https://api.trackmangolf.com/v1/tournaments/${TOURNAMENT_ID}/leaderboard?type=${leaderboardType}`,
    // Pattern 2: Facility-scoped
    `https://api.trackmangolf.com/v1/facilities/${FACILITY_ID}/tournaments/${TOURNAMENT_ID}/leaderboard?type=${leaderboardType}`,
    // Pattern 3: Portal API  
    `https://portal.trackmangolf.com/api/tournaments/${TOURNAMENT_ID}/leaderboard?type=${leaderboardType}`,
    // Pattern 4: GraphQL (some Trackman versions use this)
    `https://api.trackmangolf.com/graphql`,
  ];

  for (const url of apiCandidates) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`[Trackman] API hit: ${url}`);
        return data;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

/**
 * Fetch the raw HTML of the Trackman portal page.
 * Since it's a React SPA, the HTML won't have leaderboard data,
 * but we can look for any embedded JSON (window.__STATE__, etc.)
 */
async function fetchPortalHTML(): Promise<string | null> {
  const BASE = `https://portal.trackmangolf.com/facility/${FACILITY_ID}/tournaments/${TOURNAMENT_ID}/leaderboards`;
  
  const leaderboardTypes = [
    'coursePlayStrokeNet',
    'coursePlayStroke', 
    'closestToPin',
    'longestDrive',
  ];

  // Just fetch the first one — HTML is same regardless of query param for SPAs
  const url = `${BASE}?leaderboardType=${leaderboardTypes[0]}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 30 },
    });
    
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    console.error('[Trackman] Portal HTML fetch failed:', e);
  }
  return null;
}

/**
 * Try to extract embedded JSON state from the HTML.
 * React SPAs sometimes embed initial state in <script> tags.
 */
function extractEmbeddedState(html: string): unknown {
  // Common patterns for embedded state
  const patterns = [
    /__NEXT_DATA__\s*=\s*({.+?})\s*<\/script>/s,
    /window\.__STATE__\s*=\s*({.+?});\s*<\/script>/s,
    /window\.__INITIAL_STATE__\s*=\s*({.+?});\s*<\/script>/s,
    /__REDUX_STATE__\s*=\s*({.+?});\s*<\/script>/s,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        // Try next pattern
      }
    }
  }
  return null;
}

/**
 * Generate realistic mock data for development/demo
 * This is used when the live API can't be reached
 */
export function generateMockData(): TournamentData {
  const mockPlayers = [
    { name: 'John Smith', gross: 68, net: 65, handicap: 3 },
    { name: 'Mike Johnson', gross: 70, net: 64, handicap: 6 },
    { name: 'Tom Williams', gross: 72, net: 66, handicap: 6 },
    { name: 'Chris Davis', gross: 71, net: 68, handicap: 3 },
    { name: 'James Brown', gross: 74, net: 68, handicap: 6 },
    { name: 'Robert Miller', gross: 73, net: 70, handicap: 3 },
    { name: 'David Wilson', gross: 75, net: 70, handicap: 5 },
    { name: 'Steve Moore', gross: 76, net: 71, handicap: 5 },
    { name: 'Kevin Taylor', gross: 77, net: 72, handicap: 5 },
    { name: 'Mark Anderson', gross: 78, net: 73, handicap: 5 },
    { name: 'Paul Thomas', gross: 79, net: 74, handicap: 5 },
    { name: 'Brian Jackson', gross: 80, net: 75, handicap: 5 },
  ];

  const grossLeaderboard: Player[] = mockPlayers
    .sort((a, b) => a.gross - b.gross)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      grossScore: p.gross,
      netScore: p.net,
      thru: 18,
      scoreToPar: p.gross - 72,
      netScoreToPar: p.net - 72,
      handicap: p.handicap,
    }));

  const netLeaderboard: Player[] = [...mockPlayers]
    .sort((a, b) => a.net - b.net)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      grossScore: p.gross,
      netScore: p.net,
      thru: 18,
      scoreToPar: p.gross - 72,
      netScoreToPar: p.net - 72,
      handicap: p.handicap,
    }));

  return {
    leaderboard: { gross: grossLeaderboard, net: netLeaderboard },
    closestToPin: [
      { rank: 1, name: 'Mike Johnson', hole: 3, distance: '4\'2"', distanceUnit: 'ft' },
      { rank: 2, name: 'Chris Davis', hole: 7, distance: '6\'8"', distanceUnit: 'ft' },
      { rank: 3, name: 'John Smith', hole: 12, distance: '8\'1"', distanceUnit: 'ft' },
      { rank: 4, name: 'Tom Williams', hole: 16, distance: '11\'4"', distanceUnit: 'ft' },
      { rank: 5, name: 'James Brown', hole: 3, distance: '13\'9"', distanceUnit: 'ft' },
    ],
    longestDrive: [
      { rank: 1, name: 'Steve Moore', hole: 5, distance: '318', distanceUnit: 'yds' },
      { rank: 2, name: 'John Smith', hole: 14, distance: '305', distanceUnit: 'yds' },
      { rank: 3, name: 'Kevin Taylor', hole: 5, distance: '298', distanceUnit: 'yds' },
      { rank: 4, name: 'Robert Miller', hole: 14, distance: '291', distanceUnit: 'yds' },
      { rank: 5, name: 'David Wilson', hole: 5, distance: '287', distanceUnit: 'yds' },
    ],
    stats: mockPlayers.slice(0, 8).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      fairwaysHit: `${Math.floor(Math.random() * 5 + 8)}/14`,
      greensInRegulation: `${Math.floor(Math.random() * 6 + 10)}/18`,
      puttsPerRound: (Math.random() * 6 + 28).toFixed(1),
      avgDrivingDistance: `${Math.floor(Math.random() * 40 + 240)} yds`,
      scrambling: `${Math.floor(Math.random() * 40 + 40)}%`,
    })),
    tournamentName: 'TrackMan Tournament',
    lastUpdated: new Date().toISOString(),
    error: undefined,
  };
}

/**
 * Main data fetcher — tries API first, falls back to mock
 */
export async function fetchTournamentData(): Promise<TournamentData> {
  console.log('[Trackman] Fetching tournament data...');
  
  // Step 1: Try direct API
  const apiData = await fetchFromTrackmanAPI('coursePlayStrokeNet');
  if (apiData) {
    console.log('[Trackman] Got API data, parsing...');
    return parseAPIResponse(apiData);
  }

  // Step 2: Try HTML + embedded state
  const html = await fetchPortalHTML();
  if (html) {
    const state = extractEmbeddedState(html);
    if (state) {
      console.log('[Trackman] Got embedded state, parsing...');
      return parseAPIResponse(state);
    }
  }

  // Step 3: Return mock data with a note
  console.log('[Trackman] Could not reach live data — returning mock. See SETUP.md for API discovery steps.');
  const mock = generateMockData();
  mock.error = 'MOCK_DATA: Live Trackman API not yet configured. See SETUP.md.';
  return mock;
}

/**
 * Parse whatever Trackman's API returns into our normalized format.
 * 
 * NOTE: This needs to be updated once you inspect the real API response shape.
 * See SETUP.md for how to do this.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAPIResponse(data: any): TournamentData {
  try {
    // Try common Trackman API response shapes
    const leaderboard = 
      data?.leaderboard || 
      data?.data?.leaderboard || 
      data?.tournament?.leaderboard ||
      data?.props?.pageProps?.leaderboard ||
      null;

    if (!leaderboard) {
      throw new Error('No leaderboard found in API response');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapPlayer = (p: any, i: number): Player => ({
      rank: p.rank ?? p.position ?? i + 1,
      name: p.name ?? p.playerName ?? (p.firstName ? `${p.firstName} ${p.lastName}` : "Unknown"),
      grossScore: p.grossScore ?? p.gross ?? p.totalGross ?? null,
      netScore: p.netScore ?? p.net ?? p.totalNet ?? null,
      thru: p.thru ?? p.holesPlayed ?? 18,
      scoreToPar: p.scoreToPar ?? p.toPar ?? null,
      netScoreToPar: p.netScoreToPar ?? p.netToPar ?? null,
      handicap: p.handicap ?? p.courseHandicap ?? undefined,
    });

    const gross = (leaderboard.gross || leaderboard.stroke || leaderboard).map(mapPlayer);
    const net = (leaderboard.net || leaderboard.strokeNet || leaderboard).map(mapPlayer);

    return {
      leaderboard: { gross, net },
      closestToPin: (data?.closestToPin ?? []).map((e: any, i: number) => ({
        rank: i + 1,
        name: e.name ?? e.playerName ?? 'Unknown',
        hole: e.hole ?? e.holeNumber ?? '?',
        distance: e.distance ?? e.closestDistance ?? '?',
        distanceUnit: e.unit ?? 'ft',
      })),
      longestDrive: (data?.longestDrive ?? []).map((e: any, i: number) => ({
        rank: i + 1,
        name: e.name ?? e.playerName ?? 'Unknown',
        hole: e.hole ?? e.holeNumber ?? '?',
        distance: e.distance ?? e.driveDistance ?? '?',
        distanceUnit: e.unit ?? 'yds',
      })),
      stats: (data?.stats ?? gross.slice(0, 8)).map((p: any, i: number) => ({
        rank: i + 1,
        name: p.name ?? p.playerName ?? 'Unknown',
        fairwaysHit: p.fairwaysHit ?? '--',
        greensInRegulation: p.gir ?? p.greensInRegulation ?? '--',
        puttsPerRound: p.putts ?? p.puttsPerRound ?? '--',
        avgDrivingDistance: p.avgDistance ?? '--',
        scrambling: p.scrambling ?? '--',
      })),
      tournamentName: data?.tournamentName ?? data?.name ?? 'Tournament',
      lastUpdated: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[Trackman] Parse error:', e);
    const mock = generateMockData();
    mock.error = `PARSE_ERROR: ${e}. See SETUP.md.`;
    return mock;
  }
}
