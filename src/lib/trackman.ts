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

const TOURNAMENT_ID = process.env.TRACKMAN_TOURNAMENT_ID ||
  'TXVsdGlSb3VuZFRvdXJuYW1lbnQKZGQ1MmNlNGMzLTc3NGQtNDljYS1hNGFiLWVmNWQ2ODM2YmE1ODpQdWJsaXNoZWQ=';

const GRAPHQL_URL = 'https://api.trackmangolf.com/graphql';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'Origin': 'https://portal.trackmangolf.com',
  'Referer': 'https://portal.trackmangolf.com/',
};

const GET_ROUNDS_QUERY = `
query getLeaderboardTournament($tournamentId: ID!) {
  node(id: $tournamentId) {
    ... on CourseTournament {
      rounds {
        id
        roundNumber
        roundState
        course { displayName }
        embeddedGame {
          closestToPin { holes }
          longestDrive { holes }
        }
      }
    }
  }
}`;

const ROUND_LEADERBOARD_QUERY = `
query roundLeaderboard($roundId: ID!, $publishedTournamentId: ID!, $scoringFormat: GameTypes, $skip: Int, $take: Int, $orderBy: LeaderboardOrderBy) {
  node(id: $publishedTournamentId) {
    ... on CourseTournament {
      tournamentState
      roundLeaderboard(roundId: $roundId, scoringFormat: $scoringFormat) {
        records(skip: $skip, take: $take, orderBy: $orderBy) {
          items {
            playername
            playerId
            hcp
            score {
              pos
              score
              toPar
              thru
              state
            }
          }
          totalCount
        }
      }
    }
  }
}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function graphqlFetch(feQuery: string, query: string, variables: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${GRAPHQL_URL}?fe_query=${feQuery}`, {
    method: 'POST',
    headers: BROWSER_HEADERS,
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`GraphQL ${feQuery} failed: ${res.status}`);
  return res.json();
}

export async function fetchTournamentData(): Promise<TournamentData> {
  console.log('[Trackman] Fetching live tournament data...');

  try {
    // Step 1: get round IDs from the tournament
    const tournamentResult = await graphqlFetch(
      'getLeaderboardTournament',
      GET_ROUNDS_QUERY,
      { tournamentId: TOURNAMENT_ID }
    );

    const rounds = tournamentResult?.data?.node?.rounds ?? [];
    if (!rounds.length) throw new Error('No rounds returned for tournament');

    // Prefer an in-progress round; fall back to the latest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeRound = rounds.find((r: any) => r.roundState === 'STARTED') ?? rounds[rounds.length - 1];
    const roundId: string = activeRound.id;
    const courseName: string = activeRound.course?.displayName ?? 'Tournament';

    const baseVars = {
      roundId,
      publishedTournamentId: TOURNAMENT_ID,
      skip: 0,
      take: 300,
      orderBy: 'POS',
    };

    // Step 2: fetch NET and GROSS leaderboards in parallel
    const [netResult, grossResult] = await Promise.all([
      graphqlFetch('roundLeaderboard', ROUND_LEADERBOARD_QUERY, { ...baseVars, scoringFormat: 'STROKE_NET' }),
      graphqlFetch('roundLeaderboard', ROUND_LEADERBOARD_QUERY, { ...baseVars, scoringFormat: 'STROKE' }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const netItems: any[] = netResult?.data?.node?.roundLeaderboard?.records?.items ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grossItems: any[] = grossResult?.data?.node?.roundLeaderboard?.records?.items ?? [];

    // Build gross lookup by playerId for merging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grossById = new Map<string, any>(grossItems.map((g) => [g.playerId, g]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const netById = new Map<string, any>(netItems.map((n) => [n.playerId, n]));

    // NET leaderboard ordered by net position
    const netLeaderboard: Player[] = netItems.map((item, i) => {
      const g = grossById.get(item.playerId);
      return {
        rank: item.score?.pos ?? i + 1,
        name: item.playername ?? 'Unknown',
        netScore: item.score?.score ?? null,
        netScoreToPar: item.score?.toPar ?? null,
        grossScore: g?.score?.score ?? null,
        scoreToPar: g?.score?.toPar ?? null,
        thru: item.score?.thru ?? 0,
        handicap: item.hcp ?? undefined,
      };
    });

    // GROSS leaderboard ordered by gross position
    const grossLeaderboard: Player[] = grossItems.map((item, i) => {
      const n = netById.get(item.playerId);
      return {
        rank: item.score?.pos ?? i + 1,
        name: item.playername ?? 'Unknown',
        grossScore: item.score?.score ?? null,
        scoreToPar: item.score?.toPar ?? null,
        netScore: n?.score?.score ?? null,
        netScoreToPar: n?.score?.toPar ?? null,
        thru: item.score?.thru ?? 0,
        handicap: item.hcp ?? undefined,
      };
    });

    console.log(`[Trackman] Live data: ${netLeaderboard.length} players from ${courseName}`);

    return {
      leaderboard: { gross: grossLeaderboard, net: netLeaderboard },
      closestToPin: [],
      longestDrive: [],
      stats: [],
      tournamentName: courseName,
      lastUpdated: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[Trackman] Live fetch failed, falling back to mock:', e);
    const mock = generateMockData();
    mock.error = `LIVE_DATA_ERROR: ${e}`;
    return mock;
  }
}

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

  const grossLeaderboard: Player[] = [...mockPlayers]
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
