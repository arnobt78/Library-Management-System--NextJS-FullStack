# TanStack React Query - Production Setup Guide

## 📋 Overview

This guide documents a **production-ready React Query setup** that provides:

- ⚡ **Fast UI updates** - Immediate UI changes without page refresh
- 🚀 **Optimal performance** - Infinite cache with manual invalidation (no redundant API calls)
- 🔄 **Automatic sync** - All related queries update when data changes
- 🎯 **Smart caching** - Cache-first strategy with `staleTime: Infinity` and `refetchOnMount: true`
- 🔌 **Real-time support** - Ready for SSR, CSR, and SSE integration
- 🛡️ **Error handling** - Centralized error handling with toast notifications

> **Note:** This guide is **generic and universal** - adapt the examples to your specific entities (users, posts, orders, products, etc.) and API structure.

### 🎯 Backend Compatibility

The examples work with **any REST API backend**:

- ✅ **AWS HTTP API** (AWS API Gateway HTTP API - newer, simpler, cheaper)
- ✅ **AWS REST API** (AWS API Gateway REST API - classic version)
- ✅ **AWS Lambda** (via API Gateway)
- ✅ **Node.js/Express**
- ✅ **Next.js API Routes**
- ✅ **Django/FastAPI** (Python)
- ✅ **Rails** (Ruby)
- ✅ **Any REST API endpoint**

> **Note:** AWS HTTP API is a type of REST API (it's the newer, simplified version). Both work the same way from the client side - they're just different API Gateway configurations. The `fetch()` calls work identically with both.

### 📚 Guide Structure

This guide includes examples for:

- ✅ **React (Client-Side)** - Standard React apps
- ✅ **TypeScript** - Type-safe versions
- ✅ **Next.js** - SSR, API routes, App Router
- ✅ **Server-Side Rendering** - SSR patterns
- ✅ **Node.js Server Components** - Server-side usage

---

## 🏗️ Architecture Pattern

```bash
┌─────────────────────────────────────────────────────────────┐
│                    Root Setup (index.js)                     │
│  QueryClientProvider with optimized default options          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  Pure API functions (fetch calls) - No React Query logic     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Custom Hooks Layer                        │
│  useQuery for reads, useMutation for writes                 │
│  With staleTime: Infinity + refetchOnMount: true            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Cache Invalidation Utilities                    │
│  Centralized invalidation functions for related queries     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Components                                │
│  Use hooks, get instant UI updates via cache invalidation   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Root Setup (QueryClientProvider)

### File: `src/index.js`

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import App from "./App";

// Create QueryClient with optimized default options
// These defaults apply to ALL queries unless overridden
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time (can be overridden per query)
      staleTime: 10 * 60 * 1000, // 10 minutes

      // Garbage collection time (how long unused data stays in cache)
      gcTime: 60 * 60 * 1000, // 1 hour

      // Retry failed requests once (faster failure = faster error display)
      retry: 1,

      // Don't refetch on window focus (prevents unnecessary requests)
      refetchOnWindowFocus: false,

      // Don't refetch on reconnect (prevents unnecessary requests)
      refetchOnReconnect: false,

      // Don't refetch on mount if data is fresh (faster initial render)
      refetchOnMount: false, // Default: false, but we override to true per query

      // Use cached data as placeholder while refetching in background
      placeholderData: (previousData) => previousData,

      // Network mode
      networkMode: "online",
    },
    mutations: {
      // Default retry for mutations
      retry: 0, // Don't retry mutations (user should retry manually)
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* Your other providers */}
        <ToastContainer
          closeButton={false}
          autoClose={3000}
          position={"bottom-right"}
        />
        <App />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Key Points:**

- ✅ QueryClient created once at root level
- ✅ Default options optimize for performance
- ✅ Individual queries can override defaults
- ✅ ToastContainer for user notifications

---

## 2️⃣ Service Layer (Pure API Functions)

### Pattern: Keep service functions pure - no React Query logic

### File: `src/services/resourceService.js` (Generic Example)

```javascript
/**
 * Resource Service - Pure API Functions
 *
 * These are pure functions that make API calls.
 * NO React Query logic here - just fetch calls.
 *
 * Replace "Resource" with your entity name (User, Product, Post, Order, etc.)
 */

import { ApiError } from "./apiError";

// Base API URL from environment
const API_BASE = process.env.REACT_APP_API_BASE_URL || "";

/**
 * Get all resources with optional search/filter
 * @param {string} searchTerm - Optional search term
 * @param {Object} filters - Optional filters object
 * @returns {Promise<Array>} Array of resources
 * @throws {ApiError} Error with message and status
 */
export async function getResourceList(searchTerm = "", filters = {}) {
  const params = new URLSearchParams();
  if (searchTerm) params.append("search", searchTerm);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE}/resources?${queryString}`
    : `${API_BASE}/resources`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new ApiError(response.statusText, response.status);
  }

  const data = await response.json();
  return data;
}

/**
 * Get single resource by ID
 * @param {string|number} resourceId - Resource ID
 * @returns {Promise<Object>} Resource object
 * @throws {ApiError} Error with message and status
 */
export async function getResource(resourceId) {
  const response = await fetch(`${API_BASE}/resources/${resourceId}`);

  if (!response.ok) {
    throw new ApiError(response.statusText, response.status);
  }

  const data = await response.json();
  return data;
}
```

### File: `src/services/authenticatedService.js` (Example with Auth)

```javascript
/**
 * Authenticated Service - Pure API Functions with Auth
 *
 * Example for protected endpoints that require authentication
 */

import { ApiError } from "./apiError";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "";

/**
 * Get session token from storage
 * Adapt to your auth storage method (localStorage, sessionStorage, cookies, etc.)
 * @returns {string|null} Auth token
 */
function getToken() {
  try {
    // Adapt to your storage method
    return JSON.parse(sessionStorage.getItem("token"));
    // Or: return localStorage.getItem("token");
    // Or: return getCookie("token");
  } catch {
    return null;
  }
}

/**
 * Get dashboard statistics (example of protected endpoint)
 * @returns {Promise<Object>} Stats object
 * @throws {ApiError} Error with message and status
 */
export async function getDashboardStats() {
  const token = getToken();

  if (!token) {
    throw new ApiError("User not authenticated", 401);
  }

  const response = await fetch(`${API_BASE}/dashboard/stats`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Adapt to your auth header format
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  return data;
}

/**
 * Create a new resource
 * @param {Object} resourceData - Resource data
 * @returns {Promise<Object>} Created resource
 * @throws {ApiError} Error with message and status
 */
export async function createResource(resourceData) {
  const token = getToken();

  if (!token) {
    throw new ApiError("User not authenticated", 401);
  }

  const response = await fetch(`${API_BASE}/resources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(resourceData),
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  return data;
}

/**
 * Update an existing resource
 * @param {string} resourceId - Resource ID
 * @param {Object} updates - Resource updates
 * @returns {Promise<Object>} Updated resource
 * @throws {ApiError} Error with message and status
 */
