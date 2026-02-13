import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createLeadSyncEngine } from '@/lib/integrations/lead-sync';

// =============================================================================
// Lead Sync API
//
// POST — Trigger a bulk sync of all JobTread leads → GoHighLevel
// GET  — Check sync readiness
//
// This endpoint uses the authenticated user's JT API key to fetch contacts,
// then pushes them to GHL via the configured GHL credentials.
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      contactTypes = ['CUSTOMER', 'LEAD'],
      tags = ['jobtread', 'betterboss'],
      includeJobData = true,
      triggerWorkflow = true,
    } = body as {
      contactTypes?: string[];
      tags?: string[];
      includeJobData?: boolean;
      triggerWorkflow?: boolean;
    };

    const syncEngine = createLeadSyncEngine(session.accessToken, {
      syncContactTypes: contactTypes,
      defaultTags: tags,
      includeJobData,
      triggerWorkflow,
    });

    if (!syncEngine) {
      return NextResponse.json(
        {
          error: 'GoHighLevel not configured',
          message: 'Set GHL_API_TOKEN and GHL_LOCATION_ID in your environment variables.',
        },
        { status: 503 }
      );
    }

    // Run the bulk sync
    const result = await syncEngine.bulkSync();

    return NextResponse.json({
      status: 'completed',
      summary: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
        duration: `${((new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()) / 1000).toFixed(1)}s`,
      },
      results: result.results,
    });
  } catch (error) {
    console.error('Bulk sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed. Check server logs for details.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasGHL = !!process.env.GHL_API_TOKEN && !!process.env.GHL_LOCATION_ID;

    return NextResponse.json({
      ready: hasGHL,
      message: hasGHL
        ? 'Sync is ready. POST to this endpoint to trigger a bulk sync.'
        : 'Set GHL_API_TOKEN and GHL_LOCATION_ID to enable sync.',
      options: {
        contactTypes: {
          description: 'Which JT contact types to sync',
          default: ['CUSTOMER', 'LEAD'],
          available: ['CUSTOMER', 'LEAD', 'VENDOR', 'SUBCONTRACTOR'],
        },
        tags: {
          description: 'Tags to apply to synced contacts in GHL',
          default: ['jobtread', 'betterboss'],
        },
        includeJobData: {
          description: 'Enrich GHL contacts with related job data',
          default: true,
        },
        triggerWorkflow: {
          description: 'Trigger GHL workflow after each sync',
          default: true,
        },
      },
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
}
