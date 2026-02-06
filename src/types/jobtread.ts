// =============================================================================
// JobTread API Type Definitions
// Complete type system for JobTread GraphQL API integration
// =============================================================================

// --- Core Entities ---

export interface JobTreadUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  avatarUrl?: string;
  organization: JobTreadOrganization;
  createdAt: string;
  updatedAt: string;
}

export interface JobTreadOrganization {
  id: string;
  name: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: JobTreadAddress;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  currency: string;
  timezone: string;
  taxRate?: number;
  defaultMarkup?: number;
}

export interface JobTreadAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

// --- Jobs ---

export interface JobTreadJob {
  id: string;
  name: string;
  number?: string;
  status: JobStatus;
  stage?: string;
  description?: string;
  customer: JobTreadContact;
  address?: JobTreadAddress;
  startDate?: string;
  endDate?: string;
  budget: JobBudget;
  tasks: JobTreadTask[];
  documents: JobTreadDocument[];
  dailyLogs: JobTreadDailyLog[];
  tags?: string[];
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus =
  | 'LEAD'
  | 'ESTIMATE'
  | 'PROPOSAL'
  | 'CONTRACT'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface JobBudget {
  estimatedRevenue: number;
  estimatedCost: number;
  estimatedProfit: number;
  estimatedMargin: number;
  actualRevenue: number;
  actualCost: number;
  actualProfit: number;
  actualMargin: number;
  invoiced: number;
  paid: number;
  outstanding: number;
}

// --- Contacts ---

export interface JobTreadContact {
  id: string;
  type: ContactType;
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: JobTreadAddress;
  tags?: string[];
  notes?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContactType = 'CUSTOMER' | 'VENDOR' | 'SUBCONTRACTOR' | 'LEAD';

// --- Estimates & Line Items ---

export interface JobTreadEstimate {
  id: string;
  jobId: string;
  name: string;
  status: EstimateStatus;
  lineItems: JobTreadLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  markup?: number;
  notes?: string;
  validUntil?: string;
  sentAt?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type EstimateStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface JobTreadLineItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unit?: string;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  markup?: number;
  costCode?: string;
}

// --- Tasks ---

export interface JobTreadTask {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assignee?: JobTreadUser;
  dueDate?: string;
  completedAt?: string;
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// --- Financial ---

export interface JobTreadInvoice {
  id: string;
  jobId: string;
  number: string;
  status: InvoiceStatus;
  lineItems: JobTreadLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: string;
  paidAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID';

export interface JobTreadPurchaseOrder {
  id: string;
  jobId: string;
  number: string;
  vendor: JobTreadContact;
  status: POStatus;
  lineItems: JobTreadLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  approvedAt?: string;
  sentAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type POStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'SENT' | 'RECEIVED' | 'CANCELLED';

// --- Documents & Daily Logs ---

export interface JobTreadDocument {
  id: string;
  jobId?: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  uploadedBy?: JobTreadUser;
  createdAt: string;
}

export interface JobTreadDailyLog {
  id: string;
  jobId: string;
  date: string;
  notes: string;
  weather?: string;
  photos?: string[];
  createdBy: JobTreadUser;
  createdAt: string;
}

// --- Cost Catalog ---

export interface CostCatalogItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  unitCost: number;
  unitPrice: number;
  markup?: number;
  vendor?: string;
  sku?: string;
  isActive: boolean;
}

// --- Dashboard & Analytics ---

export interface DashboardMetrics {
  activeJobs: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  leadsThisMonth: number;
  conversionRate: number;
  upcomingTasks: number;
  overdueTasks: number;
}

export interface RevenueTimeSeries {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface JobsByStatus {
  status: JobStatus;
  count: number;
  totalValue: number;
}

// --- AI-Enhanced Types ---

export interface AIEstimateRequest {
  projectType: string;
  squareFootage?: number;
  description: string;
  location?: string;
  materials?: string[];
  complexity?: 'simple' | 'moderate' | 'complex';
}

export interface AIEstimateResult {
  lineItems: JobTreadLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  confidence: number;
  suggestions: string[];
  marketComparison?: {
    low: number;
    average: number;
    high: number;
  };
}

export interface AILeadScore {
  contactId: string;
  score: number; // 0-100
  factors: LeadScoreFactor[];
  recommendedAction: string;
  estimatedValue: number;
  probability: number;
}

export interface LeadScoreFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    jobId?: string;
    action?: string;
    data?: unknown;
  };
}

// --- API Response Types ---

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

export interface JobTreadAPIError {
  message: string;
  code: string;
  path?: string[];
}

// --- Session & Auth ---

export interface JobTreadSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: JobTreadUser;
}

export interface JobTreadAuthConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