export async function updateResource(resourceId, updates) {
  const token = getToken();

  if (!token) {
    throw new ApiError("User not authenticated", 401);
  }

  const response = await fetch(`${API_BASE}/resources/${resourceId}`, {
    method: "PUT", // or PATCH
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  return data;
}

/**
 * Delete a resource
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Object>} Deletion result
 * @throws {ApiError} Error with message and status
 */
export async function deleteResource(resourceId) {
  const token = getToken();

  if (!token) {
    throw new ApiError("User not authenticated", 401);
  }

  const response = await fetch(`${API_BASE}/resources/${resourceId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  return data;
}
```

### File: `src/services/apiError.js` (Error Utility)

```javascript
/**
 * Custom API Error class
 * Provides consistent error handling across the app
 */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
```

**Key Points:**

- ✅ Pure functions - no React Query dependencies
- ✅ Consistent error handling with `ApiError`
- ✅ Reusable across different contexts
- ✅ Easy to test

---

## 3️⃣ Query Hooks (Read Operations)

### Pattern: `staleTime: Infinity` + `refetchOnMount: true` = Cache Forever Until Invalidated

### File: `src/hooks/useResources.js` (Generic Example)

```javascript
/**
 * React Query hooks for resource-related API calls
 *
 * Replace "Resource" with your entity name (User, Product, Post, Order, etc.)
 *
 * Caching Strategy:
 * - staleTime: Infinity = Data never becomes stale automatically
 * - refetchOnMount: true = Refetch ONLY when data is stale (invalidated)
 * - Result: Cache forever until manually invalidated, then refetch once
 */

import { useQuery } from "@tanstack/react-query";
import { getResourceList, getResource } from "../services/resourceService";

/**
 * Hook to fetch all resources with optional search/filter
 *
 * Caching Behavior:
 * - First call: Fetches from API
 * - Subsequent calls: Uses cache (no API call)
 * - After invalidation: Refetches from API once, then uses cache again
 *
 * @param {string} searchTerm - Optional search term from URL params
 * @param {Object} filters - Optional filters object
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useResources(searchTerm = "", filters = {}) {
  return useQuery({
    // Unique cache key - includes searchTerm and filters for separate caching
    // Adapt key structure to your needs
    queryKey: ["resources", searchTerm, filters],

    // Pure API function (from service layer)
    queryFn: () => getResourceList(searchTerm, filters),

    // CRITICAL: Data never becomes stale automatically
    // Only becomes stale when manually invalidated
    staleTime: Infinity,

    // Keep in cache for 5 minutes after component unmounts
    gcTime: 5 * 60 * 1000,

    // Retry once on failure
    retry: 1,

    // CRITICAL: Refetch if data is stale (invalidated)
    // With staleTime: Infinity, this only triggers after invalidation
    // Normal visits use cache, after invalidation it refetches
    refetchOnMount: true,

    // Optional: Enable/disable query
    // enabled: true, // Default
  });
}

/**
 * Hook to fetch a single resource by ID
 *
 * @param {string|number} resourceId - Resource ID
 * @param {boolean} enabled - Whether to enable the query (default: true)
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useResource(resourceId, enabled = true) {
  return useQuery({
    // Unique cache key per resource
    queryKey: ["resource", resourceId],

    // Pure API function
    queryFn: () => getResource(resourceId),

    // Only fetch if enabled and ID exists
    enabled: enabled && !!resourceId,

    // Same caching strategy
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
  });
}

/**
 * Hook to fetch filtered resources (example: featured, active, etc.)
 * Filters from main list (no separate API call)
 *
 * Adapt filter logic to your business needs
 *
 * @param {Function} filterFn - Filter function
 * @param {number} limit - Optional limit
 * @returns {Object} Query result with data, isLoading, error
 */
export function useFilteredResources(filterFn, limit = null) {
  // Use main resources query and filter client-side
  // This ensures filtered resources are always in sync with main list
  const { data: allResources = [], isLoading, error } = useResources("");

  // Apply filter function
  let filteredResources = allResources.filter(filterFn);

  // Apply limit if provided
  if (limit) {
    filteredResources = filteredResources.slice(0, limit);
  }

  return {
    data: filteredResources,
    isLoading,
    error,
  };
}
```

### File: `src/hooks/useAuthenticated.js` (Example with Conditional Fetching)

```javascript
/**
 * React Query hooks for authenticated/protected API calls
 *
 * Example of conditional fetching based on authentication/authorization
 */

import { useQuery } from "@tanstack/react-query";
import {
  getDashboardStats,
  getAllResources,
} from "../services/authenticatedService";

/**
 * Helper function to check authentication
 * Adapt to your auth storage method
 * @returns {Object} Auth state
 */
function useAuth() {
  if (typeof window === "undefined") {
    return { hasToken: false, userRole: null, isAuthenticated: false };
  }

  try {
    const token = JSON.parse(sessionStorage.getItem("token"));
    const userRole = sessionStorage.getItem("userRole");
    return {
      hasToken: !!token,
      userRole,
      isAuthenticated: !!token,
      // Add more auth checks as needed
      // isAdmin: userRole === "admin",
      // isUser: userRole === "user",
    };
  } catch {
    return { hasToken: false, userRole: null, isAuthenticated: false };
  }
}

/**
 * Hook to fetch dashboard statistics
 * Only fetches if user is authenticated
 *
 * @param {boolean} enabled - Whether to enable the query (default: true)
 * @returns {Object} Query result with data, isLoading, error
 */
export function useDashboardStats(enabled = true) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,

    // Only fetch if enabled and authenticated
    enabled: enabled && isAuthenticated,

    // Same caching strategy
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
  });
}

/**
 * Hook to fetch all resources (protected endpoint)
 * Only fetches if user is authenticated
 *
 * @param {boolean} enabled - Whether to enable the query (default: true)
 * @param {string} role - Optional role requirement (e.g., "admin", "manager")
 * @returns {Object} Query result with data, isLoading, error
 */
export function useAllResources(enabled = true, role = null) {
  const { isAuthenticated, userRole } = useAuth();

  // Check role requirement if provided
  const hasRequiredRole = role ? userRole === role : true;

  return useQuery({
    queryKey: ["all-resources", role],
    queryFn: getAllResources,
    enabled: enabled && isAuthenticated && hasRequiredRole,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
  });
}
```

**Key Points:**

- ✅ `staleTime: Infinity` = Cache forever until invalidated
- ✅ `refetchOnMount: true` = Refetch only when stale (after invalidation)
- ✅ Unique `queryKey` per query (includes params for separate caching)
- ✅ Conditional fetching with `enabled` option
- ✅ Consistent error handling

---

## 4️⃣ Mutation Hooks (Write Operations)

### ⚠️ Production-Tested Approach: Direct Cache Updates (No Optimistic Updates)

**Key Learnings from Production:**

1. **❌ Avoid Optimistic Updates** - They cause UI flickers/blinks and data inconsistencies
2. **✅ Use Direct Cache Updates** - Fetch complete data from API after mutation, then update cache directly
3. **✅ Don't Invalidate Updated Query** - Update cache directly, only invalidate related queries
4. **✅ Use `placeholderData`** - Prevents flicker during refetch by showing previous data

**Common Issues with Optimistic Updates:**

- Multiple UI blinks (3-4 times) during mutations
- Incomplete data causing "Unknown" or empty fields
- Cache inconsistencies between related queries
- Unnecessary refetches causing performance issues

### Pattern: Direct Cache Update + Selective Invalidation

### File: `src/hooks/useResourceMutations.js` (Production-Tested Approach)

```javascript
/**
 * React Query mutation hooks for resource operations
 *
 * PRODUCTION-TESTED APPROACH:
 * - NO optimistic updates (causes blinks/flickers)
 * - Direct cache updates with complete API data
 * - Selective invalidation (don't invalidate updated query)
 * - Immediate toast notifications
 *
 * Replace "Resource" with your entity name (User, Product, Post, Order, etc.)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createResource,
  updateResource,
  deleteResource,
  getAllResources, // Need to fetch complete data after mutation
} from "../services/authenticatedService";
import { invalidateAfterResourceChange } from "../utils/queryInvalidation";
import { toast } from "react-toastify";

/**
 * Hook to create a new resource
 *
 * PRODUCTION-TESTED FLOW:
 * 1. User calls mutate() with resource data
 * 2. API call happens (mutationFn)
 * 3. On success: Fetch complete data from API → Update cache directly → Invalidate related queries
 * 4. Show toast immediately
 * 5. UI updates smoothly without blinks
 *
 * @returns {Object} Mutation object with mutate, mutateAsync, isLoading, error, etc.
 */
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    // Pure API function (from service layer)
    mutationFn: createResource,

    // Called when mutation succeeds
    onSuccess: async (data, variables) => {
      // CRITICAL: Fetch complete data from API (includes all related fields)
      // This ensures we have complete data to update the cache
      // The API returns the created resource WITH all related data
      try {
        const response = await fetch("/api/resources", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success && Array.isArray(apiData.resources)) {
            // Update cache directly with complete data
            // This prevents blank UI and ensures data persists
            queryClient.setQueryData(["resources"], apiData.resources);

            // Also update any filtered/searched queries
            queryClient
              .getQueryCache()
              .getAll()
              .forEach((query) => {
                const queryKey = query.queryKey;
                if (Array.isArray(queryKey) && queryKey[0] === "resources") {
                  queryClient.setQueryData(queryKey, apiData.resources);
                }
              });
          }
        }
      } catch (error) {
        console.error(
          "[useCreateResource] Failed to fetch complete data:",
          error
        );
      }

      // CRITICAL: Only invalidate related queries (books, stats, admin, etc.)
      // DON'T invalidate "resources" since we already updated it with complete data
      // This prevents multiple blinks and unnecessary refetches
      invalidateAfterResourceChange(queryClient);

      // CRITICAL: Show toast notification immediately
      toast.success("Resource created successfully", {
        closeButton: true,
        position: "bottom-center",
      });
    },

    // Called when mutation fails
    onError: (error) => {
      // Show error notification
      toast.error(error.message || "Failed to create resource", {
        closeButton: true,
        position: "bottom-center",
      });
    },
  });
}

/**
 * Hook to update an existing resource
 *
 * PRODUCTION-TESTED APPROACH:
 * - Fetch complete data after update
 * - Update cache directly (don't invalidate updated query)
 * - Only invalidate related queries
 *
 * @returns {Object} Mutation object with mutate, mutateAsync, isLoading, error, etc.
 */
export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    // Mutation function receives variables
    mutationFn: ({ resourceId, updates }) =>
      updateResource(resourceId, updates),

    onSuccess: async (data, variables) => {
      // CRITICAL: Fetch complete data from API (includes all related fields)
      try {
        // Fetch updated resource with complete data
        const response = await fetch(`/api/resources/${variables.resourceId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success && apiData.resource) {
            // Update specific resource detail query directly
            queryClient.setQueryData(
              ["resource", variables.resourceId],
              apiData.resource
            );

            // Also update list queries if resource is in them
            queryClient
              .getQueryCache()
              .getAll()
              .forEach((query) => {
                const queryKey = query.queryKey;
                if (Array.isArray(queryKey) && queryKey[0] === "resources") {
                  const currentData = queryClient.getQueryData(queryKey);
                  if (Array.isArray(currentData)) {
                    const updatedData = currentData.map((item) =>
                      item.id === variables.resourceId ? apiData.resource : item
                    );
                    queryClient.setQueryData(queryKey, updatedData);
                  }
                }
              });
          }
        }
      } catch (error) {
        console.error(
          "[useUpdateResource] Failed to fetch complete data:",
          error
        );
      }

      // CRITICAL: Only invalidate related queries (stats, admin, etc.)
      // DON'T invalidate "resource" or "resources" since we already updated them
      invalidateAfterResourceChange(queryClient);

      toast.success("Resource updated successfully", {
        closeButton: true,
        position: "bottom-center",
      });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to update resource", {
        closeButton: true,
        position: "bottom-center",
      });
    },
  });
}

