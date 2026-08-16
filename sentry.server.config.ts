/**
 * Node runtime Sentry init (RSC, route handlers, server actions).
 * No-op when DSN is unset so builds without Sentry env still succeed.
 */

import * as Sentry from "@sentry/nextjs";
import { dropExpectedAuthorizationErrors } from "@/lib/sentry/dropExpectedAuthorizationErrors";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === "development";

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: isDev ? 1.0 : 0.1,
    beforeSend(event, hint) {
      return dropExpectedAuthorizationErrors(event, hint);
    },
  });
}
