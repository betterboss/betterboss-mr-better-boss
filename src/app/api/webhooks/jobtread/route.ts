import { NextRequest, NextResponse } from 'next/server';
import { createLeadSyncEngine, type JTWebhookEvent } from '@/lib/integrations/lead-sync';

// =============================================================================
// JobTread Webhook Receiver
//
// Receives webhook events from JobTread when contacts/jobs are created/updated.
// Validates the webhook secret, then forwards to the lead sync engine which
// pushes the data to GoHighLevel.
//
// Setup: Register this URL in JobTread's webhook settings:
//   POST https://your-domain.com/api/webhooks/jobtread
//
// Environment:
//   JOBTREAD_WEBHOOK_SECRET — shared secret for validating webhook authenticity
//   JOBTREAD_SYNC_API_KEY — JT API key used by the sync engine to fetch enrichment data
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const webhookSecret = process.env.JOBTREAD_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret =
        request.headers.get('x-webhook-secret') ||
        request.headers.get('authorization')?.replace('Bearer ', '');

      if (providedSecret !== webhookSecret) {
        console.error('JobTread webhook: invalid secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse the event payload
    const body = await request.json();
    const event: JTWebhookEvent = {
      event: body.event || body.type || '',
      timestamp: body.timestamp || new Date().toISOString(),
      data: body.data || body,
    };

    if (!event.event) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    // Only process lead-related events
    const leadEvents = [
      'contact.created',
      'contact.updated',
      'customer.created',
      'customer.updated',
      'job.created',
      'job.updated',
    ];

    if (!leadEvents.includes(event.event)) {
      return NextResponse.json({
        status: 'ignored',
        message: `Event "${event.event}" is not a lead sync event.`,
      });
    }

    // Create the sync engine
    const jtApiKey = process.env.JOBTREAD_SYNC_API_KEY;
    if (!jtApiKey) {
      console.error('JobTread webhook: JOBTREAD_SYNC_API_KEY not configured');
      return NextResponse.json(
        { error: 'Sync engine not configured' },
        { status: 503 }
      );
    }

    const syncEngine = createLeadSyncEngine(jtApiKey);
    if (!syncEngine) {
      console.error('JobTread webhook: GHL credentials not configured');
      return NextResponse.json(
        { error: 'GoHighLevel integration not configured' },
        { status: 503 }
      );
    }

    // Process the event
    const result = await syncEngine.processWebhookEvent(event);

    console.log(
      `[LeadSync] ${event.event}: ${result.action} — ${result.message}`
    );

    return NextResponse.json({
      status: 'processed',
      result,
    });
  } catch (error) {
    console.error('JobTread webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Health check — verify the webhook endpoint is reachable
export async function GET() {
  const hasSecret = !!process.env.JOBTREAD_WEBHOOK_SECRET;
  const hasSyncKey = !!process.env.JOBTREAD_SYNC_API_KEY;
  const hasGHL = !!process.env.GHL_API_TOKEN && !!process.env.GHL_LOCATION_ID;

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/jobtread',
    configured: {
      webhookSecret: hasSecret,
      syncApiKey: hasSyncKey,
      goHighLevel: hasGHL,
    },
    ready: hasSyncKey && hasGHL,
  });
}
