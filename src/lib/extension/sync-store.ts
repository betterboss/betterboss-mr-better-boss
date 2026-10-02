/**
 * Better Boss — DocFill Sync Store
 *
 * Simple key-value store for extension cloud sync.
 * Uses filesystem for development/Docker.
 *
 * For production on Vercel, swap this for:
 *   - Vercel KV (Redis)
 *   - Upstash Redis
 *   - Any key-value store
 *
 * Data is keyed by a sync token (UUID) that the user generates in the extension.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORE_DIR = process.env.EXTENSION_SYNC_DIR || path.join(process.cwd(), 'data', 'extension-sync');

async function ensureDir() {
  try {
    await fs.mkdir(STORE_DIR, { recursive: true });
  } catch {
    // Already exists
  }
}

function sanitizeToken(token: string): string {
  // Only allow alphanumeric and hyphens to prevent path traversal
  return token.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 64);
}

function filePath(token: string): string {
  return path.join(STORE_DIR, `${sanitizeToken(token)}.json`);
}

export function generateSyncToken(): string {
  return crypto.randomUUID();
}

export async function getSyncData(token: string): Promise<Record<string, unknown> | null> {
  await ensureDir();
  const fp = filePath(token);
  try {
    const raw = await fs.readFile(fp, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setSyncData(token: string, data: Record<string, unknown>): Promise<void> {
  await ensureDir();
  const fp = filePath(token);
  // Add metadata
  const withMeta = {
    ...data,
    _syncedAt: new Date().toISOString(),
    _token: sanitizeToken(token),
  };
  await fs.writeFile(fp, JSON.stringify(withMeta, null, 2), 'utf-8');
}

export async function deleteSyncData(token: string): Promise<void> {
  const fp = filePath(token);
  try {
    await fs.unlink(fp);
  } catch {
    // File didn't exist
  }
}

/** Current extension version — update this when releasing new versions */
export const EXTENSION_VERSION = '2.0.0';

/** Minimum supported version (older versions should force-update) */
export const MIN_SUPPORTED_VERSION = '2.0.0';
