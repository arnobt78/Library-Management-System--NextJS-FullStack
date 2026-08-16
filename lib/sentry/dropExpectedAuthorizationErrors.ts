/**
 * Drop expected AuthorizationError denials from Sentry (not app bugs).
 * Used by server / edge / client Sentry.init beforeSend.
 */

import type { ErrorEvent, EventHint } from "@sentry/core";

const EXPECTED_AUTH_MESSAGES = [
  "Admin access required",
  "Authentication required",
  "An approved account is required",
  "Invalid account status",
  "Invalid account role",
  "You can only modify your own records",
] as const;

function isAuthorizationErrorName(name: string | undefined): boolean {
  return name === "AuthorizationError";
}

function isExpectedAuthMessage(message: string | undefined): boolean {
  if (!message) return false;
  return EXPECTED_AUTH_MESSAGES.some((m) => message.includes(m));
}

/** True when the event is an expected auth denial (drop from Sentry). */
export function isExpectedAuthorizationSentryEvent(
  event: ErrorEvent,
  hint?: EventHint,
): boolean {
  const original = hint?.originalException;
  if (original instanceof Error) {
    if (isAuthorizationErrorName(original.name)) return true;
    if (isExpectedAuthMessage(original.message)) return true;
  }

  for (const value of event.exception?.values ?? []) {
    if (isAuthorizationErrorName(value.type ?? undefined)) return true;
    if (isExpectedAuthMessage(value.value ?? undefined)) return true;
  }

  return false;
}

/** beforeSend helper — returns null to drop, else the event. */
export function dropExpectedAuthorizationErrors(
  event: ErrorEvent,
  hint?: EventHint,
): ErrorEvent | null {
  if (isExpectedAuthorizationSentryEvent(event, hint)) return null;
  return event;
}
