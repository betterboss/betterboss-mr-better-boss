import { NextRequest, NextResponse } from 'next/server';

// POST /api/ghl/webhook — Receive webhook events from GoHighLevel
// When a new contact is created in GHL, this endpoint receives it
// and can be used to create the contact in JobTread
//
// GHL Webhook Setup:
// 1. Go to GHL Settings → Webhooks
// 2. Add webhook URL: https://your-domain.com/api/ghl/webhook
// 3. Select events: Contact Create, Contact Update
// 4. Save

// Webhook events are NOT authenticated via NextAuth (they come from GHL servers)
// Instead, verify via the webhook secret header
const WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET;

interface GHLWebhookPayload {
  type: string;
  locationId?: string;
  contact?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    source?: string;
    tags?: string[];
    customField?: Record<string, string>;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-ghl-signature') || request.headers.get('authorization');
      if (signature !== WEBHOOK_SECRET && signature !== `Bearer ${WEBHOOK_SECRET}`) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload: GHLWebhookPayload = await request.json();

    if (!payload.type || !payload.contact) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Skip contacts that originated from JobTread (avoid sync loops)
    if (payload.contact.customField?.jobtread_id) {
      return NextResponse.json({ message: 'Skipped — contact originated from JobTread', skipped: true });
    }

    // For now, log the incoming contact. To complete the GHL→JT sync,
    // you need a server-side JobTread access token (e.g., a service account token in env vars).
    // The current auth model uses per-user tokens in JWT, so we log and store for later processing.
    console.log(`[GHL Webhook] ${payload.type}: ${payload.contact.firstName} ${payload.contact.lastName} (${payload.contact.email || 'no email'})`);

    // If a service-level JobTread token is available, create the contact in JobTread
    const jtServiceToken = process.env.JOBTREAD_SERVICE_TOKEN;
    if (jtServiceToken && (payload.type === 'ContactCreate' || payload.type === 'contact.create')) {
      const { getJobTreadClient } = await import('@/lib/jobtread/client');
      const jtClient = getJobTreadClient(jtServiceToken);

      // Check if contact already exists by searching name
      const searchName = `${payload.contact.firstName || ''} ${payload.contact.lastName || ''}`.trim();
      if (searchName) {
        const existing = await jtClient.getContacts({ search: searchName });
        const match = existing.data.find(
          (c) => c.email === payload.contact?.email || (`${c.firstName} ${c.lastName}` === searchName)
        );
        if (match) {
          return NextResponse.json({ message: 'Contact already exists in JobTread', existing: match.id });
        }
      }

      const created = await jtClient.createContact({
        firstName: payload.contact.firstName || '',
        lastName: payload.contact.lastName || '',
        email: payload.contact.email,
        phone: payload.contact.phone,
        company: payload.contact.companyName,
        source: payload.contact.source || 'GoHighLevel',
        type: 'LEAD',
        notes: `Synced from GHL (ID: ${payload.contact.id})`,
      });

      return NextResponse.json({
        message: `Created contact in JobTread: ${created.firstName} ${created.lastName}`,
        jobtreadId: created.id,
        ghlId: payload.contact.id,
      });
    }

    return NextResponse.json({
      message: 'Webhook received. Configure JOBTREAD_SERVICE_TOKEN for auto-creation in JobTread.',
      contact: {
        name: `${payload.contact.firstName || ''} ${payload.contact.lastName || ''}`.trim(),
        email: payload.contact.email,
      },
    });
  } catch (error) {
    console.error('GHL webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
