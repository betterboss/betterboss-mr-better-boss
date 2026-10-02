/**
 * /api/extension/sync
 *
 * Cloud sync connector for Better Boss DocFill extension.
 *
 * GET  ?token=xxx  — Pull synced data
 * POST { token, data } — Push data to cloud
 * DELETE ?token=xxx — Remove synced data
 *
 * The sync token is a UUID generated in the extension.
 * Users share the token across devices to sync their
 * profile, templates, snippets, and custom variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSyncData,
  setSyncData,
  deleteSyncData,
  generateSyncToken,
} from '@/lib/extension/sync-store';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** GET — Pull synced data by token */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token || token.length < 8) {
    return NextResponse.json(
      { error: 'Missing or invalid sync token' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const data = await getSyncData(token);
  if (!data) {
    return NextResponse.json(
      { error: 'No data found for this token', token },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, data },
    { headers: CORS_HEADERS }
  );
}

/** POST — Push data to cloud */
export async function POST(req: NextRequest) {
  let body: { token?: string; data?: Record<string, unknown>; generateToken?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Generate a new token if requested
  if (body.generateToken) {
    const newToken = generateSyncToken();
    return NextResponse.json(
      { success: true, token: newToken },
      { headers: CORS_HEADERS }
    );
  }

  const { token, data } = body;
  if (!token || token.length < 8) {
    return NextResponse.json(
      { error: 'Missing or invalid sync token' },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  if (!data || typeof data !== 'object') {
    return NextResponse.json(
      { error: 'Missing or invalid data object' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Size limit: 500KB per sync payload
  const raw = JSON.stringify(data);
  if (raw.length > 512_000) {
    return NextResponse.json(
      { error: 'Payload too large (max 500KB)' },
      { status: 413, headers: CORS_HEADERS }
    );
  }

  await setSyncData(token, data);
  return NextResponse.json(
    { success: true, token, syncedAt: new Date().toISOString() },
    { headers: CORS_HEADERS }
  );
}

/** DELETE — Remove synced data */
export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token || token.length < 8) {
    return NextResponse.json(
      { error: 'Missing or invalid sync token' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  await deleteSyncData(token);
  return NextResponse.json(
    { success: true, deleted: true },
    { headers: CORS_HEADERS }
  );
}
