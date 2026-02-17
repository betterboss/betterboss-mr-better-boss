import { NextRequest, NextResponse } from 'next/server';
import { getJobTreadClient } from '@/lib/jobtread/client';

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
  // Verify webhook secret
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'WEBHOOK_SECRET not configured' }, { status: 503 });
  }
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const jtToken = process.env.JOBTREAD_SERVICE_TOKEN;
  if (!jtToken) {
    return NextResponse.json({ error: 'JOBTREAD_SERVICE_TOKEN not configured' }, { status: 503 });
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
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: 'Contact originated from JobTread — skipping to prevent loop',
      });
    }

    if (!firstName && !lastName && !email) {
      return NextResponse.json({ error: 'No usable contact data in payload' }, { status: 400 });
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

    console.log(`[Webhook GHL→JT] Synced ${firstName} ${lastName} (GHL: ${ghlId})`);

    return NextResponse.json({
      ok: true,
      jtContactId: jtContact.id,
      message: `Synced ${firstName} ${lastName} to JobTread`,
    });
  } catch (err) {
    console.error('[Webhook GHL→JT] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
