// =============================================================================
// Server-side config store
// Reads from env vars (Vercel) and falls back to a local JSON file (dev).
// The Settings page can POST credentials here so webhooks work without
// the user ever touching .env files or the Vercel dashboard.
// =============================================================================

import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), '.betterboss-config.json');

export interface ServerConfig {
  ghlApiKey?: string;
  ghlLocationId?: string;
  jtServiceToken?: string;
  webhookSecret?: string;
}

/**
 * Read server config. Env vars take precedence (production).
 * Falls back to .betterboss-config.json (local dev).
 */
export function getServerConfig(): ServerConfig {
  let fileConfig: ServerConfig = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }

  // Env vars always override file config
  return {
    ghlApiKey: process.env.GHL_API_KEY || fileConfig.ghlApiKey,
    ghlLocationId: process.env.GHL_LOCATION_ID || fileConfig.ghlLocationId,
    jtServiceToken: process.env.JOBTREAD_SERVICE_TOKEN || fileConfig.jtServiceToken,
    webhookSecret: process.env.WEBHOOK_SECRET || fileConfig.webhookSecret,
  };
}

/**
 * Save credentials to local config file.
 * Only works in dev (Node.js runtime with filesystem access).
 * On Vercel, use environment variables instead.
 */
export function saveServerConfig(patch: Partial<ServerConfig>): { saved: boolean; error?: string } {
  try {
    let existing: ServerConfig = {};
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      }
    } catch { /* ignore */ }

    const merged = { ...existing };
    // Only overwrite non-empty values
    if (patch.ghlApiKey) merged.ghlApiKey = patch.ghlApiKey;
    if (patch.ghlLocationId) merged.ghlLocationId = patch.ghlLocationId;
    if (patch.jtServiceToken) merged.jtServiceToken = patch.jtServiceToken;
    if (patch.webhookSecret) merged.webhookSecret = patch.webhookSecret;

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
    return { saved: true };
  } catch (err) {
    return { saved: false, error: err instanceof Error ? err.message : 'Failed to write config' };
  }
}
