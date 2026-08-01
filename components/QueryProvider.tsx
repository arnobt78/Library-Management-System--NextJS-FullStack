"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { subscribeToQueryInvalidation } from "@/lib/utils/queryInvalidation";

/**
 * QueryProvider - React Query configuration provider
 *
 * This component sets up TanStack React Query with optimized defaults:
 * - Bounded freshness: Data reconciles after 30 seconds or explicit invalidation
 * - Smart refetching: Active stale data reconciles on mount, focus, and reconnect
 * - Performance optimized: Prevents redundant API calls
 *
 * Configuration:
 * - staleTime: 30 seconds
 * - refetchOnMount: true - Refetch only when stale
 * - gcTime: 30 minutes - Keep unused data for faster back navigation
 * - retry: 1 - Retry failed requests once (faster failure = faster error display)
 */
export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Parent: REQ-0027. A short freshness window keeps navigation fast while
            // allowing focus/reconnect to reconcile writes made outside this browser.
            staleTime: 30 * 1000,

            // Keep data in cache for 30 minutes after component unmounts
            // This allows faster subsequent loads while managing memory efficiently
            // Increased from 5 minutes to 30 minutes to prevent cache loss during navigation
            gcTime: 30 * 60 * 1000,

            // Retry failed requests once (faster failure = faster error display)
            // Reduced from 2 to 1 for better UX (users see errors faster)
            retry: 1,

            // Refetch on mount only when the bounded window elapsed or a mutation invalidated it.
            refetchOnMount: true,

            // Fresh queries remain cached; stale active queries reconcile on return.
            refetchOnWindowFocus: true,

            refetchOnReconnect: true,

            // Network mode: only fetch when online
            networkMode: "online",
          },
          mutations: {
            // Don't retry mutations (user should retry manually)
            // Mutations are typically user actions that shouldn't be automatically retried
            retry: 0,
          },
        },
      })
  );

  useEffect(
    () => subscribeToQueryInvalidation(queryClient),
    [queryClient]
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
