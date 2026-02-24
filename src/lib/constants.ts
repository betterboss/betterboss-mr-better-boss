// =============================================================================
// Application Constants
// Centralizes all magic numbers and configuration values
// =============================================================================

// Financial
export const DEFAULT_TAX_RATE = 8.25;
export const DEFAULT_MARKUP_PERCENT = 25;
export const MAX_MARKUP_PERCENT = 500;
export const INDUSTRY_MARGIN_LOW = 20;
export const INDUSTRY_MARGIN_HIGH = 35;

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

// AI
export const AI_ESTIMATE_CONFIDENCE = 0.92;
export const AI_MARKET_COMPARISON_LOW = 0.82;
export const AI_MARKET_COMPARISON_HIGH = 1.15;
export const AI_CHAT_MAX_HISTORY = 4;
export const BLUEPRINT_MAX_IMAGE_SIZE = 14_000_000; // 14MB base64 ≈ 10MB raw
export const BLUEPRINT_DEFAULT_MARKUP = 45;

// Lead Scoring
export const LEAD_SCORE_BASE = 50;
export const LEAD_SCORE_HOT_THRESHOLD = 80;
export const LEAD_SCORE_WARM_THRESHOLD = 60;
export const LEAD_SCORE_SOURCE_WEIGHTS: Record<string, number> = {
  referral: 25,
  'repeat customer': 30,
  'google ads': 15,
  'website form': 10,
  'google organic': 8,
  homeadvisor: 5,
  default: 5,
};

// Rate Limiting
export const RATE_LIMITS = {
  webhook: { max: 120, windowSec: 60 },
  ai: { max: 20, windowSec: 60 },
  api: { max: 60, windowSec: 60 },
} as const;

// Session
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Webhook Dedup
export const WEBHOOK_DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const WEBHOOK_DEDUP_CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

// Cache TTLs (milliseconds)
export const CACHE_TTL = {
  jobs: 2 * 60 * 1000, // 2 minutes
  contacts: 2 * 60 * 1000,
  invoices: 2 * 60 * 1000,
  estimates: 2 * 60 * 1000,
  tasks: 2 * 60 * 1000,
  dashboard: 5 * 60 * 1000, // 5 minutes
} as const;

// Supported units for line items
export const LINE_ITEM_UNITS = ['SF', 'LF', 'EA', 'SQ', 'CY', 'HR', 'LS', 'FT', 'GAL', 'TON'] as const;

// Project types
export const PROJECT_TYPES = ['residential', 'commercial', 'industrial', 'roofing', 'remodel', 'addition', 'custom'] as const;
export type ProjectType = typeof PROJECT_TYPES[number];

// Job statuses
export const JOB_STATUSES = ['LEAD', 'ESTIMATE', 'PROPOSAL', 'CONTRACT', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'] as const;
export type JobStatus = typeof JOB_STATUSES[number];

// Invoice statuses
export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID'] as const;

// Task statuses
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

// Task priorities
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
