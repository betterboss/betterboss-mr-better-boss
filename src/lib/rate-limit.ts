// =============================================================================
// In-memory rate limiter for API & webhook endpoints
// Works in Vercel Edge (instances are reused for burst protection).
// Upgrade to Upstash Redis for cross-instance limits at scale.
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean stale entries every 60s to prevent memory leak
let lastClean = Date.now();
function cleanIfNeeded() {
  const now = Date.now();
  if (now - lastClean < 60_000) return;
  lastClean = now;
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) store.delete(key);
  });
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  max: number;
  /** Window size in seconds */
  windowSec: number;
}

/** Pre-configured limits for different endpoint types */
export const LIMITS = {
  /** Webhooks: generous but bounded (JT/GHL may burst) */
  webhook: { max: 120, windowSec: 60 } as RateLimitConfig,
  /** AI endpoints: tighter to control cost */
  ai: { max: 20, windowSec: 60 } as RateLimitConfig,
  /** General API: moderate */
  api: { max: 60, windowSec: 60 } as RateLimitConfig,
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (typically IP + endpoint).
 * Returns whether the request is allowed and how many remain.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanIfNeeded();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + config.windowSec * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.max - 1, resetAt };
  }

  entry.count += 1;
  if (entry.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Helper: extract client IP from request headers (works on Vercel).
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