/**
 * Hook to delete a resource
 *
 * @returns {Object} Mutation object with mutate, mutateAsync, isLoading, error, etc.
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteResource,

    onSuccess: (data, resourceId) => {
      // Invalidate all resource-related queries
      invalidateAfterResourceChange(queryClient);

      // Also invalidate the specific resource detail query
      queryClient.invalidateQueries({
        queryKey: ["resource", resourceId],
      });

      toast.success("Resource deleted successfully", {
        closeButton: true,
        position: "bottom-center",
      });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to delete resource", {
        closeButton: true,
        position: "bottom-center",
      });
    },
  });
}
```

### Usage in Components (Generic Example)

```javascript
import {
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} from "../hooks/useResourceMutations";
import { useResource } from "../hooks/useResources";

function ResourceForm({ resourceId, initialData }) {
  // Query: Fetch resource data if editing
  const { data: resource, isLoading } = useResource(resourceId, !!resourceId);

  // Mutations
  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();
  const deleteMutation = useDeleteResource();

  const handleSubmit = (formData) => {
    if (resourceId) {
      // Update existing resource
      updateMutation.mutate(
        { resourceId, updates: formData },
        {
          // Optional: Additional callbacks per mutation
          onSuccess: () => {
            // Navigate or do something else
            console.log("Resource updated!");
          },
        }
      );
    } else {
      // Create new resource
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(resourceId);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={createMutation.isPending || updateMutation.isPending}
      >
        {createMutation.isPending || updateMutation.isPending
          ? "Saving..."
          : "Save"}
      </button>

      {resourceId && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete"}
        </button>
      )}
    </form>
  );
}
```

**Key Points:**

- ✅ Mutations use `useMutation` hook
- ✅ `onSuccess` invalidates related queries → UI updates immediately
- ✅ `onError` shows error toast
- ✅ `isPending` for loading states
- ✅ Can pass variables to `mutationFn`

---

## 4️⃣.5️⃣ Production Issues & Solutions

### 🐛 Common Issues Found in Production

#### Issue 1: Multiple UI Blinks (3-4 times) During Mutations

**Symptoms:**

- UI flickers/blinks multiple times when creating/updating resources
- Poor user experience
- Performance degradation

**Root Cause:**

- Optimistic updates combined with cache invalidation
- Invalidating the query you just updated causes unnecessary refetches
- Multiple related queries refetching simultaneously

**Solution:**

```javascript
// ❌ BAD: Causes multiple blinks
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ["resources"] }); // Causes refetch
  queryClient.invalidateQueries({ queryKey: ["resource", resourceId] }); // Causes another refetch
},

// ✅ GOOD: Direct cache update, no invalidation of updated query
onSuccess: async (data, variables) => {
  // Fetch complete data
  const response = await fetch(`/api/resources/${variables.resourceId}`);
  const apiData = await response.json();

  // Update cache directly (no refetch = no blink)
  queryClient.setQueryData(["resource", variables.resourceId], apiData.resource);

  // Only invalidate related queries (not the one you updated)
  queryClient.invalidateQueries({ queryKey: ["stats"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
},
```

#### Issue 2: "Unknown Book" or Empty Fields After Mutation

**Symptoms:**

- After creating/updating, UI shows "Unknown Book", "Unknown Author", etc.
- Missing related data (e.g., book details in borrow records)
- Data appears empty until page refresh

**Root Cause:**

- Cache updated with incomplete data from mutation response
- Mutation response doesn't include all related fields (e.g., nested book data)
- Cache updated before related data is fetched

**Solution:**

```javascript
// ❌ BAD: Using mutation response directly (incomplete data)
onSuccess: (data) => {
  queryClient.setQueryData(["borrow-records", userId], [data]); // Missing book field
},

// ✅ GOOD: Fetch complete data from API before updating cache
onSuccess: async (data, variables) => {
  // Fetch complete borrow records WITH book data
  const response = await fetch(`/api/borrow-records?userId=${variables.userId}&limit=10000`);
  const apiData = await response.json();

  if (apiData.success && Array.isArray(apiData.borrows)) {
    // Update cache with complete data (includes book field)
    queryClient.setQueryData(["borrow-records", variables.userId], apiData.borrows);
  }
},
```

#### Issue 3: Data Disappears on Navigation

**Symptoms:**

- Data shows correctly after mutation
- Navigating away and back shows empty data
- Page refresh brings data back

**Root Cause:**

- `gcTime` too short (cache garbage collected)
- SSR initial data not preserved during client-side navigation
- Cache cleared on navigation

**Solution:**

```javascript
// ✅ Increase gcTime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 30 * 60 * 1000, // 30 minutes (instead of 5 minutes)
    },
  },
});

// ✅ Preserve SSR initial data
const initialDataRef = React.useRef(ssrInitialData);

React.useEffect(() => {
  if (ssrInitialData && !initialDataRef.current) {
    initialDataRef.current = ssrInitialData;
  }
}, [ssrInitialData]);

// Use initial data as fallback
const { data } = useQuery({
  queryKey: ["resources"],
  queryFn: getResources,
  initialData: initialDataRef.current,
});
```

#### Issue 4: Unnecessary Refetches After Mutation

**Symptoms:**

- Multiple API calls after single mutation
- Network tab shows redundant requests
- Performance issues

**Root Cause:**

- Invalidating the query you just updated
- Invalidating too many related queries
- `refetchOnMount: true` with `staleTime: Infinity` causing refetches

**Solution:**

```javascript
// ❌ BAD: Invalidating updated query causes unnecessary refetch
onSuccess: (data, variables) => {
  queryClient.invalidateQueries({ queryKey: ["resource", variables.resourceId] }); // Unnecessary!
},

// ✅ GOOD: Update cache directly, don't invalidate
onSuccess: async (data, variables) => {
  const response = await fetch(`/api/resources/${variables.resourceId}`);
  const apiData = await response.json();

  // Update cache directly (no refetch needed)
  queryClient.setQueryData(["resource", variables.resourceId], apiData.resource);

  // Only invalidate truly related queries
  queryClient.invalidateQueries({ queryKey: ["stats"] });
},
```

#### Issue 5: Cache Inconsistencies Between Queries

**Symptoms:**

- List shows updated data, but detail page shows old data
- Different queries showing different versions of same data
- Data out of sync

**Root Cause:**

- Only updating one query, not updating related queries
- Invalidating without updating cache first
- Related queries not updated together

**Solution:**

```javascript
// ✅ Update all related queries together
onSuccess: async (data, variables) => {
  const response = await fetch(`/api/resources/${variables.resourceId}`);
  const apiData = await response.json();

  // Update detail query
  queryClient.setQueryData(["resource", variables.resourceId], apiData.resource);

  // Update list queries
  queryClient.getQueryCache().getAll().forEach((query) => {
    const queryKey = query.queryKey;
    if (Array.isArray(queryKey) && queryKey[0] === "resources") {
      const currentData = queryClient.getQueryData(queryKey);
      if (Array.isArray(currentData)) {
        const updatedData = currentData.map((item) =>
          item.id === variables.resourceId ? apiData.resource : item
        );
        queryClient.setQueryData(queryKey, updatedData);
      }
    }
  });
},
```

### ✅ Best Practices Summary

1. **NO Optimistic Updates** - Use direct cache updates instead
2. **Fetch Complete Data** - Always fetch complete data from API before updating cache
3. **Update Cache Directly** - Don't invalidate the query you just updated
4. **Selective Invalidation** - Only invalidate truly related queries
5. **Use placeholderData** - Prevent flicker during refetch
6. **Increase gcTime** - Prevent data loss on navigation (30 minutes recommended)
7. **Preserve SSR Data** - Use refs to preserve SSR initial data during navigation
8. **Update All Related Queries** - Keep all queries in sync

---

## 5️⃣ Cache Invalidation Utilities

### Pattern: Centralized invalidation functions for related queries

### File: `src/utils/queryInvalidation.js`

```javascript
/**
 * React Query Cache Invalidation Utilities
 *
 * Centralized functions for invalidating React Query caches when data changes.
 * This ensures all related queries update immediately after mutations.
 *
 * Adapt these functions to your specific query keys and entity structure.
 */

