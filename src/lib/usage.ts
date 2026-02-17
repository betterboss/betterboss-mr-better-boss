// =============================================================================
// Usage tracking — logs API usage per endpoint per session.
// Structured for easy upgrade to a real DB (Vercel Postgres, Planetscale, etc.)
// For now, logs to console in structured JSON so Vercel log drain can capture it.
// =============================================================================

export type UsageEvent =
  | 'webhook.jobtread'
  | 'webhook.ghl'
  | 'ai.chat'
  | 'ai.estimate'
  | 'ai.leads'
  | 'api.ghl.sync'
  | 'api.ghl.test';

interface UsageEntry {
  event: UsageEvent;
  userId?: string;
  ip?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Track a usage event. Logs structured JSON to stdout.
 * Vercel's log drain (or any log aggregator) can capture these.
 *
 * Usage:
 *   trackUsage('ai.chat', { userId: session.user.id, durationMs: 120 });
 */
export function trackUsage(
  event: UsageEvent,
  opts?: { userId?: string; ip?: string; durationMs?: number; metadata?: Record<string, unknown> }
) {
  const entry: UsageEntry = {
    event,
    userId: opts?.userId,
    ip: opts?.ip,
    durationMs: opts?.durationMs,
    metadata: opts?.metadata,
    timestamp: new Date().toISOString(),
  };

  // Structured log — easy to parse, filter, and aggregate
  console.log(JSON.stringify({ _type: 'usage', ...entry }));
}

/**
 * Wrap an async handler and automatically track its duration + result.
 */
export async function withUsageTracking<T>(
  event: UsageEvent,
  opts: { userId?: string; ip?: string },
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    trackUsage(event, { ...opts, durationMs: Date.now() - start, metadata: { status: 'ok' } });
    return result;
  } catch (err) {
    trackUsage(event, {
      ...opts,
      durationMs: Date.now() - start,
      metadata: { status: 'error', error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}
