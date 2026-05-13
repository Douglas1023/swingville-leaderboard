'use client';

import { useState, useEffect, useCallback } from 'react'; // useState still used by Dashboard
import type { TournamentData, Player, ClosestToPinEntry, LongestDriveEntry, PlayerStats } from '@/lib/trackman';

const REFRESH_INTERVAL = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '30000');

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '--';
  if (score === 0) return 'E';
  if (score > 0) return `+${score}`;
  return `${score}`;
}

function ScoreChip({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span style={{ color: 'var(--text-dim)' }}>--</span>;
  const color = score < 0 ? 'var(--red)' : score === 0 ? 'var(--accent)' : 'var(--text-dim)';
  return <span style={{ color, fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>{formatScore(score)}</span>;
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: 'var(--rank-gold)',
    2: 'var(--rank-silver)',
    3: 'var(--rank-bronze)',
  };
  const color = colors[rank] || 'var(--text-muted)';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
      height: 24,
      borderRadius: 4,
      background: rank <= 3 ? `${color}22` : 'transparent',
      color,
      fontFamily: 'DM Mono, monospace',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {rank}
    </span>
  );
}

function QuadrantHeader({ title, icon, count }: { title: string; icon: string; count?: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 20,
        letterSpacing: '0.08em',
        color: 'var(--text)',
      }}>{title}</span>
      {count !== undefined && (
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--text-muted)',
          fontFamily: 'DM Mono, monospace',
        }}>{count} players</span>
      )}
    </div>
  );
}