/**
 * Invalidate all dashboard/overview queries
 * Call this when:
 * - New entity is created
 * - Entity is updated/deleted
 * - Any data that affects dashboard metrics changes
 *
 * @param {QueryClient} queryClient - React Query client instance
 */
export function invalidateDashboardQueries(queryClient) {
  // Invalidate dashboard stats
  queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

  // Invalidate overview lists
  queryClient.invalidateQueries({ queryKey: ["all-resources"] });

  // Add more dashboard-related queries as needed
  // queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] });
}

/**
 * Invalidate all queries after resource add/remove/update
 *
 * This ensures BOTH protected and public-facing pages update immediately.
 * Adapt query keys to match your entity structure.
 *
 * @param {QueryClient} queryClient - React Query client instance
 * @param {string} entityName - Entity name (e.g., "products", "users", "posts")
 */
export function invalidateAfterResourceChange(
  queryClient,
  entityName = "resources"
) {
  // Invalidate dashboard queries
  invalidateDashboardQueries(queryClient);

  // Invalidate public-facing resource queries
  // Use prefix matching to catch all variations:
  // - ['resources'] - base resources query
  // - ['resources', searchTerm] - resources with search
  // - ['resource', resourceId] - individual resource detail pages

  // Invalidate all list queries (with or without search/filter)
  queryClient.invalidateQueries({
    queryKey: [entityName], // e.g., ["products"], ["users"], ["posts"]
    exact: false, // Match all queries starting with this key
  });

  // Invalidate all detail queries (any resourceId)
  const singularKey = entityName.slice(0, -1); // Remove 's' (e.g., "products" -> "product")
  queryClient.invalidateQueries({
    queryKey: [singularKey], // e.g., ["product"], ["user"], ["post"]
    exact: false, // Match all queries starting with this key
  });
}

