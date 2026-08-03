/**
 * Browser Sentry init (App Router). Events post to same-origin `/api/monitoring`
 * via withSentryConfig tunnelRoute — bypasses ad blockers that filter ingest hosts.
 * No-op when NEXT_PUBLIC_SENTRY_DSN is unset (local/CI without keys).
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === "development";

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      process.env.VERCEL_ENV ||
      process.env.NODE_ENV ||
      "development",
    tracesSampleRate: isDev ? 1.0 : 0.1,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: isDev ? 0 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      "top.GLOBALS",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
