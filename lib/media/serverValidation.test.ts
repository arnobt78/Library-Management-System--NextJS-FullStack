// Parent: REQ-0026; TC-0054
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/config", () => ({
  default: { env: { imagekit: { urlEndpoint: "https://ik.imagekit.io/test" } } },
}));
import { assertPersistedMediaUrl } from "./serverValidation";
import { MEDIA_UPLOAD_LIMITS } from "./uploadLimits";
import config from "@/lib/config";

describe("persisted media boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts a trusted in-policy file after inspecting its bytes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(Uint8Array.from([0xff, 0xd8, 0xff, 0]), {
      status: 206,
      headers: { "content-type": "image/jpeg", "content-range": "bytes 0-3/1024" },
    })));
    await expect(assertPersistedMediaUrl(`${config.env.imagekit.urlEndpoint}/verified.jpg`, "image")).resolves.toBeUndefined();
  });

  it("rejects untrusted, oversized, and spoofed files before persistence", async () => {
    await expect(assertPersistedMediaUrl("https://attacker.example/card.jpg", "image")).rejects.toThrow("Untrusted");
    await expect(assertPersistedMediaUrl("https://ik.imagekit.io/testevil/card.jpg", "image")).rejects.toThrow("Untrusted");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(Uint8Array.from([0xff, 0xd8, 0xff]), {
      status: 206,
      headers: {
        "content-type": "image/jpeg",
        "content-range": `bytes 0-2/${MEDIA_UPLOAD_LIMITS.image.maxBytes + 1}`,
      },
    })));
    await expect(assertPersistedMediaUrl(`${config.env.imagekit.urlEndpoint}/large.jpg`, "image")).rejects.toThrow("policy");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(Uint8Array.from([1, 2, 3]), {
      status: 206,
      headers: { "content-type": "image/png", "content-range": "bytes 0-2/3" },
    })));
    await expect(assertPersistedMediaUrl(`${config.env.imagekit.urlEndpoint}/spoof.png`, "image")).rejects.toThrow("policy");
  });
});
