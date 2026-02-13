import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createGHLClient } from '@/lib/gohighlevel/client';

// =============================================================================
// GoHighLevel Integration Status & Configuration API
//
// GET  — Check integration status and connection health
// POST — Test GHL connection with provided credentials
// =============================================================================

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasToken = !!process.env.GHL_API_TOKEN;
    const hasLocation = !!process.env.GHL_LOCATION_ID;
    const hasWorkflowUrl = !!process.env.GHL_WORKFLOW_WEBHOOK_URL;
    const hasSyncKey = !!process.env.JOBTREAD_SYNC_API_KEY;
    const hasJTWebhookSecret = !!process.env.JOBTREAD_WEBHOOK_SECRET;
    const hasGHLWebhookSecret = !!process.env.GHL_WEBHOOK_SECRET;

    const isConfigured = hasToken && hasLocation;

    // Test GHL connection if configured
    let connectionStatus = 'not_configured';
    if (isConfigured) {
      const ghl = createGHLClient();
      if (ghl) {
        try {
          // Search for a contact to verify credentials
          await ghl.searchContacts('test', 1);
          connectionStatus = 'connected';
        } catch {
          connectionStatus = 'error';
        }
      }
    }

    return NextResponse.json({
      integration: 'gohighlevel',
      status: connectionStatus,
      configured: {
        ghlToken: hasToken,
        ghlLocationId: hasLocation,
        ghlWorkflowWebhook: hasWorkflowUrl,
        jobtreadSyncKey: hasSyncKey,
        jobtreadWebhookSecret: hasJTWebhookSecret,
        ghlWebhookSecret: hasGHLWebhookSecret,
      },
      webhooks: {
        jobtreadReceiver: '/api/webhooks/jobtread',
        ghlReceiver: '/api/webhooks/gohighlevel',
      },
      syncEndpoint: '/api/integrations/ghl/sync',
    });
  } catch (error) {
    console.error('GHL integration status error:', error);
    return NextResponse.json(
      { error: 'Failed to check integration status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'test') {
      const ghl = createGHLClient();
      if (!ghl) {
        return NextResponse.json({
          success: false,
          message: 'GHL_API_TOKEN and GHL_LOCATION_ID must be set in environment variables.',
        });
      }

      try {
        const result = await ghl.searchContacts('', 1);
        return NextResponse.json({
          success: true,
          message: `Connected to GoHighLevel. Found ${result.total} contacts in location.`,
          contactCount: result.total,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
          success: false,
          message: `Connection test failed: ${msg}`,
        });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('GHL integration error:', error);
    return NextResponse.json(
      { error: 'Integration action failed' },
      { status: 500 }
    );
  }
}
