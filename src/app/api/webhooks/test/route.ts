import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { buildGHLClient } from '@/lib/ghl/client';
import { getJobTreadClient } from '@/lib/jobtread/client';

// POST /api/webhooks/test — Sends a test contact through the sync chain.
// Requires auth (only admins should trigger test syncs).
//
// Body: { direction: "jt-to-ghl" | "ghl-to-jt" }

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized — log in first' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const direction = (body.direction as string) || 'jt-to-ghl';

  const results: Record<string, unknown> = { direction };

  if (direction === 'jt-to-ghl') {
    // Test: create/update a test contact in GHL
    const ghlClient = buildGHLClient();
    if (!ghlClient) {
      return NextResponse.json({
        error: 'GHL not configured',
        fix: 'Add GHL_API_KEY and GHL_LOCATION_ID to your env vars (.env.local or Vercel dashboard)',
        currentEnv: {
          GHL_API_KEY: process.env.GHL_API_KEY ? 'SET' : 'MISSING',
          GHL_LOCATION_ID: process.env.GHL_LOCATION_ID ? 'SET' : 'MISSING',
        },
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
      results.status = 'error';
      results.error = err instanceof Error ? err.message : 'GHL API call failed';
      results.fix = 'Check your GHL_API_KEY and GHL_LOCATION_ID. The API key should be a Location API key, not an Agency key.';
    }
  } else if (direction === 'ghl-to-jt') {
    // Test: create a test contact in JT
    const jtToken = process.env.JOBTREAD_SERVICE_TOKEN || session.accessToken;
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
      results.status = 'error';
      results.error = err instanceof Error ? err.message : 'JT API call failed';
      results.fix = 'Check your JOBTREAD_SERVICE_TOKEN or make sure your JT API key has write access.';
    }
  } else {
    return NextResponse.json({ error: 'Invalid direction. Use "jt-to-ghl" or "ghl-to-jt"' }, { status: 400 });
  }

  return NextResponse.json(results);
}
