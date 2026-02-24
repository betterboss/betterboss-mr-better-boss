import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { webhookTestRequestSchema, validateBody } from '@/lib/validate';
import { RATE_LIMITS } from '@/lib/constants';
import { buildGHLClient } from '@/lib/ghl/client';
import { getJobTreadClient } from '@/lib/jobtread/client';

// POST /api/webhooks/test — Sends a test contact through the sync chain.
// Requires auth (only admins should trigger test syncs).
//
// Body: { direction: "jt-to-ghl" | "ghl-to-jt" }

export async function POST(request: NextRequest) {
  try {
    const { session, error: guardError } = await apiGuard(request, { rateLimit: RATE_LIMITS.api });
    if (guardError) return guardError;

    const body = await request.json().catch(() => ({}));
    const { data: input, error: validationError } = validateBody(webhookTestRequestSchema, body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const direction = input!.direction;
    const results: {
      direction: string;
      status?: string;
      message?: string;
      error?: string;
      fix?: string;
      ghlContact?: unknown;
      jtContact?: unknown;
    } = { direction };

    if (direction === 'jt-to-ghl') {
      const ghlClient = buildGHLClient();
      if (!ghlClient) {
        return NextResponse.json({
          error: 'GHL not configured',
          fix: 'Add GHL_API_KEY and GHL_LOCATION_ID to your env vars (.env.local or Vercel dashboard)',
        }, { status: 503 });
      }

      try {
        const testContact = await ghlClient.createOrUpdateContact({
          firstName: 'BetterBoss',
          lastName: 'Test Contact',
          email: 'test@betterboss.dev',
          phone: '555-000-0000',
          source: 'BetterBoss Webhook Test',
          tags: ['jobtread', 'test'],
          customField: {
            jobtread_id: 'test-' + Date.now(),
            jobtread_type: 'test',
          },
        });
        results.ghlContact = testContact;
        results.status = 'success';
        results.message = 'Test contact created/updated in GHL! Check your GHL contacts for "BetterBoss Test Contact".';
      } catch (err) {
        console.error('[webhook-test] GHL API call failed:', err instanceof Error ? err.message : err);
        results.status = 'error';
        results.error = 'GHL API call failed';
        results.fix = 'Check your GHL_API_KEY and GHL_LOCATION_ID. The API key should be a Location API key, not an Agency key.';
      }
    } else if (direction === 'ghl-to-jt') {
      const jtToken = process.env.JOBTREAD_SERVICE_TOKEN || session!.accessToken;
      try {
        const jtClient = getJobTreadClient(jtToken);
        const testContact = await jtClient.createContact({
          firstName: 'BetterBoss',
          lastName: 'GHL Test',
          email: 'ghl-test@betterboss.dev',
          phone: '555-000-0001',
          source: 'GoHighLevel (test)',
          type: 'LEAD',
          notes: 'Test contact from BetterBoss webhook test',
        });
        results.jtContact = testContact;
        results.status = 'success';
        results.message = 'Test contact created in JobTread! Check your JT contacts.';
      } catch (err) {
        console.error('[webhook-test] JT API call failed:', err instanceof Error ? err.message : err);
        results.status = 'error';
        results.error = 'JT API call failed';
        results.fix = 'Check your JOBTREAD_SERVICE_TOKEN or make sure your JT API key has write access.';
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      { error: 'Webhook test failed' },
      { status: 500 }
    );
  }
}
