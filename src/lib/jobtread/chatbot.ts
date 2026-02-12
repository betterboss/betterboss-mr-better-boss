// =============================================================================
// JobTread AI Chatbot Engine
// Transforms natural language messages into JobTread API calls and produces
// rich, contextual responses for construction professionals.
//
// Architecture:
//   User message → Intent classification → Data fetching → Analysis → Response
//
// Supports both read queries ("How are my jobs doing?") and write actions
// ("Create a task for the Smith renovation") with confirmation flows.
// =============================================================================

import {
  JobTreadMasterClient,
  createMasterClient,
  classifyIntent,
  DataAnalysis,
  Format,
  ENTITY_REFERENCE,
  type ChatbotContext,
  type ChatIntent,
  type IntentMatch,
  type JobTreadJob,
  type JobTreadContact,
  type JobTreadInvoice,
  type JobTreadTask,
} from './api-master';

// =============================================================================
// Section 1 — Public API
// =============================================================================

export interface ChatbotRequest {
  message: string;
  accessToken: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatbotResponse {
  content: string;
  intent: ChatIntent;
  confidence: number;
  actions?: PendingAction[];
  suggestions?: string[];
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface PendingAction {
  type: 'create' | 'update' | 'delete';
  entity: string;
  description: string;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
}

/**
 * Main entry point. Process a user message and return a chatbot response.
 */
export async function processMessage(request: ChatbotRequest): Promise<ChatbotResponse> {
  const { message, accessToken } = request;
  const client = createMasterClient(accessToken);
  const intentMatch = classifyIntent(message);

  try {
    const handler = INTENT_HANDLERS[intentMatch.intent] || INTENT_HANDLERS.general;
    const result = await handler(message, client, intentMatch);

    return {
      content: result.content,
      intent: intentMatch.intent,
      confidence: intentMatch.confidence,
      actions: result.actions,
      suggestions: result.suggestions || getDefaultSuggestions(intentMatch.intent),
      data: result.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    return {
      content: `I ran into an issue: ${errorMessage}\n\nPlease try again, or ask me something else.`,
      intent: intentMatch.intent,
      confidence: intentMatch.confidence,
      suggestions: ['Business overview', 'Job status report', 'Help'],
      timestamp: new Date().toISOString(),
    };
  }
}

// =============================================================================
// Section 2 — Handler Result Type
// =============================================================================

interface HandlerResult {
  content: string;
  actions?: PendingAction[];
  suggestions?: string[];
  data?: Record<string, unknown>;
}

// =============================================================================
// Section 3 — Intent Handlers
// Each handler fetches the data it needs and builds a response.
// =============================================================================

const INTENT_HANDLERS: Record<
  ChatIntent,
  (message: string, client: JobTreadMasterClient, match: IntentMatch) => Promise<HandlerResult>
> = {
  // ---- Business Health ----
  async business_health(_msg, client) {
    const ctx = await client.fetchAllCoreData();
    const health = DataAnalysis.businessHealth(ctx);

    let content = `## Business Health Check\n\n`;
    content += `### Key Metrics\n`;
    content += `| Metric | Value |\n|--------|-------|\n`;
    content += `| Total Jobs | ${health.totalJobs} (${health.activeJobs} active) |\n`;
    content += `| Total Revenue | ${Format.currency(health.totalRevenue)} |\n`;
    content += `| Total Profit | ${Format.currency(health.totalProfit)} |\n`;
    content += `| Average Margin | ${Format.percent(health.avgMargin)} |\n`;
    content += `| Contacts | ${health.totalContacts} |\n`;

    content += `\n### Financials\n`;
    content += `- Invoiced: ${Format.currency(health.totalInvoiced)}\n`;
    content += `- Collected: ${Format.currency(health.totalPaid)}\n`;
    content += `- Outstanding: ${Format.currency(health.totalOutstanding)}\n`;
    content += `- Overdue Invoices: ${health.overdueInvoiceCount} (${Format.currency(health.overdueInvoiceTotal)})\n`;

    content += `\n### Workload\n`;
    content += `- Pending Tasks: ${health.pendingTaskCount}\n`;
    content += `- Overdue Tasks: ${health.overdueTaskCount}\n`;

    if (health.topJobs.length > 0) {
      content += `\n### Top Active Jobs\n`;
      for (const j of health.topJobs) {
        const margin = j.budget?.estimatedMargin ?? 0;
        content += `- **${j.name}**: ${Format.currency(j.budget?.estimatedRevenue ?? 0)} rev, ${Format.percent(margin)} margin\n`;
      }
    }

    // Alerts
    const alerts: string[] = [];
    if (health.overdueInvoiceCount > 0)
      alerts.push(`Collect ${Format.currency(health.overdueInvoiceTotal)} in overdue invoices`);
    if (health.overdueTaskCount > 0)
      alerts.push(`Address ${health.overdueTaskCount} overdue task(s)`);
    if (health.avgMargin < 15)
      alerts.push(`Average margin (${Format.percent(health.avgMargin)}) is below 15% — review pricing`);

    if (alerts.length > 0) {
      content += `\n### Action Items\n`;
      alerts.forEach((a) => (content += `- ${a}\n`));
    }

    return { content, data: { health } };
  },

  // ---- Cash Flow ----
  async cash_flow(_msg, client) {
    const ctx = await client.fetchAllCoreData();
    const cf = DataAnalysis.cashFlow(ctx);

    let content = `## Cash Flow Analysis\n\n`;
    content += `### Current Position\n`;
    content += `| Metric | Amount |\n|--------|--------|\n`;
    content += `| Total Invoiced | ${Format.currency(cf.totalInvoiced)} |\n`;
    content += `| Collected | ${Format.currency(cf.totalCollected)} |\n`;
    content += `| Outstanding | ${Format.currency(cf.totalOutstanding)} |\n`;
    content += `| Active Job Revenue | ${Format.currency(cf.activeJobRevenue)} |\n`;

    content += `\n### Accounts Receivable Aging\n`;
    content += `| Bucket | Amount |\n|--------|--------|\n`;
    content += `| Current | ${Format.currency(cf.aging.current)} |\n`;
    content += `| 1-30 days | ${Format.currency(cf.aging.days30)} |\n`;
    content += `| 31-60 days | ${Format.currency(cf.aging.days60)} |\n`;
    content += `| 90+ days | ${Format.currency(cf.aging.days90plus)} |\n`;

    if (cf.outstandingInvoices.length > 0) {
      content += `\n### Outstanding Invoices\n`;
      const sorted = [...cf.outstandingInvoices].sort(
        (a, b) => (b.total ?? 0) - (a.total ?? 0)
      );
      for (const inv of sorted.slice(0, 10)) {
        const dueStr = inv.dueDate ? `, due ${Format.date(inv.dueDate)}` : '';
        const overdue = inv.dueDate && new Date(inv.dueDate) < new Date()
          ? ' **OVERDUE**'
          : '';
        content += `- Invoice #${inv.number || inv.id}: ${Format.currency(inv.total ?? 0)}${dueStr}${overdue}\n`;
      }
    }

    if (cf.aging.days90plus > 0) {
      content += `\n**Warning:** ${Format.currency(cf.aging.days90plus)} is 90+ days outstanding. Consider escalating collection efforts.\n`;
    }

    return { content };
  },

  // ---- Profitability ----
  async profitability(_msg, client) {
    const ctx = await client.fetchAllCoreData();
    const p = DataAnalysis.profitability(ctx);

    let content = `## Profitability Report\n\n`;
    content += `| Metric | Value |\n|--------|-------|\n`;
    content += `| Total Revenue | ${Format.currency(p.totalRevenue)} |\n`;
    content += `| Total Cost | ${Format.currency(p.totalCost)} |\n`;
    content += `| Total Profit | ${Format.currency(p.totalProfit)} |\n`;
    content += `| Overall Margin | ${Format.percent(p.overallMargin)} |\n`;
    content += `| Avg Job Revenue | ${Format.currency(p.avgJobRevenue)} |\n`;
    content += `| Jobs Analyzed | ${p.jobCount} |\n`;

    if (p.bestMarginJobs.length > 0) {
      content += `\n### Highest Margin Jobs\n`;
      for (const j of p.bestMarginJobs) {
        content += `- **${j.name}**: ${Format.percent(j.budget?.estimatedMargin ?? 0)} margin, ${Format.currency(j.budget?.estimatedRevenue ?? 0)} revenue\n`;
      }
    }

    if (p.worstMarginJobs.length > 0) {
      content += `\n### Lowest Margin Jobs\n`;
      for (const j of p.worstMarginJobs) {
        content += `- **${j.name}**: ${Format.percent(j.budget?.estimatedMargin ?? 0)} margin, ${Format.currency(j.budget?.estimatedRevenue ?? 0)} revenue\n`;
      }
    }

    const benchmark =
      p.overallMargin >= 30
        ? 'Your margins are strong. Maintain quality to justify premium pricing.'
        : p.overallMargin >= 20
        ? 'Your margins are in the healthy range for construction (20-35%).'
        : 'Your margins are below the 20% industry benchmark. Review cost estimates and pricing strategy.';
    content += `\n**Industry Benchmark:** ${benchmark}\n`;

    return { content };
  },

  // ---- Job Status ----
  async job_status(_msg, client) {
    const ctx = await client.fetchAllCoreData();
    const health = DataAnalysis.businessHealth(ctx);

    let content = `## Job Pipeline Report\n\n`;
    content += `**${health.totalJobs} total jobs** | **${health.activeJobs} active** | Pipeline: ${Format.currency(health.totalRevenue)}\n\n`;

    content += `### By Status\n`;
    content += `| Status | Count | Value |\n|--------|-------|-------|\n`;

    const statusOrder: string[] = ['LEAD', 'ESTIMATE', 'PROPOSAL', 'CONTRACT', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
    for (const status of statusOrder) {
      const entry = health.pipeline[status];
      if (entry) {
        content += `| ${Format.statusLabel(status)} | ${entry.count} | ${Format.currency(entry.value)} |\n`;
      }
    }

    if (health.topJobs.length > 0) {
      content += `\n### Active Jobs\n`;
      for (const j of health.topJobs) {
        const outstanding = j.budget?.outstanding ?? 0;
        content += `- **${Format.jobName(j)}** — ${Format.statusLabel(j.status)}, ${Format.currency(j.budget?.estimatedRevenue ?? 0)} rev`;
        if (outstanding > 0) content += `, ${Format.currency(outstanding)} outstanding`;
        content += `\n`;
      }
    }

    return { content };
  },

  // ---- Job Detail ----
  async job_detail(msg, client, match) {
    const query = match.entities.name || msg.replace(/^.*(?:about|detail|info|for)\s+/i, '').trim();
    if (!query || query.length < 2) {
      return {
        content: 'Which job would you like details on? Give me a job name, number, or customer name.',
        suggestions: ['List all jobs', 'Active jobs', 'Business overview'],
      };
    }

    const ctx = await client.fetchAllCoreData();
    const job = DataAnalysis.findJob(ctx, query);

    if (!job) {
      return {
        content: `I couldn't find a job matching "${query}". Try a different name or number.`,
        suggestions: ['List all jobs', 'Active jobs'],
      };
    }

    let content = `## ${job.name}\n\n`;
    content += `| Field | Value |\n|-------|-------|\n`;
    content += `| Number | ${job.number || 'N/A'} |\n`;
    content += `| Status | ${Format.statusLabel(job.status)} |\n`;
    if (job.customer) content += `| Customer | ${Format.contactName(job.customer as JobTreadContact)} |\n`;
    if (job.address) content += `| Address | ${job.address.street1 || ''}, ${job.address.city || ''} ${job.address.state || ''} ${job.address.zip || ''} |\n`;
    if (job.startDate) content += `| Start Date | ${Format.date(job.startDate)} |\n`;
    if (job.endDate) content += `| End Date | ${Format.date(job.endDate)} |\n`;

    if (job.budget) {
      content += `\n### Budget\n`;
      content += `| Metric | Estimated | Actual |\n|--------|-----------|--------|\n`;
      content += `| Revenue | ${Format.currency(job.budget.estimatedRevenue)} | ${Format.currency(job.budget.actualRevenue)} |\n`;
      content += `| Cost | ${Format.currency(job.budget.estimatedCost)} | ${Format.currency(job.budget.actualCost)} |\n`;
      content += `| Profit | ${Format.currency(job.budget.estimatedProfit)} | ${Format.currency(job.budget.actualProfit)} |\n`;
      content += `| Invoiced | ${Format.currency(job.budget.invoiced)} | Paid: ${Format.currency(job.budget.paid)} |\n`;
      if (job.budget.outstanding > 0) {
        content += `\n**Outstanding: ${Format.currency(job.budget.outstanding)}**\n`;
      }
    }

    // Tasks summary
    const jobTasks = ctx.tasks.filter((t) => t.jobId === job.id);
    if (jobTasks.length > 0) {
      const pending = jobTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      content += `\n### Tasks (${pending.length} pending / ${jobTasks.length} total)\n`;
      for (const t of pending.slice(0, 5)) {
        const due = t.dueDate ? ` — due ${Format.date(t.dueDate)}` : '';
        content += `- ${t.title} [${Format.statusLabel(t.status)}]${due}\n`;
      }
      if (pending.length > 5) content += `- ...and ${pending.length - 5} more\n`;
    }

    // Invoices for this job
    const jobInvoices = ctx.invoices.filter((inv) => inv.jobId === job.id);
    if (jobInvoices.length > 0) {
      content += `\n### Invoices (${jobInvoices.length})\n`;
      for (const inv of jobInvoices.slice(0, 5)) {
        content += `- #${inv.number || inv.id}: ${Format.currency(inv.total ?? 0)} — ${Format.statusLabel(inv.status)}\n`;
      }
    }

    return { content, data: { job } };
  },

  // ---- Task Workload ----
  async task_workload(_msg, client) {
    const ctx = await client.fetchAllCoreData();
    const tw = DataAnalysis.taskWorkload(ctx);

    let content = `## Task Workload\n\n`;
    content += `**${tw.total} total tasks**\n\n`;

    content += `### By Status\n`;
    for (const [status, count] of Object.entries(tw.byStatus)) {
      content += `- ${Format.statusLabel(status)}: ${count}\n`;
    }

    if (Object.keys(tw.byPriority).length > 0) {
      content += `\n### By Priority\n`;
      for (const [priority, count] of Object.entries(tw.byPriority)) {
        content += `- ${priority}: ${count}\n`;
      }
    }

    if (tw.overdue.length > 0) {
      content += `\n### Overdue Tasks (${tw.overdue.length})\n`;
      for (const t of tw.overdue.slice(0, 10)) {
        const daysLate = t.dueDate ? Math.abs(Format.daysUntil(t.dueDate)) : 0;
        content += `- **${t.title}** — ${daysLate} days overdue\n`;
      }
    }

    if (tw.dueThisWeek.length > 0) {
      content += `\n### Due This Week (${tw.dueThisWeek.length})\n`;
      for (const t of tw.dueThisWeek.slice(0, 10)) {
        content += `- ${t.title} — due ${t.dueDate ? Format.date(t.dueDate) : 'unknown'}\n`;
      }
    }

    if (tw.overdue.length > 0) {
      content += `\n**Recommendation:** Address the ${tw.overdue.length} overdue task(s) first to avoid project delays.\n`;
    }

    return { content };
  },

  // ---- Overdue Items ----
  async overdue_items(_msg, client) {
    const ctx = await client.fetchAllCoreData();
    const health = DataAnalysis.businessHealth(ctx);
    const cf = DataAnalysis.cashFlow(ctx);

    let content = `## Overdue Items\n\n`;

    if (health.overdueInvoices.length > 0) {
      content += `### Overdue Invoices (${health.overdueInvoiceCount})\n`;
      content += `Total: **${Format.currency(health.overdueInvoiceTotal)}**\n\n`;
      for (const inv of health.overdueInvoices) {
        const daysLate = inv.dueDate ? Math.abs(Format.daysUntil(inv.dueDate)) : 0;
        content += `- Invoice #${inv.number || inv.id}: ${Format.currency(inv.total ?? 0)} — **${daysLate} days overdue**\n`;
      }

      if (cf.aging.days90plus > 0) {
        content += `\n**Critical:** ${Format.currency(cf.aging.days90plus)} is over 90 days past due.\n`;
      }
    } else {
      content += `No overdue invoices — great job staying on top of collections!\n`;
    }

    if (health.overdueTasks.length > 0) {
      content += `\n### Overdue Tasks (${health.overdueTaskCount})\n`;
      for (const t of health.overdueTasks.slice(0, 10)) {
        const daysLate = t.dueDate ? Math.abs(Format.daysUntil(t.dueDate)) : 0;
        content += `- **${t.title}** — ${daysLate} days overdue\n`;
      }
    } else {
      content += `\nNo overdue tasks.\n`;
    }

    return { content };
  },

  // ---- Estimate Analysis ----
  async estimate_analysis(_msg, client) {
    const ctx = await client.fetchAllCoreData();
    const ea = DataAnalysis.estimateAnalysis(ctx);
    const p = DataAnalysis.profitability(ctx);

    let content = `## Estimate Analysis\n\n`;
    content += `| Metric | Value |\n|--------|-------|\n`;
    content += `| Total Estimates | ${ea.total} |\n`;
    content += `| Total Value | ${Format.currency(ea.totalValue)} |\n`;
    content += `| Accepted Value | ${Format.currency(ea.acceptedValue)} |\n`;
    content += `| Win Rate | ${Format.percent(ea.winRate)} |\n`;
    content += `| Avg Estimate | ${Format.currency(ea.avgEstimateValue)} |\n`;

    content += `\n### By Status\n`;
    for (const [status, count] of Object.entries(ea.byStatus)) {
      content += `- ${Format.statusLabel(status)}: ${count}\n`;
    }

    content += `\n### Pricing Guidance\n`;
    content += `- Current average margin: **${Format.percent(p.overallMargin)}**\n`;
    content += `- Industry standard for contractors: 20-35%\n`;
    if (p.overallMargin < 20) {
      content += `- **Warning:** Your margins are below the industry benchmark. Consider increasing your markup.\n`;
    } else if (p.overallMargin > 35) {
      content += `- Your margins are above average. Strong pricing power.\n`;
    }

    content += `\nUse the **Smart Estimator** to generate AI-powered estimates for new projects.\n`;

    return { content };
  },

  // ---- Contact Lookup ----
  async contact_lookup(msg, client, match) {
    const query = match.entities.name || msg.replace(/^.*(?:find|look up|search|contact|customer|who is)\s+/i, '').trim();

    const ctx = await client.fetchAllCoreData();

    if (query && query.length >= 2) {
      const contact = DataAnalysis.findContact(ctx, query);
      if (contact) {
        let content = `## ${Format.contactName(contact)}\n\n`;
        content += `| Field | Value |\n|-------|-------|\n`;
        content += `| Type | ${contact.type || 'N/A'} |\n`;
        content += `| Email | ${contact.email || 'N/A'} |\n`;
        content += `| Phone | ${contact.phone || 'N/A'} |\n`;
        if (contact.company) content += `| Company | ${contact.company} |\n`;
        if (contact.source) content += `| Source | ${contact.source} |\n`;
        if (contact.notes) content += `\n**Notes:** ${contact.notes}\n`;

        // Find related jobs
        const relatedJobs = ctx.jobs.filter(
          (j) =>
            j.customer?.id === contact.id ||
            `${j.customer?.firstName} ${j.customer?.lastName}`.toLowerCase() ===
              `${contact.firstName} ${contact.lastName}`.toLowerCase()
        );
        if (relatedJobs.length > 0) {
          content += `\n### Related Jobs (${relatedJobs.length})\n`;
          for (const j of relatedJobs.slice(0, 5)) {
            content += `- **${j.name}** — ${Format.statusLabel(j.status)}, ${Format.currency(j.budget?.estimatedRevenue ?? 0)}\n`;
          }
        }

        return { content, data: { contact } };
      }

      return {
        content: `No contact found matching "${query}". Try a different name, email, or company.`,
        suggestions: ['List all contacts', 'List customers', 'List vendors'],
      };
    }

    // No query — show contact summary
    const byType: Record<string, number> = {};
    for (const c of ctx.contacts) {
      const t = c.type || 'UNKNOWN';
      byType[t] = (byType[t] || 0) + 1;
    }

    let content = `## Contact Summary\n\n`;
    content += `**${ctx.contacts.length} total contacts**\n\n`;
    for (const [type, count] of Object.entries(byType)) {
      content += `- ${Format.statusLabel(type)}: ${count}\n`;
    }

    content += `\nRecent contacts:\n`;
    for (const c of ctx.contacts.slice(0, 5)) {
      content += `- ${Format.contactName(c)}`;
      if (c.email) content += ` — ${c.email}`;
      content += `\n`;
    }

    return { content };
  },

  // ---- Lead Management ----
  async lead_management(_msg, client) {
    const contactsResult = await client.getContacts({ type: 'LEAD' }, { first: 100 });
    const leads = contactsResult.data;

    let content = `## Lead Management\n\n`;
    content += `**${leads.length} active leads**\n\n`;

    if (leads.length === 0) {
      content += `No leads in the system. New leads can be added from the Contacts page or via web forms.\n`;
      return { content };
    }

    content += `### Lead List\n`;
    for (const lead of leads.slice(0, 15)) {
      content += `- **${Format.contactName(lead)}**`;
      if (lead.source) content += ` (Source: ${lead.source})`;
      if (lead.phone) content += ` — ${lead.phone}`;
      content += `\n`;
    }

    if (leads.length > 15) {
      content += `\n...and ${leads.length - 15} more leads.\n`;
    }

    content += `\n### Recommendations\n`;
    content += `- Follow up with leads within 24 hours of receiving them\n`;
    content += `- Referrals and repeat customers have the highest conversion rates\n`;
    content += `- Use the Lead Scoring tool to prioritize your outreach\n`;

    return { content };
  },

  // ---- Vendor Spend ----
  async vendor_spend(_msg, client) {
    const ctx = await client.fetchAllCoreData();
    const vs = DataAnalysis.vendorSpend(ctx);

    let content = `## Vendor & Subcontractor Spend\n\n`;
    content += `**${vs.totalPOs} purchase orders** totaling **${Format.currency(vs.totalSpend)}**\n\n`;

    if (vs.topVendors.length > 0) {
      content += `### Top Vendors by Spend\n`;
      content += `| Vendor | Total Spend | PO Count |\n|--------|------------|----------|\n`;
      for (const v of vs.topVendors) {
        content += `| ${v.name} | ${Format.currency(v.total)} | ${v.count} |\n`;
      }
    }

    return { content };
  },

  // ---- Create Job ----
  async create_job(msg, _client, match) {
    const name = match.entities.name || extractAfterKeyword(msg, ['job', 'project']);

    if (!name) {
      return {
        content: `To create a new job, I need at least a job name. Please say something like:\n\n*"Create a job called Smith Kitchen Remodel"*`,
      };
    }

    return {
      content: `I can create a new job called **"${name}"**.\n\nTo proceed, I'll need a few more details:\n- Customer name or ID\n- Job address (optional)\n- Starting status (default: LEAD)\n\nWould you like to provide these now, or create the job with just the name?`,
      actions: [
        {
          type: 'create',
          entity: 'job',
          description: `Create job "${name}"`,
          params: { name, status: 'LEAD' },
          requiresConfirmation: true,
        },
      ],
    };
  },

  // ---- Create Task ----
  async create_task(msg, _client, match) {
    const title = match.entities.name || extractAfterKeyword(msg, ['task', 'todo', 'reminder']);

    if (!title) {
      return {
        content: `To create a task, I need at least a title. For example:\n\n*"Create a task: Order materials for the Johnson build"*`,
      };
    }

    return {
      content: `I can create a task: **"${title}"**\n\nI'll also need:\n- Which job is this for?\n- Due date (optional)\n- Priority: LOW, MEDIUM, HIGH, or URGENT (optional)\n- Assignee (optional)`,
      actions: [
        {
          type: 'create',
          entity: 'task',
          description: `Create task "${title}"`,
          params: { title },
          requiresConfirmation: true,
        },
      ],
    };
  },

  // ---- Create Contact ----
  async create_contact(msg, _client, match) {
    const name = match.entities.name || extractAfterKeyword(msg, ['contact', 'customer', 'vendor', 'lead']);

    if (!name) {
      return {
        content: `To create a contact, I need at least a name. For example:\n\n*"Add a new customer: John Smith"*\n*"Create vendor contact Acme Supply Co"*`,
      };
    }

    const typeHints: Record<string, string> = {
      customer: 'CUSTOMER',
      vendor: 'VENDOR',
      sub: 'SUBCONTRACTOR',
      subcontractor: 'SUBCONTRACTOR',
      lead: 'LEAD',
    };
    let contactType = 'CUSTOMER';
    for (const [keyword, type] of Object.entries(typeHints)) {
      if (msg.toLowerCase().includes(keyword)) {
        contactType = type;
        break;
      }
    }

    return {
      content: `I can create a **${contactType.toLowerCase()}** contact: **"${name}"**\n\nOptional details:\n- Email\n- Phone\n- Company name\n- Address`,
      actions: [
        {
          type: 'create',
          entity: 'contact',
          description: `Create ${contactType.toLowerCase()} "${name}"`,
          params: { name, type: contactType },
          requiresConfirmation: true,
        },
      ],
    };
  },

  // ---- Create Estimate ----
  async create_estimate(_msg) {
    return {
      content: `To generate an estimate, use the **Smart Estimator** tool which provides AI-powered line items.\n\nOr tell me:\n- Project type (roofing, remodel, addition, commercial)\n- Square footage\n- Job to attach it to\n\nExample: *"Generate an estimate for a 2,500 sqft roofing job"*`,
      suggestions: ['Open Smart Estimator', 'List my jobs', 'Cost catalog'],
    };
  },

  // ---- Create Daily Log ----
  async create_daily_log(msg, _client, match) {
    const notes = match.entities.name || extractAfterKeyword(msg, ['log', 'note', 'report']);

    return {
      content: `To create a daily log, I need:\n- **Job** — which project is this for?\n- **Notes** — what happened on site today?${notes ? `\n\nI captured these notes: *"${notes}"*` : ''}\n- **Weather** (optional)\n\nExample: *"Log for Smith Remodel: Framing completed on second floor. Electrical rough-in starts tomorrow. Sunny, 72°F"*`,
      actions: notes
        ? [
            {
              type: 'create',
              entity: 'dailyLog',
              description: 'Create daily log',
              params: { notes },
              requiresConfirmation: true,
            },
          ]
        : undefined,
    };
  },

  // ---- Update Job Status ----
  async update_job_status(msg, client) {
    const ctx = await client.fetchAllCoreData();
    const statusMatch = msg.match(
      /\b(lead|estimate|proposal|contract|in.?progress|on.?hold|completed|cancelled)\b/i
    );
    const newStatus = statusMatch
      ? statusMatch[1].toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_')
      : null;

    // Try to find the job
    const jobQuery = msg
      .replace(/^.*(?:update|change|move|set|mark)\s+/i, '')
      .replace(/\s+(?:to|as|status)\s+.*$/i, '')
      .trim();

    const job = jobQuery ? DataAnalysis.findJob(ctx, jobQuery) : null;

    if (!job) {
      return {
        content: `Which job do you want to update? Give me a job name or number.\n\nAvailable statuses: LEAD → ESTIMATE → PROPOSAL → CONTRACT → IN_PROGRESS → ON_HOLD → COMPLETED → CANCELLED`,
      };
    }

    if (!newStatus) {
      return {
        content: `Job **${job.name}** is currently **${Format.statusLabel(job.status)}**.\n\nWhat status should I change it to?\n\nAvailable: LEAD, ESTIMATE, PROPOSAL, CONTRACT, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED`,
      };
    }

    return {
      content: `Update **${job.name}** from **${Format.statusLabel(job.status)}** to **${Format.statusLabel(newStatus)}**?`,
      actions: [
        {
          type: 'update',
          entity: 'job',
          description: `Change ${job.name} to ${Format.statusLabel(newStatus)}`,
          params: { id: job.id, status: newStatus },
          requiresConfirmation: true,
        },
      ],
    };
  },

  // ---- Update Task Status ----
  async update_task_status(msg, client) {
    const ctx = await client.fetchAllCoreData();

    const markComplete = /\b(complete|done|finish|close)\b/i.test(msg);
    const taskQuery = msg
      .replace(/^.*(?:mark|update|set|complete)\s+/i, '')
      .replace(/\s+(?:as|to)\s+.*$/i, '')
      .replace(/\b(done|complete|finished)\b/i, '')
      .trim();

    const task = ctx.tasks.find(
      (t) => t.title?.toLowerCase().includes(taskQuery.toLowerCase())
    );

    if (!task) {
      return {
        content: `Which task do you want to update? Give me the task title.\n\nYour pending tasks:\n${ctx.tasks
          .filter((t) => t.status !== 'COMPLETED')
          .slice(0, 10)
          .map((t) => `- ${t.title}`)
          .join('\n')}`,
      };
    }

    const newStatus = markComplete ? 'COMPLETED' : 'IN_PROGRESS';

    return {
      content: `Mark task **"${task.title}"** as **${Format.statusLabel(newStatus)}**?`,
      actions: [
        {
          type: 'update',
          entity: 'task',
          description: `Mark "${task.title}" as ${Format.statusLabel(newStatus)}`,
          params: { id: task.id, status: newStatus },
          requiresConfirmation: true,
        },
      ],
    };
  },

  // ---- Cost Catalog ----
  async cost_catalog(msg, client) {
    const search = msg
      .replace(/^.*(?:catalog|cost item|search for|find|look up)\s*/i, '')
      .trim();

    const items = await client.getCostCatalog(
      search && search.length >= 2 ? { search } : undefined
    );

    let content = `## Cost Catalog\n\n`;

    if (items.length === 0) {
      content += search
        ? `No items found matching "${search}". Try a different search term.`
        : `Your cost catalog is empty. Add items in JobTread under Settings > Cost Catalog.`;
      return { content };
    }

    content += `**${items.length} items**${search ? ` matching "${search}"` : ''}\n\n`;
    content += `| Item | Category | Unit | Cost | Price | Markup |\n|------|----------|------|------|-------|--------|\n`;
    for (const item of items.slice(0, 20)) {
      content += `| ${item.name} | ${item.category} | ${item.unit} | ${Format.currencyExact(item.unitCost)} | ${Format.currencyExact(item.unitPrice)} | ${item.markup ? Format.percent(item.markup) : 'N/A'} |\n`;
    }

    if (items.length > 20) {
      content += `\n...and ${items.length - 20} more items. Refine your search for more specific results.\n`;
    }

    return { content };
  },

  // ---- Help ----
  async help() {
    let content = `## What I Can Do\n\n`;
    content += `### Ask Me About\n`;
    content += `- **"Business overview"** — Full health check with KPIs\n`;
    content += `- **"Cash flow"** — AR aging, collections, outstanding balances\n`;
    content += `- **"Profitability report"** — Margins, best/worst jobs\n`;
    content += `- **"Job status"** — Pipeline breakdown by stage\n`;
    content += `- **"Tell me about [job name]"** — Deep dive into any job\n`;
    content += `- **"Task workload"** — Overdue + upcoming tasks\n`;
    content += `- **"Overdue items"** — Everything that's past due\n`;
    content += `- **"Estimate analysis"** — Win rates, pricing guidance\n`;
    content += `- **"Find [contact name]"** — Contact lookup with related jobs\n`;
    content += `- **"Leads"** — Active leads and follow-up recommendations\n`;
    content += `- **"Vendor spend"** — PO analysis by vendor\n`;
    content += `- **"Cost catalog"** — Browse or search your price list\n`;

    content += `\n### Actions I Can Take\n`;
    content += `- **"Create a job called [name]"** — Start a new project\n`;
    content += `- **"Add a task: [title]"** — Create a task on a job\n`;
    content += `- **"Add customer [name]"** — Create a new contact\n`;
    content += `- **"Log for [job]: [notes]"** — Create a daily log entry\n`;
    content += `- **"Move [job] to In Progress"** — Update job status\n`;
    content += `- **"Mark [task] as done"** — Complete a task\n`;

    content += `\n### Tips\n`;
    content += `- Use **quotes** around names: *"Tell me about 'Smith Renovation'"*\n`;
    content += `- I pull live data from your JobTread account\n`;
    content += `- All write actions require your confirmation before executing\n`;

    return { content };
  },

  // ---- General / Fallback ----
  async general(msg, client) {
    const ctx = await client.fetchAllCoreData();
    const health = DataAnalysis.businessHealth(ctx);

    let content = `Here's a quick snapshot of your business:\n\n`;
    content += `- **${health.activeJobs} active jobs** with ${Format.currency(health.totalRevenue)} total revenue\n`;
    content += `- **${Format.percent(health.avgMargin)} average margin** across all jobs\n`;
    content += `- **${health.overdueInvoiceCount} overdue invoices** totaling ${Format.currency(health.overdueInvoiceTotal)}\n`;
    content += `- **${health.pendingTaskCount} pending tasks** (${health.overdueTaskCount} overdue)\n`;
    content += `- **${health.totalContacts} contacts** in your CRM\n`;

    // Try to detect if the user asked about a specific entity
    const job = DataAnalysis.findJob(ctx, msg);
    if (job) {
      content += `\n---\n\nDid you mean the job **${job.name}** (${Format.statusLabel(job.status)})? Say *"Tell me about '${job.name}'"* for full details.\n`;
    }

    const contact = DataAnalysis.findContact(ctx, msg);
    if (contact) {
      content += `\nI found a contact: **${Format.contactName(contact)}**. Say *"Find '${contact.firstName} ${contact.lastName}'"* for full details.\n`;
    }

    content += `\nI can help you dig deeper. Try:\n`;
    content += `- "Business health check"\n`;
    content += `- "Cash flow forecast"\n`;
    content += `- "Job status report"\n`;
    content += `- "Task workload"\n`;
    content += `- "Help" for all commands\n`;

    return { content };
  },
};

// =============================================================================
// Section 4 — Helpers
// =============================================================================

function extractAfterKeyword(msg: string, keywords: string[]): string | null {
  const lower = msg.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      const after = msg
        .slice(idx + kw.length)
        .replace(/^[\s:]+/, '')
        .trim();
      if (after.length >= 2) return after;
    }
  }
  return null;
}

function getDefaultSuggestions(intent: ChatIntent): string[] {
  const map: Partial<Record<ChatIntent, string[]>> = {
    business_health: ['Cash flow', 'Profitability', 'Overdue items'],
    cash_flow: ['Overdue invoices', 'Job status', 'Business overview'],
    profitability: ['Best margin jobs', 'Estimate analysis', 'Cash flow'],
    job_status: ['Active jobs detail', 'Overdue items', 'Task workload'],
    task_workload: ['Overdue tasks', 'Job status', 'Business overview'],
    overdue_items: ['Cash flow', 'Task workload', 'Job status'],
    estimate_analysis: ['Profitability', 'Cost catalog', 'Create estimate'],
    contact_lookup: ['Lead management', 'Job status', 'Business overview'],
    lead_management: ['Contact lookup', 'Estimate analysis', 'Business overview'],
    vendor_spend: ['Cost catalog', 'Profitability', 'Purchase orders'],
    help: ['Business overview', 'Job status', 'Cash flow'],
  };
  return map[intent] || ['Business overview', 'Job status', 'Help'];
}

// =============================================================================
// Section 5 — Action Executor
// Executes confirmed write actions against the JobTread API.
// =============================================================================

export async function executeAction(
  action: PendingAction,
  accessToken: string
): Promise<{ success: boolean; message: string; data?: unknown }> {
  const client = createMasterClient(accessToken);

  try {
    switch (action.entity) {
      case 'job': {
        if (action.type === 'create') {
          const result = await client.createJob(action.params);
          return {
            success: true,
            message: `Job "${result.name}" created (${result.number || result.id}).`,
            data: result,
          };
        }
        if (action.type === 'update') {
          const { id, ...input } = action.params as { id: string; [key: string]: unknown };
          const result = await client.updateJob(id, input);
          return {
            success: true,
            message: `Job "${result.name}" updated to ${result.status}.`,
            data: result,
          };
        }
        break;
      }

      case 'task': {
        if (action.type === 'create') {
          const { jobId, ...input } = action.params as { jobId: string; [key: string]: unknown };
          const result = await client.createTask(jobId, input as { title: string });
          return {
            success: true,
            message: `Task "${result.title}" created.`,
            data: result,
          };
        }
        if (action.type === 'update') {
          const { id, status } = action.params as { id: string; status: string };
          const result = await client.updateTaskStatus(id, status);
          return {
            success: true,
            message: `Task "${result.title}" marked as ${result.status}.`,
            data: result,
          };
        }
        break;
      }

      case 'contact': {
        if (action.type === 'create') {
          const result = await client.createContact(action.params);
          return {
            success: true,
            message: `Contact "${result.firstName} ${result.lastName}" created.`,
            data: result,
          };
        }
        break;
      }

      case 'dailyLog': {
        if (action.type === 'create') {
          const { jobId, ...input } = action.params as { jobId: string; notes: string; weather?: string };
          const result = await client.createDailyLog(jobId, input);
          return {
            success: true,
            message: `Daily log created for ${Format.date(result.date)}.`,
            data: result,
          };
        }
        break;
      }

      default:
        return { success: false, message: `Unknown entity type: ${action.entity}` };
    }

    return { success: false, message: 'Action type not supported.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Failed: ${errorMessage}` };
  }
}
