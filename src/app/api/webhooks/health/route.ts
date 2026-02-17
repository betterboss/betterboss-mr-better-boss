import { NextRequest, NextResponse } from 'next/server';

// GET /api/webhooks/health — Diagnostic endpoint.
// Shows exactly which env vars are set and what's missing.
// No auth required so you can test from a browser or curl.

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;

  // Require secret to see diagnostics (prevents info leakage)
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Pass ?secret=WEBHOOK_SECRET to view diagnostics' },
      { status: 401 }
    );
  }

  const checks = {
    WEBHOOK_SECRET: Boolean(process.env.WEBHOOK_SECRET),
    GHL_API_KEY: Boolean(process.env.GHL_API_KEY),
    GHL_LOCATION_ID: Boolean(process.env.GHL_LOCATION_ID),
    JOBTREAD_SERVICE_TOKEN: Boolean(process.env.JOBTREAD_SERVICE_TOKEN),
    JOBTREAD_API_URL: process.env.JOBTREAD_API_URL || 'NOT SET (using default)',
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    VERCEL_URL: process.env.VERCEL_URL || 'NOT SET (not on Vercel)',
  };

  const missing: string[] = [];
  if (!checks.GHL_API_KEY) missing.push('GHL_API_KEY — needed for JT→GHL sync');
  if (!checks.GHL_LOCATION_ID) missing.push('GHL_LOCATION_ID — needed for JT→GHL sync');
  if (!checks.JOBTREAD_SERVICE_TOKEN) missing.push('JOBTREAD_SERVICE_TOKEN — needed for GHL→JT sync');

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return NextResponse.json({
    status: missing.length === 0 ? 'ready' : 'incomplete',
    checks,
    missing,
    webhookUrls: {
      jt: `${baseUrl}/api/webhooks/jobtread?secret=${process.env.WEBHOOK_SECRET}`,
      ghl: `${baseUrl}/api/webhooks/ghl?secret=${process.env.WEBHOOK_SECRET}`,
      health: `${baseUrl}/api/webhooks/health?secret=${process.env.WEBHOOK_SECRET}`,
    },
    instructions: missing.length > 0
      ? [
          'Add missing env vars to .env.local (local) or Vercel dashboard (production).',
          'GHL_API_KEY: Go to GHL → Settings → Business Profile → API Key',
          'GHL_LOCATION_ID: Go to GHL → Settings → Business Profile → Location ID',
          'JOBTREAD_SERVICE_TOKEN: Use your JobTread API key (same one you log in with)',
        ]
      : ['All configured! Set up JT and GHL workflows with the URLs above.'],
  });
}
