import { NextRequest, NextResponse } from 'next/server';
import { GHLClient } from '@/lib/ghl/client';
import { getJobTreadClient } from '@/lib/jobtread/client';
import { getServerConfig } from '@/lib/server-config';
import { safeCompare } from '@/lib/user-token';

// POST /api/auto-setup — Register webhook connectors without a browser session.
// Auth: webhook secret as query param OR in request body.
// This endpoint can be called:
//   1. By the HTML setup tool pointing at your Vercel URL
//   2. By curl after deployment
//   3. Automatically on first login (see middleware)
//
// curl -X POST "https://your-app.vercel.app/api/auto-setup?secret=YOUR_WEBHOOK_SECRET"

export async function POST(request: NextRequest) {
  const config = getServerConfig();
  const expectedSecret = config.webhookSecret;

  // Auth via query param or body
  const querySecret = request.nextUrl.searchParams.get('secret');
  let bodySecret = '';
  let bodyAppUrl = '';
  try {
    const body = await request.json();
    bodySecret = body.secret || '';
    bodyAppUrl = body.appUrl || '';
  } catch { /* no body */ }

  const secret = querySecret || bodySecret;
  if (!expectedSecret || !secret || !safeCompare(secret, expectedSecret)) {
    return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Resolve credentials from env/config
  const ghlApiKey = config.ghlApiKey;
  const ghlLocationId = config.ghlLocationId;
  const jtToken = config.jtServiceToken;

  // Check what we have
  if (!ghlApiKey || !ghlLocationId) {
    results.ghlError = 'GHL_API_KEY or GHL_LOCATION_ID not configured';
  }
  if (!jtToken) {
    results.jtError = 'JOBTREAD_SERVICE_TOKEN not configured';
  }

  // Build webhook URLs
  const baseUrl = bodyAppUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    request.nextUrl.origin;

  const jtWebhookUrl = `${baseUrl}/api/webhooks/jobtread?secret=${expectedSecret}`;
  const ghlWebhookUrl = `${baseUrl}/api/webhooks/ghl?secret=${expectedSecret}`;
  results.webhookUrls = { jt: jtWebhookUrl, ghl: ghlWebhookUrl };
  results.baseUrl = baseUrl;

  // ---- Validate + Register GHL ----
  let ghlClient: GHLClient | null = null;
  if (ghlApiKey && ghlLocationId) {
    ghlClient = new GHLClient(ghlApiKey, ghlLocationId);

    // Test connection
    try {
      const test = await ghlClient.testConnection();
      results.ghlConnected = true;
      results.ghlContactCount = test.contactCount;
    } catch (err) {
      results.ghlConnected = false;
      results.ghlError = err instanceof Error ? err.message : 'GHL connection failed';
    }

    // Register webhook
    if (results.ghlConnected) {
      try {
        const existing = await ghlClient.listWebhooks();
        const already = existing.find(h => h.url === ghlWebhookUrl);
        if (already) {
          results.ghlWebhook = 'already registered';
          results.ghlWebhookId = already.id;
        } else {
          const hook = await ghlClient.registerWebhook(ghlWebhookUrl, ['ContactCreate', 'ContactUpdate']);
          if (hook) {
            results.ghlWebhook = 'registered';
            results.ghlWebhookId = hook.id;
          } else {
            results.ghlWebhook = 'manual';
            results.ghlWebhookNote = 'Paste this URL in GHL Automations: ' + ghlWebhookUrl;
          }
        }
      } catch (err) {
        results.ghlWebhook = 'error';
        results.ghlWebhookError = err instanceof Error ? err.message : 'Registration failed';
      }
    }
  }

  // ---- Validate + Register JT ----
  if (jtToken) {
    const jtClient = getJobTreadClient(jtToken);

    // Test connection
    try {
      const me = await jtClient.getCurrentUser();
      results.jtConnected = true;
      results.jtUser = `${me.firstName} ${me.lastName}`;
    } catch {
      results.jtConnected = false;
      results.jtError = 'JT API connection failed — token may be invalid';
    }

    // Register webhook
    try {
      const existing = await jtClient.listConnectors();
      const already = existing.find(c => c.url === jtWebhookUrl || c.name === 'BetterBoss GHL Sync');
      if (already) {
        results.jtWebhook = 'already registered';
        results.jtWebhookId = already.id;
      } else {
        const connector = await jtClient.registerWebhook(jtWebhookUrl, [
          'contact.created', 'contact.updated', 'CONTACT_CREATED', 'CONTACT_UPDATED',
        ]);
        if (connector) {
          results.jtWebhook = 'registered';
          results.jtWebhookId = connector.id;
        } else {
          results.jtWebhook = 'manual';
          results.jtWebhookNote = 'Paste this URL in JT Workflows: ' + jtWebhookUrl;
        }
      }
    } catch {
      results.jtWebhook = 'manual';
      results.jtWebhookNote = 'JT API does not support webhook registration. Paste URL in JT Workflows: ' + jtWebhookUrl;
    }
  }

  // Summary
  const ghlOk = results.ghlWebhook === 'registered' || results.ghlWebhook === 'already registered';
  const jtOk = results.jtWebhook === 'registered' || results.jtWebhook === 'already registered';

  if (ghlOk && jtOk) {
    results.message = 'All connectors registered! Lead sync is live.';
  } else {
    const manual: string[] = [];
    if (!ghlOk) manual.push('GHL');
    if (!jtOk) manual.push('JT');
    results.message = `APIs connected. ${manual.join(' and ')} webhook${manual.length > 1 ? 's' : ''} need${manual.length === 1 ? 's' : ''} manual setup — see URLs above.`;
  }

  results.ready = Boolean(results.ghlConnected && results.jtConnected);

  return NextResponse.json(results);
}
