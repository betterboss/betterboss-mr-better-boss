/**
 * GET /api/extension/version
 *
 * Returns the current extension version info.
 * The extension calls this periodically to check for updates.
 */

import { NextResponse } from 'next/server';
import { EXTENSION_VERSION, MIN_SUPPORTED_VERSION } from '@/lib/extension/sync-store';

export async function GET() {
  return NextResponse.json(
    {
      version: EXTENSION_VERSION,
      minSupported: MIN_SUPPORTED_VERSION,
      downloadUrl: '/betterboss-docfill-extension.zip',
      userscriptUrl: '/betterboss-docfill.user.js',
      changelog: [
        'v2.0.0 — Multi-template engine, snippets, custom variables, keyboard shortcuts, cloud sync',
      ],
      updatedAt: '2026-02-14',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // 5 min cache
      },
    }
  );
}
