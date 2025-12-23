"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * QueryProvider - React Query configuration provider
 *
 * This component sets up TanStack React Query with optimized defaults:
 * - Infinite cache strategy: Data cached forever until manually invalidated
 * - Smart refetching: Only refetches when data is stale (after invalidation)
 * - Performance optimized: Prevents redundant API calls
 *
 * Configuration:
 * - staleTime: Infinity - Data never becomes stale automatically
 * - refetchOnMount: true - Refetch only when stale (after invalidation)
 * - gcTime: 5 minutes - Keep unused data in cache for faster subsequent loads
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
            // CRITICAL: Infinite cache - data cached forever until manually invalidated
            // This prevents redundant API calls and ensures optimal performance
            // Data only becomes stale when explicitly invalidated after mutations
            staleTime: Infinity,

            // Keep data in cache for 30 minutes after component unmounts
            // This allows faster subsequent loads while managing memory efficiently
            // Increased from 5 minutes to 30 minutes to prevent cache loss during navigation
            gcTime: 30 * 60 * 1000,

            // Retry failed requests once (faster failure = faster error display)
            // Reduced from 2 to 1 for better UX (users see errors faster)
            retry: 1,

            // CRITICAL: Refetch if data is stale (invalidated)
            // With staleTime: Infinity, this only triggers after invalidation
            // Normal visits use cache, after invalidation it refetches once
            refetchOnMount: true,

            // Don't refetch on window focus (prevents unnecessary requests)
            refetchOnWindowFocus: false,

            // Don't refetch on reconnect (prevents unnecessary requests)
            refetchOnReconnect: false,

            // Use cached data as placeholder while refetching in background
            // This provides instant UI updates while ensuring data freshness
            placeholderData: (previousData: unknown) => previousData,

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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
