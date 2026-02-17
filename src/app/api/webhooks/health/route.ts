import { NextRequest, NextResponse } from 'next/server';
import { getServerConfig } from '@/lib/server-config';

// GET /api/webhooks/health — Diagnostic endpoint.
// Shows exactly which env vars are set and what's missing.
// Uses server-config (env vars + local config file fallback).

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const config = getServerConfig();
  const expectedSecret = config.webhookSecret;

  // Require secret to see diagnostics (prevents info leakage)
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Pass ?secret=WEBHOOK_SECRET to view diagnostics' },
      { status: 401 }
    );
  }

  const checks = {
    WEBHOOK_SECRET: Boolean(config.webhookSecret),
    GHL_API_KEY: Boolean(config.ghlApiKey),
    GHL_LOCATION_ID: Boolean(config.ghlLocationId),
    JOBTREAD_SERVICE_TOKEN: Boolean(config.jtServiceToken),
    JOBTREAD_API_URL: process.env.JOBTREAD_API_URL || 'NOT SET (using default)',
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    VERCEL_URL: process.env.VERCEL_URL || 'NOT SET (not on Vercel)',
  };

  const missing: string[] = [];
  if (!config.ghlApiKey) missing.push('GHL_API_KEY — needed for JT→GHL sync');
  if (!config.ghlLocationId) missing.push('GHL_LOCATION_ID — needed for JT→GHL sync');
  if (!config.jtServiceToken) missing.push('JOBTREAD_SERVICE_TOKEN — needed for GHL→JT sync');

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return NextResponse.json({
    status: missing.length === 0 ? 'ready' : 'incomplete',
    checks,
    missing,
    webhookUrls: {
      jt: `${baseUrl}/api/webhooks/jobtread?secret=${config.webhookSecret}`,
      ghl: `${baseUrl}/api/webhooks/ghl?secret=${config.webhookSecret}`,
      health: `${baseUrl}/api/webhooks/health?secret=${config.webhookSecret}`,
    },
    instructions: missing.length > 0
      ? [
          'Add missing credentials via Settings page (Connect & Save) or .env.local or Vercel dashboard.',
          'GHL_API_KEY: Go to GHL → Settings → Business Profile → API Key',
          'GHL_LOCATION_ID: Go to GHL → Settings → Business Profile → Location ID',
          'JOBTREAD_SERVICE_TOKEN: Use your JobTread API key (same one you log in with)',
        ]
      : ['All configured! Run `npm run setup` to register connectors, or use the Settings page.'],
  });
}
