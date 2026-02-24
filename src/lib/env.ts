// =============================================================================
// Environment Variable Validation
// Validates all env vars at startup using Zod
// =============================================================================

import { z } from 'zod';

const serverEnvSchema = z.object({
  // Required
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),

  // Optional with defaults
  NEXTAUTH_URL: z.string().url().optional(),
  JOBTREAD_API_URL: z.string().url().default('https://api.jobtread.com/graphql'),

  // Optional AI keys
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Optional GHL
  GHL_API_KEY: z.string().optional(),
  GHL_LOCATION_ID: z.string().optional(),

  // Optional OAuth (not currently used)
  JOBTREAD_CLIENT_ID: z.string().optional(),
  JOBTREAD_CLIENT_SECRET: z.string().optional(),
  JOBTREAD_SERVICE_TOKEN: z.string().optional(),

  // Optional webhook
  WEBHOOK_SECRET: z.string().optional(),

  // Public vars
  NEXT_PUBLIC_APP_NAME: z.string().default('BetterBoss Sidebar'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let _env: ServerEnv | null = null;

/**
 * Returns validated server environment variables.
 * Caches the result after first call.
 */
export function getServerEnv(): ServerEnv {
  if (_env) return _env;

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`[env] Invalid environment variables:\n${formatted}`);
    // In development, warn but don't crash
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid environment variables:\n${formatted}`);
    }
    // Return a partial parse for dev — fill missing required with empty strings
    _env = serverEnvSchema.parse({
      ...process.env,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-change-me',
    });
    return _env;
  }

  _env = result.data;
  return _env;
}
