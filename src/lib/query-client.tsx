// =============================================================================
// React Query Client Provider
// Wraps the app with TanStack React Query for caching, dedup, and background refetch
// =============================================================================

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { CACHE_TTL } from '@/lib/constants';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale after 2 minutes — still shows cached data but refetches in background
            staleTime: CACHE_TTL.jobs,
            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests up to 2 times with exponential backoff
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            // Refetch on window focus (user tabs back in)
            refetchOnWindowFocus: true,
            // Don't refetch on reconnect automatically — let staleTime handle it
            refetchOnReconnect: 'always',
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
