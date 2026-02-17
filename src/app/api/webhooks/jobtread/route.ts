import { NextRequest, NextResponse } from 'next/server';
import { buildGHLClient } from '@/lib/ghl/client';

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
  // Verify webhook secret
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'WEBHOOK_SECRET not configured' }, { status: 503 });
  }
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const ghlClient = buildGHLClient();
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

    console.log(`[Webhook JT→GHL] Synced ${firstName} ${lastName} (${jtId})`);

    return NextResponse.json({
      ok: true,
      ghlContactId: ghlContact.id,
      message: `Synced ${firstName} ${lastName} to GHL`,
    });
  } catch (err) {
    console.error('[Webhook JT→GHL] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