/**
 * Invalidate user-specific queries
 * Call this when:
 * - New entity is created by the current user
 * - User's own data changes
 *
 * @param {QueryClient} queryClient - React Query client instance
 * @param {string|null} userId - User ID (optional, will try to get from storage)
 * @param {string} entityName - Entity name (e.g., "orders", "posts", "comments")
 */
export function invalidateUserQueries(
  queryClient,
  userId = null,
  entityName = "user-entities"
) {
  // Get user ID if not provided
  // Adapt to your auth storage method
  if (!userId) {
    try {
      userId = JSON.parse(sessionStorage.getItem("userId"));
      // Or: userId = localStorage.getItem("userId");
    } catch {
      userId = null;
    }
  }

  if (userId) {
    queryClient.invalidateQueries({
      queryKey: [entityName, userId], // e.g., ["user-orders", userId]
    });
  }
}

/**
 * Invalidate all queries after entity creation
 * This is the most common use case - invalidates both user and dashboard queries
 *
 * @param {QueryClient} queryClient - React Query client instance
 * @param {string} entityName - Entity name (e.g., "products", "orders")
 * @param {string|null} userId - User ID (optional)
 */
export function invalidateAfterEntityCreation(
  queryClient,
  entityName,
  userId = null
) {
  invalidateUserQueries(queryClient, userId, `user-${entityName}`);
  invalidateDashboardQueries(queryClient);
  invalidateAfterResourceChange(queryClient, entityName);
}

/**
 * Invalidate all queries after user registration/login
 * This ensures dashboard shows new user count immediately
 *
 * @param {QueryClient} queryClient - React Query client instance
 */
export function invalidateAfterUserChange(queryClient) {
  invalidateDashboardQueries(queryClient);
  // Add more user-related invalidations as needed
}
```

**Key Points:**

- ✅ Centralized invalidation functions
- ✅ Use `exact: false` for prefix matching (catches all variations)
- ✅ Invalidate both admin and customer-facing queries
- ✅ Reusable across different mutations

---

## 6️⃣ Complete Example: Resource Management Flow

### Step 1: Service Function

```javascript
// src/services/authenticatedService.js
export async function updateResource(resourceId, updates) {
  const token = getToken();
  if (!token) throw new ApiError("Not authenticated", 401);

  const response = await fetch(`${API_BASE}/resources/${resourceId}`, {
    method: "PUT", // or PATCH
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ApiError(errorData.message || "Update failed", response.status);
  }

  return response.json();
}
```

### Step 2: Mutation Hook

```javascript
// src/hooks/useResourceMutations.js
export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resourceId, updates }) =>
      updateResource(resourceId, updates),
    onSuccess: (data, variables) => {
      // Invalidate all resource queries → UI updates immediately
      // Adapt entityName to your entity (e.g., "products", "users", "posts")
      invalidateAfterResourceChange(queryClient, "resources");

      // Also invalidate the specific resource detail query
      queryClient.invalidateQueries({
        queryKey: ["resource", variables.resourceId],
      });

      toast.success("Resource updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Update failed");
    },
  });
}
```

### Step 3: Component Usage

```javascript
// src/pages/ResourceEditPage.js
import { useUpdateResource } from "../hooks/useResourceMutations";
import { useResource } from "../hooks/useResources";

function ResourceEditPage({ resourceId }) {
  // Query: Fetch resource data
  const { data: resource, isLoading } = useResource(resourceId);

  // Mutation: Update resource
  const updateMutation = useUpdateResource();

  const handleSubmit = (formData) => {
    updateMutation.mutate(
      { resourceId, updates: formData },
      {
        onSuccess: () => {
          // Optional: Navigate or do something else
          // UI already updated via cache invalidation
        },
      }
    );
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Updating..." : "Update Resource"}
      </button>
    </form>
  );
}
```

### Step 4: What Happens

1. **User submits form** → `updateMutation.mutate()` called
2. **API call happens** → Resource updated in database
3. **onSuccess fires** → `invalidateAfterResourceChange()` called
4. **All resource queries invalidated** → React Query marks them as stale
5. **UI automatically refetches** → Fresh data loaded
6. **Components re-render** → Updated resource displayed immediately
7. **No page refresh needed** → Seamless UX

---

## 7️⃣ Search/Query Params Integration

### Pattern: Use URL params for search/filter state

```javascript
// src/pages/ResourcesPage.js
import { useSearchParams } from "react-router-dom";
import { useResources } from "../hooks/useResources";

function ResourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const filter = searchParams.get("filter") || "";

  // Build filters object from URL params
  const filters = filter ? { category: filter } : {};

  // Query automatically refetches when searchTerm or filters change
  const { data: resources, isLoading } = useResources(searchTerm, filters);

  const handleSearch = (value) => {
    // Update URL params
    setSearchParams({ search: value, filter });
    // Query automatically refetches because searchTerm changed
  };

  const handleFilter = (value) => {
    // Update URL params
    setSearchParams({ search: searchTerm, filter: value });
    // Query automatically refetches because filters changed
  };

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search resources..."
      />
      <select value={filter} onChange={(e) => handleFilter(e.target.value)}>
        <option value="">All</option>
        <option value="category1">Category 1</option>
        <option value="category2">Category 2</option>
      </select>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Key Points:**

- ✅ URL params as single source of truth
- ✅ Query key includes search term → separate cache per search
- ✅ Browser back/forward works automatically
- ✅ Shareable URLs with search state

---

## 8️⃣ Error Handling Pattern

### Global Error Handling (Optional)

```javascript
// src/index.js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ... other options
      onError: (error) => {
        // Global error handler for queries
        console.error("Query error:", error);
        // You can show a global error toast here if needed
      },
    },
    mutations: {
      onError: (error) => {
        // Global error handler for mutations
        console.error("Mutation error:", error);
      },
    },
  },
});
```

### Per-Query/Mutation Error Handling

```javascript
// In hooks
export function useResources() {
  return useQuery({
    queryKey: ["resources"],
    queryFn: getResourceList,
    staleTime: Infinity,
    refetchOnMount: true,
    // Per-query error handling (optional)
    onError: (error) => {
      console.error("Resources query error:", error);
      // Show specific error toast if needed
    },
  });
}
```

---

## 9️⃣ Performance Optimization Tips

### 1. Use `staleTime: Infinity` for Static/Infrequently Changing Data

```javascript
// Good for: Static entities, categories, settings, configuration
staleTime: Infinity, // Cache forever until invalidated
```

### 2. Use Shorter `staleTime` for Frequently Changing Data

```javascript
// Good for: Real-time data, notifications, live feeds
staleTime: 30 * 1000, // 30 seconds
```

### 3. Use `enabled` to Prevent Unnecessary Fetches

```javascript
// Only fetch if conditions are met
enabled: !!token && isAuthenticated,
// Or: enabled: !!userId && hasPermission,
```

### 4. Use `placeholderData` for Instant UI Updates

```javascript
// Show previous data while refetching
placeholderData: (previousData) => previousData,
```

### 5. Use `gcTime` to Control Cache Duration

```javascript
// Keep unused data in cache for faster subsequent loads
gcTime: 5 * 60 * 1000, // 5 minutes
// Adjust based on your needs (longer = more memory, faster loads)
```

---

## 🔟 Real-Time Support (SSR, CSR, SSE)

