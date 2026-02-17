// =============================================================================
// Webhook idempotency layer
// Prevents duplicate contact creation when JT/GHL retries a webhook.
// Uses in-memory store with 5-minute TTL (covers typical retry windows).
// =============================================================================

interface DedupEntry {
  expiresAt: number;
  result: unknown;
}

const seen = new Map<string, DedupEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean expired entries periodically
let lastClean = Date.now();
function cleanIfNeeded() {
  const now = Date.now();
  if (now - lastClean < 60_000) return;
  lastClean = now;
  Array.from(seen.entries()).forEach(([key, entry]) => {
    if (now > entry.expiresAt) seen.delete(key);
  });
}

/**
 * Generate a dedup key from webhook payload.
 * Uses contact identifiers to catch retries even if the webhook ID differs.
 */
export function buildDedupKey(
  source: 'jobtread' | 'ghl',
  payload: { id?: string; email?: string; firstName?: string; lastName?: string }
): string {
  // Prefer source-specific ID, fall back to name+email composite
  const id = payload.id || `${payload.firstName || ''}-${payload.lastName || ''}-${payload.email || ''}`;
  return `${source}:${id}`;
}

/**
 * Check if this webhook was already processed.
 * Returns the cached result if it was, or null if it's new.
 */
export function checkDedup(key: string): unknown | null {
  cleanIfNeeded();
  const entry = seen.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.result;
  }
  return null;
}

/**
 * Mark a webhook as processed and cache the result.
 */
export function markProcessed(key: string, result: unknown): void {
  seen.set(key, { expiresAt: Date.now() + TTL_MS, result });
}
