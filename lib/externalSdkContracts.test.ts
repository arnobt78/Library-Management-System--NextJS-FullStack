// Parent: REQ-0021; TC-0028

import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  getUploadAuthParams: vi.fn(),
  limit: vi.fn(),
  publishJSON: vi.fn(),
  resend: vi.fn(() => ({ provider: "resend" })),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "127.0.0.1" })),
}));
vi.mock("@/lib/ratelimit", () => ({
  default: { limit: sdk.limit },
}));
vi.mock("@imagekit/next/server", () => ({
  getUploadAuthParams: sdk.getUploadAuthParams,
}));
vi.mock("@upstash/workflow", () => ({
  Client: class {
    constructor(_options: unknown) {}
  },
}));
vi.mock("@upstash/qstash", () => ({
  Client: class {
    publishJSON = sdk.publishJSON;
    constructor(_options: unknown) {}
  },
  resend: sdk.resend,
}));

describe("external SDK contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.limit.mockResolvedValue({ success: true });
  });

  it("returns ImageKit upload authentication parameters", async () => {
    sdk.getUploadAuthParams.mockReturnValue({
      token: "token",
      expire: 123,
      signature: "signature",
    });
    const { GET } = await import("@/app/api/auth/imagekit/route");

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      token: "token",
      expire: 123,
      signature: "signature",
    });
  });

  it("preserves ImageKit failure behavior", async () => {
    sdk.getUploadAuthParams.mockImplementation(() => {
      throw new Error("image service unavailable");
    });
    const { GET } = await import("@/app/api/auth/imagekit/route");

    const response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Failed to get ImageKit authentication parameters",
    });
  });

  it("publishes workflow email payloads and propagates provider failures", async () => {
    sdk.publishJSON.mockResolvedValueOnce({ messageId: "message-1" });
    const { sendEmail } = await import("@/lib/workflow");
    await expect(
      sendEmail({ email: "reader@example.test", subject: "Due", message: "Body" })
    ).resolves.toBeUndefined();
    expect(sdk.publishJSON).toHaveBeenCalledOnce();

    sdk.publishJSON.mockRejectedValueOnce(new Error("qstash unavailable"));
    await expect(
      sendEmail({ email: "reader@example.test", subject: "Due", message: "Body" })
    ).rejects.toThrow("qstash unavailable");
  });
});