### Server-Side Rendering (SSR) Ready

```javascript
// QueryClient can be created per request in SSR
// Data can be prefetched on server and hydrated on client
const queryClient = new QueryClient();

// Prefetch on server
await queryClient.prefetchQuery({
  queryKey: ["resources"],
  queryFn: getResourceList,
});

// Hydrate on client
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>;
```

### Client-Side Rendering (CSR) - Current Setup

```javascript
// Already implemented - works out of the box
// QueryClient created once at root level
```

### Server-Sent Events (SSE) Integration

```javascript
// Example: Listen to SSE events and invalidate queries
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Invalidate queries when SSE event received
      // Adapt event types and query keys to your needs
      if (data.type === "resource-updated") {
        queryClient.invalidateQueries({ queryKey: ["resources"] });
        queryClient.invalidateQueries({
          queryKey: ["resource", data.resourceId],
        });
      }

      // Add more event types as needed
      // if (data.type === "resource-deleted") { ... }
    };

    return () => eventSource.close();
  }, [queryClient]);
}
```

---

## 1️⃣1️⃣ Checklist: Implementing in Your Project

### ✅ Setup Checklist

- [ ] Install dependencies: `npm install @tanstack/react-query react-toastify`
- [ ] Create `QueryClient` in root `index.js`
- [ ] Wrap app with `QueryClientProvider`
- [ ] Create service layer (pure API functions)
- [ ] Create custom hooks (useQuery, useMutation)
- [ ] Create cache invalidation utilities
- [ ] Add error handling (toasts)
- [ ] Test query caching (should use cache on second visit)
- [ ] Test mutation invalidation (UI should update immediately)
- [ ] Test search/query params integration

### ✅ Code Structure

```bash
src/
├── index.js                    # QueryClientProvider setup
├── services/
│   ├── resourceService.js      # Pure API functions (public)
│   ├── authenticatedService.js # Pure API functions (protected)
│   └── apiError.js            # Error utility
├── hooks/
│   ├── useResources.js        # Query hooks
│   ├── useResourceMutations.js # Mutation hooks
│   └── useAuthenticated.js    # Protected query hooks
├── utils/
│   └── queryInvalidation.js   # Cache invalidation utilities
└── pages/
    └── ResourcesPage.js       # Component using hooks
```

---

## 1️⃣2️⃣ Common Patterns & Best Practices

### Pattern 1: Conditional Queries

```javascript
// Only fetch if conditions are met
const { data } = useQuery({
  queryKey: ["user-entities", userId],
  queryFn: () => getUserEntities(userId),
  enabled: !!userId && isAuthenticated, // Conditional fetch
});
```

### Pattern 2: Dependent Queries

```javascript
// Fetch second query only after first succeeds
const { data: user } = useUser(userId);
const { data: orders } = useUserOrders(userId, {
  enabled: !!user, // Only fetch if user exists
});
```

### Pattern 3: Direct Cache Updates (Production-Tested - Recommended)

```javascript
/**
 * PRODUCTION-TESTED APPROACH: Direct Cache Updates
 *
 * Why NOT use optimistic updates:
 * - Causes multiple UI blinks (3-4 times)
 * - Incomplete data causes "Unknown" fields
 * - Cache inconsistencies between queries
 * - Unnecessary refetches
 *
 * Instead: Fetch complete data → Update cache → Invalidate related queries only
 */
const updateMutation = useMutation({
  mutationFn: updateResource,

  onSuccess: async (data, variables) => {
    // 1. Fetch complete data from API (includes all related fields)
    const response = await fetch(`/api/resources/${variables.resourceId}`);
    const apiData = await response.json();

    // 2. Update cache directly with complete data
    queryClient.setQueryData(
      ["resource", variables.resourceId],
      apiData.resource
    );

    // 3. Update list queries if resource is in them
    queryClient
      .getQueryCache()
      .getAll()
      .forEach((query) => {
        const queryKey = query.queryKey;
        if (Array.isArray(queryKey) && queryKey[0] === "resources") {
          const currentData = queryClient.getQueryData(queryKey);
          if (Array.isArray(currentData)) {
            const updatedData = currentData.map((item) =>
              item.id === variables.resourceId ? apiData.resource : item
            );
            queryClient.setQueryData(queryKey, updatedData);
          }
        }
      });

    // 4. Only invalidate related queries (NOT the updated query)
    // This prevents unnecessary refetches and blinks
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });

    // 5. Show toast immediately
    toast.success("Resource updated successfully");
  },
});
```

### Pattern 4: Parallel Queries

```javascript
// Fetch multiple queries in parallel
const resources = useResources();
const categories = useCategories();
const featured = useFilteredResources();

// All queries run in parallel automatically
```

### Pattern 5: Sequential Mutations

```javascript
// Chain mutations (create resource, then upload attachment)
const createMutation = useCreateResource();
const uploadMutation = useUploadAttachment();

const handleSubmit = async (data) => {
  const resource = await createMutation.mutateAsync(data);
  await uploadMutation.mutateAsync({
    resourceId: resource.id,
    attachment: data.attachment,
  });
};
```

---

## 1️⃣3️⃣ Troubleshooting

### Issue: UI not updating after mutation

**Solution:** Check that you're updating cache directly OR invalidating queries in `onSuccess`:

```javascript
// Option 1: Direct cache update (recommended - no blinks)
onSuccess: async (data, variables) => {
  const response = await fetch(`/api/resources/${variables.resourceId}`);
  const apiData = await response.json();
  queryClient.setQueryData(
    ["resource", variables.resourceId],
    apiData.resource
  );
  // Only invalidate related queries, not the updated one
  queryClient.invalidateQueries({ queryKey: ["stats"] });
};

// Option 2: Invalidate (causes refetch - may cause blinks)
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["resources"] });
};
```

### Issue: Multiple UI blinks/flickers during mutations

**Root Cause:** Optimistic updates or invalidating the query you just updated

**Solution:** Use direct cache updates instead of optimistic updates:

```javascript
// ❌ BAD: Optimistic update causes blinks
onMutate: async (newData) => {
  queryClient.setQueryData(["resource", resourceId], newData);
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ["resource", resourceId] }); // Causes blink
},

// ✅ GOOD: Direct cache update with complete data
onSuccess: async (data, variables) => {
  const response = await fetch(`/api/resources/${variables.resourceId}`);
  const apiData = await response.json();
  queryClient.setQueryData(["resource", variables.resourceId], apiData.resource);
  // Don't invalidate the updated query - only related ones
  queryClient.invalidateQueries({ queryKey: ["stats"] });
},
```

### Issue: "Unknown" or empty fields after mutation

**Root Cause:** Cache updated with incomplete data (missing related fields)

**Solution:** Always fetch complete data from API before updating cache:

```javascript
// ❌ BAD: Using mutation response directly (may be incomplete)
onSuccess: (data) => {
  queryClient.setQueryData(["resource", resourceId], data); // Missing related fields
},

// ✅ GOOD: Fetch complete data from API
onSuccess: async (data, variables) => {
  const response = await fetch(`/api/resources/${variables.resourceId}`);
  const apiData = await response.json();
  queryClient.setQueryData(["resource", variables.resourceId], apiData.resource); // Complete data
},
```

### Issue: Too many API calls

**Solution:** Check `staleTime` - should be `Infinity` for static data, or use direct cache updates:

