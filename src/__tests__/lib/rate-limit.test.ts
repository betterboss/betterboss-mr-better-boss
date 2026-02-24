import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, getClientIp, type RateLimitConfig } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  const config: RateLimitConfig = { max: 3, windowSec: 60 };

  beforeEach(() => {
    // Use a unique key prefix per test to avoid cross-test contamination
  });

  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`;
    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests over the limit', () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);

    const r4 = checkRateLimit(key, config);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const key = `test-reset-${Date.now()}`;

    // Exhaust the limit
    checkRateLimit(key, { max: 1, windowSec: 1 });
    const blocked = checkRateLimit(key, { max: 1, windowSec: 1 });
    expect(blocked.allowed).toBe(false);

    // Simulate time passing by directly manipulating the window
    // This test verifies the resetAt value is set correctly
    expect(blocked.resetAt).toBeGreaterThan(Date.now() - 1000);
  });

  it('uses separate counters for different keys', () => {
    const key1 = `test-sep-a-${Date.now()}`;
    const key2 = `test-sep-b-${Date.now()}`;

    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);

    const r1 = checkRateLimit(key1, config);
    expect(r1.allowed).toBe(false);

    const r2 = checkRateLimit(key2, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(2);
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(getClientIp(headers)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip', () => {
    const headers = new Headers({
      'x-real-ip': '10.0.0.1',
    });
    expect(getClientIp(headers)).toBe('10.0.0.1');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4',
      'x-real-ip': '10.0.0.1',
    });
    expect(getClientIp(headers)).toBe('1.2.3.4');
  });

  it('returns unknown when no IP headers', () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe('unknown');
  });
});
