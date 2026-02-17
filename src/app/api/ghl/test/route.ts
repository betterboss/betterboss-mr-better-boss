import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { buildGHLClient } from '@/lib/ghl/client';

// POST /api/ghl/test — Test GHL connection with user-provided credentials

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ghlApiKey, ghlLocationId } = await request.json();

    if (!ghlApiKey || !ghlLocationId) {
      return NextResponse.json(
        { error: 'GHL API Key and Location ID are required.' },
        { status: 400 }
      );
    }

    const client = buildGHLClient(ghlApiKey, ghlLocationId);
    if (!client) {
      return NextResponse.json({ error: 'Could not create GHL client.' }, { status: 500 });
    }

    const result = await client.testConnection();
    return NextResponse.json({
      message: `Connected! ${result.contactCount} contacts in GHL.`,
      contactCount: result.contactCount,
    });
  } catch (error) {
    console.error('GHL test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection test failed' },
      { status: 500 }
    );
  }
}
