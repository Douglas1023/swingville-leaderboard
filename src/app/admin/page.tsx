'use client';

import { useState, useEffect } from 'react';
import { SPONSORS } from '@/lib/sponsors';

type Status = 'idle' | 'saving' | 'success' | 'error';

export default function AdminPage() {
  const [tournamentId, setTournamentId] = useState('');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        setTournamentId(cfg.tournamentId ?? '');
        setSponsorLogoUrl(cfg.sponsorLogoUrl ?? SPONSORS[0].logoUrl);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, sponsorLogoUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#023d1e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 36,
        width: '100%',
        maxWidth: 500,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/swingville-logo.png" alt="Swingville" style={{ height: 56, width: 'auto' }} />
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 30, color: '#023d1e', lineHeight: 1 }}>
              Admin
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>Weekly Tournament Setup</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tournament ID */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#666',
              marginBottom: 8,
            }}>
              Trackman Tournament ID
            </label>
            <input
              type="text"
              value={tournamentId}
              onChange={e => setTournamentId(e.target.value)}
              placeholder="Paste the tournament ID here…"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1.5px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'DM Mono, monospace',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#111',
              }}
            />
            <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0' }}>
              Go to your tournament on <strong>portal.trackmangolf.com</strong>, copy the last part
              after{' '}
              <code style={{ background: '#f2f2f2', padding: '1px 5px', borderRadius: 3 }}>/tournaments/</code>
              {' '}and before{' '}
              <code style={{ background: '#f2f2f2', padding: '1px 5px', borderRadius: 3 }}>/leaderboards</code>
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '4px 0 24px' }} />

          {/* Sponsor Logo Picker */}
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block',
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#666',
              marginBottom: 12,
            }}>
              This Week&apos;s Sponsor
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {SPONSORS.map(s => {
                const selected = sponsorLogoUrl === s.logoUrl;
                return (
                  <button
                    key={s.logoUrl}
                    type="button"
                    onClick={() => setSponsorLogoUrl(s.logoUrl)}
                    style={{
                      padding: '16px 12px',
                      border: selected ? '2px solid #023d1e' : '2px solid #e0e0e0',
                      borderRadius: 10,
                      background: selected ? '#f0f6f2' : '#fafafa',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.logoUrl}
                      alt={s.name}
                      style={{ height: 48, maxWidth: '100%', objectFit: 'contain' }}
                    />
                    <span style={{
                      fontSize: 11,
                      fontWeight: selected ? 700 : 400,
                      color: selected ? '#023d1e' : '#888',
                      fontFamily: 'DM Mono, monospace',
                    }}>
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status messages */}
          {status === 'error' && (
            <div style={{
              background: '#fff1f1',
              border: '1px solid #fcc',
              borderRadius: 8,
              padding: '12px 14px',
              color: '#c0392b',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {errorMsg}
            </div>
          )}
          {status === 'success' && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 8,
              padding: '12px 14px',
              color: '#166534',
              fontSize: 13,
              marginBottom: 16,
            }}>
              Saved! The leaderboard is now live.
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'saving'}
            style={{
              width: '100%',
              padding: 14,
              background: '#023d1e',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: status === 'saving' ? 'not-allowed' : 'pointer',
              opacity: status === 'saving' ? 0.65 : 1,
              letterSpacing: '0.02em',
            }}
          >
            {status === 'saving' ? 'Saving…' : 'Save & Go Live'}
          </button>
        </form>
      </div>
    </div>
  );
}
