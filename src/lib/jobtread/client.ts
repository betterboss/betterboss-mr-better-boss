// =============================================================================
// JobTread GraphQL API Client
// Handles all communication with JobTread's Open API
// =============================================================================

import type {
  JobTreadJob,
  JobTreadContact,
  JobTreadEstimate,
  JobTreadTask,
  JobTreadInvoice,
  JobTreadPurchaseOrder,
  DashboardMetrics,
  CostCatalogItem,
  PaginatedResponse,
  JobTreadDailyLog,
} from '@/types/jobtread';

const JOBTREAD_API_URL = process.env.JOBTREAD_API_URL || 'https://api.jobtread.com/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

export class JobTreadClient {
  private accessToken: string;
  private apiUrl: string;

  constructor(accessToken: string, apiUrl?: string) {
    this.accessToken = accessToken;
    this.apiUrl = apiUrl || JOBTREAD_API_URL;
  }

  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`JobTread API error: ${response.status} ${response.statusText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL Error: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    if (!result.data) {
      throw new Error('No data returned from JobTread API');
    }

    return result.data;
  }

  // ---- Jobs ----

  async getJobs(
    filters?: { status?: string; search?: string },
    pagination?: { first?: number; after?: string }
  ): Promise<PaginatedResponse<JobTreadJob>> {
    const data = await this.query<{ jobs: PaginatedResponse<JobTreadJob> }>(
      `query GetJobs($first: Int, $after: String, $status: String, $search: String) {
        jobs(first: $first, after: $after, filter: { status: $status, search: $search }) {
          data {
            id name number status stage description
            startDate endDate createdAt updatedAt tags
            customer { id firstName lastName company email phone }
            address { street1 city state zip }
            budget {
              estimatedRevenue estimatedCost estimatedProfit estimatedMargin
              actualRevenue actualCost actualProfit actualMargin
              invoiced paid outstanding
            }
          }
          totalCount
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }`,
      { ...filters, ...pagination }
    );
    return data.jobs;
  }

  async getJob(id: string): Promise<JobTreadJob> {
    const data = await this.query<{ job: JobTreadJob }>(
      `query GetJob($id: ID!) {
        job(id: $id) {
          id name number status stage description
          startDate endDate createdAt updatedAt tags
          customer { id firstName lastName company email phone }
          address { street1 street2 city state zip country lat lng }
          budget {
            estimatedRevenue estimatedCost estimatedProfit estimatedMargin
            actualRevenue actualCost actualProfit actualMargin
            invoiced paid outstanding
          }
          tasks {
            id title status priority dueDate completedAt
            assignee { id firstName lastName }
          }
          documents { id name type url createdAt }
          dailyLogs { id date notes weather createdAt }
        }
      }`,
      { id }
    );
    return data.job;
  }

  async createJob(input: Partial<JobTreadJob>): Promise<JobTreadJob> {
    const data = await this.query<{ createJob: JobTreadJob }>(
      `mutation CreateJob($input: CreateJobInput!) {
        createJob(input: $input) {
          id name number status createdAt
        }
      }`,
      { input }
    );
    return data.createJob;
  }

  async updateJobStatus(id: string, status: string): Promise<JobTreadJob> {
    const data = await this.query<{ updateJob: JobTreadJob }>(
      `mutation UpdateJobStatus($id: ID!, $status: String!) {
        updateJob(id: $id, input: { status: $status }) {
          id name status updatedAt
        }
      }`,
      { id, status }
    );
    return data.updateJob;
  }

  // ---- Contacts ----

  async getContacts(
    filters?: { type?: string; search?: string },
    pagination?: { first?: number; after?: string }
  ): Promise<PaginatedResponse<JobTreadContact>> {
    const data = await this.query<{ contacts: PaginatedResponse<JobTreadContact> }>(
      `query GetContacts($first: Int, $after: String, $type: String, $search: String) {
        contacts(first: $first, after: $after, filter: { type: $type, search: $search }) {
          data {
            id type firstName lastName company email phone
            address { street1 city state zip }
            tags source notes createdAt updatedAt
          }
          totalCount
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }`,
      { ...filters, ...pagination }
    );
    return data.contacts;
  }

  async createContact(input: Partial<JobTreadContact>): Promise<JobTreadContact> {
    const data = await this.query<{ createContact: JobTreadContact }>(
      `mutation CreateContact($input: CreateContactInput!) {
        createContact(input: $input) {
          id type firstName lastName company email phone createdAt
        }
      }`,
      { input }
    );
    return data.createContact;
  }

  // ---- Estimates ----

  async getEstimates(jobId?: string): Promise<JobTreadEstimate[]> {
    const data = await this.query<{ estimates: { data: JobTreadEstimate[] } }>(
      `query GetEstimates($jobId: ID) {
        estimates(filter: { jobId: $jobId }) {
          data {
            id jobId name status subtotal tax total markup
            notes validUntil sentAt signedAt createdAt updatedAt
            lineItems {
              id name description category quantity unit
              unitCost unitPrice totalCost totalPrice markup costCode
            }
          }
        }
      }`,
      { jobId }
    );
    return data.estimates.data;
  }

  async createEstimate(
    jobId: string,
    input: { name: string; lineItems: Partial<import('@/types/jobtread').JobTreadLineItem>[]; notes?: string }
  ): Promise<JobTreadEstimate> {
    const data = await this.query<{ createEstimate: JobTreadEstimate }>(
      `mutation CreateEstimate($jobId: ID!, $input: CreateEstimateInput!) {
        createEstimate(jobId: $jobId, input: $input) {
          id name status subtotal tax total createdAt
          lineItems { id name quantity unitCost unitPrice totalCost totalPrice }
        }
      }`,
      { jobId, input }
    );
    return data.createEstimate;
  }

  // ---- Tasks ----

  async getTasks(
    filters?: { jobId?: string; status?: string; assigneeId?: string }
  ): Promise<JobTreadTask[]> {
    const data = await this.query<{ tasks: { data: JobTreadTask[] } }>(
      `query GetTasks($jobId: ID, $status: String, $assigneeId: ID) {
        tasks(filter: { jobId: $jobId, status: $status, assigneeId: $assigneeId }) {
          data {
            id jobId title description status priority
            dueDate completedAt createdAt updatedAt
            assignee { id firstName lastName }
          }
        }
      }`,
      filters
    );
    return data.tasks.data;
  }

  async createTask(
    jobId: string,
    input: { title: string; description?: string; dueDate?: string; assigneeId?: string; priority?: string }
  ): Promise<JobTreadTask> {
    const data = await this.query<{ createTask: JobTreadTask }>(
      `mutation CreateTask($jobId: ID!, $input: CreateTaskInput!) {
        createTask(jobId: $jobId, input: $input) {
          id title status priority dueDate createdAt
        }
      }`,
      { jobId, input }
    );
    return data.createTask;
  }

  async updateTaskStatus(id: string, status: string): Promise<JobTreadTask> {
    const data = await this.query<{ updateTask: JobTreadTask }>(
      `mutation UpdateTaskStatus($id: ID!, $status: String!) {
        updateTask(id: $id, input: { status: $status }) {
          id title status updatedAt
        }
      }`,
      { id, status }
    );
    return data.updateTask;
  }

  // ---- Invoices ----

  async getInvoices(
    filters?: { jobId?: string; status?: string }
  ): Promise<JobTreadInvoice[]> {
    const data = await this.query<{ invoices: { data: JobTreadInvoice[] } }>(
      `query GetInvoices($jobId: ID, $status: String) {
        invoices(filter: { jobId: $jobId, status: $status }) {
          data {
            id jobId number status subtotal tax total
            dueDate paidAt sentAt createdAt updatedAt
            lineItems { id name quantity unitPrice totalPrice }
          }
        }
      }`,
      filters
    );
    return data.invoices.data;
  }

  // ---- Purchase Orders ----

  async getPurchaseOrders(
    filters?: { jobId?: string; status?: string }
  ): Promise<JobTreadPurchaseOrder[]> {
    const data = await this.query<{ purchaseOrders: { data: JobTreadPurchaseOrder[] } }>(
      `query GetPurchaseOrders($jobId: ID, $status: String) {
        purchaseOrders(filter: { jobId: $jobId, status: $status }) {
          data {
            id jobId number status subtotal tax total
            approvedAt sentAt receivedAt createdAt updatedAt
            vendor { id firstName lastName company }
            lineItems { id name quantity unitCost totalCost }
          }
        }
      }`,
      filters
    );
    return data.purchaseOrders.data;
  }

  // ---- Cost Catalog ----

  async getCostCatalog(
    filters?: { category?: string; search?: string }
  ): Promise<CostCatalogItem[]> {
    const data = await this.query<{ costCatalog: { data: CostCatalogItem[] } }>(
      `query GetCostCatalog($category: String, $search: String) {
        costCatalog(filter: { category: $category, search: $search }) {
          data {
            id name description category unit
            unitCost unitPrice markup vendor sku isActive
          }
        }
      }`,
      filters
    );
    return data.costCatalog.data;
  }

  // ---- Daily Logs ----

  async createDailyLog(
    jobId: string,
    input: { notes: string; weather?: string }
  ): Promise<JobTreadDailyLog> {
    const data = await this.query<{ createDailyLog: JobTreadDailyLog }>(
      `mutation CreateDailyLog($jobId: ID!, $input: CreateDailyLogInput!) {
        createDailyLog(jobId: $jobId, input: $input) {
          id date notes weather createdAt
        }
      }`,
      { jobId, input }
    );
    return data.createDailyLog;
  }

  // ---- Dashboard Aggregation ----

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const data = await this.query<{ dashboard: DashboardMetrics }>(
      `query GetDashboardMetrics {
        dashboard {
          activeJobs totalRevenue totalProfit avgMargin
          outstandingInvoices overdueInvoices
          leadsThisMonth conversionRate
          upcomingTasks overdueTasks
        }
      }`
    );
    return data.dashboard;
  }

  // ---- Current User ----

  async getCurrentUser() {
    const data = await this.query<{ me: import('@/types/jobtread').JobTreadUser }>(
      `query GetCurrentUser {
        me {
          id email firstName lastName phone role avatarUrl
          organization { id name logoUrl phone email }
        }
      }`
    );
    return data.me;
  }
}

// Singleton factory
let clientInstance: JobTreadClient | null = null;

export function getJobTreadClient(accessToken: string): JobTreadClient {
  if (!clientInstance || (clientInstance as unknown as { accessToken: string }).accessToken !== accessToken) {
    clientInstance = new JobTreadClient(accessToken);
  }
  return clientInstance;
}
