# Integration Guide: Redis Caching, Sentry & PostHog

> **Purpose**: Complete setup guide for Redis caching, Sentry error tracking, and PostHog analytics integration
> **Reusable**: This guide can be applied to any Next.js project
> **Last Updated**: 2025-01-20

---

## Table of Contents

1. [Redis Caching Setup](#1-redis-caching-setup)
2. [Sentry Error Tracking Setup](#2-sentry-error-tracking-setup)
3. [PostHog Analytics Setup](#3-posthog-analytics-setup)
4. [Integration Checklist](#integration-checklist)

---

## 1. Redis Caching Setup

### Overview

Redis caching provides server-side caching for API responses, reducing external API calls and improving response times. This implementation uses Upstash Redis (serverless Redis) with automatic TTL management.

### Prerequisites

- Upstash Redis account (free tier available)
- Next.js project
- Node.js 18+

### Step 1: Install Dependencies

```bash
npm install @upstash/redis
```

### Step 2: Environment Variables

Add to `.env.local`:

```env
UPSTASH_REDIS_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token-here
```

Get these from: [Upstash Console](https://console.upstash.com/)

### Step 3: Create Redis Client

Create `lib/redis.ts`:

```typescript
/**
 * Upstash Redis Client
 *
 * Provides Redis connection and basic operations
 * Works with serverless/edge environments
 */

import { Redis } from "@upstash/redis";

/**
 * Redis client instance
 * Initialize with environment variables
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || "",
  token: process.env.UPSTASH_REDIS_TOKEN || "",
});

/**
 * Get cached value by key
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    console.error("Redis get error:", error);
    return null; // Fail gracefully - caching is optional
  }
}

/**
 * Set cached value with optional TTL
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds (optional)
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  try {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
  } catch (error) {
    console.error("Redis set error:", error);
    // Don't throw - caching is optional, shouldn't break API
  }
}

/**
 * Delete cached value by key
 * @param key - Cache key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis delete error:", error);
  }
}

/**
 * Delete multiple keys by pattern
 * @param pattern - Key pattern (e.g., "recipe:*")
 */
export async function deleteCacheByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Redis delete pattern error:", error);
  }
}

/**
 * Check if key exists
 * @param key - Cache key
 * @returns true if key exists, false otherwise
 */
export async function existsCache(key: string): Promise<boolean> {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error("Redis exists error:", error);
    return false;
  }
}

/**
 * Get TTL (time to live) for a key
 * @param key - Cache key
 * @returns TTL in seconds, or -2 if key doesn't exist, -1 if no expiry
 */
export async function getTTL(key: string): Promise<number> {
  try {
    return await redis.ttl(key);
  } catch (error) {
    console.error("Redis TTL error:", error);
    return -2;
  }
}

/**
 * Centralized cache key generator
 * Ensures consistent cache key naming across the application
 */
export const cacheKeys = {
  // Recipe cache keys
  recipe: (id: string | number) => `recipe:${id}`,
  recipeSearch: (term: string, page: number, options?: string) =>
    `recipe:search:${term}:${page}${options ? `:${options}` : ""}`,
  recipeSimilar: (id: string | number) => `recipe:similar:${id}`,
  recipeSummary: (id: string | number) => `recipe:summary:${id}`,

  // User-specific cache keys
  favouriteRecipes: (userId: string) => `favourites:${userId}`,
  collections: (userId: string) => `collections:${userId}`,
  collection: (collectionId: string) => `collection:${collectionId}`,
  mealPlan: (userId: string, date: string) => `mealplan:${userId}:${date}`,
  shoppingList: (userId: string) => `shopping:${userId}`,

  // Content cache keys
  blogPosts: (skip: number, limit: number) => `blog:posts:${skip}:${limit}`,
  blogPost: (slug: string) => `blog:post:${slug}`,
};
```

### Step 4: Create Caching Utilities

Create `lib/redis-cache.ts`:

```typescript
/**
 * Redis Cache Integration for API Routes
 *
 * Provides server-side caching layer for API responses
 * Works alongside React Query client-side caching
 */

import { getCache, setCache, deleteCache, cacheKeys } from "./redis";

/**
 * Cache configuration
 * Adjust TTL values based on data update frequency
 */
const DEFAULT_TTL = 60 * 60; // 1 hour in seconds
const RECIPE_TTL = 24 * 60 * 60; // 24 hours for recipe data (rarely changes)
const SEARCH_TTL = 30 * 60; // 30 minutes for search results (more dynamic)

/**
 * Get cached API response
 * @param key - Cache key
 * @returns Cached data or null
 */
export async function getCachedResponse<T>(key: string): Promise<T | null> {
  try {
    return await getCache<T>(key);
  } catch (error) {
    console.error("Redis cache get error:", error);
    return null;
  }
}

/**
 * Set cached API response
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlSeconds - Time to live in seconds (optional, uses defaults)
 */
export async function setCachedResponse<T>(
  key: string,
  data: T,
  ttlSeconds?: number
): Promise<void> {
  try {
    await setCache(key, data, ttlSeconds);
  } catch (error) {
    console.error("Redis cache set error:", error);
    // Don't throw - caching is optional, shouldn't break API
  }
}

/**
 * Cache recipe data with appropriate TTL
 */
export async function cacheRecipe<T>(
  recipeId: string | number,
  data: T
): Promise<void> {
  await setCachedResponse(cacheKeys.recipe(recipeId), data, RECIPE_TTL);
}

/**
 * Get cached recipe data
 */
export async function getCachedRecipe<T>(
  recipeId: string | number
): Promise<T | null> {
  return getCachedResponse<T>(cacheKeys.recipe(recipeId));
}

/**
 * Cache search results with shorter TTL
 */
export async function cacheSearchResults<T>(
  searchTerm: string,
  page: number,
  data: T,
  options?: string
): Promise<void> {
  await setCachedResponse(
    cacheKeys.recipeSearch(searchTerm, page, options),
    data,
    SEARCH_TTL
  );
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults<T>(
  searchTerm: string,
  page: number,
  options?: string
): Promise<T | null> {
  return getCachedResponse<T>(cacheKeys.recipeSearch(searchTerm, page, options));
}

/**
 * Invalidate recipe cache
 */
export async function invalidateRecipeCache(
  recipeId: string | number
): Promise<void> {
  try {
    await deleteCache(cacheKeys.recipe(recipeId));
    await deleteCache(cacheKeys.recipeSimilar(recipeId));
    await deleteCache(cacheKeys.recipeSummary(recipeId));
  } catch (error) {
    console.error("Redis cache invalidation error:", error);
  }
}

/**
 * Invalidate search cache for a term
 */
export async function invalidateSearchCache(searchTerm: string): Promise<void> {
  try {
    // Delete all pages for this search term
    // Note: This is a simple implementation - in production, you might want to track page numbers
    for (let page = 1; page <= 10; page++) {
      await deleteCache(cacheKeys.recipeSearch(searchTerm, page));
    }
  } catch (error) {
    console.error("Redis search cache invalidation error:", error);
  }
}

/**
 * Helper to wrap API handler with caching
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withCache(
 *     "my-cache-key",
 *     3600, // 1 hour TTL
 *     async () => {
 *       // Your API logic here
 *       const data = await fetchData();
 *       return NextResponse.json(data);
 *     }
 *   );
 * }
 * ```
 *
 * @param cacheKey - Cache key
 * @param handler - API handler function that returns a NextResponse
 * @param ttlSeconds - Optional TTL override
 * @returns Cached or fresh response
 */
export async function withCache(
  cacheKey: string,
  handler: () => Promise<Response>,
  ttlSeconds?: number
): Promise<Response> {
  // Try to get from cache first
  const cached = await getCachedResponse<any>(cacheKey);
  if (cached !== null) {
    // Return cached response as NextResponse
    const response = Response.json(cached);
    response.headers.set("X-Cache-Status", "hit");
    return response;
  }

  // Execute handler and cache result
  const result = await handler();

  // Cache the response body (only for successful responses)
  if (result.status === 200) {
    try {
      const clonedResponse = result.clone();
      const data = await clonedResponse.json();
      await setCachedResponse(cacheKey, data, ttlSeconds);
    } catch (error) {
      // If response isn't JSON, don't cache
      console.warn("Cannot cache non-JSON response:", error);
    }
  }

  result.headers.set("X-Cache-Status", "miss");
  return result;
}

/**
 * Alternative: Cache data directly (for use with jsonResponse helper)
 *
 * Usage:
 * ```typescript
 * const results = await withCache(
 *   cacheKey,
 *   async () => {
 *     return await fetchDataFromAPI();
 *   },
 *   3600
 * );
 * const response = jsonResponse(results);
 * return response;
 * ```
 */
export async function withCacheData<T>(
  cacheKey: string,
  handler: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  // Try to get from cache first
  const cached = await getCachedResponse<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Execute handler and cache result
  const result = await handler();
  await setCachedResponse(cacheKey, result, ttlSeconds);
  return result;
}
```

### Step 5: Use in API Routes

Example: `app/api/recipes/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withCacheData, cacheKeys } from "@/lib/redis-cache";
import { getRecipeInformation } from "@/lib/recipe-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate ID
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
  }

  // Generate cache key
  const cacheKey = cacheKeys.recipe(id);

  try {
    // Use Redis caching with 24 hour TTL
    const results = await withCacheData(
      cacheKey,
      async () => {
        return await getRecipeInformation(id, {
          includeNutrition: true,
        });
      },
      24 * 60 * 60 // 24 hours TTL
    );

    const response = NextResponse.json(results);
    response.headers.set("X-Cache-Status", "hit"); // or "miss"
    return response;
  } catch (error) {
    console.error("Recipe API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}
```

### Step 6: Cache Invalidation

When data changes, invalidate cache:

```typescript
import { invalidateRecipeCache } from "@/lib/redis-cache";

// After updating a recipe
await updateRecipeInDatabase(recipeId, newData);
await invalidateRecipeCache(recipeId); // Clear cached data
```

### Best Practices

1. **TTL Selection**:
   - Static data (rarely changes): 24 hours
   - Dynamic data (changes frequently): 30 minutes - 1 hour
   - User-specific data: 1 hour or shorter

2. **Cache Key Strategy**:
   - Use consistent naming: `resource:identifier:options`
   - Include all relevant parameters in key
   - Use `cacheKeys` helper for consistency

3. **Error Handling**:
   - Always fail gracefully (return null on cache errors)
   - Don't let cache failures break your API
   - Log errors but don't throw

4. **Monitoring**:
   - Check `X-Cache-Status` header in responses
   - Monitor cache hit rates
   - Track Redis memory usage

---

## 2. Sentry Error Tracking Setup

### Overview

Sentry provides error tracking, performance monitoring, and release tracking. This setup covers Next.js integration with client, server, and edge runtime support.

### Prerequisites

- Sentry account (free tier available)
- Next.js 13+ project
- Node.js 18+

### Step 1: Install Dependencies

```bash
npm install @sentry/nextjs
```

### Step 2: Run Sentry Wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard will:
- Create Sentry config files
- Update `next.config.js`
- Create `sentry.properties` file

**Or manually set up (see below):**

### Step 3: Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token-here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

Get DSN from: Sentry Dashboard → Project Settings → Client Keys (DSN)

### Step 4: Create Sentry Configuration Files

#### Client Configuration: `sentry.client.config.ts`

```typescript
/**
 * Sentry Client Configuration
 * Runs in the browser
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable Replay (session replay) - optional
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and user input by default
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],
    }),
  ],

  // Set sample rate for profiling (optional)
  profilesSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Network errors
    "ResizeObserver loop limit exceeded",
    // Ad blockers
    "Non-Error promise rejection captured",
  ],
});
```

#### Server Configuration: `sentry.server.config.ts`

```typescript
/**
 * Sentry Server Configuration
 * Runs in Node.js (API routes, server components)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production
  tracesSampleRate: 1.0,

  debug: false,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Integrations
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],
    }),
  ],
});
```

#### Edge Configuration: `sentry.edge.config.ts`

```typescript
/**
 * Sentry Edge Configuration
 * Runs in Edge Runtime (middleware, edge API routes)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 1.0,

  debug: false,

  environment: process.env.NODE_ENV || "development",
});
```

### Step 5: Initialize Sentry in Next.js

#### Update `app/layout.tsx`:

```typescript
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Initialize Sentry on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Client-side Sentry is already initialized via sentry.client.config.ts
      // This is just for any additional setup
    }
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

#### Create `instrumentation.ts` (for server-side initialization):

```typescript
/**
 * Next.js Instrumentation
 * Required for server-side Sentry initialization
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
```

### Step 6: Update `next.config.js`

```javascript
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config
};

// Wrap with Sentry config
module.exports = withSentryConfig(
  nextConfig,
  {
    // Sentry options
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    // Additional Sentry webpack plugin options
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
  }
);
```

### Step 7: Error Boundary Component

Create `src/components/common/ErrorBoundary.tsx`:

```typescript
/**
 * React Error Boundary with Sentry Integration
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture error in Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Log error for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We've been notified and are working on a fix.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Step 8: Use in API Routes

Example: `app/api/example/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
  try {
    // Your API logic
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: {
        api_route: "/api/example",
      },
      extra: {
        url: request.url,
        method: request.method,
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Step 9: Manual Error Tracking

```typescript
import * as Sentry from "@sentry/nextjs";

// Capture exceptions
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}

// Capture messages
Sentry.captureMessage("Something important happened", "info");

// Set user context
Sentry.setUser({
  id: "123",
  email: "user@example.com",
  username: "user123",
});

// Add breadcrumbs
Sentry.addBreadcrumb({
  category: "navigation",
  message: "User navigated to profile page",
  level: "info",
});

// Set tags
Sentry.setTag("feature", "recipe-search");

// Set context
Sentry.setContext("recipe", {
  recipeId: "123",
  recipeName: "Chocolate Cake",
});
```

### Best Practices

1. **Error Sampling**: Adjust `tracesSampleRate` based on traffic
2. **Ignore Errors**: Add common non-critical errors to `ignoreErrors`
3. **User Context**: Set user context after authentication
4. **Release Tracking**: Use git commit SHA for releases
5. **Source Maps**: Enable source maps in production for better stack traces

---

## 3. PostHog Analytics Setup

### Overview

PostHog provides product analytics, feature flags, session replay, and heatmaps. This setup covers Next.js integration with client-side tracking.

### Prerequisites

- PostHog account (free tier available)
- Next.js 13+ project
- Node.js 18+

### Step 1: Install Dependencies

```bash
npm install posthog-js
```

### Step 2: Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_your-project-api-key
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Get API key from: PostHog Dashboard → Project Settings → API Keys

**Note**: Use `https://eu.i.posthog.com` for EU region or `https://app.posthog.com` for US region.

### Step 3: Create PostHog Client

Create `src/lib/posthog.ts`:

```typescript
/**
 * PostHog Analytics Client
 *
 * Provides PostHog initialization and tracking utilities
 */

import posthog from "posthog-js";

/**
 * Initialize PostHog
 * Call this once in your app (typically in layout or provider)
 */
export function initPostHog(): void {
  if (typeof window === "undefined") return;

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!posthogKey || !posthogHost) {
    console.warn("PostHog not configured - missing API key or host");
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") {
        console.log("PostHog initialized:", posthog);
      }
    },
    capture_pageview: true, // Automatically capture page views
    capture_pageleave: true, // Capture when user leaves page
    autocapture: true, // Automatically capture clicks, form submissions
    disable_session_recording: false, // Enable session replay
  });
}

/**
 * Get PostHog instance safely
 * @returns PostHog instance or null
 */
function getPostHogInstance() {
  if (typeof window !== "undefined" && window.posthog) {
    return window.posthog;
  }
  return null;
}

/**
 * Track a custom event
 * @param eventName - Event name
 * @param properties - Event properties (optional)
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const ph = getPostHogInstance();
  if (ph) {
    ph.capture(eventName, properties);
  } else {
    console.warn(`PostHog not initialized. Cannot track event: ${eventName}`);
  }
}

/**
 * Identify a user
 * @param userId - User ID
 * @param properties - User properties (optional)
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
): void {
  const ph = getPostHogInstance();
  if (ph) {
    ph.identify(userId, properties);
  } else {
    console.warn(`PostHog not initialized. Cannot identify user: ${userId}`);
  }
}

/**
 * Reset user (on logout)
 */
export function resetUser(): void {
  const ph = getPostHogInstance();
  if (ph) {
    ph.reset();
  } else {
    console.warn("PostHog not initialized. Cannot reset user.");
  }
}
```

### Step 4: Create PostHog Provider

Create `src/components/providers/PostHogProvider.tsx`:

```typescript
/**
 * PostHog Provider Component
 *
 * Initializes PostHog and provides context
 */

"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog } from "@/lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize PostHog on mount
    initPostHog();
  }, []);

  useEffect(() => {
    // Track page views on route change
    if (typeof window !== "undefined" && window.posthog) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      window.posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
```

### Step 5: Add Provider to Layout

Update `app/layout.tsx`:

```typescript
import { PostHogProvider } from "@/components/providers/PostHogProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
```

### Step 6: Create Custom Hook

Create `src/hooks/usePostHog.ts`:

```typescript
/**
 * PostHog Tracking Hook
 *
 * Provides convenient tracking functions for common events
 */

import { useCallback } from "react";
import { trackEvent, identifyUser } from "@/lib/posthog";

export function usePostHog() {
  /**
   * Track a custom event
   */
  const track = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    trackEvent(eventName, properties);
  }, []);

  /**
   * Track recipe-related events
   */
  const trackRecipe = useCallback((
    action: "view" | "favourite_added" | "favourite_removed" | "shared",
    recipeId: number | string,
    recipeTitle?: string
  ) => {
    trackEvent("recipe_action", {
      action,
      recipe_id: recipeId,
      recipe_title: recipeTitle,
    });
  }, [track]);

  /**
   * Track search events
   */
  const trackSearch = useCallback((searchTerm: string, resultCount?: number) => {
    trackEvent("search_performed", {
      search_term: searchTerm,
      result_count: resultCount,
    });
  }, [track]);

  /**
   * Track collection events
   */
  const trackCollection = useCallback((
    action: "created" | "updated" | "deleted" | "recipe_added",
    collectionId: string,
    collectionName?: string
  ) => {
    trackEvent("collection_action", {
      action,
      collection_id: collectionId,
      collection_name: collectionName,
    });
  }, [track]);

  /**
   * Track page view
   */
  const trackPageView = useCallback((pageName: string, properties?: Record<string, unknown>) => {
    trackEvent("$pageview", {
      page_name: pageName,
      ...properties,
    });
  }, [track]);

  return {
    track,
    trackRecipe,
    trackSearch,
    trackCollection,
    trackPageView,
  };
}
```

### Step 7: Use in Components

Example: Track recipe views:

```typescript
"use client";

