import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TAX_RATE,
  DEFAULT_MARKUP_PERCENT,
  RATE_LIMITS,
  LEAD_SCORE_BASE,
  LEAD_SCORE_HOT_THRESHOLD,
  LEAD_SCORE_WARM_THRESHOLD,
  LEAD_SCORE_SOURCE_WEIGHTS,
  PROJECT_TYPES,
  JOB_STATUSES,
  INVOICE_STATUSES,
  TASK_STATUSES,
  LINE_ITEM_UNITS,
  CACHE_TTL,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/constants';

describe('constants', () => {
  describe('financial constants', () => {
    it('has valid tax rate', () => {
      expect(DEFAULT_TAX_RATE).toBeGreaterThan(0);
      expect(DEFAULT_TAX_RATE).toBeLessThan(100);
    });

    it('has valid markup percent', () => {
      expect(DEFAULT_MARKUP_PERCENT).toBeGreaterThan(0);
    });
  });

  describe('rate limits', () => {
    it('has all required limit types', () => {
      expect(RATE_LIMITS).toHaveProperty('webhook');
      expect(RATE_LIMITS).toHaveProperty('ai');
      expect(RATE_LIMITS).toHaveProperty('api');
    });

    it('AI limit is stricter than general API', () => {
      expect(RATE_LIMITS.ai.max).toBeLessThan(RATE_LIMITS.api.max);
    });

    it('webhook limit is more generous', () => {
      expect(RATE_LIMITS.webhook.max).toBeGreaterThanOrEqual(RATE_LIMITS.api.max);
    });
  });

  describe('lead scoring', () => {
    it('has valid thresholds', () => {
      expect(LEAD_SCORE_HOT_THRESHOLD).toBeGreaterThan(LEAD_SCORE_WARM_THRESHOLD);
      expect(LEAD_SCORE_WARM_THRESHOLD).toBeGreaterThan(0);
      expect(LEAD_SCORE_BASE).toBeLessThanOrEqual(100);
    });

    it('has source weights with a default', () => {
      expect(LEAD_SCORE_SOURCE_WEIGHTS).toHaveProperty('default');
      expect(LEAD_SCORE_SOURCE_WEIGHTS.referral).toBeGreaterThan(LEAD_SCORE_SOURCE_WEIGHTS.default);
    });
  });

  describe('enum constants', () => {
    it('PROJECT_TYPES includes expected values', () => {
      expect(PROJECT_TYPES).toContain('residential');
      expect(PROJECT_TYPES).toContain('commercial');
      expect(PROJECT_TYPES).toContain('roofing');
    });

    it('JOB_STATUSES includes workflow stages', () => {
      expect(JOB_STATUSES).toContain('LEAD');
      expect(JOB_STATUSES).toContain('IN_PROGRESS');
      expect(JOB_STATUSES).toContain('COMPLETED');
    });

    it('INVOICE_STATUSES covers lifecycle', () => {
      expect(INVOICE_STATUSES).toContain('DRAFT');
      expect(INVOICE_STATUSES).toContain('PAID');
      expect(INVOICE_STATUSES).toContain('OVERDUE');
    });

    it('TASK_STATUSES has expected values', () => {
      expect(TASK_STATUSES).toContain('PENDING');
      expect(TASK_STATUSES).toContain('COMPLETED');
    });

    it('LINE_ITEM_UNITS includes construction units', () => {
      expect(LINE_ITEM_UNITS).toContain('SF');
      expect(LINE_ITEM_UNITS).toContain('SQ');
      expect(LINE_ITEM_UNITS).toContain('EA');
      expect(LINE_ITEM_UNITS).toContain('LF');
    });
  });

  describe('cache TTLs', () => {
    it('all TTLs are positive', () => {
      Object.values(CACHE_TTL).forEach((ttl) => {
        expect(ttl).toBeGreaterThan(0);
      });
    });

    it('dashboard TTL is longer than entity TTLs', () => {
      expect(CACHE_TTL.dashboard).toBeGreaterThan(CACHE_TTL.jobs);
    });
  });

  describe('session', () => {
    it('session max age is 30 days', () => {
      expect(SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    });
  });
});
