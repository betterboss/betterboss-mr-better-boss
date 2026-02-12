// =============================================================================
// JobTread API Master File
// Single source of truth for all JobTread GraphQL API operations.
// Designed for AI chatbot consumption — every query, mutation, type, and
// helper needed to power an intelligent construction-management assistant.
// =============================================================================

import type {
  JobTreadJob,
  JobTreadContact,
  JobTreadEstimate,
  JobTreadTask,
  JobTreadInvoice,
  JobTreadPurchaseOrder,
  JobTreadDailyLog,
  JobTreadUser,
  CostCatalogItem,
  DashboardMetrics,
  PaginatedResponse,
  JobTreadLineItem,
  JobBudget,
  JobStatus,
  ContactType,
  EstimateStatus,
  TaskStatus,
  TaskPriority,
  InvoiceStatus,
  POStatus,
} from '@/types/jobtread';

// Re-export all types so consumers only need this file
export type {
  JobTreadJob,
  JobTreadContact,
  JobTreadEstimate,
  JobTreadTask,
  JobTreadInvoice,
  JobTreadPurchaseOrder,
  JobTreadDailyLog,
  JobTreadUser,
  CostCatalogItem,
  DashboardMetrics,
  PaginatedResponse,
  JobTreadLineItem,
  JobBudget,
  JobStatus,
  ContactType,
  EstimateStatus,
  TaskStatus,
  TaskPriority,
  InvoiceStatus,
  POStatus,
};

// =============================================================================
// Section 1 — API Configuration
// =============================================================================

const JOBTREAD_API_URL =
  process.env.JOBTREAD_API_URL || 'https://api.jobtread.com/graphql';

// =============================================================================
// Section 2 — GraphQL Fragment Library
// Reusable field selections shared across queries to keep things DRY.
// =============================================================================

export const FRAGMENTS = {
  address: `street1 street2 city state zip country lat lng`,

  contactCore: `id type firstName lastName company email phone`,

  budgetFull: `
    estimatedRevenue estimatedCost estimatedProfit estimatedMargin
    actualRevenue actualCost actualProfit actualMargin
    invoiced paid outstanding
  `,

  lineItem: `
    id name description category quantity unit
    unitCost unitPrice totalCost totalPrice markup costCode
  `,

  pageInfo: `hasNextPage hasPreviousPage startCursor endCursor`,

  taskCore: `id jobId title description status priority dueDate completedAt createdAt updatedAt`,

  invoiceCore: `id jobId number status subtotal tax total dueDate paidAt sentAt createdAt updatedAt`,
} as const;

// =============================================================================
// Section 3 — Named Queries
// Every read operation the chatbot or UI might need.
// =============================================================================

export const QUERIES = {
  // -- User & Org --
  currentUser: `
    query GetCurrentUser {
      me {
        id email firstName lastName phone role avatarUrl
        organization {
          id name logoUrl phone email
          address { ${FRAGMENTS.address} }
          settings { currency timezone taxRate defaultMarkup }
        }
        createdAt updatedAt
      }
    }`,

  // -- Jobs --
  jobs: `
    query GetJobs($first: Int, $after: String, $status: String, $search: String) {
      jobs(first: $first, after: $after, filter: { status: $status, search: $search }) {
        data {
          id name number status stage description
          startDate endDate createdAt updatedAt tags
          customer { ${FRAGMENTS.contactCore} }
          address { ${FRAGMENTS.address} }
          budget { ${FRAGMENTS.budgetFull} }
        }
        totalCount
        pageInfo { ${FRAGMENTS.pageInfo} }
      }
    }`,

  job: `
    query GetJob($id: ID!) {
      job(id: $id) {
        id name number status stage description
        startDate endDate createdAt updatedAt tags
        customer { ${FRAGMENTS.contactCore} }
        address { ${FRAGMENTS.address} }
        budget { ${FRAGMENTS.budgetFull} }
        tasks {
          ${FRAGMENTS.taskCore}
          assignee { id firstName lastName }
        }
        documents { id name type url createdAt }
        dailyLogs { id date notes weather createdAt }
      }
    }`,

  // -- Contacts --
  contacts: `
    query GetContacts($first: Int, $after: String, $type: String, $search: String) {
      contacts(first: $first, after: $after, filter: { type: $type, search: $search }) {
        data {
          ${FRAGMENTS.contactCore}
          address { ${FRAGMENTS.address} }
          tags source notes createdAt updatedAt
        }
        totalCount
        pageInfo { ${FRAGMENTS.pageInfo} }
      }
    }`,

  // -- Estimates --
  estimates: `
    query GetEstimates($jobId: ID, $status: String) {
      estimates(filter: { jobId: $jobId, status: $status }) {
        data {
          id jobId name status subtotal tax total markup
          notes validUntil sentAt signedAt createdAt updatedAt
          lineItems { ${FRAGMENTS.lineItem} }
        }
      }
    }`,

  // -- Tasks --
  tasks: `
    query GetTasks($jobId: ID, $status: String, $assigneeId: ID) {
      tasks(filter: { jobId: $jobId, status: $status, assigneeId: $assigneeId }) {
        data {
          ${FRAGMENTS.taskCore}
          assignee { id firstName lastName }
        }
      }
    }`,

  // -- Invoices --
  invoices: `
    query GetInvoices($jobId: ID, $status: String) {
      invoices(filter: { jobId: $jobId, status: $status }) {
        data {
          ${FRAGMENTS.invoiceCore}
          lineItems { id name quantity unitPrice totalPrice }
        }
      }
    }`,

  // -- Purchase Orders --
  purchaseOrders: `
    query GetPurchaseOrders($jobId: ID, $status: String) {
      purchaseOrders(filter: { jobId: $jobId, status: $status }) {
        data {
          id jobId number status subtotal tax total
          approvedAt sentAt receivedAt createdAt updatedAt
          vendor { ${FRAGMENTS.contactCore} }
          lineItems { id name quantity unitCost totalCost }
        }
      }
    }`,

  // -- Cost Catalog --
  costCatalog: `
    query GetCostCatalog($category: String, $search: String) {
      costCatalog(filter: { category: $category, search: $search }) {
        data {
          id name description category unit
          unitCost unitPrice markup vendor sku isActive
        }
      }
    }`,

  // -- Change Orders --
  changeOrders: `
    query GetChangeOrders($jobId: ID, $status: String) {
      changeOrders(filter: { jobId: $jobId, status: $status }) {
        data {
          id jobId name description status
          subtotal tax total markup
          approvedAt createdAt updatedAt
          lineItems { ${FRAGMENTS.lineItem} }
        }
      }
    }`,

  // -- Bills --
  bills: `
    query GetBills($jobId: ID, $status: String, $vendorId: ID) {
      bills(filter: { jobId: $jobId, status: $status, vendorId: $vendorId }) {
        data {
          id jobId number status subtotal tax total
          vendor { ${FRAGMENTS.contactCore} }
          purchaseOrderId dueDate paidAt createdAt updatedAt
          lineItems { id name quantity unitCost totalCost costCode }
        }
      }
    }`,

  // -- Time Entries --
  timeEntries: `
    query GetTimeEntries($jobId: ID, $userId: ID, $startDate: String, $endDate: String) {
      timeEntries(filter: { jobId: $jobId, userId: $userId, startDate: $startDate, endDate: $endDate }) {
        data {
          id jobId userId date hours description
          costCode rate totalCost
          user { id firstName lastName }
          createdAt updatedAt
        }
      }
    }`,

  // -- Payments --
  payments: `
    query GetPayments($jobId: ID, $invoiceId: ID) {
      payments(filter: { jobId: $jobId, invoiceId: $invoiceId }) {
        data {
          id invoiceId amount method reference
          receivedAt createdAt
        }
      }
    }`,

  // -- Dashboard --
  dashboard: `
    query GetDashboardMetrics {
      dashboard {
        activeJobs totalRevenue totalProfit avgMargin
        outstandingInvoices overdueInvoices
        leadsThisMonth conversionRate
        upcomingTasks overdueTasks
      }
    }`,
} as const;

