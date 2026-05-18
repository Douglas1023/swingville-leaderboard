'use client';

import { useState, useEffect, useRef } from 'react';

type Status = 'idle' | 'saving' | 'success' | 'error';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Mono, monospace',
  fontSize: 11,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: '#666',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #e0e0e0',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'DM Mono, monospace',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#111',
};

export default function AdminPage() {
  const [tournamentId, setTournamentId] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [currentLogoUrl, setCurrentLogoUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        setTournamentId(cfg.tournamentId ?? '');
        setSponsorName(cfg.sponsorName ?? '');
        setCurrentLogoUrl(cfg.sponsorLogoUrl ?? '');
      })
      .catch(() => {});
  }, []);

  function pickFile(file: File | null) {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setErrorMsg('');

    try {
      const body = new FormData();
      body.append('tournamentId', tournamentId);
      body.append('sponsorName', sponsorName);
      if (logoFile) body.append('logo', logoFile);

      const res = await fetch('/api/admin/save', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json.error || 'Save failed');

      if (json.sponsorLogoUrl) setCurrentLogoUrl(json.sponsorLogoUrl);
      setLogoFile(null);
      setLogoPreview('');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  }

  const displayLogo = logoPreview || currentLogoUrl;

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
            <div style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 30,
              color: '#023d1e',
              lineHeight: 1,
            }}>
              Admin
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>Weekly Tournament Setup</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tournament ID */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Trackman Tournament ID</label>
            <input
              style={inputStyle}
              type="text"
              value={tournamentId}
              onChange={e => setTournamentId(e.target.value)}
              placeholder="Paste the tournament ID here…"
              required
            />
            <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0' }}>
              Go to your tournament on <strong>portal.trackmangolf.com</strong>, copy the last part of the URL
              after{' '}
              <code style={{ background: '#f2f2f2', padding: '1px 5px', borderRadius: 3 }}>/tournaments/</code>
              {' '}and before{' '}
              <code style={{ background: '#f2f2f2', padding: '1px 5px', borderRadius: 3 }}>/leaderboards</code>
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '4px 0 24px' }} />

          {/* Sponsor Name */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>This Week&apos;s Sponsor</label>
            <input
              style={{ ...inputStyle, fontFamily: 'inherit', fontSize: 14 }}
              type="text"
              value={sponsorName}
              onChange={e => setSponsorName(e.target.value)}
              placeholder="Sponsor name"
            />
          </div>

          {/* Sponsor Logo */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Sponsor Logo</label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f?.type.startsWith('image/')) pickFile(f);
              }}
              style={{
                border: '2px dashed #ccc',
                borderRadius: 10,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#fafafa',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {displayLogo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayLogo}
                    alt="Sponsor logo preview"
                    style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }}
                  />
                  {logoFile && (
                    <span style={{ fontSize: 12, color: '#888' }}>{logoFile.name}</span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 13, color: '#bbb' }}>Click or drag an image here</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => pickFile(e.target.files?.[0] ?? null)}
            />
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
              Saved! The leaderboard is now live with the new tournament.
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
