/**
 * Unit tests for Sentry auth-denial filter.
 * Parent: Sentry `/admin/support-tickets` auth noise
 */

import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/core";
import {
  dropExpectedAuthorizationErrors,
  isExpectedAuthorizationSentryEvent,
} from "@/lib/sentry/dropExpectedAuthorizationErrors";

describe("dropExpectedAuthorizationErrors", () => {
  it("drops AuthorizationError by originalException name", () => {
    const err = new Error("Admin access required");
    err.name = "AuthorizationError";
    const event = {
      type: undefined,
      exception: { values: [] },
    } as unknown as ErrorEvent;
    expect(
      isExpectedAuthorizationSentryEvent(event, { originalException: err }),
    ).toBe(true);
    expect(dropExpectedAuthorizationErrors(event, { originalException: err })).toBeNull();
  });

  it("drops by exception.values type", () => {
    const event = {
      type: undefined,
      exception: {
        values: [{ type: "AuthorizationError", value: "Admin access required" }],
      },
    } as unknown as ErrorEvent;
    expect(dropExpectedAuthorizationErrors(event)).toBeNull();
  });

  it("keeps unrelated errors", () => {
    const err = new Error("Database connection failed");
    const event = {
      type: undefined,
      exception: {
        values: [{ type: "Error", value: "Database connection failed" }],
      },
    } as unknown as ErrorEvent;
    expect(
      dropExpectedAuthorizationErrors(event, { originalException: err }),
    ).toBe(event);
  });
});
