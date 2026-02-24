// =============================================================================
// API Route Guard
// Shared authentication + rate limiting + CSRF protection for all API routes
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { checkRateLimit, getClientIp, type RateLimitConfig } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';

interface GuardOptions {
  /** Rate limit config. Defaults to RATE_LIMITS.api */
  rateLimit?: RateLimitConfig;
  /** If true, require authenticated session */
  requireAuth?: boolean;
  /** If true, skip CSRF origin check (for webhook endpoints) */
  skipCsrf?: boolean;
}

interface GuardResult {
  session: { accessToken: string; user: { id: string; email: string; name: string } } | null;
  error: NextResponse | null;
  ip: string;
}

/** Security headers applied to all API error responses */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
} as const;

/**
 * Verify the request origin matches our app domain (CSRF protection).
 * Only applied to state-changing requests (POST, PUT, DELETE, PATCH).
 */
function checkCsrfOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // If no origin header, check referer
  const source = origin || (referer ? new URL(referer).origin : null);
  if (!source) {
    // Allow requests without origin/referer in development
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  }

  // Compare origin against host
  if (!host) return false;
  const expectedOrigins = [
    `https://${host}`,
    `http://${host}`,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean);

  return expectedOrigins.some((allowed) => source === allowed);
}

/**
 * Unified guard for API routes.
 * Checks CSRF origin, rate limiting, and (optionally) authentication.
 * Returns the session if authenticated, or an error response.
 */
export async function apiGuard(
  request: NextRequest,
  options: GuardOptions = {}
): Promise<GuardResult> {
  const { rateLimit = RATE_LIMITS.api, requireAuth = true, skipCsrf = false } = options;
  const ip = getClientIp(request.headers);

  // CSRF origin check
  if (!skipCsrf && !checkCsrfOrigin(request)) {
    return {
      session: null,
      ip,
      error: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: SECURITY_HEADERS }
      ),
    };
  }

  // Rate limit check
  const rl = checkRateLimit(`api:${ip}`, rateLimit);
  if (!rl.allowed) {
    return {
      session: null,
      ip,
      error: NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rateLimit.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
          },
        }
      ),
    };
  }

  // Auth check
  if (requireAuth) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        session: null,
        ip,
        error: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: SECURITY_HEADERS }
        ),
      };
    }
    return {
      session: session as GuardResult['session'],
      ip,
      error: null,
    };
  }

  return { session: null, ip, error: null };
}
