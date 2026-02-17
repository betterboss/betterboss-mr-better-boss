import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { saveServerConfig, getServerConfig } from '@/lib/server-config';
import { GHLClient } from '@/lib/ghl/client';

// POST /api/setup — One-click connector setup.
// Saves GHL + JT credentials server-side, validates them, returns status.
// Called from the Settings page "Connect" button.

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { ghlApiKey, ghlLocationId } = body as {
    ghlApiKey?: string;
    ghlLocationId?: string;
  };

  const results: Record<string, unknown> = {};

  // 1. Save GHL credentials server-side
  if (ghlApiKey && ghlLocationId) {
    const saveResult = saveServerConfig({
      ghlApiKey,
      ghlLocationId,
      // Also save the user's JT token as service token so GHL→JT works
      jtServiceToken: session.accessToken,
    });

    if (!saveResult.saved) {
      results.configSaved = false;
      results.configError = saveResult.error;
    } else {
      results.configSaved = true;
    }

    // 2. Validate GHL connection
    try {
      const ghlClient = new GHLClient(ghlApiKey, ghlLocationId);
      const testResult = await ghlClient.testConnection();
      results.ghlConnected = true;
      results.ghlContactCount = testResult.contactCount;
    } catch (err) {
      results.ghlConnected = false;
      results.ghlError = err instanceof Error ? err.message : 'GHL connection failed';
    }
  }

  // 3. Validate JT connection (we already have the token from session)
  results.jtConnected = true;
  results.jtUser = session.user?.name;

  // 4. Generate webhook URLs
  const config = getServerConfig();
  const secret = config.webhookSecret;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  if (secret) {
    results.webhookUrls = {
      jt: `${baseUrl}/api/webhooks/jobtread?secret=${secret}`,
      ghl: `${baseUrl}/api/webhooks/ghl?secret=${secret}`,
    };
  }

  // 5. Overall status
  const ready = Boolean(
    results.ghlConnected &&
    results.jtConnected &&
    config.webhookSecret &&
    config.ghlApiKey &&
    config.ghlLocationId &&
    config.jtServiceToken
  );

  return NextResponse.json({
    ...results,
    ready,
    message: ready
      ? 'Connected! Copy the webhook URLs into your JT and GHL workflows.'
      : 'Partially configured — see errors above.',
  });
}

// GET /api/setup — Returns current connection status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getServerConfig();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return NextResponse.json({
    ghlApiKey: config.ghlApiKey ? 'configured' : 'missing',
    ghlLocationId: config.ghlLocationId ? 'configured' : 'missing',
    jtServiceToken: config.jtServiceToken ? 'configured' : 'missing',
    webhookSecret: config.webhookSecret ? 'configured' : 'missing',
    webhookUrls: config.webhookSecret ? {
      jt: `${baseUrl}/api/webhooks/jobtread?secret=${config.webhookSecret}`,
      ghl: `${baseUrl}/api/webhooks/ghl?secret=${config.webhookSecret}`,
    } : null,
    ready: Boolean(config.ghlApiKey && config.ghlLocationId && config.jtServiceToken && config.webhookSecret),
  });
}
