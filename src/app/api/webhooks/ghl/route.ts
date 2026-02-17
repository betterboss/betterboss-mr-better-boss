import { NextRequest, NextResponse } from 'next/server';
import { getJobTreadClient } from '@/lib/jobtread/client';
import { checkRateLimit, getClientIp, LIMITS } from '@/lib/rate-limit';
import { buildDedupKey, checkDedup, markProcessed } from '@/lib/webhook-dedup';
import { trackUsage } from '@/lib/usage';
import { getServerConfig } from '@/lib/server-config';
import { decryptUserToken } from '@/lib/user-token';

// POST /api/webhooks/ghl — receives webhook from GoHighLevel workflow
// when a contact is created, and pushes it to JobTread.
//
// GHL workflow setup:
//   Trigger: "Contact Created"
//   Action:  "Webhook" → POST to this URL with ?secret=WEBHOOK_SECRET
//
// GHL typically sends:
//   { type: "ContactCreate", id, firstName, lastName, email, phone, ... }
//   OR { contact: { ... } }

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  // Rate limit
  const rl = checkRateLimit(`webhook-ghl:${ip}`, LIMITS.webhook);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Read config from env vars + local config file
  const config = getServerConfig();

  // Verify webhook secret
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = config.webhookSecret;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'WEBHOOK_SECRET not configured' }, { status: 503 });
  }
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // Try per-user token first, then fall back to global server config
  const ut = request.nextUrl.searchParams.get('ut');
  const userPayload = ut ? decryptUserToken(ut) : null;

  const jtToken = userPayload?.jt || config.jtServiceToken;
  if (!jtToken) {
    return NextResponse.json({ error: 'JT credentials not configured. Connect in Settings.' }, { status: 503 });
  }

  try {
    const body = await request.json();

    // Normalize — GHL may nest contact or send flat
    const contact = body.contact || body.data || body;

    const firstName = contact.firstName || contact.first_name || '';
    const lastName = contact.lastName || contact.last_name || '';
    const email = contact.email || '';
    const phone = contact.phone || contact.phoneNumber || '';
    const company = contact.companyName || contact.company || '';
    const source = contact.source || 'GoHighLevel';
    const ghlId = contact.id || '';

    // Skip contacts that originally came from JT (prevent loops)
    const tags: string[] = contact.tags || [];
    const jtIdField = contact.customField?.jobtread_id;
    if (tags.includes('jobtread') || jtIdField) {
      trackUsage('webhook.ghl', { ip, metadata: { skipped: true, reason: 'loop-prevention' } });
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: 'Contact originated from JobTread — skipping to prevent loop',
      });
    }

    if (!firstName && !lastName && !email) {
      return NextResponse.json({ error: 'No usable contact data in payload' }, { status: 400 });
    }

    // Idempotency check
    const dedupKey = buildDedupKey('ghl', { id: ghlId, email, firstName, lastName });
    const cached = checkDedup(dedupKey);
    if (cached) {
      trackUsage('webhook.ghl', { ip, metadata: { dedup: true } });
      return NextResponse.json(cached);
    }

    const jtClient = getJobTreadClient(jtToken);
    const jtContact = await jtClient.createContact({
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      source,
      type: 'LEAD',
      notes: `Synced from GHL (ID: ${ghlId})`,
    });

    const result = {
      ok: true,
      jtContactId: jtContact.id,
      message: `Synced ${firstName} ${lastName} to JobTread`,
    };

    markProcessed(dedupKey, result);
    trackUsage('webhook.ghl', { ip, metadata: { contactId: ghlId } });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Webhook GHL→JT] Error:', err);
    trackUsage('webhook.ghl', { ip, metadata: { error: true } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
