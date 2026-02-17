import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getJobTreadClient } from '@/lib/jobtread/client';
import { getGHLClient } from '@/lib/ghl/client';

// POST /api/ghl/sync — Sync contacts from JobTread to GoHighLevel
// Can sync all contacts or a specific contact by ID

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ghlClient = getGHLClient();
    if (!ghlClient) {
      return NextResponse.json(
        { error: 'GoHighLevel not configured. Set GHL_API_KEY and GHL_LOCATION_ID environment variables.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { contactId } = body as { contactId?: string };

    const jtClient = getJobTreadClient(session.accessToken);

    if (contactId) {
      // Sync a single contact
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
        contact: ghlContact,
        message: `Synced ${contact.firstName} ${contact.lastName} to GoHighLevel`,
      });
    }

    // Sync all contacts
    const allContacts = await jtClient.getContacts(undefined, { first: 500 });
    let synced = 0;
    const errors: string[] = [];

    for (const contact of allContacts.data) {
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
      } catch (err) {
        errors.push(`Failed to sync ${contact.firstName} ${contact.lastName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      synced,
      total: allContacts.data.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${synced}/${allContacts.data.length} contacts to GoHighLevel`,
    });
  } catch (error) {
    console.error('GHL sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'GHL sync failed' },
      { status: 500 }
    );
  }
}
