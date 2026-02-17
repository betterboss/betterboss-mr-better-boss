// =============================================================================
// Encrypted User Tokens for Multi-Tenant Webhook URLs
//
// Each user's credentials (GHL API key, JT token) are AES-256-GCM encrypted
// into a URL-safe token. This token is embedded in their webhook URLs so
// webhook handlers can decrypt it and use the correct credentials per user.
//
// No database needed — credentials travel with the webhook URL itself.
// =============================================================================

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface UserTokenPayload {
  /** User's JobTread user ID */
  uid: string;
  /** User's GHL API key */
  gk: string;
  /** User's GHL location ID */
  gl: string;
  /** User's JT API token */
  jt: string;
  /** Timestamp when token was created */
  ts: number;
}

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for user token encryption');
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt user credentials into a URL-safe token.
 */
export function encryptUserToken(payload: UserTokenPayload): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Pack: iv (12 bytes) + auth tag (16 bytes) + ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString('base64url');
}

/**
 * Decrypt a user token back into credentials.
 * Returns null if the token is invalid or tampered with.
 */
export function decryptUserToken(token: string): UserTokenPayload | null {
  try {
    const key = getKey();
    const packed = Buffer.from(token, 'base64url');
    if (packed.length < IV_LENGTH + TAG_LENGTH + 1) return null;

    const iv = packed.subarray(0, IV_LENGTH);
    const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = packed.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(decrypted.toString('utf8')) as UserTokenPayload;

    if (!payload.uid || !payload.gk || !payload.gl || !payload.jt) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Build personalized webhook URLs for a user.
 */
export function buildUserWebhookUrls(
  baseUrl: string,
  webhookSecret: string,
  userToken: string
): { jt: string; ghl: string } {
  return {
    jt: `${baseUrl}/api/webhooks/jobtread?ut=${userToken}&secret=${webhookSecret}`,
    ghl: `${baseUrl}/api/webhooks/ghl?ut=${userToken}&secret=${webhookSecret}`,
  };
}

/**
 * Timing-safe string comparison to prevent timing attacks on webhook secrets.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a constant-time compare to avoid leaking length info
    const buf = Buffer.from(a);
    crypto.timingSafeEqual(buf, buf);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
