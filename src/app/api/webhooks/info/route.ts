import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// GET /api/webhooks/info — returns webhook URLs + config status
// for authenticated users to copy/paste into JT and GHL workflows.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.WEBHOOK_SECRET;

  // Auto-detect base URL: prefer explicit setting, fall back to Vercel URL
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.NEXTAUTH_URL ||
    '';

  // Config status for each direction
  const config = {
    webhookSecret: Boolean(secret),
    ghlApiKey: Boolean(process.env.GHL_API_KEY),
    ghlLocationId: Boolean(process.env.GHL_LOCATION_ID),
    jtServiceToken: Boolean(process.env.JOBTREAD_SERVICE_TOKEN),
    baseUrl: baseUrl || null,
  };

  const missing: string[] = [];
  if (!secret) missing.push('WEBHOOK_SECRET');
  if (!config.ghlApiKey) missing.push('GHL_API_KEY');
  if (!config.ghlLocationId) missing.push('GHL_LOCATION_ID');
  if (!config.jtServiceToken) missing.push('JOBTREAD_SERVICE_TOKEN');
  if (!baseUrl) missing.push('NEXT_PUBLIC_APP_URL or VERCEL_URL');

  return NextResponse.json({
    jt: secret && baseUrl ? `${baseUrl}/api/webhooks/jobtread?secret=${secret}` : null,
    ghl: secret && baseUrl ? `${baseUrl}/api/webhooks/ghl?secret=${secret}` : null,
    config,
    missing,
    ready: missing.length === 0,
  });
}
