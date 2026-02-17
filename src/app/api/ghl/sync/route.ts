import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getJobTreadClient } from '@/lib/jobtread/client';
import { buildGHLClient } from '@/lib/ghl/client';

// POST /api/ghl/sync — Bidirectional pull-based sync between JobTread and GoHighLevel
//
// Directions:
//   "push"  = JT → GHL only (default for single-contact sync)
//   "pull"  = GHL → JT only
//   "both"  = bidirectional (default for auto/full sync)
//
// No webhooks needed — this is called:
//   1. On leads page load (auto-sync when enabled)
//   2. By the Sync GHL button (manual)
//   3. By Vercel Cron every 15 min (background)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      contactId,
      ghlApiKey,
      ghlLocationId,
      mode = 'full',
      direction = contactId ? 'push' : 'both',
      syncedIds,
    } = body as {
      contactId?: string;
      ghlApiKey?: string;
      ghlLocationId?: string;
      mode?: 'full' | 'auto';
      direction?: 'push' | 'pull' | 'both';
      syncedIds?: string[];
    };

    const ghlClient = buildGHLClient(ghlApiKey, ghlLocationId);
    if (!ghlClient) {
      return NextResponse.json(
        { error: 'GoHighLevel not configured. Add your GHL API Key and Location ID in Settings.' },
        { status: 503 }
      );
    }

    const jtClient = getJobTreadClient(session.accessToken);

    // --- Single contact push (JT → GHL) ---
    if (contactId) {
      const contacts = await jtClient.getContacts({ search: contactId });
      const contact = contacts.data.find((c) => c.id === contactId);
      if (!contact) {
        return NextResponse.json({ error: 'Contact not found in JobTread' }, { status: 404 });
      }

      const ghlContact = await ghlClient.createOrUpdateContact({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        companyName: contact.company || undefined,
        source: contact.source || 'JobTread',
        tags: ['jobtread', contact.type?.toLowerCase() || 'contact'].filter(Boolean),
        customField: {
          jobtread_id: contact.id,
          jobtread_type: contact.type || '',
        },
      });

      return NextResponse.json({
        synced: 1,
        syncedIds: [contact.id],
        pulled: 0,
        contact: ghlContact,
        message: `Synced ${contact.firstName} ${contact.lastName} to GHL`,
      });
    }

    // --- Bulk / auto sync ---
    const alreadySynced = new Set(syncedIds || []);
    let pushed = 0;
    let pulled = 0;
    const newSyncedIds: string[] = [];
    const errors: string[] = [];

    // 1. PUSH: JT → GHL
    if (direction === 'push' || direction === 'both') {
      const jtContacts = await jtClient.getContacts(undefined, { first: 500 });
      const contactsToSync = mode === 'auto'
        ? jtContacts.data.filter((c) => !alreadySynced.has(c.id))
        : jtContacts.data;

      for (const contact of contactsToSync) {
        try {
          await ghlClient.createOrUpdateContact({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || undefined,
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
          newSyncedIds.push(contact.id);
        } catch (err) {
          errors.push(`→GHL ${contact.firstName} ${contact.lastName}: ${err instanceof Error ? err.message : 'Failed'}`);
        }
      }
    }

    // 2. PULL: GHL → JT
    if (direction === 'pull' || direction === 'both') {
      try {
        // Fetch all GHL contacts (paginate)
        const ghlResult = await ghlClient.getContacts(1, 100);
        const ghlContacts = ghlResult.contacts;

        // Fetch JT contacts to check for duplicates
        const jtContacts = await jtClient.getContacts(undefined, { first: 500 });
        const jtEmails = new Set(jtContacts.data.map((c) => c.email?.toLowerCase()).filter(Boolean));
        const jtNames = new Set(jtContacts.data.map((c) => `${c.firstName} ${c.lastName}`.toLowerCase()));

        for (const ghlContact of ghlContacts) {
          // Skip contacts that came from JT (tagged or have jobtread_id)
          if (ghlContact.tags?.includes('jobtread') || ghlContact.customField?.jobtread_id) {
            continue;
          }

          // Skip if already in JT (match by email or name)
          const email = ghlContact.email?.toLowerCase();
          const name = `${ghlContact.firstName || ''} ${ghlContact.lastName || ''}`.trim().toLowerCase();
          if ((email && jtEmails.has(email)) || (name && jtNames.has(name))) {
            continue;
          }

          // Create in JobTread
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
            // Add to known sets so we don't duplicate in same run
            if (email) jtEmails.add(email);
            if (name) jtNames.add(name);
          } catch (err) {
            errors.push(`→JT ${ghlContact.firstName} ${ghlContact.lastName}: ${err instanceof Error ? err.message : 'Failed'}`);
          }
        }
      } catch (err) {
        errors.push(`GHL fetch: ${err instanceof Error ? err.message : 'Failed to read GHL contacts'}`);
      }
    }

    const parts: string[] = [];
    if (pushed > 0) parts.push(`${pushed} to GHL`);
    if (pulled > 0) parts.push(`${pulled} to JobTread`);

    return NextResponse.json({
      synced: pushed,
      pulled,
      syncedIds: newSyncedIds,
      errors: errors.length > 0 ? errors : undefined,
      message: parts.length > 0
        ? `Synced ${parts.join(', ')}`
        : 'Everything in sync — no new contacts.',
    });
  } catch (error) {
    console.error('GHL sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'GHL sync failed' },
      { status: 500 }
    );
  }
}