// =============================================================================
// Section 4 — Named Mutations
// Every write operation the chatbot can trigger on behalf of the user.
// =============================================================================

export const MUTATIONS = {
  // -- Jobs --
  createJob: `
    mutation CreateJob($input: CreateJobInput!) {
      createJob(input: $input) {
        id name number status createdAt
      }
    }`,

  updateJob: `
    mutation UpdateJob($id: ID!, $input: UpdateJobInput!) {
      updateJob(id: $id, input: $input) {
        id name status stage description startDate endDate updatedAt
      }
    }`,

  updateJobStatus: `
    mutation UpdateJobStatus($id: ID!, $status: String!) {
      updateJob(id: $id, input: { status: $status }) {
        id name status updatedAt
      }
    }`,

  // -- Contacts --
  createContact: `
    mutation CreateContact($input: CreateContactInput!) {
      createContact(input: $input) {
        id type firstName lastName company email phone createdAt
      }
    }`,

  updateContact: `
    mutation UpdateContact($id: ID!, $input: UpdateContactInput!) {
      updateContact(id: $id, input: $input) {
        id type firstName lastName company email phone updatedAt
      }
    }`,

  // -- Estimates --
  createEstimate: `
    mutation CreateEstimate($jobId: ID!, $input: CreateEstimateInput!) {
      createEstimate(jobId: $jobId, input: $input) {
        id name status subtotal tax total createdAt
        lineItems { ${FRAGMENTS.lineItem} }
      }
    }`,

  // -- Tasks --
  createTask: `
    mutation CreateTask($jobId: ID!, $input: CreateTaskInput!) {
      createTask(jobId: $jobId, input: $input) {
        id title status priority dueDate createdAt
      }
    }`,

  updateTask: `
    mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
      updateTask(id: $id, input: $input) {
        id title status priority dueDate updatedAt
      }
    }`,

  updateTaskStatus: `
    mutation UpdateTaskStatus($id: ID!, $status: String!) {
      updateTask(id: $id, input: { status: $status }) {
        id title status updatedAt
      }
    }`,

  // -- Daily Logs --
  createDailyLog: `
    mutation CreateDailyLog($jobId: ID!, $input: CreateDailyLogInput!) {
      createDailyLog(jobId: $jobId, input: $input) {
        id date notes weather createdAt
      }
    }`,

  // -- Invoices --
  createInvoice: `
    mutation CreateInvoice($jobId: ID!, $input: CreateInvoiceInput!) {
      createInvoice(jobId: $jobId, input: $input) {
        id number status subtotal tax total createdAt
        lineItems { id name quantity unitPrice totalPrice }
      }
    }`,

  // -- Purchase Orders --
  createPurchaseOrder: `
    mutation CreatePurchaseOrder($jobId: ID!, $input: CreatePurchaseOrderInput!) {
      createPurchaseOrder(jobId: $jobId, input: $input) {
        id number status subtotal tax total createdAt
        vendor { ${FRAGMENTS.contactCore} }
        lineItems { id name quantity unitCost totalCost }
      }
    }`,

  // -- Change Orders --
  createChangeOrder: `
    mutation CreateChangeOrder($jobId: ID!, $input: CreateChangeOrderInput!) {
      createChangeOrder(jobId: $jobId, input: $input) {
        id name status subtotal tax total createdAt
        lineItems { ${FRAGMENTS.lineItem} }
      }
    }`,

  // -- Time Entries --
  createTimeEntry: `
    mutation CreateTimeEntry($jobId: ID!, $input: CreateTimeEntryInput!) {
      createTimeEntry(jobId: $jobId, input: $input) {
        id date hours description costCode rate totalCost createdAt
      }
    }`,

  // -- Files --
  uploadFile: `
    mutation UploadFile($jobId: ID!, $input: UploadFileInput!) {
      uploadFile(jobId: $jobId, input: $input) {
        id name type url createdAt
      }
    }`,

  // -- Comments --
  createComment: `
    mutation CreateComment($entityType: String!, $entityId: ID!, $input: CreateCommentInput!) {
      createComment(entityType: $entityType, entityId: $entityId, input: $input) {
        id text createdAt
        author { id firstName lastName }
      }
    }`,

  // -- Locations --
  createLocation: `
    mutation CreateLocation($entityType: String!, $entityId: ID!, $input: CreateLocationInput!) {
      createLocation(entityType: $entityType, entityId: $entityId, input: $input) {
        id name address { ${FRAGMENTS.address} }
        createdAt
      }
    }`,
} as const;

