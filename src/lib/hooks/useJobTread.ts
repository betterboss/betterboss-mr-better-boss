// =============================================================================
// Client-side hooks for live JobTread data via /api/jobtread proxy
// Replaces all hardcoded demo data throughout the app
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function useJobTreadQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { skip?: boolean; transform?: (raw: Record<string, unknown>) => T }
): UseQueryResult<T> {
  const { status } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const varsRef = useRef(JSON.stringify(variables));

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  // Stable variable serialization
  const varsKey = JSON.stringify(variables);
  if (varsKey !== varsRef.current) varsRef.current = varsKey;

  useEffect(() => {
    if (status !== 'authenticated' || options?.skip) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch('/api/jobtread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
      .then(async (res) => {
        if (res.status === 401) throw new Error('Session expired. Please log in again.');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `API error ${res.status}`);
        }
        return res.json();
      })
      .then((result) => {
        if (cancelled) return;
        if (result.errors?.length) throw new Error(result.errors[0].message);
        const transformed = options?.transform
          ? options.transform(result.data)
          : (result.data as T);
        setData(transformed);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, varsRef.current, status, trigger, options?.skip]);

  return { data, isLoading, error, refetch };
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

// ---- Data hooks ----

export function useJobs(filters?: { status?: string; search?: string }) {
  return useJobTreadQuery<JTJob[]>(
    `query GetJobs($first: Int, $status: String, $search: String) {
      jobs(first: $first, filter: { status: $status, search: $search }) {
        data {
          id name number status description startDate endDate createdAt updatedAt
          customer { id firstName lastName company email phone }
          address { street1 city state zip }
          budget { estimatedRevenue estimatedCost estimatedProfit actualRevenue actualCost actualProfit invoiced paid outstanding }
        }
        totalCount
      }
    }`,
    { first: 100, ...filters },
    { transform: (raw) => ((raw?.jobs as { data?: JTJob[] })?.data) || [] }
  );
}

export function useJob(id: string | null) {
  return useJobTreadQuery<JTJob>(
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
    { skip: !id, transform: (raw) => (raw?.job as JTJob) || null }
  );
}

export function useContacts(filters?: { type?: string; search?: string }) {
  return useJobTreadQuery<JTContact[]>(
    `query GetContacts($first: Int, $type: String, $search: String) {
      contacts(first: $first, filter: { type: $type, search: $search }) {
        data { id type firstName lastName company email phone source notes createdAt }
        totalCount
      }
    }`,
    { first: 100, ...filters },
    { transform: (raw) => ((raw?.contacts as { data?: JTContact[] })?.data) || [] }
  );
}

export function useEstimates(jobId?: string) {
  return useJobTreadQuery<JTEstimate[]>(
    `query GetEstimates($jobId: ID) {
      estimates(filter: { jobId: $jobId }) {
        data {
          id jobId name status subtotal tax total createdAt
          lineItems { id name quantity unitCost unitPrice totalPrice }
        }
      }
    }`,
    { jobId },
    { transform: (raw) => ((raw?.estimates as { data?: JTEstimate[] })?.data) || [] }
  );
}

export function useInvoices(filters?: { jobId?: string; status?: string }) {
  return useJobTreadQuery<JTInvoice[]>(
    `query GetInvoices($jobId: ID, $status: String) {
      invoices(filter: { jobId: $jobId, status: $status }) {
        data { id jobId number status subtotal tax total dueDate paidAt createdAt }
      }
    }`,
    filters,
    { transform: (raw) => ((raw?.invoices as { data?: JTInvoice[] })?.data) || [] }
  );
}

export function useTasks(filters?: { jobId?: string; status?: string }) {
  return useJobTreadQuery<JTTask[]>(
    `query GetTasks($jobId: ID, $status: String) {
      tasks(filter: { jobId: $jobId, status: $status }) {
        data { id jobId title status priority dueDate completedAt }
      }
    }`,
    filters,
    { transform: (raw) => ((raw?.tasks as { data?: JTTask[] })?.data) || [] }
  );
}

// ---- Mutation helper ----

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
