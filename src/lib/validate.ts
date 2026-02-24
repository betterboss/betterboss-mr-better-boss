// =============================================================================
// Input Validation Schemas (Zod)
// Shared validation for all API request bodies
// =============================================================================

import { z } from 'zod';
import { PROJECT_TYPES } from '@/lib/constants';

// AI Chat
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(50)
    .optional()
    .default([]),
});

// AI Estimate
export const estimateRequestSchema = z.object({
  projectType: z.string().min(1, 'Project type is required').max(100),
  squareFootage: z.number().min(0).max(1_000_000).optional(),
  description: z.string().max(5000).optional().default(''),
});

// AI Lead Scoring
export const leadScoreRequestSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  contactData: z.record(z.string(), z.unknown()).optional().default({}),
});

// Blueprint Takeoff
export const blueprintRequestSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'),
  projectType: z.enum(PROJECT_TYPES as unknown as [string, ...string[]]).optional(),
  defaultMarkup: z.number().min(0).max(500).optional(),
  notes: z.string().max(5000).optional(),
});

// GHL Sync
export const ghlSyncRequestSchema = z.object({
  contactId: z.string().optional(),
  ghlApiKey: z.string().optional(),
  ghlLocationId: z.string().optional(),
  mode: z.enum(['full', 'auto']).optional().default('full'),
  direction: z.enum(['push', 'pull', 'both']).optional(),
  syncedIds: z.array(z.string()).optional(),
});

// GHL Test Connection
export const ghlTestRequestSchema = z.object({
  ghlApiKey: z.string().min(1, 'GHL API Key is required'),
  ghlLocationId: z.string().min(1, 'GHL Location ID is required'),
});

// Webhook Test
export const webhookTestRequestSchema = z.object({
  direction: z.enum(['jt-to-ghl', 'ghl-to-jt']).optional().default('jt-to-ghl'),
});

// JobTread Proxy
export const jobtreadProxyRequestSchema = z.object({
  query: z.string().min(1, 'GraphQL query is required').max(10000),
  variables: z.record(z.string(), z.unknown()).optional(),
});

// Setup
export const setupRequestSchema = z.object({
  ghlApiKey: z.string().optional(),
  ghlLocationId: z.string().optional(),
});

// Settings
export const settingsSchema = z.object({
  notifications: z.record(z.string(), z.boolean()).optional(),
  defaultMarkup: z.number().min(0).max(500).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  confidenceThreshold: z.string().optional(),
  ghlApiKey: z.string().optional(),
  ghlLocationId: z.string().optional(),
  ghlAutoSync: z.boolean().optional(),
});

/**
 * Validate request body against a Zod schema.
 * Returns the parsed data or a formatted error string.
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { data: result.data, error: null };
  }
  const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return { data: null, error: messages.join('; ') };
}
