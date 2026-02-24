import { describe, it, expect } from 'vitest';
import {
  chatRequestSchema,
  estimateRequestSchema,
  leadScoreRequestSchema,
  blueprintRequestSchema,
  ghlSyncRequestSchema,
  ghlTestRequestSchema,
  webhookTestRequestSchema,
  jobtreadProxyRequestSchema,
  setupRequestSchema,
  settingsSchema,
  validateBody,
} from '@/lib/validate';

describe('validateBody', () => {
  it('returns parsed data for valid input', () => {
    const result = validateBody(chatRequestSchema, { message: 'Hello' });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ message: 'Hello', history: [] });
  });

  it('returns error for invalid input', () => {
    const result = validateBody(chatRequestSchema, { message: '' });
    expect(result.data).toBeNull();
    expect(result.error).toContain('message');
  });

  it('returns error for missing required fields', () => {
    const result = validateBody(chatRequestSchema, {});
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe('chatRequestSchema', () => {
  it('accepts valid chat request', () => {
    const result = chatRequestSchema.safeParse({
      message: 'How is my business?',
      history: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = chatRequestSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects message over 10000 chars', () => {
    const result = chatRequestSchema.safeParse({ message: 'x'.repeat(10001) });
    expect(result.success).toBe(false);
  });

  it('defaults history to empty array', () => {
    const result = chatRequestSchema.safeParse({ message: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history).toEqual([]);
    }
  });

  it('rejects invalid history role', () => {
    const result = chatRequestSchema.safeParse({
      message: 'test',
      history: [{ role: 'system', content: 'invalid' }],
    });
    expect(result.success).toBe(false);
  });

  it('limits history to 50 messages', () => {
    const history = Array.from({ length: 51 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }));
    const result = chatRequestSchema.safeParse({ message: 'test', history });
    expect(result.success).toBe(false);
  });
});

describe('estimateRequestSchema', () => {
  it('accepts valid estimate request', () => {
    const result = estimateRequestSchema.safeParse({
      projectType: 'roofing',
      squareFootage: 2500,
      description: 'New roof installation',
    });
    expect(result.success).toBe(true);
  });

  it('requires projectType', () => {
    const result = estimateRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects negative square footage', () => {
    const result = estimateRequestSchema.safeParse({
      projectType: 'roofing',
      squareFootage: -100,
    });
    expect(result.success).toBe(false);
  });

  it('defaults description to empty string', () => {
    const result = estimateRequestSchema.safeParse({ projectType: 'roofing' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
    }
  });
});

describe('leadScoreRequestSchema', () => {
  it('accepts valid lead score request', () => {
    const result = leadScoreRequestSchema.safeParse({
      contactId: 'abc123',
      contactData: { firstName: 'John', email: 'john@test.com' },
    });
    expect(result.success).toBe(true);
  });

  it('requires contactId', () => {
    const result = leadScoreRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('defaults contactData to empty object', () => {
    const result = leadScoreRequestSchema.safeParse({ contactId: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactData).toEqual({});
    }
  });
});

describe('blueprintRequestSchema', () => {
  it('accepts valid blueprint request', () => {
    const result = blueprintRequestSchema.safeParse({
      imageData: 'base64imagedata',
      projectType: 'residential',
    });
    expect(result.success).toBe(true);
  });

  it('requires imageData', () => {
    const result = blueprintRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid project type', () => {
    const result = blueprintRequestSchema.safeParse({
      imageData: 'data',
      projectType: 'invalid_type',
    });
    expect(result.success).toBe(false);
  });
});

describe('ghlSyncRequestSchema', () => {
  it('accepts valid sync request', () => {
    const result = ghlSyncRequestSchema.safeParse({
      ghlApiKey: 'key123',
      ghlLocationId: 'loc456',
      mode: 'full',
    });
    expect(result.success).toBe(true);
  });

  it('defaults mode to full', () => {
    const result = ghlSyncRequestSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('full');
    }
  });
});

describe('ghlTestRequestSchema', () => {
  it('requires both fields', () => {
    const result = ghlTestRequestSchema.safeParse({ ghlApiKey: 'key' });
    expect(result.success).toBe(false);
  });

  it('accepts valid test request', () => {
    const result = ghlTestRequestSchema.safeParse({
      ghlApiKey: 'key123',
      ghlLocationId: 'loc456',
    });
    expect(result.success).toBe(true);
  });
});

describe('webhookTestRequestSchema', () => {
  it('defaults direction', () => {
    const result = webhookTestRequestSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.direction).toBe('jt-to-ghl');
    }
  });

  it('accepts ghl-to-jt direction', () => {
    const result = webhookTestRequestSchema.safeParse({ direction: 'ghl-to-jt' });
    expect(result.success).toBe(true);
  });
});

describe('jobtreadProxyRequestSchema', () => {
  it('requires query', () => {
    const result = jobtreadProxyRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects query over 10000 chars', () => {
    const result = jobtreadProxyRequestSchema.safeParse({ query: 'x'.repeat(10001) });
    expect(result.success).toBe(false);
  });

  it('accepts valid proxy request', () => {
    const result = jobtreadProxyRequestSchema.safeParse({
      query: '{ me { id } }',
      variables: { first: 10 },
    });
    expect(result.success).toBe(true);
  });
});

describe('setupRequestSchema', () => {
  it('accepts empty object', () => {
    const result = setupRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts optional credentials', () => {
    const result = setupRequestSchema.safeParse({
      ghlApiKey: 'key',
      ghlLocationId: 'loc',
    });
    expect(result.success).toBe(true);
  });
});

describe('settingsSchema', () => {
  it('accepts valid settings', () => {
    const result = settingsSchema.safeParse({
      defaultMarkup: 35,
      taxRate: 8.25,
      ghlAutoSync: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects markup over 500', () => {
    const result = settingsSchema.safeParse({ defaultMarkup: 501 });
    expect(result.success).toBe(false);
  });

  it('rejects taxRate over 100', () => {
    const result = settingsSchema.safeParse({ taxRate: 101 });
    expect(result.success).toBe(false);
  });
});
