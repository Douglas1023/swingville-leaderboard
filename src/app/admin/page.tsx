'use client';

import { useState, useRef, useEffect } from 'react';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d0d0d0',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#555',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const btnStyle: React.CSSProperties = {
  background: '#023d1e',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '14px',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
  letterSpacing: '0.04em',
  fontFamily: 'system-ui, sans-serif',
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [tournamentId, setTournamentId] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('adminPw');
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        setTournamentId(cfg.tournamentId || '');
        setSponsorName(cfg.sponsorName || '');
        setLogoPreview(cfg.sponsorLogoUrl || null);
      });
  }, [authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(false);
    // Validate against server on first real save; for the gate just store and proceed
    sessionStorage.setItem('adminPw', password);
    setAuthed(true);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const form = new FormData();
    form.append('tournamentId', tournamentId);
    form.append('sponsorName', sponsorName);
    if (logoFile) form.append('logo', logoFile);

    const res = await fetch('/api/admin/save', {
      method: 'POST',
      headers: { 'x-admin-password': password },
      body: form,
    });

    setSaving(false);

    if (res.ok) {
      setStatus({ type: 'success', message: 'Saved! Leaderboard is now live with the new tournament and sponsor.' });
      setLogoFile(null);
    } else {
      const err = await res.json();
      if (res.status === 401) {
        setAuthError(true);
        sessionStorage.removeItem('adminPw');
        setAuthed(false);
      } else {
        setStatus({ type: 'error', message: err.error || 'Something went wrong. Try again.' });
      }
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#023d1e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: 'system-ui, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
  };

  if (!authed) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/swingville-logo.png" alt="Swingville" style={{ height: 56, marginBottom: 24, display: 'block' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#023d1e' }}>Admin</h1>
          <p style={{ color: '#888', marginBottom: 28, fontSize: 14, margin: '4px 0 28px' }}>
            Enter your password to manage the leaderboard.
          </p>
          {authError && (
            <div style={{ background: '#fdecea', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              Incorrect password.
            </div>
          )}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              style={inputStyle}
            />
            <button type="submit" style={btnStyle}>Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/swingville-logo.png" alt="Swingville" style={{ height: 48, display: 'block' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#023d1e' }}>Admin</div>
            <div style={{ fontSize: 12, color: '#999' }}>Weekly Tournament Setup</div>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem('adminPw'); setAuthed(false); setPassword(''); }}
            style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Sign out
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Tournament ID */}
          <div>
            <label style={labelStyle}>Trackman Tournament ID</label>
            <input
              type="text"
              value={tournamentId}
              onChange={e => setTournamentId(e.target.value)}
              placeholder="Paste from Trackman URL…"
              required
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 6, lineHeight: 1.5 }}>
              Go to your tournament on{' '}
              <strong style={{ color: '#666' }}>portal.trackmangolf.com</strong>, copy the last
              part of the URL after <code style={{ background: '#f0f0f0', padding: '1px 4px', borderRadius: 3 }}>/tournaments/</code>
            </div>
          </div>

          <div style={{ height: 1, background: '#f0f0f0' }} />

          {/* Sponsor Name */}
          <div>
            <label style={labelStyle}>This Week&apos;s Sponsor</label>
            <input
              type="text"
              value={sponsorName}
              onChange={e => setSponsorName(e.target.value)}
              placeholder="e.g. Good Pilates"
              required
              style={inputStyle}
            />
          </div>

          {/* Sponsor Logo */}
          <div>
            <label style={labelStyle}>Sponsor Logo</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${logoFile ? '#023d1e' : '#d8d8d8'}`,
                borderRadius: 10,
                padding: 24,
                textAlign: 'center',
                cursor: 'pointer',
                background: logoFile ? '#f0f6f2' : '#fafafa',
                transition: 'all 0.15s',
                minHeight: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {logoPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoPreview}
                  alt="Sponsor preview"
                  style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#bbb', fontSize: 14 }}>Click to upload JPG or PNG</div>
              )}
              {logoFile && (
                <div style={{ fontSize: 11, color: '#023d1e', fontWeight: 600 }}>{logoFile.name}</div>
              )}
              {!logoFile && logoPreview && (
                <div style={{ fontSize: 11, color: '#bbb' }}>Click to replace</div>
              )}
              {!logoFile && !logoPreview && (
                <div style={{ fontSize: 11, color: '#ccc' }}>JPG or PNG recommended</div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Status */}
          {status && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: status.type === 'success' ? '#e8f5e9' : '#fdecea',
              color: status.type === 'success' ? '#1b5e20' : '#c0392b',
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{ ...btnStyle, opacity: saving ? 0.65 : 1, marginTop: 4 }}
          >
            {saving ? 'Saving…' : 'Save & Go Live'}
          </button>
        </form>
      </div>
    </div>
  );
}