```javascript
// For queries
staleTime: Infinity, // Prevents automatic refetching

// For mutations - use direct cache updates instead of invalidation
// This prevents unnecessary refetches
```

### Issue: Cache not working

**Solution:** Check `queryKey` - must be unique and consistent:

```javascript
queryKey: ["resources", searchTerm, filters], // Include all dependencies
```

### Issue: Stale data showing

**Solution:** Ensure `refetchOnMount: true` and use `placeholderData`:

```javascript
refetchOnMount: true, // Refetch if stale
placeholderData: (previousData) => previousData, // Show previous data during refetch
```

### Issue: Data disappears on navigation

**Root Cause:** Cache cleared or `gcTime` too short

**Solution:** Increase `gcTime` or use SSR initial data:

```javascript
// Increase garbage collection time
gcTime: 30 * 60 * 1000, // 30 minutes (instead of 5 minutes)

// Or use SSR initial data
const { data } = useQuery({
  queryKey: ["resources"],
  queryFn: getResources,
  initialData: ssrInitialData, // From server-side rendering
});
```

---

## 📚 Summary

This setup provides:

✅ **Fast UI Updates** - Immediate updates via direct cache updates (no blinks)  
✅ **Optimal Performance** - Infinite cache, no redundant API calls  
✅ **Automatic Sync** - All related queries update together  
✅ **Smart Caching** - Cache forever until invalidated  
✅ **Error Handling** - Centralized with toast notifications  
✅ **Real-Time Ready** - Supports SSR, CSR, SSE  
✅ **Production Ready** - Battle-tested patterns

**Key Configuration:**

- `staleTime: Infinity` - Cache forever until invalidated
- `refetchOnMount: true` - Refetch only when stale
- `placeholderData: (previousData) => previousData` - Prevent flicker during refetch
- `gcTime: 30 * 60 * 1000` - Keep cache for 30 minutes (prevents data loss on navigation)
- **Direct cache updates** - Fetch complete data → Update cache → Don't invalidate updated query
- **Selective invalidation** - Only invalidate related queries, not the one you just updated
- Centralized invalidation utilities
- Pure service layer
- Custom hooks for queries and mutations

**Production-Tested Patterns:**

- ❌ **NO Optimistic Updates** - Causes multiple blinks and data inconsistencies
- ✅ **Direct Cache Updates** - Fetch complete data from API, update cache directly
- ✅ **Selective Invalidation** - Don't invalidate the query you just updated
- ✅ **SSR Initial Data** - Preserve SSR data during client-side navigation
- ✅ **placeholderData** - Show previous data during refetch to prevent flicker

---

## 1️⃣4️⃣ TypeScript Support

### TypeScript Setup

Install TypeScript types:

```bash
npm install --save-dev typescript @types/react @types/react-dom
npm install @tanstack/react-query
```

### TypeScript Service Layer

```typescript
// src/services/apiError.ts
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
```

```typescript
// src/services/resourceService.ts
import { ApiError } from "./apiError";

// Define your resource type
export interface Resource {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Add your specific fields
}

export interface ResourceFilters {
  category?: string;
  status?: string;
  search?: string;
}

const API_BASE = process.env.REACT_APP_API_BASE_URL || "";

/**
 * Get all resources with optional search/filter
 */
export async function getResourceList(
  searchTerm: string = "",
  filters: ResourceFilters = {}
): Promise<Resource[]> {
  const params = new URLSearchParams();
  if (searchTerm) params.append("search", searchTerm);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE}/resources?${queryString}`
    : `${API_BASE}/resources`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new ApiError(response.statusText, response.status);
  }

  const data: Resource[] = await response.json();
  return data;
}

/**
 * Get single resource by ID
 */
export async function getResource(resourceId: string): Promise<Resource> {
  const response = await fetch(`${API_BASE}/resources/${resourceId}`);

  if (!response.ok) {
    throw new ApiError(response.statusText, response.status);
  }

  const data: Resource = await response.json();
  return data;
}
```

### TypeScript Hooks

```typescript
// src/hooks/useResources.ts
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import {
  getResourceList,
  getResource,
  Resource,
  ResourceFilters,
} from "../services/resourceService";

/**
 * Hook to fetch all resources with optional search/filter
 */
export function useResources(
  searchTerm: string = "",
  filters: ResourceFilters = {}
): UseQueryResult<Resource[], Error> {
  return useQuery<Resource[], Error>({
    queryKey: ["resources", searchTerm, filters],
    queryFn: () => getResourceList(searchTerm, filters),
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
  });
}

/**
 * Hook to fetch a single resource by ID
 */
export function useResource(
  resourceId: string | undefined,
  enabled: boolean = true
): UseQueryResult<Resource, Error> {
  return useQuery<Resource, Error>({
    queryKey: ["resource", resourceId],
    queryFn: () => getResource(resourceId!),
    enabled: enabled && !!resourceId,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
  });
}
```

### TypeScript Mutations

```typescript
// src/hooks/useResourceMutations.ts
import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  createResource,
  updateResource,
  deleteResource,
  Resource,
} from "../services/authenticatedService";
import { invalidateAfterResourceChange } from "../utils/queryInvalidation";
import { toast } from "react-toastify";

interface CreateResourceInput {
  name: string;
  description?: string;
  // Add your specific fields
}

interface UpdateResourceInput {
  name?: string;
  description?: string;
  // Add your specific fields
}

/**
 * Hook to create a new resource
 */
export function useCreateResource(): UseMutationResult<
  Resource,
  Error,
  CreateResourceInput
> {
  const queryClient = useQueryClient();

  return useMutation<Resource, Error, CreateResourceInput>({
    mutationFn: createResource,
    onSuccess: (data) => {
      invalidateAfterResourceChange(queryClient, "resources");
      toast.success("Resource created successfully", {
        closeButton: true,
        position: "bottom-center",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create resource", {
        closeButton: true,
        position: "bottom-center",
      });
    },
  });
}

/**
 * Hook to update an existing resource
 */
export function useUpdateResource(): UseMutationResult<
  Resource,
  Error,
  { resourceId: string; updates: UpdateResourceInput }
> {
  const queryClient = useQueryClient();

  return useMutation<
    Resource,
    Error,
    { resourceId: string; updates: UpdateResourceInput }
  >({
    mutationFn: ({ resourceId, updates }) =>
      updateResource(resourceId, updates),
    onSuccess: (data, variables) => {
      invalidateAfterResourceChange(queryClient, "resources");
      queryClient.invalidateQueries({
        queryKey: ["resource", variables.resourceId],
      });
      toast.success("Resource updated successfully", {
        closeButton: true,
        position: "bottom-center",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update resource", {
        closeButton: true,
        position: "bottom-center",
      });
    },
  });
}
```

### TypeScript Component Usage

```typescript
// src/pages/ResourceEditPage.tsx
import { useUpdateResource } from "../hooks/useResourceMutations";
import { useResource } from "../hooks/useResources";

interface ResourceEditPageProps {
  resourceId: string;
}