// =============================================================================
// Section 5 — GraphQL Transport
// Low-level fetch wrapper shared by the master client.
// =============================================================================

interface GraphQLError {
  message: string;
  path?: string[];
  extensions?: Record<string, unknown>;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

async function gqlFetch<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
  apiUrl?: string
): Promise<T> {
  const url = apiUrl || JOBTREAD_API_URL;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new JobTreadAPIError(
        'Authentication failed. Check your API key in JobTread Settings > API.',
        'AUTH_FAILED',
        status
      );
    }
    throw new JobTreadAPIError(
      `JobTread API returned HTTP ${status}`,
      'HTTP_ERROR',
      status
    );
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    const messages = result.errors.map((e) => e.message).join('; ');
    throw new JobTreadAPIError(messages, 'GRAPHQL_ERROR');
  }

  if (!result.data) {
    throw new JobTreadAPIError('Empty response from JobTread API', 'EMPTY_RESPONSE');
  }

  return result.data;
}

// =============================================================================
// Section 6 — Error Types
// =============================================================================

export class JobTreadAPIError extends Error {
  code: string;
  httpStatus?: number;

  constructor(message: string, code: string, httpStatus?: number) {
    super(message);
    this.name = 'JobTreadAPIError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// =============================================================================
// Section 7 — Master Client
// The single comprehensive client for all JobTread operations.
// Each method is documented with what it does, so the AI chatbot can decide
// which methods to call for any given user question.
// =============================================================================

export class JobTreadMasterClient {
  private token: string;
  private apiUrl: string;

  constructor(token: string, apiUrl?: string) {
    this.token = token;
    this.apiUrl = apiUrl || JOBTREAD_API_URL;
  }

  private fetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return gqlFetch<T>(this.token, query, variables, this.apiUrl);
  }

  // ---------------------------------------------------------------------------
  // User & Organization
  // ---------------------------------------------------------------------------

  /** Get the authenticated user's profile and organization settings. */
  async getCurrentUser(): Promise<JobTreadUser> {
    const d = await this.fetch<{ me: JobTreadUser }>(QUERIES.currentUser);
    return d.me;
  }

  // ---------------------------------------------------------------------------
  // Jobs — the core entity in JobTread
  // ---------------------------------------------------------------------------

  /**
   * List jobs with optional filtering and cursor-based pagination.
   * Use status filter to find jobs at a specific stage (LEAD, ESTIMATE,
   * PROPOSAL, CONTRACT, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED).
   */
  async getJobs(
    filters?: { status?: string; search?: string },
    pagination?: { first?: number; after?: string }
  ): Promise<PaginatedResponse<JobTreadJob>> {
    const d = await this.fetch<{ jobs: PaginatedResponse<JobTreadJob> }>(
      QUERIES.jobs,
      { first: pagination?.first ?? 100, after: pagination?.after, ...filters }
    );
    return d.jobs;
  }

  /** Get a single job by ID with full details including tasks, docs, logs. */
  async getJob(id: string): Promise<JobTreadJob> {
    const d = await this.fetch<{ job: JobTreadJob }>(QUERIES.job, { id });
    return d.job;
  }

  /** Create a new job. Pass name, customerId, status, etc. */
  async createJob(input: Record<string, unknown>): Promise<JobTreadJob> {
    const d = await this.fetch<{ createJob: JobTreadJob }>(MUTATIONS.createJob, { input });
    return d.createJob;
  }

  /** Update any fields on a job. */
  async updateJob(id: string, input: Record<string, unknown>): Promise<JobTreadJob> {
    const d = await this.fetch<{ updateJob: JobTreadJob }>(MUTATIONS.updateJob, { id, input });
    return d.updateJob;
  }

  /** Change a job's status (e.g. from ESTIMATE to CONTRACT). */
  async updateJobStatus(id: string, status: string): Promise<JobTreadJob> {
    const d = await this.fetch<{ updateJob: JobTreadJob }>(MUTATIONS.updateJobStatus, { id, status });
    return d.updateJob;
  }

  // ---------------------------------------------------------------------------
  // Contacts (Customers, Vendors, Subcontractors, Leads)
  // ---------------------------------------------------------------------------

  /** List contacts. Filter by type: CUSTOMER, VENDOR, SUBCONTRACTOR, LEAD. */
  async getContacts(
    filters?: { type?: string; search?: string },
    pagination?: { first?: number; after?: string }
  ): Promise<PaginatedResponse<JobTreadContact>> {
    const d = await this.fetch<{ contacts: PaginatedResponse<JobTreadContact> }>(
      QUERIES.contacts,
      { first: pagination?.first ?? 100, after: pagination?.after, ...filters }
    );
    return d.contacts;
  }

  /** Create a new contact (customer, vendor, sub, or lead). */
  async createContact(input: Record<string, unknown>): Promise<JobTreadContact> {
    const d = await this.fetch<{ createContact: JobTreadContact }>(MUTATIONS.createContact, { input });
    return d.createContact;
  }

  /** Update an existing contact. */
  async updateContact(id: string, input: Record<string, unknown>): Promise<JobTreadContact> {
    const d = await this.fetch<{ updateContact: JobTreadContact }>(MUTATIONS.updateContact, { id, input });
    return d.updateContact;
  }

  // ---------------------------------------------------------------------------
  // Estimates
  // ---------------------------------------------------------------------------

  /** List estimates, optionally filtered by job ID or status. */
  async getEstimates(filters?: { jobId?: string; status?: string }): Promise<JobTreadEstimate[]> {
    const d = await this.fetch<{ estimates: { data: JobTreadEstimate[] } }>(QUERIES.estimates, filters);
    return d.estimates.data;
  }

  /** Create an estimate on a job with line items. */
  async createEstimate(
    jobId: string,
    input: { name: string; lineItems: Partial<JobTreadLineItem>[]; notes?: string }
  ): Promise<JobTreadEstimate> {
    const d = await this.fetch<{ createEstimate: JobTreadEstimate }>(MUTATIONS.createEstimate, { jobId, input });
    return d.createEstimate;
  }

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  /** List tasks. Filter by jobId, status, or assigneeId. */
  async getTasks(filters?: { jobId?: string; status?: string; assigneeId?: string }): Promise<JobTreadTask[]> {
    const d = await this.fetch<{ tasks: { data: JobTreadTask[] } }>(QUERIES.tasks, filters);
    return d.tasks.data;
  }

  /** Create a task on a job. */
  async createTask(
    jobId: string,
    input: { title: string; description?: string; dueDate?: string; assigneeId?: string; priority?: string }
  ): Promise<JobTreadTask> {
    const d = await this.fetch<{ createTask: JobTreadTask }>(MUTATIONS.createTask, { jobId, input });
    return d.createTask;
  }

  /** Update a task's fields. */
  async updateTask(id: string, input: Record<string, unknown>): Promise<JobTreadTask> {
    const d = await this.fetch<{ updateTask: JobTreadTask }>(MUTATIONS.updateTask, { id, input });
    return d.updateTask;
  }

  /** Mark a task as COMPLETED, IN_PROGRESS, etc. */
  async updateTaskStatus(id: string, status: string): Promise<JobTreadTask> {
    const d = await this.fetch<{ updateTask: JobTreadTask }>(MUTATIONS.updateTaskStatus, { id, status });
    return d.updateTask;
  }

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------

  /** List invoices. Filter by jobId or status (DRAFT, SENT, PAID, OVERDUE…). */
  async getInvoices(filters?: { jobId?: string; status?: string }): Promise<JobTreadInvoice[]> {
    const d = await this.fetch<{ invoices: { data: JobTreadInvoice[] } }>(QUERIES.invoices, filters);
    return d.invoices.data;
  }

  /** Create an invoice on a job. */
  async createInvoice(
    jobId: string,
    input: { lineItems: Partial<JobTreadLineItem>[]; dueDate?: string; notes?: string }
  ): Promise<JobTreadInvoice> {
    const d = await this.fetch<{ createInvoice: JobTreadInvoice }>(MUTATIONS.createInvoice, { jobId, input });
    return d.createInvoice;
  }

  // ---------------------------------------------------------------------------
  // Purchase Orders
  // ---------------------------------------------------------------------------

  /** List purchase orders. Filter by jobId or status. */
  async getPurchaseOrders(filters?: { jobId?: string; status?: string }): Promise<JobTreadPurchaseOrder[]> {
    const d = await this.fetch<{ purchaseOrders: { data: JobTreadPurchaseOrder[] } }>(QUERIES.purchaseOrders, filters);
    return d.purchaseOrders.data;
  }

  /** Create a purchase order on a job. */
  async createPurchaseOrder(
    jobId: string,
    input: { vendorId: string; lineItems: Partial<JobTreadLineItem>[]; notes?: string }
  ): Promise<JobTreadPurchaseOrder> {
    const d = await this.fetch<{ createPurchaseOrder: JobTreadPurchaseOrder }>(MUTATIONS.createPurchaseOrder, { jobId, input });
    return d.createPurchaseOrder;
  }

  // ---------------------------------------------------------------------------
  // Change Orders
  // ---------------------------------------------------------------------------

  /** List change orders for a job. */
  async getChangeOrders(filters?: { jobId?: string; status?: string }): Promise<ChangeOrder[]> {
    const d = await this.fetch<{ changeOrders: { data: ChangeOrder[] } }>(QUERIES.changeOrders, filters);
    return d.changeOrders.data;
  }

  /** Create a change order on a job. */
  async createChangeOrder(
    jobId: string,
    input: { name: string; description?: string; lineItems: Partial<JobTreadLineItem>[] }
  ): Promise<ChangeOrder> {
    const d = await this.fetch<{ createChangeOrder: ChangeOrder }>(MUTATIONS.createChangeOrder, { jobId, input });
    return d.createChangeOrder;
  }

  // ---------------------------------------------------------------------------
  // Bills (Vendor billing matched to POs)
  // ---------------------------------------------------------------------------

  /** List bills. Filter by jobId, status, or vendorId. */
  async getBills(filters?: { jobId?: string; status?: string; vendorId?: string }): Promise<Bill[]> {
    const d = await this.fetch<{ bills: { data: Bill[] } }>(QUERIES.bills, filters);
    return d.bills.data;
  }

  // ---------------------------------------------------------------------------
  // Time Entries
  // ---------------------------------------------------------------------------

  /** List time entries. Filter by job, user, or date range. */
  async getTimeEntries(
    filters?: { jobId?: string; userId?: string; startDate?: string; endDate?: string }
  ): Promise<TimeEntry[]> {
    const d = await this.fetch<{ timeEntries: { data: TimeEntry[] } }>(QUERIES.timeEntries, filters);
    return d.timeEntries.data;
  }

  /** Log time on a job. */
  async createTimeEntry(
    jobId: string,
    input: { date: string; hours: number; description?: string; costCode?: string; rate?: number }
  ): Promise<TimeEntry> {
    const d = await this.fetch<{ createTimeEntry: TimeEntry }>(MUTATIONS.createTimeEntry, { jobId, input });
    return d.createTimeEntry;
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  /** List payments for a job or invoice. */
  async getPayments(filters?: { jobId?: string; invoiceId?: string }): Promise<Payment[]> {
    const d = await this.fetch<{ payments: { data: Payment[] } }>(QUERIES.payments, filters);
    return d.payments.data;
  }

  // ---------------------------------------------------------------------------
  // Cost Catalog
  // ---------------------------------------------------------------------------

  /** Search or browse the cost catalog. Filter by category or keyword. */
  async getCostCatalog(filters?: { category?: string; search?: string }): Promise<CostCatalogItem[]> {
    const d = await this.fetch<{ costCatalog: { data: CostCatalogItem[] } }>(QUERIES.costCatalog, filters);
    return d.costCatalog.data;
  }

  // ---------------------------------------------------------------------------
  // Daily Logs
  // ---------------------------------------------------------------------------

  /** Create a daily log entry for a job. */
  async createDailyLog(
    jobId: string,
    input: { notes: string; weather?: string }
  ): Promise<JobTreadDailyLog> {
    const d = await this.fetch<{ createDailyLog: JobTreadDailyLog }>(MUTATIONS.createDailyLog, { jobId, input });
    return d.createDailyLog;
  }

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  /** Add a comment to any entity (job, task, invoice, etc.). */
  async createComment(
    entityType: string,
    entityId: string,
    input: { text: string }
  ): Promise<Comment> {
    const d = await this.fetch<{ createComment: Comment }>(
      MUTATIONS.createComment,
      { entityType, entityId, input }
    );
    return d.createComment;
  }

  // ---------------------------------------------------------------------------
  // Dashboard / Analytics
  // ---------------------------------------------------------------------------

  /** Get high-level business KPIs for the dashboard. */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const d = await this.fetch<{ dashboard: DashboardMetrics }>(QUERIES.dashboard);
    return d.dashboard;
  }

  // ---------------------------------------------------------------------------
  // Bulk Data Fetch — for chatbot context building
  // Fetches all core data in parallel for fast AI responses.
  // ---------------------------------------------------------------------------

  /**
   * Fetch all primary data sources in parallel.
   * Used by the chatbot to build a complete picture before answering.
   */
  async fetchAllCoreData(): Promise<ChatbotContext> {
    const [jobsResult, contacts, invoices, tasks, estimates, pos] =
      await Promise.all([
        this.getJobs(undefined, { first: 200 }),
        this.getContacts(undefined, { first: 200 }).then((r) => r.data),
        this.getInvoices(),
        this.getTasks(),
        this.getEstimates(),
        this.getPurchaseOrders(),
      ]);

    return {
      jobs: jobsResult.data,
      contacts,
      invoices,
      tasks,
      estimates,
      purchaseOrders: pos,
      fetchedAt: new Date().toISOString(),
    };
  }
}

// =============================================================================
// Section 8 — Extended Types
// Types for entities not yet in the main types file.
// =============================================================================

export interface ChangeOrder {
  id: string;
  jobId: string;
  name: string;
  description?: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  markup?: number;
  lineItems: JobTreadLineItem[];
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  jobId: string;
  number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  vendor: JobTreadContact;
  purchaseOrderId?: string;
  dueDate?: string;
  paidAt?: string;
  lineItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    costCode?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  jobId: string;
  userId: string;
  date: string;
  hours: number;
  description?: string;
  costCode?: string;
  rate?: number;
  totalCost?: number;
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method?: string;
  reference?: string;
  receivedAt: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  text: string;
  author?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

// =============================================================================
// Section 9 — Chatbot Context Type
// The full data snapshot the AI chatbot works with.
// =============================================================================

export interface ChatbotContext {
  jobs: JobTreadJob[];
  contacts: JobTreadContact[];
  invoices: JobTreadInvoice[];
  tasks: JobTreadTask[];
  estimates: JobTreadEstimate[];
  purchaseOrders: JobTreadPurchaseOrder[];
  fetchedAt: string;
}

// =============================================================================
// Section 10 — Data Analysis Utilities
// Pure functions that analyze JobTread data and return structured insights.
// These are the building blocks the chatbot uses to generate responses.
// =============================================================================

export const DataAnalysis = {
  /** Compute overall business health metrics from raw data. */
  businessHealth(ctx: ChatbotContext): BusinessHealthMetrics {
    const { jobs, invoices, tasks, contacts } = ctx;

    const activeJobs = jobs.filter(
      (j) => j.status === 'IN_PROGRESS' || j.status === 'CONTRACT'
    );
    const totalRevenue = jobs.reduce((s, j) => s + (j.budget?.estimatedRevenue ?? 0), 0);
    const totalCost = jobs.reduce((s, j) => s + (j.budget?.estimatedCost ?? 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const now = new Date();
    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status === 'PAID' || inv.status === 'VOID' || !inv.dueDate) return false;
      return new Date(inv.dueDate) < now;
    });
    const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.total ?? 0), 0);

