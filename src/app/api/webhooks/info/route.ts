import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getServerConfig } from '@/lib/server-config';
import { encryptUserToken, buildUserWebhookUrls } from '@/lib/user-token';

// GET /api/webhooks/info — returns webhook URLs + config status
// Reads from env vars AND the local config file (saved via /api/setup).

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cfg = getServerConfig();

  // Auto-detect base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.NEXTAUTH_URL ||
    '';

  const config = {
    webhookSecret: Boolean(cfg.webhookSecret),
    ghlApiKey: Boolean(cfg.ghlApiKey),
    ghlLocationId: Boolean(cfg.ghlLocationId),
    jtServiceToken: Boolean(cfg.jtServiceToken),
    baseUrl: baseUrl || null,
  };

  const missing: string[] = [];
  if (!cfg.webhookSecret) missing.push('WEBHOOK_SECRET');
  if (!cfg.ghlApiKey) missing.push('GHL_API_KEY — click "Connect & Save" above');
  if (!cfg.ghlLocationId) missing.push('GHL_LOCATION_ID — click "Connect & Save" above');
  if (!cfg.jtServiceToken) missing.push('JOBTREAD_SERVICE_TOKEN — saved automatically on Connect');
  if (!baseUrl) missing.push('NEXT_PUBLIC_APP_URL');

  const secret = cfg.webhookSecret;

  // Generate per-user webhook URLs if GHL is configured
  if (secret && baseUrl && cfg.ghlApiKey && cfg.ghlLocationId) {
    const userToken = encryptUserToken({
      uid: session.user?.id || '',
      gk: cfg.ghlApiKey,
      gl: cfg.ghlLocationId,
      jt: session.accessToken!,
      ts: Date.now(),
    });
    const urls = buildUserWebhookUrls(baseUrl, secret, userToken);
    return NextResponse.json({
      jt: urls.jt,
      ghl: urls.ghl,
      config,
      missing,
      ready: missing.length === 0,
      perUser: true,
    });
  }

  return NextResponse.json({
    jt: secret && baseUrl ? `${baseUrl}/api/webhooks/jobtread` : null,
    ghl: secret && baseUrl ? `${baseUrl}/api/webhooks/ghl` : null,
    config,
    missing,
    ready: missing.length === 0,
    perUser: false,
  });
}
