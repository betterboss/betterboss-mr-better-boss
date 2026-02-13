// =============================================================================
// Lead Sync Workflow Engine
// Orchestrates bi-directional sync between JobTread and GoHighLevel.
//
// Workflows:
//   1. JobTread → GHL: New/updated leads in JT auto-create/update contacts in GHL
//   2. GHL → JT: Optionally sync GHL contact events back to JT
//   3. Manual bulk sync: Sync all existing JT leads to GHL on demand
//
// Architecture:
//   Webhook event → validate → transform → upsert → log → trigger GHL workflow
// =============================================================================

import {
  GoHighLevelClient,
  createGHLClient,
  type GHLContact,
  type GHLCustomField,
} from '@/lib/gohighlevel/client';
import { JobTreadMasterClient, createMasterClient } from '@/lib/jobtread/api-master';
import type { JobTreadContact, JobTreadJob } from '@/types/jobtread';

// =============================================================================
// Types
// =============================================================================

/** A JobTread webhook event payload. */
export interface JTWebhookEvent {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/** Supported JobTread webhook event types for lead sync. */
export type LeadSyncEventType =
  | 'contact.created'
  | 'contact.updated'
  | 'customer.created'
  | 'customer.updated'
  | 'job.created'
  | 'job.updated';

/** Result of a single sync operation. */
export interface SyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  jobtreadId: string;
  ghlContactId?: string;
  message: string;
  timestamp: string;
}

/** Result of a bulk sync operation. */
export interface BulkSyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: SyncResult[];
  startedAt: string;
  completedAt: string;
}

/** Configuration for the lead sync workflow. */
export interface LeadSyncConfig {
  /** Which JT contact types to sync. Default: ['CUSTOMER', 'LEAD'] */
  syncContactTypes: string[];
  /** Tags to apply to all synced contacts in GHL. */
  defaultTags: string[];
  /** Whether to sync job data as custom fields. */
  includeJobData: boolean;
  /** GHL inbound webhook URL for triggering GHL workflows after sync. */
  ghlWorkflowWebhookUrl?: string;
  /** Whether to trigger GHL workflow after each sync. */
  triggerWorkflow: boolean;
}

const DEFAULT_CONFIG: LeadSyncConfig = {
  syncContactTypes: ['CUSTOMER', 'LEAD'],
  defaultTags: ['jobtread', 'betterboss'],
  includeJobData: true,
  triggerWorkflow: true,
  ghlWorkflowWebhookUrl: process.env.GHL_WORKFLOW_WEBHOOK_URL,
};

// =============================================================================
// Core Sync Engine
// =============================================================================

export class LeadSyncEngine {
  private ghl: GoHighLevelClient;
  private jt: JobTreadMasterClient;
  private config: LeadSyncConfig;