    const overdueTasks = tasks.filter((t) => {
      if (t.status === 'COMPLETED' || !t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });
    const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

    const totalOutstanding = jobs.reduce((s, j) => s + (j.budget?.outstanding ?? 0), 0);
    const totalInvoiced = jobs.reduce((s, j) => s + (j.budget?.invoiced ?? 0), 0);
    const totalPaid = jobs.reduce((s, j) => s + (j.budget?.paid ?? 0), 0);

    // Job pipeline breakdown
    const pipeline: Record<string, { count: number; value: number }> = {};
    for (const j of jobs) {
      if (!pipeline[j.status]) pipeline[j.status] = { count: 0, value: 0 };
      pipeline[j.status].count++;
      pipeline[j.status].value += j.budget?.estimatedRevenue ?? 0;
    }

    return {
      totalJobs: jobs.length,
      activeJobs: activeJobs.length,
      totalRevenue,
      totalCost,
      totalProfit,
      avgMargin,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      overdueInvoiceCount: overdueInvoices.length,
      overdueInvoiceTotal: overdueTotal,
      overdueTaskCount: overdueTasks.length,
      pendingTaskCount: pendingTasks.length,
      totalContacts: contacts.length,
      pipeline,
      topJobs: [...activeJobs]
        .sort((a, b) => (b.budget?.estimatedRevenue ?? 0) - (a.budget?.estimatedRevenue ?? 0))
        .slice(0, 5),
      overdueInvoices,
      overdueTasks,
      pendingTasks: pendingTasks.slice(0, 10),
    };
  },

