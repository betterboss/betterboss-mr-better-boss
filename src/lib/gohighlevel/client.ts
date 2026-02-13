// =============================================================================
// GoHighLevel (GHL) API Client
// Handles all communication with the GHL V2 REST API.
// Uses Private Integration Token (Bearer) or OAuth2 access token.
//
// GHL API Base: https://services.leadconnectorhq.com
// Required headers: Authorization, Content-Type, Version
// =============================================================================

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

// =============================================================================
// Types
// =============================================================================

export interface GHLConfig {
  accessToken: string;
  locationId: string;
}

export interface GHLContact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  source?: string;
  tags?: string[];
  customFields?: GHLCustomField[];
  dateAdded?: string;
  dateUpdated?: string;
  assignedTo?: string;
  dnd?: boolean;
}

export interface GHLCustomField {
  id?: string;
  key?: string;
  field_value: string;
}

export interface GHLCreateContactInput {
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  source?: string;
  tags?: string[];
  customFields?: GHLCustomField[];
  assignedTo?: string;
  dnd?: boolean;
}

export interface GHLUpdateContactInput {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  source?: string;
  tags?: string[];
  customFields?: GHLCustomField[];
  assignedTo?: string;
  dnd?: boolean;
}

export interface GHLUpsertContactInput extends GHLCreateContactInput {}

export interface GHLContactResponse {
  contact: GHLContact;
}

export interface GHLSearchContactsResponse {
  contacts: GHLContact[];
  total: number;
}

export interface GHLTagsResponse {
  tags: string[];
}

export interface GHLAPIError {
  status: number;
  message: string;
  code?: string;
}

// =============================================================================
// Client
// =============================================================================

export class GoHighLevelClient {
  private token: string;
  private locationId: string;

  constructor(config: GHLConfig) {
    this.token = config.accessToken;
    this.locationId = config.locationId;
  }

  // ---------------------------------------------------------------------------
  // HTTP transport
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${GHL_API_BASE}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Version: GHL_API_VERSION,
    };

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 429) {
      // Rate limited — wait and retry once
      const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      const retryResponse = await fetch(url, options);
      if (!retryResponse.ok) {
        throw new GHLClientError(
          `GHL API rate limited (retry failed): ${retryResponse.status}`,
          retryResponse.status
        );
      }
      return retryResponse.json();
    }

    if (!response.ok) {
      let errorMessage = `GHL API error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorBody.error || errorMessage;
      } catch {
        // Use default error message
      }
      throw new GHLClientError(errorMessage, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  /**
   * Create a new contact in GoHighLevel.
   * Requires at least email or phone.
   */
  async createContact(input: Omit<GHLCreateContactInput, 'locationId'>): Promise<GHLContact> {
    const result = await this.request<GHLContactResponse>('POST', '/contacts/', {
      ...input,
      locationId: this.locationId,
    });
    return result.contact;
  }

  /**
   * Update an existing contact by ID.
   * Only include the fields you want to change.
   */
  async updateContact(contactId: string, input: GHLUpdateContactInput): Promise<GHLContact> {
    const result = await this.request<GHLContactResponse>(
      'PUT',
      `/contacts/${contactId}`,
      input as Record<string, unknown>
    );
    return result.contact;
  }

  /**
   * Upsert a contact — create if new, update if exists.
   * Deduplication is based on the location's duplicate detection settings (email/phone).
   */
  async upsertContact(input: Omit<GHLUpsertContactInput, 'locationId'>): Promise<GHLContact> {
    const result = await this.request<GHLContactResponse>('POST', '/contacts/upsert', {
      ...input,
      locationId: this.locationId,
    });
    return result.contact;
  }

  /**
   * Get a contact by their GHL contact ID.
   */
  async getContact(contactId: string): Promise<GHLContact> {
    const result = await this.request<GHLContactResponse>(
      'GET',
      `/contacts/${contactId}`
    );
    return result.contact;
  }

  /**
   * Search contacts by query string (email, phone, name).
   */
  async searchContacts(query: string, limit = 20): Promise<GHLSearchContactsResponse> {
    return this.request<GHLSearchContactsResponse>(
      'GET',
      `/contacts/search?locationId=${this.locationId}&q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  /**
   * Delete a contact by ID.
   */
  async deleteContact(contactId: string): Promise<void> {
    await this.request<void>('DELETE', `/contacts/${contactId}`);
  }

  // ---------------------------------------------------------------------------
  // Tags
  // ---------------------------------------------------------------------------

  /**
   * Add tags to a contact.
   */
  async addTags(contactId: string, tags: string[]): Promise<string[]> {
    const result = await this.request<GHLTagsResponse>(
      'POST',
      `/contacts/${contactId}/tags`,
      { tags }
    );
    return result.tags;
  }

  /**
   * Remove tags from a contact.
   */
  async removeTags(contactId: string, tags: string[]): Promise<string[]> {
    const result = await this.request<GHLTagsResponse>(
      'DELETE',
      `/contacts/${contactId}/tags`,
      { tags }
    );
    return result.tags;
  }

  // ---------------------------------------------------------------------------
  // Inbound Webhook (trigger a GHL workflow)
  // ---------------------------------------------------------------------------

  /**
   * Trigger a GoHighLevel workflow via its inbound webhook URL.
   * This sends data to a GHL workflow trigger to kick off automations.
   */
  async triggerWorkflow(
    webhookUrl: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new GHLClientError(
        `Failed to trigger GHL workflow: ${response.status}`,
        response.status
      );
    }
  }
}

// =============================================================================
// Error class
// =============================================================================

export class GHLClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GHLClientError';
    this.status = status;
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createGHLClient(): GoHighLevelClient | null {
  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    return null;
  }

  return new GoHighLevelClient({ accessToken: token, locationId });
}