  constructor(
    ghlClient: GoHighLevelClient,
    jtClient: JobTreadMasterClient,
    config?: Partial<LeadSyncConfig>
  ) {
    this.ghl = ghlClient;
    this.jt = jtClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Webhook event handler — single event processing
  // ---------------------------------------------------------------------------

  /**
   * Process a single webhook event from JobTread.
   * Maps the event to the appropriate sync action.
   */
  async processWebhookEvent(event: JTWebhookEvent): Promise<SyncResult> {
    const eventType = event.event as LeadSyncEventType;
    const timestamp = new Date().toISOString();

    try {
      switch (eventType) {
        case 'contact.created':
        case 'contact.updated':
        case 'customer.created':
        case 'customer.updated': {
          const contact = event.data as unknown as JobTreadContact;
          return await this.syncContact(contact);
        }

        case 'job.created':
        case 'job.updated': {
          const job = event.data as unknown as JobTreadJob;
          if (job.customer) {
            return await this.syncContact(job.customer, job);
          }
          return {
            success: true,
            action: 'skipped',
            jobtreadId: job.id,
            message: 'Job has no customer attached — skipped.',
            timestamp,
          };
        }

        default:
          return {
            success: true,
            action: 'skipped',
            jobtreadId: (event.data as { id?: string }).id || 'unknown',
            message: `Event type "${event.event}" is not handled by lead sync.`,
            timestamp,
          };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        action: 'failed',
        jobtreadId: (event.data as { id?: string }).id || 'unknown',
        message: msg,
        timestamp,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Single contact sync
  // ---------------------------------------------------------------------------

  /**
   * Sync a single JobTread contact to GoHighLevel.
   * Uses upsert to create or update based on email/phone matching.
   */
  async syncContact(
    contact: JobTreadContact,
    relatedJob?: JobTreadJob
  ): Promise<SyncResult> {
    const timestamp = new Date().toISOString();

    // Check if this contact type should be synced
    if (contact.type && !this.config.syncContactTypes.includes(contact.type)) {
      return {
        success: true,
        action: 'skipped',
        jobtreadId: contact.id,
        message: `Contact type "${contact.type}" is not configured for sync.`,
        timestamp,
      };
    }

    // Must have email or phone for GHL
    if (!contact.email && !contact.phone) {
      return {
        success: true,
        action: 'skipped',
        jobtreadId: contact.id,
        message: 'Contact has no email or phone — required for GHL.',
        timestamp,
      };
    }

    // Build the GHL contact payload
    const ghlPayload = this.mapContactToGHL(contact, relatedJob);

    try {
      const ghlContact = await this.ghl.upsertContact(ghlPayload);

      // Add tags (upsert may not handle tags on update)
      if (this.config.defaultTags.length > 0 && ghlContact.id) {
        const allTags = [...this.config.defaultTags];
        if (contact.type) allTags.push(`jt-${contact.type.toLowerCase()}`);
        if (contact.source) allTags.push(`source-${contact.source.toLowerCase().replace(/\s+/g, '-')}`);

        try {
          await this.ghl.addTags(ghlContact.id, allTags);
        } catch {
          // Non-fatal — contact was still synced
        }
      }

      // Trigger GHL workflow if configured
      if (
        this.config.triggerWorkflow &&
        this.config.ghlWorkflowWebhookUrl &&
        ghlContact.id
      ) {
        try {
          await this.ghl.triggerWorkflow(this.config.ghlWorkflowWebhookUrl, {
            event: 'lead_synced',
            source: 'jobtread',
            contact: {
              ghlId: ghlContact.id,
              jobtreadId: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              type: contact.type,
              source: contact.source,
            },
            job: relatedJob
              ? {
                  id: relatedJob.id,
                  name: relatedJob.name,
                  status: relatedJob.status,
                  estimatedRevenue: relatedJob.budget?.estimatedRevenue,
                }
              : null,
            syncedAt: timestamp,
          });
        } catch {
          // Non-fatal — sync still succeeded
        }
      }

      // Determine if this was a create or update
      const isNew = !ghlContact.dateUpdated ||
        ghlContact.dateAdded === ghlContact.dateUpdated;

      return {
        success: true,
        action: isNew ? 'created' : 'updated',
        jobtreadId: contact.id,
        ghlContactId: ghlContact.id,
        message: `${isNew ? 'Created' : 'Updated'} contact "${contact.firstName} ${contact.lastName}" in GoHighLevel.`,
        timestamp,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        action: 'failed',
        jobtreadId: contact.id,
        message: `Failed to sync to GHL: ${msg}`,
        timestamp,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk sync — push all JT leads to GHL
  // ---------------------------------------------------------------------------

  /**
   * Sync all JobTread contacts matching the configured types to GoHighLevel.
   * Processes sequentially to respect GHL rate limits.
   */
  async bulkSync(): Promise<BulkSyncResult> {
    const startedAt = new Date().toISOString();
    const results: SyncResult[] = [];

    // Fetch all contacts from JobTread
    const contactsResult = await this.jt.getContacts(undefined, { first: 200 });
    const contacts = contactsResult.data;

    // Fetch all jobs to enrich contacts with job data
    let jobsByCustomer: Map<string, JobTreadJob> | undefined;
    if (this.config.includeJobData) {
      const jobsResult = await this.jt.getJobs(undefined, { first: 200 });
      jobsByCustomer = new Map();
      for (const job of jobsResult.data) {
        if (job.customer?.id) {
          // Store the most recent job per customer
          const existing = jobsByCustomer.get(job.customer.id);
          if (!existing || (job.createdAt > existing.createdAt)) {
            jobsByCustomer.set(job.customer.id, job);
          }
        }
      }
    }

    // Process each contact
    for (const contact of contacts) {
      const relatedJob = jobsByCustomer?.get(contact.id);
      const result = await this.syncContact(contact, relatedJob);
      results.push(result);

      // Small delay between requests to respect rate limits
      // GHL allows 100 req / 10 seconds = 10/sec
      if (result.action !== 'skipped') {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    return {
      total: results.length,
      created: results.filter((r) => r.action === 'created').length,
      updated: results.filter((r) => r.action === 'updated').length,
      skipped: results.filter((r) => r.action === 'skipped').length,
      failed: results.filter((r) => r.action === 'failed').length,
      results,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Data mapping: JobTread → GoHighLevel
  // ---------------------------------------------------------------------------

  private mapContactToGHL(
    contact: JobTreadContact,
    relatedJob?: JobTreadJob
  ): Omit<import('@/lib/gohighlevel/client').GHLCreateContactInput, 'locationId'> {
    const customFields: GHLCustomField[] = [
      { key: 'jobtread_id', field_value: contact.id },
      { key: 'jobtread_type', field_value: contact.type || 'UNKNOWN' },
    ];

    if (contact.source) {
      customFields.push({ key: 'lead_source', field_value: contact.source });
    }

    if (contact.notes) {
      customFields.push({ key: 'jobtread_notes', field_value: contact.notes });
    }

    // Add job data as custom fields
    if (relatedJob && this.config.includeJobData) {
      customFields.push({ key: 'jobtread_job_name', field_value: relatedJob.name });
      customFields.push({ key: 'jobtread_job_status', field_value: relatedJob.status });
      if (relatedJob.budget?.estimatedRevenue) {
        customFields.push({
          key: 'estimated_project_value',
          field_value: String(relatedJob.budget.estimatedRevenue),
        });
      }
      if (relatedJob.description) {
        customFields.push({
          key: 'project_description',
          field_value: relatedJob.description.slice(0, 500),
        });
      }
    }

    const tags = [...this.config.defaultTags];
    if (contact.type) tags.push(`jt-${contact.type.toLowerCase()}`);
    if (contact.tags) tags.push(...contact.tags);

    return {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      companyName: contact.company || undefined,
      address1: contact.address?.street1 || undefined,
      city: contact.address?.city || undefined,
      state: contact.address?.state || undefined,
      postalCode: contact.address?.zip || undefined,
      country: contact.address?.country || undefined,
      source: 'JobTread (BetterBoss)',
      tags,
      customFields,
    };
  }
}

// =============================================================================
// Reverse sync: GoHighLevel → JobTread
// =============================================================================

/**
 * Process an inbound webhook from GoHighLevel and sync the contact back to JT.
 * Called by the GHL webhook receiver route.
 */
export async function syncGHLContactToJobTread(
  ghlContact: GHLContact,
  jtClient: JobTreadMasterClient
): Promise<SyncResult> {
  const timestamp = new Date().toISOString();

  if (!ghlContact.email && !ghlContact.phone) {
    return {
      success: true,
      action: 'skipped',
      jobtreadId: '',
      ghlContactId: ghlContact.id,
      message: 'GHL contact has no email or phone — cannot match in JobTread.',
      timestamp,
    };
  }

  try {
    // Search for existing contact in JobTread
    const search = ghlContact.email || ghlContact.phone || '';
    const existingContacts = await jtClient.getContacts(
      { search },
      { first: 5 }
    );

    if (existingContacts.data.length > 0) {
      // Contact already exists in JT — update if needed
      const jtContact = existingContacts.data[0];
      await jtClient.updateContact(jtContact.id, {
        firstName: ghlContact.firstName || jtContact.firstName,
        lastName: ghlContact.lastName || jtContact.lastName,
        email: ghlContact.email || jtContact.email,
        phone: ghlContact.phone || jtContact.phone,
        company: ghlContact.companyName || jtContact.company,
      });

      return {
        success: true,
        action: 'updated',
        jobtreadId: jtContact.id,
        ghlContactId: ghlContact.id,
        message: `Updated existing JT contact "${jtContact.firstName} ${jtContact.lastName}".`,
        timestamp,
      };
    }

    // Create new contact in JobTread
    const newContact = await jtClient.createContact({
      type: 'LEAD',
      firstName: ghlContact.firstName || '',
      lastName: ghlContact.lastName || '',
      email: ghlContact.email,
      phone: ghlContact.phone,
      company: ghlContact.companyName,
    });

    return {
      success: true,
      action: 'created',
      jobtreadId: newContact.id,
      ghlContactId: ghlContact.id,
      message: `Created new JT contact "${newContact.firstName} ${newContact.lastName}".`,
      timestamp,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      action: 'failed',
      jobtreadId: '',
      ghlContactId: ghlContact.id,
      message: `Failed to sync GHL → JT: ${msg}`,
      timestamp,
    };
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a LeadSyncEngine if both GHL and JT are configured.
 * Returns null if either integration is missing credentials.
 */
export function createLeadSyncEngine(
  jtAccessToken: string,
  config?: Partial<LeadSyncConfig>
): LeadSyncEngine | null {
  const ghl = createGHLClient();
  if (!ghl) return null;

  const jt = createMasterClient(jtAccessToken);
  return new LeadSyncEngine(ghl, jt, config);
}