  /** Analyze cash flow: inflows, outflows, AR aging. */
  cashFlow(ctx: ChatbotContext): CashFlowAnalysis {
    const { jobs, invoices } = ctx;
    const now = new Date();

    const outstanding = invoices.filter(
      (inv) => inv.status !== 'PAID' && inv.status !== 'VOID'
    );
    const aging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90plus: 0,
    };

    for (const inv of outstanding) {
      if (!inv.dueDate) {
        aging.current += inv.total ?? 0;
        continue;
      }
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysOverdue <= 0) aging.current += inv.total ?? 0;
      else if (daysOverdue <= 30) aging.days30 += inv.total ?? 0;
      else if (daysOverdue <= 60) aging.days60 += inv.total ?? 0;
      else aging.days90plus += inv.total ?? 0;
    }

    const activeRevenue = jobs
      .filter((j) => j.status === 'IN_PROGRESS' || j.status === 'CONTRACT')
      .reduce((s, j) => s + (j.budget?.estimatedRevenue ?? 0), 0);

    return {
      totalInvoiced: jobs.reduce((s, j) => s + (j.budget?.invoiced ?? 0), 0),
      totalCollected: jobs.reduce((s, j) => s + (j.budget?.paid ?? 0), 0),
      totalOutstanding: jobs.reduce((s, j) => s + (j.budget?.outstanding ?? 0), 0),
      aging,
      activeJobRevenue: activeRevenue,
      outstandingInvoices: outstanding,
    };
  },

  /** Analyze profitability across jobs. Identify best/worst performers. */
  profitability(ctx: ChatbotContext): ProfitabilityAnalysis {
    const jobsWithBudget = ctx.jobs.filter((j) => j.budget?.estimatedRevenue);
    const sorted = [...jobsWithBudget].sort(
      (a, b) => (b.budget?.estimatedMargin ?? 0) - (a.budget?.estimatedMargin ?? 0)
    );

    const totalRevenue = jobsWithBudget.reduce((s, j) => s + (j.budget?.estimatedRevenue ?? 0), 0);
    const totalCost = jobsWithBudget.reduce((s, j) => s + (j.budget?.estimatedCost ?? 0), 0);
    const totalProfit = totalRevenue - totalCost;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      overallMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      bestMarginJobs: sorted.slice(0, 5),
      worstMarginJobs: sorted.slice(-5).reverse(),
      avgJobRevenue: jobsWithBudget.length > 0 ? totalRevenue / jobsWithBudget.length : 0,
      jobCount: jobsWithBudget.length,
    };
  },

  /** Get task workload summary: overdue, upcoming, by status. */
  taskWorkload(ctx: ChatbotContext): TaskWorkloadSummary {
    const { tasks } = ctx;
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdue = tasks.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED' || !t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });

    const dueThisWeek = tasks.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED' || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= now && d <= nextWeek;
    });

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.priority) byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    }

    return {
      total: tasks.length,
      overdue,
      dueThisWeek,
      byStatus,
      byPriority,
    };
  },

  /** Summarize estimate win/loss rates. */
  estimateAnalysis(ctx: ChatbotContext): EstimateAnalysisSummary {
    const { estimates } = ctx;
    const byStatus: Record<string, number> = {};
    for (const e of estimates) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }

    const totalValue = estimates.reduce((s, e) => s + (e.total ?? 0), 0);
    const accepted = estimates.filter((e) => e.status === 'ACCEPTED');
    const acceptedValue = accepted.reduce((s, e) => s + (e.total ?? 0), 0);
    const winRate =
      estimates.length > 0
        ? (accepted.length / estimates.filter((e) => e.status === 'ACCEPTED' || e.status === 'DECLINED').length) * 100
        : 0;

    return {
      total: estimates.length,
      byStatus,
      totalValue,
      acceptedValue,
      winRate: isNaN(winRate) ? 0 : winRate,
      avgEstimateValue: estimates.length > 0 ? totalValue / estimates.length : 0,
    };
  },

  /** Analyze PO spending by vendor. */
  vendorSpend(ctx: ChatbotContext): VendorSpendSummary {
    const { purchaseOrders } = ctx;
    const byVendor: Record<string, { name: string; total: number; count: number }> = {};

    for (const po of purchaseOrders) {
      const vendorName = po.vendor?.company || `${po.vendor?.firstName ?? ''} ${po.vendor?.lastName ?? ''}`.trim() || 'Unknown';
      const key = po.vendor?.id || vendorName;
      if (!byVendor[key]) byVendor[key] = { name: vendorName, total: 0, count: 0 };
      byVendor[key].total += po.total ?? 0;
      byVendor[key].count++;
    }

    const sorted = Object.values(byVendor).sort((a, b) => b.total - a.total);

    return {
      totalPOs: purchaseOrders.length,
      totalSpend: purchaseOrders.reduce((s, po) => s + (po.total ?? 0), 0),
      topVendors: sorted.slice(0, 10),
    };
  },

  /** Find a job by name, number, or customer name (fuzzy). */
  findJob(ctx: ChatbotContext, query: string): JobTreadJob | undefined {
    const q = query.toLowerCase();
    return ctx.jobs.find(
      (j) =>
        j.name?.toLowerCase().includes(q) ||
        j.number?.toLowerCase().includes(q) ||
        `${j.customer?.firstName ?? ''} ${j.customer?.lastName ?? ''}`.toLowerCase().includes(q) ||
        j.customer?.company?.toLowerCase().includes(q)
    );
  },

  /** Find a contact by name, email, company, or phone. */
  findContact(ctx: ChatbotContext, query: string): JobTreadContact | undefined {
    const q = query.toLowerCase();
    return ctx.contacts.find(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  },
};

