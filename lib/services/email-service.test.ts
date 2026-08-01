// Parent: REQ-0030; TC-0046
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());

describe("idempotent email delivery", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RESEND_TOKEN = "test-token";
    process.env.RESEND_SENDER_EMAIL = "Library <library@example.test>";
    vi.stubGlobal("fetch", send);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("passes the stable outbox key to the provider", async () => {
    send.mockResolvedValue(new Response(JSON.stringify({ id: "message-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const { sendIdempotentEmailViaResend } = await import("./email-service");
    await expect(sendIdempotentEmailViaResend(
      "reader@example.test",
      "Ready",
      "<p>Ready</p>",
      "Ready",
      "reservation-id:READY",
    )).resolves.toEqual({ messageId: "message-1", provider: "Resend" });
    expect(send).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Idempotency-Key": "reservation-id:READY" }),
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