export function ResourceEditPage({ resourceId }: ResourceEditPageProps) {
  const { data: resource, isLoading } = useResource(resourceId, true);
  const updateMutation = useUpdateResource();

  const handleSubmit = (formData: UpdateResourceInput) => {
    updateMutation.mutate(
      { resourceId, updates: formData },
      {
        onSuccess: () => {
          console.log("Resource updated!");
        },
      }
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (!resource) return <div>Resource not found</div>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleSubmit({
          name: formData.get("name") as string,
          description: formData.get("description") as string,
        });
      }}
    >
      <input name="name" defaultValue={resource.name} />
      <textarea name="description" defaultValue={resource.description} />
      <button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Updating..." : "Update Resource"}
      </button>
    </form>
  );
}
```

---

## 1️⃣5️⃣ Next.js Support

### Next.js App Router Setup

```typescript
// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnMount: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Next.js API Routes (Server-Side)

```typescript
// app/api/resources/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";

  // Fetch from your backend (AWS Lambda, database, etc.)
  const response = await fetch(
    `${process.env.API_BASE_URL}/resources?search=${search}`
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Create resource via your backend
  const response = await fetch(`${process.env.API_BASE_URL}/resources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.headers.get("authorization")}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data, { status: 201 });
}
```

### Next.js Service Layer (Using API Routes)

```typescript
// src/services/resourceService.ts
// Use Next.js API routes instead of direct backend calls
const API_BASE = "/api"; // Use relative path for Next.js API routes

export async function getResourceList(
  searchTerm: string = "",
  filters: ResourceFilters = {}
): Promise<Resource[]> {
  const params = new URLSearchParams();
  if (searchTerm) params.append("search", searchTerm);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE}/resources?${queryString}`
    : `${API_BASE}/resources`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new ApiError(response.statusText, response.status);
  }

  const data: Resource[] = await response.json();
  return data;
}
```

### Next.js Server-Side Rendering (SSR)

```typescript
// app/resources/page.tsx
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { getResourceList } from "@/services/resourceService";
import { ResourcesList } from "./ResourcesList";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const queryClient = new QueryClient();
  const searchTerm = searchParams.search || "";

  // Prefetch data on server
  await queryClient.prefetchQuery({
    queryKey: ["resources", searchTerm],
    queryFn: () => getResourceList(searchTerm),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ResourcesList searchTerm={searchTerm} />
    </HydrationBoundary>
  );
}
```

```typescript
// app/resources/ResourcesList.tsx
"use client";

import { useResources } from "@/hooks/useResources";

export function ResourcesList({ searchTerm }: { searchTerm: string }) {
  const { data: resources, isLoading } = useResources(searchTerm);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {resources?.map((resource) => (
        <div key={resource.id}>{resource.name}</div>
      ))}
    </div>
  );
}
```

### Next.js Server Components (React Server Components)

```typescript
// app/resources/server-page.tsx
// This is a Server Component (no "use client")
import { getResourceList } from "@/services/resourceService";

export default async function ResourcesServerPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  // Fetch directly in Server Component (no React Query needed)
  const resources = await getResourceList(searchParams.search || "");

  return (
    <div>
      {resources.map((resource) => (
        <div key={resource.id}>{resource.name}</div>
      ))}
    </div>
  );
}
```

### Next.js Client Component with React Query

```typescript
// app/resources/client-page.tsx
"use client";

import { useResources } from "@/hooks/useResources";
import { useSearchParams } from "next/navigation";

export default function ResourcesClientPage() {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search") || "";

  const { data: resources, isLoading } = useResources(searchTerm);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {resources?.map((resource) => (
        <div key={resource.id}>{resource.name}</div>
      ))}
    </div>
  );
}
```

---

## 1️⃣6️⃣ Server-Side Rendering (SSR) Patterns

### React SSR with React Query

```typescript
// server.tsx (Express, Fastify, etc.)
import express from "express";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import App from "./App";
import { getResourceList } from "./services/resourceService";

const app = express();

app.get("/resources", async (req, res) => {
  const queryClient = new QueryClient();
  const searchTerm = (req.query.search as string) || "";

  // Prefetch data on server
  await queryClient.prefetchQuery({
    queryKey: ["resources", searchTerm],
    queryFn: () => getResourceList(searchTerm),
  });

  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <App />
      </HydrationBoundary>
    </QueryClientProvider>
  );

  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Resources</title></head>
      <body>
        <div id="root">${html}</div>
        <script>
          window.__REACT_QUERY_STATE__ = ${JSON.stringify(
            dehydrate(queryClient)
          )};
        </script>
        <script src="/client.js"></script>
      </body>
    </html>
  `);
});
```

### Client Hydration

```typescript
// client.tsx
import { hydrateRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HydrationBoundary } from "@tanstack/react-query";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnMount: true,
    },
  },
});

// Hydrate with server state
const dehydratedState = window.__REACT_QUERY_STATE__;

hydrateRoot(
  document.getElementById("root")!,
  <QueryClientProvider client={queryClient}>
    <HydrationBoundary state={dehydratedState}>
      <App />
    </HydrationBoundary>
  </QueryClientProvider>
);
```

---

## 1️⃣7️⃣ Node.js Server-Side Usage

### React Query in Node.js (Server Components)

```typescript
// server/resourceService.ts
import { QueryClient } from "@tanstack/react-query";
import { getResourceList } from "../services/resourceService";

// Create QueryClient for server-side usage
const serverQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

/**
 * Fetch resources on server (for SSR, API routes, etc.)
 */
export async function getServerResources(searchTerm: string = "") {
  return serverQueryClient.fetchQuery({
    queryKey: ["resources", searchTerm],
    queryFn: () => getResourceList(searchTerm),
  });
}

/**
 * Prefetch resources for SSR
 */
export async function prefetchResources(searchTerm: string = "") {
  await serverQueryClient.prefetchQuery({
    queryKey: ["resources", searchTerm],
    queryFn: () => getResourceList(searchTerm),
  });

  return serverQueryClient;
}
```

### Express API Route with React Query

```typescript
// server/routes/resources.ts
import express from "express";
import { QueryClient } from "@tanstack/react-query";
import { getResourceList } from "../../services/resourceService";

const router = express.Router();
const queryClient = new QueryClient();

router.get("/", async (req, res) => {
  try {
    const searchTerm = (req.query.search as string) || "";

    // Use React Query on server for caching
    const resources = await queryClient.fetchQuery({
      queryKey: ["resources", searchTerm],
      queryFn: () => getResourceList(searchTerm),
      staleTime: Infinity,
    });

    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

export default router;
```

### Next.js Server Action with React Query

```typescript
// app/actions/resources.ts
"use server";

import { QueryClient } from "@tanstack/react-query";
import { getResourceList } from "@/services/resourceService";

const serverQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

export async function getResourcesAction(searchTerm: string = "") {
  return serverQueryClient.fetchQuery({
    queryKey: ["resources", searchTerm],
    queryFn: () => getResourceList(searchTerm),
  });
}
```

```typescript
// app/resources/page.tsx
import { getResourcesAction } from "../actions/resources";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  // Use server action (which uses React Query internally)
  const resources = await getResourcesAction(searchParams.search || "");

  return (
    <div>
      {resources.map((resource) => (
        <div key={resource.id}>{resource.name}</div>
      ))}
    </div>
  );
}
```

---

**Last Updated:** 2025-12-02  
**Version:** 2.0.0  
**Status:** Universal/Generic Guide - Supports React, TypeScript, Next.js, SSR, Node.js
