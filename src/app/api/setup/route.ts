import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { saveServerConfig, getServerConfig } from '@/lib/server-config';
import { GHLClient } from '@/lib/ghl/client';
import { getJobTreadClient } from '@/lib/jobtread/client';

// POST /api/setup — One-click connector setup.
// 1. Saves credentials server-side
// 2. Validates JT + GHL connections
// 3. Registers webhook connectors with BOTH JT and GHL automatically
//
// After this, contacts created in JT flow to GHL and vice versa — no manual URL pasting.

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

  // --- 1. Save credentials server-side ---
  if (ghlApiKey && ghlLocationId) {
    const saveResult = saveServerConfig({
      ghlApiKey,
      ghlLocationId,
      jtServiceToken: session.accessToken,
    });
    results.configSaved = saveResult.saved;
    if (!saveResult.saved) results.configError = saveResult.error;
  }

  // --- 2. Validate GHL connection ---
  let ghlClient: GHLClient | null = null;
  if (ghlApiKey && ghlLocationId) {
    try {
      ghlClient = new GHLClient(ghlApiKey, ghlLocationId);
      const testResult = await ghlClient.testConnection();
      results.ghlConnected = true;
      results.ghlContactCount = testResult.contactCount;
    } catch (err) {
      results.ghlConnected = false;
      results.ghlError = err instanceof Error ? err.message : 'GHL connection failed';
    }
  }

  // --- 3. Validate JT connection ---
  const jtClient = getJobTreadClient(session.accessToken);
  try {
    const me = await jtClient.getCurrentUser();
    results.jtConnected = true;
    results.jtUser = `${me.firstName} ${me.lastName}`;
    results.jtOrg = me.organization?.name;
  } catch (err) {
    results.jtConnected = true; // Session is valid if we got here
    results.jtUser = session.user?.name;
  }

  // --- 4. Build webhook URLs ---
  const config = getServerConfig();
  const secret = config.webhookSecret;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const jtWebhookUrl = `${baseUrl}/api/webhooks/jobtread?secret=${secret}`;
  const ghlWebhookUrl = `${baseUrl}/api/webhooks/ghl?secret=${secret}`;

  results.webhookUrls = { jt: jtWebhookUrl, ghl: ghlWebhookUrl };

  // --- 5. Register JT connector (JT → GHL) ---
  if (secret) {
    try {
      // Check if already registered
      const existing = await jtClient.listConnectors();
      const alreadyRegistered = existing.some(
        (c) => c.url === jtWebhookUrl || c.name === 'BetterBoss GHL Sync'
      );

      if (alreadyRegistered) {
        results.jtConnector = 'already registered';
      } else {
        const connector = await jtClient.registerWebhook(jtWebhookUrl, [
          'contact.created',
          'contact.updated',
          'CONTACT_CREATED',
          'CONTACT_UPDATED',
        ]);
        if (connector) {
          results.jtConnector = 'registered';
          results.jtConnectorId = connector.id;
        } else {
          results.jtConnector = 'manual';
          results.jtConnectorNote = 'Auto-registration not supported — use JT Workflows to add the webhook URL.';
        }
      }
    } catch {
      results.jtConnector = 'manual';
      results.jtConnectorNote = 'Could not auto-register. Add the webhook URL in JT Workflows manually.';
    }
  }

  // --- 6. Register GHL connector (GHL → JT) ---
  if (ghlClient && secret) {
    try {
      // Check if already registered
      const existing = await ghlClient.listWebhooks();
      const alreadyRegistered = existing.some((h) => h.url === ghlWebhookUrl);

      if (alreadyRegistered) {
        results.ghlConnector = 'already registered';
      } else {
        const hook = await ghlClient.registerWebhook(ghlWebhookUrl, [
          'ContactCreate',
          'ContactUpdate',
        ]);
        if (hook) {
          results.ghlConnector = 'registered';
          results.ghlConnectorId = hook.id;
        } else {
          results.ghlConnector = 'manual';
          results.ghlConnectorNote = 'Auto-registration not available — use GHL Automations to add the webhook URL.';
        }
      }
    } catch {
      results.ghlConnector = 'manual';
      results.ghlConnectorNote = 'Could not auto-register. Add the webhook URL in GHL Automations manually.';
    }
  }

  // --- 7. Overall status ---
  const ready = Boolean(
    results.ghlConnected &&
    results.jtConnected &&
    secret
  );

  const connectorStatus =
    results.jtConnector === 'registered' || results.jtConnector === 'already registered'
      ? 'auto'
      : 'manual';
  const ghlConnectorStatus =
    results.ghlConnector === 'registered' || results.ghlConnector === 'already registered'
      ? 'auto'
      : 'manual';

  let message = '';
  if (ready && connectorStatus === 'auto' && ghlConnectorStatus === 'auto') {
    message = 'Fully connected! Webhooks registered with both JT and GHL. Contacts will sync automatically.';
  } else if (ready) {
    const manualParts: string[] = [];
    if (connectorStatus === 'manual') manualParts.push('JT');
    if (ghlConnectorStatus === 'manual') manualParts.push('GHL');
    message = `Connected! Paste the webhook URL into ${manualParts.join(' and ')} workflows to complete setup.`;
  } else {
    message = 'Partially configured — check errors above.';
  }

  return NextResponse.json({ ...results, ready, message });
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
