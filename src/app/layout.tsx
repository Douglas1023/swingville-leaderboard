import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrackMan Tournament Dashboard',
  description: 'Live tournament leaderboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
