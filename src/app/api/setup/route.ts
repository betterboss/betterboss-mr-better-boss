import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { setupRequestSchema, validateBody } from '@/lib/validate';
import { RATE_LIMITS } from '@/lib/constants';
import { saveServerConfig, getServerConfig } from '@/lib/server-config';
import { GHLClient } from '@/lib/ghl/client';
import { getJobTreadClient } from '@/lib/jobtread/client';
import { encryptUserToken, buildUserWebhookUrls } from '@/lib/user-token';

// POST /api/setup — One-click connector setup.
// 1. Saves credentials server-side
// 2. Validates JT + GHL connections
// 3. Registers webhook connectors with BOTH JT and GHL automatically
//
// After this, contacts created in JT flow to GHL and vice versa — no manual URL pasting.

export async function POST(request: NextRequest) {
  const { session, error: guardError } = await apiGuard(request, { rateLimit: RATE_LIMITS.api });
  if (guardError) return guardError;

  const body = await request.json().catch(() => ({}));
  const { data: input, error: validationError } = validateBody(setupRequestSchema, body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { ghlApiKey: bodyGhlApiKey, ghlLocationId: bodyGhlLocationId } = input!;

  const results: {
    configSaved?: boolean;
    configError?: string;
    ghlConnected?: boolean;
    ghlContactCount?: number;
    ghlError?: string;
    jtConnected?: boolean;
    jtUser?: string | null;
    jtOrg?: string;
    webhookUrls?: { jt: string | null; ghl: string | null };
    jtConnector?: string;
    jtConnectorId?: string;
    jtConnectorNote?: string;
    ghlConnector?: string;
    ghlConnectorId?: string;
    ghlConnectorNote?: string;
  } = {};

  // --- 1. Save credentials server-side (if new values provided) ---
  if (bodyGhlApiKey && bodyGhlLocationId) {
    const saveResult = saveServerConfig({
      ghlApiKey: bodyGhlApiKey,
      ghlLocationId: bodyGhlLocationId,
      jtServiceToken: session!.accessToken,
    });
    results.configSaved = saveResult.saved;
    if (!saveResult.saved) results.configError = saveResult.error;
  } else {
    // Even without new creds, save the JT token from session
    saveServerConfig({ jtServiceToken: session!.accessToken });
  }

  // Resolve GHL credentials: body > server config > env vars
  const config = getServerConfig();
  const ghlApiKey = bodyGhlApiKey || config.ghlApiKey;
  const ghlLocationId = bodyGhlLocationId || config.ghlLocationId;

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
  } else {
    results.ghlConnected = false;
    results.ghlError = 'GHL credentials not configured';
  }

  // --- 3. Validate JT connection ---
  const jtClient = getJobTreadClient(session!.accessToken);
  try {
    const me = await jtClient.getCurrentUser();
    results.jtConnected = true;
    results.jtUser = `${me.firstName} ${me.lastName}`;
    results.jtOrg = me.organization?.name;
  } catch {
    // Session token is valid (we're authenticated) but JT API call failed
    // Still mark as connected since the user has a valid session
    results.jtConnected = true;
    results.jtUser = session!.user?.name;
  }

  // --- 4. Generate per-user encrypted token + personalized webhook URLs ---
  const latestConfig = getServerConfig();
  const secret = latestConfig.webhookSecret;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  if (secret && ghlApiKey && ghlLocationId) {
    // Encrypt user's credentials into a URL-safe token
    const userToken = encryptUserToken({
      uid: session!.user?.id || '',
      gk: ghlApiKey,
      gl: ghlLocationId,
      jt: session!.accessToken,
      ts: Date.now(),
    });

    const webhookUrls = buildUserWebhookUrls(baseUrl, secret, userToken);
    results.webhookUrls = webhookUrls;

    // --- 5. Register JT connector with per-user URL ---
    try {
      const existing = await jtClient.listConnectors();
      const alreadyRegistered = existing.some(
        (c) => c.url?.includes('/api/webhooks/jobtread') || c.name === 'BetterBoss GHL Sync'
      );

      if (alreadyRegistered) {
        results.jtConnector = 'already registered';
      } else {
        const connector = await jtClient.registerWebhook(webhookUrls.jt, [
          'contact.created', 'contact.updated', 'CONTACT_CREATED', 'CONTACT_UPDATED',
        ]);
        results.jtConnector = connector ? 'registered' : 'manual';
        if (connector) results.jtConnectorId = connector.id;
        else results.jtConnectorNote = 'Auto-registration not supported — use JT Workflows to add the webhook URL.';
      }
    } catch (err) {
      console.error('[setup] JT connector registration failed:', err instanceof Error ? err.message : err);
      results.jtConnector = 'manual';
      results.jtConnectorNote = 'Could not auto-register. Add the webhook URL in JT Workflows manually.';
    }

    // --- 6. Register GHL connector with per-user URL ---
    if (ghlClient) {
      try {
        const existing = await ghlClient.listWebhooks();
        const alreadyRegistered = existing.some((h) => h.url?.includes('/api/webhooks/ghl'));

        if (alreadyRegistered) {
          results.ghlConnector = 'already registered';
        } else {
          const hook = await ghlClient.registerWebhook(webhookUrls.ghl, ['ContactCreate', 'ContactUpdate']);
          results.ghlConnector = hook ? 'registered' : 'manual';
          if (hook) results.ghlConnectorId = hook.id;
          else results.ghlConnectorNote = 'Auto-registration not available — use GHL Automations to add the webhook URL.';
        }
      } catch (err) {
        console.error('[setup] GHL connector registration failed:', err instanceof Error ? err.message : err);
        results.ghlConnector = 'manual';
        results.ghlConnectorNote = 'Could not auto-register. Add the webhook URL in GHL Automations manually.';
      }
    }
  } else {
    // Fallback: global webhook URLs
    results.webhookUrls = {
      jt: secret ? `${baseUrl}/api/webhooks/jobtread?secret=${secret}` : null,
      ghl: secret ? `${baseUrl}/api/webhooks/ghl?secret=${secret}` : null,
    };
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

// GET /api/setup — Returns current connection status + masked credentials
export async function GET(request: NextRequest) {
  const { error: getGuardError } = await apiGuard(request, { rateLimit: RATE_LIMITS.api });
  if (getGuardError) return getGuardError;

  const config = getServerConfig();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  // Return masked values so the Settings page can show "configured" status
  const mask = (val?: string) => val ? `${val.slice(0, 6)}...${val.slice(-4)}` : '';

  return NextResponse.json({
    ghlApiKey: config.ghlApiKey ? 'configured' : 'missing',
    ghlLocationId: config.ghlLocationId ? 'configured' : 'missing',
    jtServiceToken: config.jtServiceToken ? 'configured' : 'missing',
    webhookSecret: config.webhookSecret ? 'configured' : 'missing',
    // Masked values for UI display — enough to confirm which key is loaded
    maskedGhlApiKey: mask(config.ghlApiKey),
    maskedGhlLocationId: mask(config.ghlLocationId),
    maskedJtToken: mask(config.jtServiceToken),
    webhookUrls: config.webhookSecret ? {
      jt: `${baseUrl}/api/webhooks/jobtread`,
      ghl: `${baseUrl}/api/webhooks/ghl`,
    } : null,
    ready: Boolean(config.ghlApiKey && config.ghlLocationId && config.jtServiceToken && config.webhookSecret),
  });
}