function LeaderboardQuadrant({ net }: { gross: Player[]; net: Player[] }) {
  return (
    <div className="quadrant" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <QuadrantHeader title="Leaderboard" icon="🏆" count={net.length} />

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 56px 16px 56px 40px',
        gap: 6,
        padding: '0 4px 8px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 4,
        alignItems: 'center',
      }}>
        {['#', 'Player', 'NET', '', 'GROSS', 'Thru'].map((h, i) => (
          <span key={i} style={{
            fontSize: 10,
            color: h === 'NET' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textAlign: i >= 2 ? 'center' : 'left',
          }}>
            {h}
          </span>
        ))}
      </div>

      {/* Player rows */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {net.slice(0, 20).map((player, i) => (
          <div
            key={player.name + i}
            className="animate-in"
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 56px 16px 56px 40px',
              gap: 6,
              padding: '8px 4px',
              borderBottom: i < net.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              animationDelay: `${i * 0.03}s`,
              background: i === 0 ? 'rgba(255,215,0,0.03)' : 'transparent',
              borderRadius: 4,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'rgba(255,215,0,0.03)' : 'transparent')}
          >
            <RankBadge rank={player.rank} />
            <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.name}
            </span>
            {/* Net score */}
            <div style={{ textAlign: 'center' }}>
              <ScoreChip score={player.netScoreToPar} />
            </div>
            {/* divider */}
            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 auto' }} />
            {/* Gross score */}
            <div style={{ textAlign: 'center', opacity: 0.6 }}>
              <ScoreChip score={player.scoreToPar} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>
              {player.thru === 18 ? '✓' : player.thru}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosestToPinQuadrant({ entries }: { entries: ClosestToPinEntry[] }) {
  return (
    <div className="quadrant" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <QuadrantHeader title="Closest to the Pin" icon="📍" />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 60px 80px',
        gap: 8,
        padding: '0 4px 8px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 4,
      }}>
        {['#', 'Player', 'Hole', 'Distance'].map(h => (
          <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {h}
          </span>
        ))}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {entries.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No data yet
          </div>
        ) : entries.map((entry, i) => (
          <div
            key={entry.name + i}
            className="animate-in"
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 60px 80px',
              gap: 8,
              padding: '10px 4px',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              animationDelay: `${i * 0.04}s`,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <RankBadge rank={entry.rank} />
            <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 12,
              color: 'var(--text-dim)',
              background: 'var(--surface2)',
              borderRadius: 4,
              padding: '2px 6px',
              textAlign: 'center',
            }}>
              #{entry.hole}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 14,
              fontWeight: 600,
              color: entry.rank === 1 ? 'var(--rank-gold)' : entry.rank === 2 ? 'var(--rank-silver)' : entry.rank === 3 ? 'var(--rank-bronze)' : 'var(--accent)',
            }}>
              {entry.distance}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LongestDriveQuadrant({ entries }: { entries: LongestDriveEntry[] }) {
  return (
    <div className="quadrant" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <QuadrantHeader title="Longest Drive" icon="💨" />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 60px 80px',
        gap: 8,
        padding: '0 4px 8px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 4,
      }}>
        {['#', 'Player', 'Hole', 'Distance'].map(h => (
          <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {h}
          </span>
        ))}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {entries.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No data yet
          </div>
        ) : entries.map((entry, i) => (
          <div
            key={entry.name + i}
            className="animate-in"
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 60px 80px',
              gap: 8,
              padding: '10px 4px',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              animationDelay: `${i * 0.04}s`,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <RankBadge rank={entry.rank} />
            <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 12,
              color: 'var(--text-dim)',
              background: 'var(--surface2)',
              borderRadius: 4,
              padding: '2px 6px',
              textAlign: 'center',
            }}>
              #{entry.hole}
            </span>
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 14,
              fontWeight: 600,
              color: entry.rank === 1 ? 'var(--rank-gold)' : entry.rank === 2 ? 'var(--rank-silver)' : entry.rank === 3 ? 'var(--rank-bronze)' : 'var(--green)',
            }}>
              {entry.distance} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{entry.distanceUnit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsQuadrant({ stats }: { stats: PlayerStats[] }) {
  return (
    <div className="quadrant" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <QuadrantHeader title="Player Stats" icon="📊" />

      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Player', 'FIR', 'GIR', 'Putts', 'Avg Dist', 'Scr%'].map(h => (
                <th key={h} style={{
                  padding: '4px 8px 10px',
                  textAlign: h === 'Player' ? 'left' : 'center',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((player, i) => (
              <tr
                key={player.name + i}
                className="animate-in"
                style={{
                  borderBottom: i < stats.length - 1 ? '1px solid var(--border)' : 'none',
                  animationDelay: `${i * 0.03}s`,
                  cursor: 'default',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface2)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <td style={{ padding: '9px 8px', fontWeight: 500, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.name}
                </td>
                {[player.fairwaysHit, player.greensInRegulation, player.puttsPerRound, player.avgDrivingDistance ?? '--', player.scrambling ?? '--'].map((val, vi) => (
                  <td key={vi} style={{
                    padding: '9px 8px',
                    textAlign: 'center',
                    fontFamily: 'DM Mono, monospace',
                    color: 'var(--text-dim)',
                    whiteSpace: 'nowrap',
                  }}>
                    {String(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ padding: 16 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 36, marginBottom: 8, animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/tournament', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        gap: 16,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* TrackMan logo text */}
          <div style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 26,
            letterSpacing: '0.06em',
            color: 'var(--text)',
            lineHeight: 1,
          }}>
            <span style={{ color: 'var(--accent)' }}>TRACK</span>MAN
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              {data?.tournamentName || 'Tournament Dashboard'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              LIVE LEADERBOARD
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Mock data warning */}
          {data?.error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--gold)',
              maxWidth: 300,
            }}>
              ⚠️ <span>Demo data — see SETUP.md to connect live feed</span>
            </div>
          )}

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="live-dot" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', letterSpacing: '0.1em' }}>LIVE</span>
          </div>

          {/* Refresh info */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', textAlign: 'right' }}>
            {lastRefresh && (
              <div>Updated {lastRefresh.toLocaleTimeString()}</div>
            )}
            <div style={{ color: refreshing ? 'var(--accent)' : 'var(--text-muted)' }}>
              {refreshing ? '⟳ Refreshing...' : `Next in ${countdown}s`}
            </div>
          </div>

          {/* Manual refresh */}
          <button
            onClick={fetchData}
            disabled={refreshing}
            style={{
              padding: '7px 14px',
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: 6,
              color: 'var(--text)',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 500,
              opacity: refreshing ? 0.5 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={e => !refreshing && ((e.currentTarget as HTMLElement).style.background = 'var(--border2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface2)')}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: refreshing ? 'transform 1s linear' : 'none' }}>↻</span>
            Refresh
          </button>
        </div>
      </header>

      {/* 4-Quadrant Grid */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 1,
        background: 'var(--border)',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Top Left: Leaderboard */}
        <div style={{
          background: 'var(--surface)',
          padding: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {loading ? <Skeleton /> : data ? (
            <LeaderboardQuadrant gross={data.leaderboard.gross} net={data.leaderboard.net} />
          ) : null}
        </div>

        {/* Top Right: Closest to Pin */}
        <div style={{
          background: 'var(--surface)',
          padding: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {loading ? <Skeleton /> : data ? (
            <ClosestToPinQuadrant entries={data.closestToPin} />
          ) : null}
        </div>

        {/* Bottom Left: Longest Drive */}
        <div style={{
          background: 'var(--surface)',
          padding: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {loading ? <Skeleton /> : data ? (
            <LongestDriveQuadrant entries={data.longestDrive} />
          ) : null}
        </div>

        {/* Bottom Right: Stats */}
        <div style={{
          background: 'var(--surface)',
          padding: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {loading ? <Skeleton /> : data ? (
            <StatsQuadrant stats={data.stats} />
          ) : null}
        </div>
      </main>
    </div>
  );
}
