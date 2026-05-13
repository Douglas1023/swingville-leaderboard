# TrackMan Tournament Dashboard

A live, auto-refreshing tournament leaderboard dashboard built with Next.js 15.

## Features

- **4-quadrant layout**: Leaderboard, Closest to Pin, Longest Drive, Player Stats
- **Net / Gross toggle** on the leaderboard
- **Auto-refreshes every 30 seconds** (configurable)
- **Live API scraping** from TrackMan portal
- Dark, golf-themed UI

## Getting Started

```bash
npm install
cp .env.example .env.local
# Edit .env.local — see SETUP.md for how to find your API endpoint
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The dashboard runs in **demo mode** until the live API is configured. See [SETUP.md](./SETUP.md) for full instructions.

## Deploy to Vercel

```bash
npx vercel
```

Set your environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- No UI framework — custom CSS variables
- Vercel ISR for 30s revalidation
