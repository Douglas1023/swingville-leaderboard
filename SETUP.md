# TrackMan Dashboard — Setup Guide

## Quick Start (Demo Mode)

The dashboard runs immediately with mock data. To connect it to your live TrackMan tournament, follow the steps below.

---

## Step 1: Discover the Live API Endpoint

TrackMan Portal is a React SPA — the data is loaded via internal API calls, not HTML.

1. Open your tournament URL in **Chrome**:
   ```
   https://portal.trackmangolf.com/facility/.../leaderboards?leaderboardType=coursePlayStrokeNet
   ```

2. Open **DevTools** → **Network** tab → click **"Fetch/XHR"** filter

3. **Reload the page** and watch for API calls

4. Look for requests that return JSON with player/leaderboard data. They'll look something like:
   - `https://api.trackmangolf.com/v1/tournaments/...`
   - `https://portal.trackmangolf.com/api/...`
   - Or something with `leaderboard` in the URL

5. **Click on one of those requests** → go to the **"Response"** tab → you'll see the JSON

6. **Copy the exact URL** — this is your `TRACKMAN_API_BASE`

---

## Step 2: Check for Auth Headers

In DevTools, click the API request → go to the **"Headers"** tab → look for:

- `Authorization: Bearer eyJ...` — if present, you need a token
- `Cookie: session=...` — if present, the session cookie drives auth

**If there's a Bearer token**, copy it and set it in `.env.local`:
```
TRACKMAN_API_TOKEN=eyJ...your-token-here...
```

**If it's cookie-based**, the dashboard will auto-handle cookies in the same browser session, but the serverless function may need to replicate the login. In that case, reach out — we can add a login step.

---

## Step 3: Update `.env.local`

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:
```
TRACKMAN_API_BASE=https://api.trackmangolf.com   # from Step 1
TRACKMAN_API_TOKEN=eyJ...                         # from Step 2 (if needed)
TRACKMAN_TOURNAMENT_ID=TXVsd...                   # already in the file
TRACKMAN_FACILITY_ID=RmFja...                     # already in the file
```

---

## Step 4: Update the API Parser

Once you know the real API response shape, update `src/lib/trackman.ts`:

1. Find the `parseAPIResponse` function
2. Look at the actual JSON fields your API returns
3. Map them to our `Player`, `ClosestToPinEntry`, etc. types

Example — if the API returns:
```json
{
  "players": [
    { "position": 1, "fullName": "John Smith", "totalStrokes": 68, "netStrokes": 65 }
  ]
}
```

Update the mapper:
```typescript
const mapPlayer = (p: any, i: number): Player => ({
  rank: p.position,
  name: p.fullName,
  grossScore: p.totalStrokes,
  netScore: p.netStrokes,
  ...
});
```

---

## Step 5: Add Bearer Token to Fetch Calls (if needed)

In `src/lib/trackman.ts`, update `BROWSER_HEADERS`:

```typescript
const BROWSER_HEADERS = {
  ...existing headers...
  'Authorization': `Bearer ${process.env.TRACKMAN_API_TOKEN}`,
};
```

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars in Vercel dashboard or via CLI:
vercel env add TRACKMAN_API_BASE
vercel env add TRACKMAN_API_TOKEN
vercel env add TRACKMAN_TOURNAMENT_ID
vercel env add TRACKMAN_FACILITY_ID
```

The dashboard auto-refreshes every **30 seconds** via Vercel's ISR (Incremental Static Regeneration).

---

## Troubleshooting

**"Demo data" warning showing** → The API endpoint hasn't been configured yet. Follow Steps 1–3.

**Data loads but looks wrong** → The API response shape doesn't match our parser. Follow Step 4.

**Auth errors (401/403)** → Follow Step 2 to add the auth token.

**CORS errors in the browser** → The fetch happens server-side (Next.js API route), so CORS doesn't apply. This won't be an issue.

---

## Need Help?

If you paste the JSON from the Network tab API response, we can update the parser automatically to match the exact field names TrackMan uses.
