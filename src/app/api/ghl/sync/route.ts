import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getJobTreadClient } from '@/lib/jobtread/client';
import { buildGHLClient } from '@/lib/ghl/client';

// POST /api/ghl/sync — Sync contacts between JobTread and GoHighLevel
// Accepts user-provided GHL credentials from Settings (localStorage)
// Supports: single contact sync, bulk sync, and auto-sync (new contacts only)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { contactId, ghlApiKey, ghlLocationId, mode, syncedIds } = body as {
      contactId?: string;
      ghlApiKey?: string;
      ghlLocationId?: string;
      mode?: 'full' | 'auto';
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

    // Single contact sync
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
          jobtread_notes: contact.notes || '',
        },
      });

      return NextResponse.json({
        synced: 1,
        syncedIds: [contact.id],
        contact: ghlContact,
        message: `Synced ${contact.firstName} ${contact.lastName} to GHL`,
      });
    }

    // Bulk or auto sync
    const allContacts = await jtClient.getContacts(undefined, { first: 500 });
    const alreadySynced = new Set(syncedIds || []);

    // In auto mode, only sync contacts not already synced
    const contactsToSync = mode === 'auto'
      ? allContacts.data.filter((c) => !alreadySynced.has(c.id))
      : allContacts.data;

    if (contactsToSync.length === 0) {
      return NextResponse.json({
        synced: 0,
        syncedIds: [],
        total: allContacts.data.length,
        message: 'All contacts already synced.',
      });
    }

    let synced = 0;
    const newSyncedIds: string[] = [];
    const errors: string[] = [];

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
            jobtread_notes: contact.notes || '',
          },
        });
        synced++;
        newSyncedIds.push(contact.id);
      } catch (err) {
        errors.push(
          `${contact.firstName} ${contact.lastName}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      synced,
      syncedIds: newSyncedIds,
      total: allContacts.data.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${synced}/${contactsToSync.length} contacts to GHL`,
    });
  } catch (error) {
    console.error('GHL sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'GHL sync failed' },
      { status: 500 }
    );
  }
}