import { useEffect } from "react";
import { usePostHog } from "@/hooks/usePostHog";

export function RecipeDetail({ recipeId, recipeTitle }: { recipeId: number; recipeTitle: string }) {
  const { trackRecipe } = usePostHog();

  useEffect(() => {
    // Track recipe view
    trackRecipe("view", recipeId, recipeTitle);
  }, [recipeId, recipeTitle, trackRecipe]);

  return <div>Recipe content...</div>;
}
```

Example: Track search:

```typescript
"use client";

import { usePostHog } from "@/hooks/usePostHog";

export function SearchBar() {
  const { trackSearch } = usePostHog();

  const handleSearch = (searchTerm: string, resultCount: number) => {
    trackSearch(searchTerm, resultCount);
  };

  return <input onSearch={handleSearch} />;
}
```

### Step 8: User Identification

Update your auth context/hook:

```typescript
import { useEffect } from "react";
import { identifyUser, resetUser } from "@/lib/posthog";
import { useAuth } from "@/context/AuthContext";

export function useAuthWithPostHog() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Identify user in PostHog
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
      });
    } else {
      // Reset user on logout
      resetUser();
    }
  }, [isAuthenticated, user]);

  return { user, isAuthenticated };
}
```

### Step 9: Feature Flags (Optional)

```typescript
import { usePostHog } from "posthog-js/react";

