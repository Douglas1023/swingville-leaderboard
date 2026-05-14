'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TournamentData, Player, ClosestToPinEntry, LongestDriveEntry } from '@/lib/trackman';

const REFRESH_INTERVAL = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '30000');

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '--';
  if (score === 0) return 'E';
  if (score > 0) return `+${score}`;
  return `${score}`;
}

// Red for under par (good), cream for even, blue for over par (bad)
function getScoreColor(toPar: number | null): string {
  if (toPar === null || toPar === undefined) return 'var(--text-muted)';
  if (toPar === 0) return '#F2E6C8';
  if (toPar < 0) {
    const t = Math.min(Math.abs(toPar) / 8, 1);
    const l = Math.round(72 - t * 32);
    return `hsl(0, 82%, ${l}%)`;
  }
  const t = Math.min(toPar / 8, 1);
  const l = Math.round(74 - t * 26);
  return `hsl(210, 78%, ${l}%)`;
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
      width: 26,
      height: 26,
      borderRadius: 5,
      background: rank <= 3 ? `${color}22` : 'transparent',
      border: rank <= 3 ? `1px solid ${color}44` : '1px solid transparent',
      color,
      fontFamily: 'DM Mono, monospace',
      fontSize: 12,
      fontWeight: 700,
    }}>
      {rank}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'Bebas Neue, sans-serif',
      fontSize: 11,
      letterSpacing: '0.18em',
      color: 'var(--text-muted)',
    }}>
      {children}
    </span>
  );
}

// Animated horizontal score bar for leaderboard rows
function ScoreBar({ toPar, minScore, maxScore }: { toPar: number | null; minScore: number; maxScore: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  if (toPar === null) return <div style={{ height: 3 }} />;
  const range = maxScore - minScore || 1;
  const pct = ((maxScore - toPar) / range) * 100;
  const color = getScoreColor(toPar);

  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: mounted ? `${Math.max(pct, 4)}%` : '0%',
        background: color,
        borderRadius: 2,
        transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: `0 0 6px ${color}88`,
      }} />
    </div>
  );
}

// Proportional bar for distance panels
function DistanceBar({ value, maxValue, color, invert }: {
  value: number; maxValue: number; color: string; invert?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const raw = maxValue > 0 ? value / maxValue : 0;
  const pct = invert ? (1 - raw) * 90 + 10 : raw * 100; // invert: best (smallest) gets longest bar

  return (
    <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: mounted ? `${Math.max(pct, 6)}%` : '0%',
        background: `linear-gradient(90deg, ${color}cc, ${color})`,
        borderRadius: 4,
        transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: `0 0 8px ${color}55`,
      }} />
    </div>
  );
}

