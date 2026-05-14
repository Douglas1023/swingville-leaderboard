import { NextResponse } from 'next/server';
import { fetchTournamentData } from '@/lib/trackman';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await fetchTournamentData();
  const players = data.leaderboard.net.map(p => ({
    name: p.name,
    rank: p.rank,
    state: p.state ?? null,
    thru: p.thru,
  }));
  const uniqueStates = [...new Set(players.map(p => p.state))];
  return NextResponse.json({ uniqueStates, players });
}
