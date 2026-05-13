import { NextResponse } from 'next/server';
import { fetchTournamentData } from '@/lib/trackman';

export const revalidate = 30; // ISR: revalidate every 30s

export async function GET() {
  try {
    const data = await fetchTournamentData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching tournament data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament data' },
      { status: 500 }
    );
  }
}
