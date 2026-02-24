import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { ghlTestRequestSchema, validateBody } from '@/lib/validate';
import { RATE_LIMITS } from '@/lib/constants';
import { buildGHLClient } from '@/lib/ghl/client';

// POST /api/ghl/test — Test GHL connection with user-provided credentials

export async function POST(request: NextRequest) {
  try {
    const { error: guardError } = await apiGuard(request, { rateLimit: RATE_LIMITS.api });
    if (guardError) return guardError;

    const body = await request.json();
    const { data: input, error: validationError } = validateBody(ghlTestRequestSchema, body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { ghlApiKey, ghlLocationId } = input!;

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
      { error: 'Connection test failed' },
      { status: 500 }
    );
  }
}
