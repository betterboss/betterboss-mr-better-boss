// =============================================================================
// GoHighLevel (GHL) API Client
// Syncs contacts/leads from JobTread to GoHighLevel CRM
// =============================================================================

const GHL_API_URL = 'https://rest.gohighlevel.com/v1';

export interface GHLContact {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  source?: string;
  tags?: string[];
  customField?: Record<string, string>;
}

interface GHLResponse {
  contact?: GHLContact;
  contacts?: GHLContact[];
  meta?: { total: number; currentPage: number; nextPage: number | null };
}

export class GHLClient {
  private apiKey: string;
  private locationId: string;

  constructor(apiKey: string, locationId: string) {
    this.apiKey = apiKey;
    this.locationId = locationId;
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const response = await fetch(`${GHL_API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`GHL API error ${response.status}: ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }

  async createOrUpdateContact(contact: GHLContact): Promise<GHLContact> {
    // Try to find existing contact by email first
    if (contact.email) {
      const existing = await this.findContactByEmail(contact.email);
      if (existing?.id) {
        return this.updateContact(existing.id, contact);
      }
    }

    const result = await this.request<GHLResponse>('/contacts/', {
      method: 'POST',
      body: {
        ...contact,
        locationId: this.locationId,
      },
    });

    if (!result.contact) {
      throw new Error('Failed to create contact in GHL');
    }

    return result.contact;
  }

  async findContactByEmail(email: string): Promise<GHLContact | null> {
    try {
      const result = await this.request<GHLResponse>(
        `/contacts/lookup?email=${encodeURIComponent(email)}&locationId=${this.locationId}`
      );
      return result.contacts?.[0] || null;
    } catch {
      return null;
    }
  }

  async updateContact(id: string, contact: Partial<GHLContact>): Promise<GHLContact> {
    const result = await this.request<GHLResponse>(`/contacts/${id}`, {
      method: 'PUT',
      body: contact,
    });

    if (!result.contact) {
      throw new Error('Failed to update contact in GHL');
    }

    return result.contact;
  }

  async getContacts(page = 1, limit = 100): Promise<{ contacts: GHLContact[]; total: number }> {
    const result = await this.request<GHLResponse>(
      `/contacts/?locationId=${this.locationId}&limit=${limit}&page=${page}`
    );

    return {
      contacts: result.contacts || [],
      total: result.meta?.total || 0,
    };
  }
}

// Factory function
export function getGHLClient(): GHLClient | null {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    return null;
  }

  return new GHLClient(apiKey, locationId);
}
