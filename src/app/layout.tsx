import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Swingville Golf Tournament Dashboard',
  description: 'Live tournament leaderboard',
  openGraph: {
    title: 'Swingville Golf Tournament Dashboard',
    description: 'Live tournament leaderboard',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
