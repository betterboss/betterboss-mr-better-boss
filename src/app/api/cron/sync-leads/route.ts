import { NextRequest, NextResponse } from 'next/server';
import { getJobTreadClient } from '@/lib/jobtread/client';
import { buildGHLClient } from '@/lib/ghl/client';

// GET /api/cron/sync-leads — Vercel Cron job for automatic bidirectional lead sync
// Runs every 15 minutes. Uses env var credentials (not user localStorage).
// Vercel Cron calls this with GET and sends CRON_SECRET in Authorization header.

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jtToken = process.env.JOBTREAD_SERVICE_TOKEN;
  if (!jtToken) {
    return NextResponse.json({ error: 'JOBTREAD_SERVICE_TOKEN not configured' }, { status: 503 });
  }

  const ghlClient = buildGHLClient(); // uses env vars
  if (!ghlClient) {
    return NextResponse.json({ error: 'GHL_API_KEY / GHL_LOCATION_ID not configured' }, { status: 503 });
  }

  const jtClient = getJobTreadClient(jtToken);

  let pushed = 0;
  let pulled = 0;
  const errors: string[] = [];

  try {
    // 1. PUSH: JT → GHL (new JT contacts not yet in GHL)
    const jtContacts = await jtClient.getContacts(undefined, { first: 500 });

    for (const contact of jtContacts.data) {
      // Only push contacts that have email (needed for dedup in GHL)
      if (!contact.email) continue;
      try {
        await ghlClient.createOrUpdateContact({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone || undefined,
          companyName: contact.company || undefined,
          source: contact.source || 'JobTread',
          tags: ['jobtread', contact.type?.toLowerCase() || 'contact'].filter(Boolean),
          customField: {
            jobtread_id: contact.id,
            jobtread_type: contact.type || '',
          },
        });
        pushed++;
      } catch (err) {
        errors.push(`→GHL ${contact.firstName}: ${err instanceof Error ? err.message : 'Failed'}`);
      }
    }

    // 2. PULL: GHL → JT (new GHL contacts not in JT)
    const ghlResult = await ghlClient.getContacts(1, 100);
    const jtEmails = new Set(jtContacts.data.map((c) => c.email?.toLowerCase()).filter(Boolean));
    const jtNames = new Set(jtContacts.data.map((c) => `${c.firstName} ${c.lastName}`.toLowerCase()));

    for (const ghlContact of ghlResult.contacts) {
      if (ghlContact.tags?.includes('jobtread') || ghlContact.customField?.jobtread_id) continue;

      const email = ghlContact.email?.toLowerCase();
      const name = `${ghlContact.firstName || ''} ${ghlContact.lastName || ''}`.trim().toLowerCase();
      if ((email && jtEmails.has(email)) || (name && jtNames.has(name))) continue;

      try {
        await jtClient.createContact({
          firstName: ghlContact.firstName || '',
          lastName: ghlContact.lastName || '',
          email: ghlContact.email,
          phone: ghlContact.phone,
          company: ghlContact.companyName,
          source: ghlContact.source || 'GoHighLevel',
          type: 'LEAD',
          notes: `Synced from GHL (ID: ${ghlContact.id || 'unknown'})`,
        });
        pulled++;
        if (email) jtEmails.add(email);
        if (name) jtNames.add(name);
      } catch (err) {
        errors.push(`→JT ${ghlContact.firstName}: ${err instanceof Error ? err.message : 'Failed'}`);
      }
    }
  } catch (err) {
    errors.push(`Fatal: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  const timestamp = new Date().toISOString();
  console.log(`[Cron sync-leads] ${timestamp} — pushed=${pushed} pulled=${pulled} errors=${errors.length}`);

  return NextResponse.json({
    pushed,
    pulled,
    errors: errors.length > 0 ? errors : undefined,
    timestamp,
  });
}
