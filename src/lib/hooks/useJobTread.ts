// =============================================================================
// Client-side hooks for live JobTread data via /api/jobtread proxy
// Uses TanStack React Query for caching, dedup, background refetch, and retry
// =============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

// ---- API helper ----

async function jtFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  transform?: (raw: Record<string, unknown>) => T
): Promise<T> {
  const res = await fetch('/api/jobtread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401) throw new Error('Session expired. Please log in again.');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  const result = await res.json();
  if (result.errors?.length) throw new Error(result.errors[0].message);

  return transform ? transform(result.data) : (result.data as T);
}

// ---- Typed data interfaces ----

export interface JTJob {
  id: string;
  name: string;
  number?: string;
  status: string;
  description?: string;
  customer?: { id: string; firstName: string; lastName: string; company?: string; email?: string; phone?: string };
  address?: { street1?: string; city?: string; state?: string; zip?: string };
  budget?: {
    estimatedRevenue?: number;
    estimatedCost?: number;
    estimatedProfit?: number;
    actualRevenue?: number;
    actualCost?: number;
    actualProfit?: number;
    invoiced?: number;
    paid?: number;
    outstanding?: number;
  };
  tasks?: { id: string; title: string; status: string; dueDate?: string }[];
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JTContact {
  id: string;
  type?: string;
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
  createdAt?: string;
}

export interface JTEstimate {
  id: string;
  jobId?: string;
  name: string;
  status: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  createdAt?: string;
  lineItems?: { id: string; name: string; quantity: number; unitCost: number; unitPrice: number; totalPrice: number }[];
}

export interface JTInvoice {
  id: string;
  jobId?: string;
  number?: string;
  status: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  dueDate?: string;
  paidAt?: string;
  createdAt?: string;
}

export interface JTTask {
  id: string;
  jobId?: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string;
  completedAt?: string;
}

// ---- Query key factory (enables targeted invalidation) ----

export const jtKeys = {
  all: ['jobtread'] as const,
  jobs: (filters?: { status?: string; search?: string }) =>
    [...jtKeys.all, 'jobs', filters ?? {}] as const,
  job: (id: string | null) => [...jtKeys.all, 'job', id] as const,
  contacts: (filters?: { type?: string; search?: string }) =>
    [...jtKeys.all, 'contacts', filters ?? {}] as const,
  estimates: (jobId?: string) =>
    [...jtKeys.all, 'estimates', jobId ?? 'all'] as const,
  invoices: (filters?: { jobId?: string; status?: string }) =>
    [...jtKeys.all, 'invoices', filters ?? {}] as const,
  tasks: (filters?: { jobId?: string; status?: string }) =>
    [...jtKeys.all, 'tasks', filters ?? {}] as const,
};

// ---- Data hooks (React Query) ----

export function useJobs(filters?: { status?: string; search?: string }) {
  const { status: authStatus } = useSession();
  return useQuery({
    queryKey: jtKeys.jobs(filters),
    queryFn: () =>
      jtFetch<JTJob[]>(
        `query GetJobs($first: Int, $status: String, $search: String) {
          jobs(first: $first, filter: { status: $status, search: $search }, sort: { field: "createdAt", order: DESC }) {
            data {
              id name number status description startDate endDate createdAt updatedAt
              customer { id firstName lastName company email phone }
              address { street1 city state zip }
              budget { estimatedRevenue estimatedCost estimatedProfit actualRevenue actualCost actualProfit invoiced paid outstanding }
            }
            totalCount
          }
        }`,
        { first: DEFAULT_PAGE_SIZE, ...filters },
        (raw) => ((raw?.jobs as { data?: JTJob[] })?.data) || []
      ),
    enabled: authStatus === 'authenticated',
  });
}

export function useJob(id: string | null) {
  const { status: authStatus } = useSession();
  return useQuery({
    queryKey: jtKeys.job(id),
    queryFn: () =>
      jtFetch<JTJob | null>(
        `query GetJob($id: ID!) {
          job(id: $id) {
            id name number status description startDate endDate createdAt updatedAt
            customer { id firstName lastName company email phone }
            address { street1 city state zip }
            budget { estimatedRevenue estimatedCost estimatedProfit actualRevenue actualCost actualProfit invoiced paid outstanding }
            tasks { id title status dueDate }
          }
        }`,
        { id },
        (raw) => (raw?.job as JTJob) || null
      ),
    enabled: authStatus === 'authenticated' && !!id,
  });
}

export function useContacts(filters?: { type?: string; search?: string }) {
  const { status: authStatus } = useSession();
  return useQuery({
    queryKey: jtKeys.contacts(filters),
    queryFn: () =>
      jtFetch<JTContact[]>(
        `query GetContacts($first: Int, $type: String, $search: String) {
          contacts(first: $first, filter: { type: $type, search: $search }, sort: { field: "createdAt", order: DESC }) {
            data { id type firstName lastName company email phone source notes createdAt }
            totalCount
          }
        }`,
        { first: DEFAULT_PAGE_SIZE, ...filters },
        (raw) => ((raw?.contacts as { data?: JTContact[] })?.data) || []
      ),
    enabled: authStatus === 'authenticated',
  });
}

export function useEstimates(jobId?: string) {
  const { status: authStatus } = useSession();
  return useQuery({
    queryKey: jtKeys.estimates(jobId),
    queryFn: () =>
      jtFetch<JTEstimate[]>(
        `query GetEstimates($jobId: ID) {
          estimates(filter: { jobId: $jobId }) {
            data {
              id jobId name status subtotal tax total createdAt
              lineItems { id name quantity unitCost unitPrice totalPrice }
            }
          }
        }`,
        { jobId },
        (raw) => ((raw?.estimates as { data?: JTEstimate[] })?.data) || []
      ),
    enabled: authStatus === 'authenticated',
  });
}

export function useInvoices(filters?: { jobId?: string; status?: string }) {
  const { status: authStatus } = useSession();
  return useQuery({
    queryKey: jtKeys.invoices(filters),
    queryFn: () =>
      jtFetch<JTInvoice[]>(
        `query GetInvoices($jobId: ID, $status: String) {
          invoices(filter: { jobId: $jobId, status: $status }) {
            data { id jobId number status subtotal tax total dueDate paidAt createdAt }
          }
        }`,
        filters,
        (raw) => ((raw?.invoices as { data?: JTInvoice[] })?.data) || []
      ),
    enabled: authStatus === 'authenticated',
  });
}

export function useTasks(filters?: { jobId?: string; status?: string }) {
  const { status: authStatus } = useSession();
  return useQuery({
    queryKey: jtKeys.tasks(filters),
    queryFn: () =>
      jtFetch<JTTask[]>(
        `query GetTasks($jobId: ID, $status: String) {
          tasks(filter: { jobId: $jobId, status: $status }) {
            data { id jobId title status priority dueDate completedAt }
          }
        }`,
        filters,
        (raw) => ((raw?.tasks as { data?: JTTask[] })?.data) || []
      ),
    enabled: authStatus === 'authenticated',
  });
}

// ---- Mutation helper with automatic cache invalidation ----

export function useJTMutation() {
  const queryClient = useQueryClient();

  const mutate = useCallback(
    async (query: string, variables?: Record<string, unknown>) => {
      const res = await fetch('/api/jobtread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API error ${res.status}`);
      }
      const result = await res.json();
      if (result.errors?.length) throw new Error(result.errors[0].message);

      // Invalidate all jobtread queries so lists refresh
      queryClient.invalidateQueries({ queryKey: jtKeys.all });

      return result.data;
    },
    [queryClient]
  );

  return mutate;
}

// ---- Legacy jtMutate for backwards compatibility ----

export async function jtMutate(query: string, variables?: Record<string, unknown>) {
  const res = await fetch('/api/jobtread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  const result = await res.json();
  if (result.errors?.length) throw new Error(result.errors[0].message);
  return result.data;
}
