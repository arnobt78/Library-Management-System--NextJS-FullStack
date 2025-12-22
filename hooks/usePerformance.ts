"use client";

import { useEffect } from "react";
import { usePerformanceStore } from "@/lib/stores/performance";

export const usePerformanceMonitor = (pageName: string) => {
  const { updatePageLoadTime } = usePerformanceStore();

  useEffect(() => {
    // Measure client-side hydration and interaction time
    const startTime = performance.now();

    // Use requestAnimationFrame to measure after initial render
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const hydrationTime = endTime - startTime;
      updatePageLoadTime(`${pageName}-hydration`, hydrationTime);
    });

    // Monitor page visibility changes for better metrics
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const endTime = performance.now();
        const visibleTime = endTime - startTime;
        updatePageLoadTime(`${pageName}-visible`, visibleTime);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pageName, updatePageLoadTime]);
};

export const useQueryPerformance = () => {
  const {
    updateQueryTime,
    incrementCacheHit,
    incrementCacheMiss,
    incrementTotalRequests,
  } = usePerformanceStore();

  /**
   * Track query execution time and cache status.
   * This is called when React Query actually fetches data (cache miss).
   * queryFn is only executed when data is not in cache or is stale.
   *
   * @param queryName - Name of the query for tracking
   * @param queryFn - The actual query function to execute
   * @returns Promise with query result
   */
  const trackQuery = async <T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    incrementTotalRequests();
    incrementCacheMiss(); // queryFn is only called on cache miss

    try {
      const result = await queryFn();
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      updateQueryTime(queryName, queryTime);
      return result;
    } catch (error) {
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      updateQueryTime(`${queryName}-error`, queryTime);
      throw error;
    }
  };

  /**
   * Track React Query cache hit (when data comes from cache, not fetched).
   * Call this when a query has data but isFetching is false (using cached data).
   *
   * @param queryName - Name of the query for tracking
   */
  const trackCacheHit = (queryName: string) => {
    incrementTotalRequests();
    incrementCacheHit();
    // Cache hits are instant, so we track 0ms
    updateQueryTime(`${queryName}-cache-hit`, 0);
  };

  /**
   * Create onSuccess callback for React Query hooks to track successful fetches.
   * Note: This only fires when data is successfully fetched, not when using cache.
   * Cache misses are already tracked in trackQuery when queryFn is called.
   *
   * @param _queryName - Name of the query for tracking (unused for now, kept for future extensibility)
   * @returns onSuccess callback function
   */
  const createOnSuccess = (_queryName: string) => {
    return () => {
      // onSuccess only fires after successful fetch, so this is already tracked in trackQuery
      // This callback is mainly for future extensibility
    };
  };

  /**
   * Create onError callback for React Query hooks to track errors.
   * Error timing is already tracked in trackQuery catch block.
   *
   * @param queryName - Name of the query for tracking
   * @returns onError callback function
   */
  const createOnError = (queryName: string) => {
    return (error: Error) => {
      // Error timing is already tracked in trackQuery catch block
      console.error(`Query ${queryName} failed:`, error);
    };
  };

  return {
    trackQuery,
    trackCacheHit,
    createOnSuccess,
    createOnError,
  };
};

// New hook for SSR performance monitoring
export const useSSRPerformance = () => {
  const { updatePageLoadTime } = usePerformanceStore();

  useEffect(() => {
    // Measure navigation timing if available
    if (typeof window !== "undefined" && "performance" in window) {
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        const metrics = {
          "ssr-dom-content-loaded":
            navigation.domContentLoadedEventEnd -
            navigation.domContentLoadedEventStart,
          "ssr-first-paint": navigation.responseEnd - navigation.requestStart,
          "ssr-total-load": navigation.loadEventEnd - navigation.fetchStart,
        };

        Object.entries(metrics).forEach(([key, value]) => {
          if (value > 0) {
            updatePageLoadTime(key, value);
          }
        });
      }
    }
  }, [updatePageLoadTime]);
};