function QuadrantHeader({ title, icon, sub, live }: { title: string; icon: string; sub?: string; live?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 22,
        letterSpacing: '0.1em',
        color: 'var(--text)',
        lineHeight: 1,
      }}>{title}</span>
      {live && (
        <div className="leaderboard-live" style={{
          display: 'none',
          alignItems: 'center',
          gap: 5,
          background: 'rgba(74,222,128,0.08)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: 20,
          padding: '3px 8px',
        }}>
          <div className="live-dot" style={{ width: 6, height: 6 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em' }}>LIVE</span>
        </div>
      )}
      {sub && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em' }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function LeaderboardQuadrant({ net }: { gross: Player[]; net: Player[] }) {
  const scores = net.map(p => p.netScoreToPar ?? 0);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  return (
    <div className="quadrant-inner" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <QuadrantHeader title="Leaderboard" icon="🏆" sub={`${net.length} players`} live />

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '34px 1fr 52px 12px 52px 38px',
        gap: 8,
        padding: '0 4px 10px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 2,
        alignItems: 'center',
      }}>
        {[
          { label: '#', align: 'left' },
          { label: 'PLAYER', align: 'left' },
          { label: 'NET', align: 'center', accent: true },
          { label: '', align: 'center' },
          { label: 'GROSS', align: 'center' },
          { label: 'THRU', align: 'center' },
        ].map((h, i) => (
          <SectionLabel key={i}>
            <span style={{
              display: 'block',
              textAlign: h.align as 'left' | 'center',
              color: h.accent ? 'var(--accent)' : undefined,
            }}>
              {h.label}
            </span>
          </SectionLabel>
        ))}
      </div>

      <div className="quadrant-scroll" style={{ overflowY: 'auto', flex: 1 }}>
        {net.map((player, i) => {
          const isLeader = i === 0;
          const scoreColor = getScoreColor(player.netScoreToPar);
          const grossColor = getScoreColor(player.scoreToPar);

          return (
            <div
              key={player.name + i}
              className="animate-in"
              style={{
                padding: '9px 4px 4px',
                borderBottom: '1px solid var(--border)',
                borderLeft: isLeader ? '3px solid var(--rank-gold)' : '3px solid transparent',
                background: isLeader
                  ? 'linear-gradient(90deg, rgba(255,215,0,0.07) 0%, transparent 60%)'
                  : 'transparent',
                boxShadow: isLeader ? '0 0 24px rgba(255,215,0,0.05)' : 'none',
                borderRadius: 2,
                animationDelay: `${i * 0.04}s`,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = isLeader
                ? 'linear-gradient(90deg, rgba(255,215,0,0.07) 0%, transparent 60%)'
                : 'transparent')}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: '34px 1fr 52px 12px 52px 38px',
                gap: 8,
                alignItems: 'center',
              }}>
                <RankBadge rank={player.rank} />

                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text)',
                    letterSpacing: '0.01em',
                  }}>
                    {player.name}
                  </div>
                  {player.handicap !== undefined && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                      HCP {player.handicap < 0 ? '+' : ''}{Math.abs(player.handicap)}
                    </div>
                  )}
                </div>

                {/* NET */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 16,
                    fontWeight: 700,
                    color: scoreColor,
                    textShadow: player.netScoreToPar !== null && player.netScoreToPar < 0
                      ? `0 0 12px ${scoreColor}66` : 'none',
                  }}>
                    {formatScore(player.netScoreToPar)}
                  </span>
                </div>

                <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 auto' }} />

                {/* GROSS */}
                <div style={{ textAlign: 'center', opacity: 0.55 }}>
                  <span style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 13,
                    fontWeight: 600,
                    color: grossColor,
                  }}>
                    {formatScore(player.scoreToPar)}
                  </span>
                </div>

                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  color: player.thru === 18 ? 'var(--green)' : 'var(--text-dim)',
                  textAlign: 'center',
                  letterSpacing: '0.04em',
                }}>
                  {player.thru === 18 ? 'F' : player.thru || '—'}
                </span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClosestToPinQuadrant({ entries }: { entries: ClosestToPinEntry[] }) {
  const maxDist = Math.max(...entries.map(e => e.rawDistance), 1);

  return (
    <div className="quadrant-inner" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <QuadrantHeader title="Closest to Pin" icon="⛳" sub={entries[0] ? `Hole ${entries[0].hole}` : undefined} />

      <div className="quadrant-scroll" style={{ overflowY: 'auto', flex: 1 }}>
        {entries.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
        ) : entries.map((entry, i) => {
          const rankColors = ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'];
          const barColor = rankColors[i] || 'var(--accent)';

          return (
            <div
              key={entry.name + i}
              className="animate-in"
              style={{
                padding: '10px 4px',
                borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                animationDelay: `${i * 0.05}s`,
                borderLeft: i === 0 ? '3px solid var(--rank-gold)' : '3px solid transparent',
                background: i === 0 ? 'linear-gradient(90deg, rgba(255,215,0,0.06) 0%, transparent 50%)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                <RankBadge rank={entry.rank} />
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.name}
                </span>
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 15,
                  fontWeight: 700,
                  color: barColor,
                  textShadow: i === 0 ? `0 0 10px ${barColor}66` : 'none',
                }}>
                  {entry.distance}
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>ft</span>
              </div>
              {/* Proportional bar — closer = longer bar (inverted) */}
              <DistanceBar value={entry.rawDistance} maxValue={maxDist} color={barColor} invert />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LongestDriveQuadrant({ entries }: { entries: LongestDriveEntry[] }) {
  const maxDist = Math.max(...entries.map(e => e.rawDistance), 1);

  return (
    <div className="quadrant-inner" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <QuadrantHeader title="Longest Drive" icon="💪" sub={entries[0] ? `Hole ${entries[0].hole}` : undefined} />

      <div className="quadrant-scroll" style={{ overflowY: 'auto', flex: 1 }}>
        {entries.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
        ) : entries.map((entry, i) => {
          const rankColors = ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'];
          const barColor = rankColors[i] || 'var(--accent)';

          return (
            <div
              key={entry.name + i}
              className="animate-in"
              style={{
                padding: '10px 4px',
                borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                animationDelay: `${i * 0.05}s`,
                borderLeft: i === 0 ? '3px solid var(--rank-gold)' : '3px solid transparent',
                background: i === 0 ? 'linear-gradient(90deg, rgba(255,215,0,0.06) 0%, transparent 50%)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                <RankBadge rank={entry.rank} />
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.name}
                </span>
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 15,
                  fontWeight: 700,
                  color: barColor,
                  textShadow: i === 0 ? `0 0 10px ${barColor}66` : 'none',
                }}>
                  {entry.distance}
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>yds</span>
              </div>
              {/* Proportional bar — longer drive = longer bar */}
              <DistanceBar value={entry.rawDistance} maxValue={maxDist} color={barColor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ padding: 16 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 44, marginBottom: 10, borderRadius: 4, animationDelay: `${i * 0.05}s` }} />
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
  const [sponsorName, setSponsorName] = useState('Good Pilates');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('/good-pilates-logo.png');

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [tournamentRes, configRes] = await Promise.all([
        fetch('/api/tournament', { cache: 'no-store' }),
        fetch('/api/config', { cache: 'no-store' }),
      ]);
      if (!tournamentRes.ok) throw new Error('Failed to fetch');
      const json = await tournamentRes.json();
      setData(json);
      setLastRefresh(new Date());
      setCountdown(REFRESH_INTERVAL / 1000);
      if (configRes.ok) {
        const cfg = await configRes.json();
        if (cfg.sponsorName) setSponsorName(cfg.sponsorName);
        if (cfg.sponsorLogoUrl) setSponsorLogoUrl(cfg.sponsorLogoUrl);
      }
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

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="site-header">
        {/* Left: logo + course info */}
        <div className="header-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/swingville-logo.png"
            alt="Swingville Golf Club"
            style={{ height: 90, width: 'auto', display: 'block' }}
          />
          <div className="divider" style={{ width: 1, height: 36, background: 'var(--border)' }} />
          <div>
            <div style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 20,
              letterSpacing: '0.08em',
              color: '#023d1e',
              lineHeight: 1.1,
            }}>
              {data?.tournamentName || 'Tournament'}
            </div>
            {data?.courseLocation && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                {data.courseLocation}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{today}</span>
            </div>
          </div>
        </div>

        {/* Center: sponsor (desktop centered, mobile inline next to course info) */}
        <div className="header-sponsor">
          <span className="header-sponsor-label" style={{
            fontSize: 9,
            fontFamily: 'DM Mono, monospace',
            letterSpacing: '0.18em',
            color: '#023d1e',
            opacity: 0.6,
            textTransform: 'uppercase',
          }}>
            This Week&apos;s Sponsor
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sponsorLogoUrl}
            alt={sponsorName}
            style={{ height: 36, width: 'auto', display: 'block' }}
          />
        </div>

        {/* Right: live status + refresh */}
        <div className="header-right">
          {data?.error && (
            <div style={{
              fontSize: 11, color: 'var(--gold)',
              background: 'rgba(232,200,112,0.1)',
              border: '1px solid rgba(232,200,112,0.3)',
              borderRadius: 6, padding: '4px 10px',
            }}>
              ⚠ Demo mode
            </div>
          )}

          {/* Live pulse — hidden on mobile (moves to leaderboard header) */}
          <div className="header-live-pulse" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.2)',
            borderRadius: 20, padding: '5px 12px',
          }}>
            <div className="live-dot" />
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--green)',
              fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em',
            }}>LIVE</span>
          </div>

          {/* Refresh info + button */}
          <div className="header-refresh-info">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              {lastRefresh && `Updated ${lastRefresh.toLocaleTimeString()}`}
            </div>
            <div style={{ fontSize: 10, color: refreshing ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
              {refreshing ? '⟳ Refreshing...' : `Next in ${countdown}s`}
            </div>
          </div>

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
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={e => !refreshing && ((e.currentTarget as HTMLElement).style.background = 'var(--border2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface2)')}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: refreshing ? 'transform 1s linear' : 'none' }}>↻</span>
            Refresh
          </button>
        </div>
      </header>

      {/* Main grid: leaderboard left (full height), CTP + LD stacked right */}
      <main className="main-grid">
        {/* Left: Leaderboard — spans both rows */}
        <div className="quadrant quadrant-leaderboard">
          {loading ? <Skeleton /> : data ? (
            <LeaderboardQuadrant gross={data.leaderboard.gross} net={data.leaderboard.net} />
          ) : null}
        </div>

        {/* Top Right: Closest to Pin */}
        <div className="quadrant">
          {loading ? <Skeleton /> : data ? (
            <ClosestToPinQuadrant entries={data.closestToPin} />
          ) : null}
        </div>

        {/* Bottom Right: Longest Drive */}
        <div className="quadrant">
          {loading ? <Skeleton /> : data ? (
            <LongestDriveQuadrant entries={data.longestDrive} />
          ) : null}
        </div>
      </main>
    </div>
  );
}
