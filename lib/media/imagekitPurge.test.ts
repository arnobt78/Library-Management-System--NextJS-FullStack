/**
 * ImageKit orphan purge — path allowlist + best-effort delete API.
 * Parent: REQ-0033 storage hygiene
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({
  default: {
    env: {
      imagekit: {
        urlEndpoint: "https://ik.imagekit.io/test",
        privateKey: "private_test_key",
      },
    },
  },
}));

vi.mock("@/database/drizzle", () => ({
  db: {
    select: vi.fn(),
  },
}));

import {
  purgeImageKitMedia,
  toAllowlistedFilePath,
} from "./imagekitPurge";
import { db } from "@/database/drizzle";

const ENDPOINT = "https://ik.imagekit.io/test";

describe("toAllowlistedFilePath", () => {
  it("accepts cover, video, and ids under the tenant endpoint", () => {
    expect(
      toAllowlistedFilePath(`${ENDPOINT}/books/covers/a.jpg`, ENDPOINT),
    ).toBe("/books/covers/a.jpg");
    expect(
      toAllowlistedFilePath(`${ENDPOINT}/books/videos/a.mp4`, ENDPOINT),
    ).toBe("/books/videos/a.mp4");
    expect(toAllowlistedFilePath(`${ENDPOINT}/ids/card.png`, ENDPOINT)).toBe(
      "/ids/card.png",
    );
    expect(toAllowlistedFilePath("ids/card.png", ENDPOINT)).toBe("/ids/card.png");
  });

  it("skips local seeds, empty, untrusted host, and non-allowlisted folders", () => {
    expect(toAllowlistedFilePath("/images/demo.png", ENDPOINT)).toBeNull();
    expect(toAllowlistedFilePath("/icons/logo.svg", ENDPOINT)).toBeNull();
    expect(toAllowlistedFilePath("", ENDPOINT)).toBeNull();
    expect(
      toAllowlistedFilePath("https://attacker.example/ids/x.png", ENDPOINT),
    ).toBeNull();
    expect(
      toAllowlistedFilePath(`${ENDPOINT}/other/folder/x.png`, ENDPOINT),
    ).toBeNull();
  });
});

describe("purgeImageKitMedia", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function mockRefcountZero() {
    const where = vi.fn().mockResolvedValue([{ count: 0 }]);
    const from = vi.fn(() => ({ where }));
    vi.mocked(db.select).mockReturnValue({ from } as never);
  }

  it("lists by path then deletes fileId when unreferenced", async () => {
    mockRefcountZero();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/v1/files?") && (!init?.method || init.method === "GET")) {
        return new Response(
          JSON.stringify([
            {
              fileId: "file_abc",
              filePath: "/books/covers/a.jpg",
              type: "file",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/v1/files/file_abc") && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      return new Response("unexpected", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await purgeImageKitMedia([`${ENDPOINT}/books/covers/a.jpg`]);

    expect(fetchMock).toHaveBeenCalled();
    const deleteCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "DELETE",
    );
    expect(deleteCall).toBeTruthy();
  });

  it("swallows ImageKit failures and never throws", async () => {
    mockRefcountZero();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    await expect(
      purgeImageKitMedia([`${ENDPOINT}/books/videos/x.mp4`]),
    ).resolves.toBeUndefined();
  });

  it("skips local university card paths without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await purgeImageKitMedia(["/images/demo-card.png"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
