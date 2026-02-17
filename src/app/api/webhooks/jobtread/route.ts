import { NextRequest, NextResponse } from 'next/server';
import { buildGHLClient } from '@/lib/ghl/client';
import { checkRateLimit, getClientIp, LIMITS } from '@/lib/rate-limit';
import { buildDedupKey, checkDedup, markProcessed } from '@/lib/webhook-dedup';
import { trackUsage } from '@/lib/usage';
import { getServerConfig } from '@/lib/server-config';

// POST /api/webhooks/jobtread — receives webhook from JobTread workflow
// when a contact is created/updated, and pushes it to GoHighLevel.
//
// JobTread workflow setup:
//   Trigger: "When a Contact is Created"
//   Action:  "Send Webhook" → POST to this URL with ?secret=WEBHOOK_SECRET
//
// Expected payload (flexible — handles multiple shapes):
//   { firstName, lastName, email, phone, company, source, type, id }
//   OR { data: { ... } }  OR { record: { ... } }

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  // Rate limit
  const rl = checkRateLimit(`webhook-jt:${ip}`, LIMITS.webhook);
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

  const ghlClient = buildGHLClient(config.ghlApiKey, config.ghlLocationId);
  if (!ghlClient) {
    return NextResponse.json({ error: 'GHL_API_KEY / GHL_LOCATION_ID not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();

    // Normalize — JT may nest the contact under data, record, or send flat
    const contact = body.data || body.record || body.contact || body;

    const firstName = contact.firstName || contact.first_name || '';
    const lastName = contact.lastName || contact.last_name || '';
    const email = contact.email || '';
    const phone = contact.phone || contact.phoneNumber || '';
    const company = contact.company || contact.companyName || '';
    const source = contact.source || 'JobTread';
    const type = contact.type || 'contact';
    const jtId = contact.id || '';

    if (!firstName && !lastName && !email) {
      return NextResponse.json({ error: 'No usable contact data in payload' }, { status: 400 });
    }

    // Idempotency check — skip if we already processed this contact recently
    const dedupKey = buildDedupKey('jobtread', { id: jtId, email, firstName, lastName });
    const cached = checkDedup(dedupKey);
    if (cached) {
      trackUsage('webhook.jobtread', { ip, metadata: { dedup: true } });
      return NextResponse.json(cached);
    }

    const ghlContact = await ghlClient.createOrUpdateContact({
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      companyName: company || undefined,
      source,
      tags: ['jobtread', type.toLowerCase()].filter(Boolean),
      customField: {
        jobtread_id: jtId,
        jobtread_type: type,
      },
    });

    const result = {
      ok: true,
      ghlContactId: ghlContact.id,
      message: `Synced ${firstName} ${lastName} to GHL`,
    };

    markProcessed(dedupKey, result);
    trackUsage('webhook.jobtread', { ip, metadata: { contactId: jtId } });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Webhook JT→GHL] Error:', err);
    trackUsage('webhook.jobtread', { ip, metadata: { error: true } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
