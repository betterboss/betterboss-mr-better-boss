import type { Metadata } from 'next';
import { Providers } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'BetterBoss Sidebar | AI-Powered JobTread Companion',
  description:
    'The ultimate AI-powered sidebar for JobTread. Smart estimating, lead scoring, cash flow analytics, and AI assistance - built by Better Boss, America\'s #1 AI Automation for Contractors.',
  keywords: [
    'JobTread',
    'construction management',
    'AI estimating',
    'roofing software',
    'BetterBoss',
    'contractor software',
    'construction CRM',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-dark-950 text-dark-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
