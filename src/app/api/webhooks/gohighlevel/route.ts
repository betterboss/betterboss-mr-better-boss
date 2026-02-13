import { NextRequest, NextResponse } from 'next/server';
import { syncGHLContactToJobTread } from '@/lib/integrations/lead-sync';
import { createMasterClient } from '@/lib/jobtread/api-master';
import type { GHLContact } from '@/lib/gohighlevel/client';

// =============================================================================
// GoHighLevel Webhook Receiver
//
// Receives webhook events from GoHighLevel when contacts are created/updated.
// Syncs the contact data back to JobTread for bi-directional sync.
//
// Setup: Configure this URL in your GHL Marketplace App webhook settings
// or as a Custom Webhook action in a GHL workflow:
//   POST https://your-domain.com/api/webhooks/gohighlevel
//
// Environment:
//   GHL_WEBHOOK_SECRET — shared secret for validating webhook authenticity
//   JOBTREAD_SYNC_API_KEY — JT API key used for creating/updating contacts in JT
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret =
        request.headers.get('x-webhook-secret') ||
        request.headers.get('authorization')?.replace('Bearer ', '');

      if (providedSecret !== webhookSecret) {
        console.error('GHL webhook: invalid secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const eventType: string = body.type || body.event || '';

    // Only handle contact events
    const contactEvents = ['ContactCreate', 'ContactUpdate', 'contact.created', 'contact.updated'];
    if (!contactEvents.includes(eventType)) {
      return NextResponse.json({
        status: 'ignored',
        message: `Event "${eventType}" is not handled.`,
      });
    }

    // Extract the contact data
    const contactData = body.data || body.contact || body;
    const ghlContact: GHLContact = {
      id: contactData.id || contactData.contactId || '',
      locationId: contactData.locationId || '',
      firstName: contactData.firstName || contactData.first_name,
      lastName: contactData.lastName || contactData.last_name,
      email: contactData.email,
      phone: contactData.phone,
      companyName: contactData.companyName || contactData.company_name,
      address1: contactData.address1,
      city: contactData.city,
      state: contactData.state,
      postalCode: contactData.postalCode || contactData.postal_code,
      country: contactData.country,
      source: contactData.source || contactData.contact_source,
      tags: contactData.tags || [],
    };

    // Skip contacts that originated from JobTread (prevent loops)
    if (
      ghlContact.tags?.includes('jobtread') ||
      ghlContact.tags?.includes('betterboss') ||
      ghlContact.source === 'JobTread (BetterBoss)'
    ) {
      return NextResponse.json({
        status: 'skipped',
        message: 'Contact originated from JobTread — skipping to prevent sync loop.',
      });
    }

    // Create JT client and sync
    const jtApiKey = process.env.JOBTREAD_SYNC_API_KEY;
    if (!jtApiKey) {
      console.error('GHL webhook: JOBTREAD_SYNC_API_KEY not configured');
      return NextResponse.json(
        { error: 'JobTread sync not configured' },
        { status: 503 }
      );
    }

    const jtClient = createMasterClient(jtApiKey);
    const result = await syncGHLContactToJobTread(ghlContact, jtClient);

    console.log(
      `[LeadSync GHL→JT] ${eventType}: ${result.action} — ${result.message}`
    );

    return NextResponse.json({
      status: 'processed',
      result,
    });
  } catch (error) {
    console.error('GHL webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const hasSecret = !!process.env.GHL_WEBHOOK_SECRET;
  const hasSyncKey = !!process.env.JOBTREAD_SYNC_API_KEY;

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/gohighlevel',
    configured: {
      webhookSecret: hasSecret,
      syncApiKey: hasSyncKey,
    },
    ready: hasSyncKey,
  });
}