export function FeatureComponent() {
  const posthog = usePostHog();
  const isFeatureEnabled = posthog?.isFeatureEnabled("new-feature");

  if (!isFeatureEnabled) {
    return <div>Feature not available</div>;
  }

  return <div>New feature content</div>;
}
```

### Best Practices

1. **Event Naming**: Use consistent naming (snake_case recommended)
2. **Properties**: Include relevant context (IDs, counts, categories)
3. **User Privacy**: Respect user privacy, don't track PII unless necessary
4. **Performance**: PostHog batches events, but avoid excessive tracking
5. **Testing**: Test tracking in development, verify events in PostHog dashboard

---

## Integration Checklist

### Redis Caching
- [ ] Install `@upstash/redis`
- [ ] Add environment variables
- [ ] Create `lib/redis.ts`
- [ ] Create `lib/redis-cache.ts`
- [ ] Update API routes to use `withCache` or `withCacheData`
- [ ] Test caching with API calls
- [ ] Verify cache headers in responses
- [ ] Set up cache invalidation strategy

### Sentry Error Tracking
- [ ] Install `@sentry/nextjs`
- [ ] Run Sentry wizard or create config files manually
- [ ] Add environment variables
- [ ] Create `sentry.client.config.ts`
- [ ] Create `sentry.server.config.ts`
- [ ] Create `sentry.edge.config.ts`
- [ ] Create `instrumentation.ts`
- [ ] Update `next.config.js`
- [ ] Add ErrorBoundary component
- [ ] Test error tracking (trigger test error)
- [ ] Verify errors appear in Sentry dashboard

### PostHog Analytics
- [ ] Install `posthog-js`
- [ ] Add environment variables
- [ ] Create `src/lib/posthog.ts`
- [ ] Create `src/components/providers/PostHogProvider.tsx`
- [ ] Create `src/hooks/usePostHog.ts`
- [ ] Add PostHogProvider to layout
- [ ] Update auth context for user identification
- [ ] Add tracking to key user actions
- [ ] Test events in PostHog dashboard
- [ ] Verify session replay (if enabled)

---

## Troubleshooting

### Redis
- **Connection errors**: Check environment variables, verify Upstash dashboard
- **Cache not working**: Check `X-Cache-Status` header, verify TTL settings
- **Memory issues**: Monitor Redis memory usage, implement cache eviction

### Sentry
- **Events not appearing**: Check DSN, verify environment variables, check network tab
- **Source maps not working**: Ensure source maps are uploaded during build
- **Too many events**: Adjust `tracesSampleRate`, add errors to `ignoreErrors`

### PostHog
- **Events not tracking**: Check API key, verify PostHog host URL, check browser console
- **Ad blocker blocking**: Inform users to whitelist PostHog domain
- **Session replay not working**: Check `disable_session_recording` setting

---

## Additional Resources

- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [PostHog Docs](https://posthog.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## This repo (BookWise / university-library)

Sentry is wired with current Next 16 App Router files (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `app/global-error.tsx`) and `withSentryConfig({ tunnelRoute: "/api/monitoring" })` — not the older `sentry.client.config.ts` / layout `useEffect` examples above. Redis stays rate-limit only (no business-data cache). PostHog is not installed. Env placeholders: `.env.example`.

**Last Updated**: 2026-08-04
**Version**: 1.1.0