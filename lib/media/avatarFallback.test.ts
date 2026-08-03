import { describe, expect, it } from "vitest";
import { robohashUrl } from "@/lib/media/avatarFallback";

describe("robohashUrl", () => {
  it("builds a stable Robohash URL from email", () => {
    expect(robohashUrl("Admin@Example.com", 80)).toBe(
      "https://robohash.org/admin%40example.com?set=set1&size=80x80",
    );
  });

  it("clamps size into a safe range", () => {
    expect(robohashUrl("a@b.c", 8)).toContain("size=40x40");
    expect(robohashUrl("a@b.c", 999)).toContain("size=256x256");
  });
});