// =============================================================================
// Section 11 — Analysis Result Types
// =============================================================================

export interface BusinessHealthMetrics {
  totalJobs: number;
  activeJobs: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueInvoiceCount: number;
  overdueInvoiceTotal: number;
  overdueTaskCount: number;
  pendingTaskCount: number;
  totalContacts: number;
  pipeline: Record<string, { count: number; value: number }>;
  topJobs: JobTreadJob[];
  overdueInvoices: JobTreadInvoice[];
  overdueTasks: JobTreadTask[];
  pendingTasks: JobTreadTask[];
}

export interface CashFlowAnalysis {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  aging: {
    current: number;
    days30: number;
    days60: number;
    days90plus: number;
  };
  activeJobRevenue: number;
  outstandingInvoices: JobTreadInvoice[];
}

export interface ProfitabilityAnalysis {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  bestMarginJobs: JobTreadJob[];
  worstMarginJobs: JobTreadJob[];
  avgJobRevenue: number;
  jobCount: number;
}

export interface TaskWorkloadSummary {
  total: number;
  overdue: JobTreadTask[];
  dueThisWeek: JobTreadTask[];
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface EstimateAnalysisSummary {
  total: number;
  byStatus: Record<string, number>;
  totalValue: number;
  acceptedValue: number;
  winRate: number;
  avgEstimateValue: number;
}

export interface VendorSpendSummary {
  totalPOs: number;
  totalSpend: number;
  topVendors: Array<{ name: string; total: number; count: number }>;
}

// =============================================================================
// Section 12 — Formatting Utilities
// Human-readable formatters for chatbot responses.
// =============================================================================

export const Format = {
  currency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  currencyExact(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  percent(value: number): string {
    return `${value.toFixed(1)}%`;
  },

  number(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  },

  date(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },

  daysAgo(dateStr: string): string {
    const seconds = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 1000
    );
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  },

  daysUntil(dateStr: string): number {
    return Math.floor(
      (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  },

  jobName(job: JobTreadJob): string {
    const customer = job.customer
      ? ` (${job.customer.firstName} ${job.customer.lastName})`
      : '';
    return `${job.name}${customer}`;
  },

  contactName(contact: JobTreadContact): string {
    const company = contact.company ? ` — ${contact.company}` : '';
    return `${contact.firstName} ${contact.lastName}${company}`;
  },

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  },
};

// =============================================================================
// Section 13 — Intent Registry
// Maps natural language user intents to the API operations and analysis
// functions the chatbot should call. This is the "brain routing table."
// =============================================================================

export type ChatIntent =
  | 'business_health'
  | 'cash_flow'
  | 'profitability'
  | 'job_status'
  | 'job_detail'
  | 'task_workload'
  | 'overdue_items'
  | 'estimate_analysis'
  | 'contact_lookup'
  | 'lead_management'
  | 'vendor_spend'
  | 'create_job'
  | 'create_task'
  | 'create_contact'
  | 'create_estimate'
  | 'create_daily_log'
  | 'update_job_status'
  | 'update_task_status'
  | 'cost_catalog'
  | 'help'
  | 'general';

export interface IntentMatch {
  intent: ChatIntent;
  confidence: number;
  entities: Record<string, string>;
}

/** Keyword-based intent classifier. Fast, no external API needed. */
export function classifyIntent(message: string): IntentMatch {
  const lower = message.toLowerCase().trim();
  const entities: Record<string, string> = {};

  // Extract quoted names or IDs
  const quotedMatch = message.match(/"([^"]+)"|'([^']+)'/);
  if (quotedMatch) {
    entities.name = quotedMatch[1] || quotedMatch[2];
  }

  // Scoring: each intent gets a score based on keyword matches
  const scores: Array<{ intent: ChatIntent; score: number }> = [];

  const kw = (patterns: string[]): number =>
    patterns.filter((p) => lower.includes(p)).length;

  // Read intents
  scores.push({
    intent: 'business_health',
    score: kw(['health', 'overview', 'summary', 'how is my business', 'how are we doing', 'dashboard', 'kpi', 'metrics']),
  });
  scores.push({
    intent: 'cash_flow',
    score: kw(['cash', 'flow', 'forecast', 'ar ', 'accounts receivable', 'collection', 'aging', 'outstanding']),
  });
  scores.push({
    intent: 'profitability',
    score: kw(['profit', 'margin', 'profitability', 'roi', 'best job', 'worst job', 'money']),
  });
  scores.push({
    intent: 'job_status',
    score: kw(['job', 'project', 'status report', 'pipeline', 'active jobs', 'all jobs']),
  });
  scores.push({
    intent: 'job_detail',
    score: kw(['tell me about job', 'job detail', 'specific job', 'job info', 'project detail']),
  });
  scores.push({
    intent: 'task_workload',
    score: kw(['task', 'to do', 'todo', 'workload', 'schedule', 'due', 'assignment', 'upcoming']),
  });
  scores.push({
    intent: 'overdue_items',
    score: kw(['overdue', 'late', 'behind', 'past due', 'missed', 'delinquent']),
  });
  scores.push({
    intent: 'estimate_analysis',
    score: kw(['estimate', 'bid', 'quote', 'proposal', 'win rate', 'pricing']),
  });
  scores.push({
    intent: 'contact_lookup',
    score: kw(['contact', 'customer', 'client', 'phone', 'email', 'find person', 'look up']),
  });
  scores.push({
    intent: 'lead_management',
    score: kw(['lead', 'prospect', 'follow up', 'new business', 'conversion', 'sales']),
  });
  scores.push({
    intent: 'vendor_spend',
    score: kw(['vendor', 'supplier', 'subcontractor', 'sub', 'spending', 'purchase order', 'po ']),
  });
  scores.push({
    intent: 'cost_catalog',
    score: kw(['cost catalog', 'cost item', 'cost code', 'material cost', 'unit cost', 'price list']),
  });

  // Write intents (check for action words)
  const hasAction = kw(['create', 'add', 'new', 'make', 'start', 'set up']);
  if (hasAction > 0) {
    scores.push({ intent: 'create_job', score: hasAction + kw(['job', 'project']) });
    scores.push({ intent: 'create_task', score: hasAction + kw(['task', 'to-do', 'todo', 'reminder']) });
    scores.push({ intent: 'create_contact', score: hasAction + kw(['contact', 'customer', 'vendor', 'lead']) });
    scores.push({ intent: 'create_estimate', score: hasAction + kw(['estimate', 'quote', 'bid', 'proposal']) });
    scores.push({ intent: 'create_daily_log', score: hasAction + kw(['log', 'daily log', 'daily report', 'field note']) });
  }

  const hasUpdate = kw(['update', 'change', 'move', 'mark', 'set', 'complete', 'close', 'cancel']);
  if (hasUpdate > 0) {
    scores.push({ intent: 'update_job_status', score: hasUpdate + kw(['job', 'project', 'status']) });
    scores.push({ intent: 'update_task_status', score: hasUpdate + kw(['task', 'done', 'complete', 'finished']) });
  }

  scores.push({
    intent: 'help',
    score: kw(['help', 'what can you do', 'how do i', 'commands', 'features']),
  });

  // Pick the highest-scoring intent
  const best = scores.sort((a, b) => b.score - a.score)[0];

  if (!best || best.score === 0) {
    return { intent: 'general', confidence: 0.3, entities };
  }

  const confidence = Math.min(best.score / 3, 1);
  return { intent: best.intent, confidence, entities };
}

// =============================================================================
// Section 14 — Entity Schema Reference
// A plain-English reference the AI chatbot can use to explain JobTread's data
// model to users when they ask questions.
// =============================================================================

export const ENTITY_REFERENCE: Record<string, EntityDoc> = {
  job: {
    name: 'Job',
    description:
      'The central entity in JobTread. Represents a construction project from lead through completion. Contains budget, tasks, documents, daily logs, and customer info.',
    statuses: ['LEAD', 'ESTIMATE', 'PROPOSAL', 'CONTRACT', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
    keyFields: ['name', 'number', 'status', 'customer', 'budget', 'startDate', 'endDate', 'address'],
    relationships: ['Has many Tasks', 'Has many Estimates', 'Has many Invoices', 'Has many POs', 'Has many Change Orders', 'Has many Daily Logs', 'Belongs to a Customer'],
  },
  contact: {
    name: 'Contact',
    description: 'A person or company you work with. Can be a Customer, Vendor, Subcontractor, or Lead.',
    statuses: [],
    keyFields: ['firstName', 'lastName', 'company', 'email', 'phone', 'type', 'source'],
    relationships: ['Can be Customer on Jobs', 'Can be Vendor on POs', 'Has Locations', 'Has Contact Persons'],
  },
  estimate: {
    name: 'Estimate',
    description: 'A detailed cost breakdown and price quote for a job. Contains line items with quantities, unit costs, and markup.',
    statuses: ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
    keyFields: ['name', 'status', 'lineItems', 'subtotal', 'tax', 'total', 'validUntil'],
    relationships: ['Belongs to a Job', 'Contains Line Items'],
  },
  task: {
    name: 'Task',
    description: 'A work item or to-do on a job. Can be assigned to team members with due dates and priorities.',
    statuses: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    keyFields: ['title', 'status', 'priority', 'dueDate', 'assignee'],
    relationships: ['Belongs to a Job', 'Assigned to a User'],
  },
  invoice: {
    name: 'Invoice',
    description: 'A bill sent to a customer for work performed. Tracks payment status and aging.',
    statuses: ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID'],
    keyFields: ['number', 'status', 'total', 'dueDate', 'paidAt'],
    relationships: ['Belongs to a Job', 'Contains Line Items', 'Has Payments'],
  },
  purchaseOrder: {
    name: 'Purchase Order',
    description: 'An order placed with a vendor or subcontractor for materials or services.',
    statuses: ['DRAFT', 'PENDING', 'APPROVED', 'SENT', 'RECEIVED', 'CANCELLED'],
    keyFields: ['number', 'vendor', 'status', 'total'],
    relationships: ['Belongs to a Job', 'Has a Vendor', 'Contains Line Items', 'Matched to Bills'],
  },
  changeOrder: {
    name: 'Change Order',
    description: 'A modification to the original job scope/budget. Requires customer approval and updates the budget.',
    statuses: ['DRAFT', 'PENDING', 'APPROVED', 'DECLINED'],
    keyFields: ['name', 'description', 'status', 'total'],
    relationships: ['Belongs to a Job', 'Contains Line Items'],
  },
  dailyLog: {
    name: 'Daily Log',
    description: 'A field report capturing what happened on a job site that day, including notes, weather, and photos.',
    statuses: [],
    keyFields: ['date', 'notes', 'weather', 'photos'],
    relationships: ['Belongs to a Job', 'Created by a User'],
  },
  costCatalog: {
    name: 'Cost Catalog',
    description: 'Your master price list of materials, labor, and services. Used to quickly build estimates and budgets.',
    statuses: [],
    keyFields: ['name', 'category', 'unit', 'unitCost', 'unitPrice', 'markup'],
    relationships: ['Referenced by Line Items'],
  },
};

export interface EntityDoc {
  name: string;
  description: string;
  statuses: string[];
  keyFields: string[];
  relationships: string[];
}

// =============================================================================
// Section 15 — Factory
// =============================================================================

export function createMasterClient(accessToken: string): JobTreadMasterClient {
  return new JobTreadMasterClient(accessToken);
}
