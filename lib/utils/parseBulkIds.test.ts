import { describe, expect, it } from "vitest";
import { parseBulkIdInput } from "@/lib/utils/parseBulkIds";

describe("parseBulkIdInput", () => {
  it("parses comma newline and dedupes UUIDs", () => {
    const a = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const b = "11111111-2222-4333-8444-555555555555";
    expect(parseBulkIdInput(`${a}\n${b}, ${a}`)).toEqual([a, b]);
  });

  it("drops non-uuids", () => {
    expect(parseBulkIdInput("not-an-id 123")).toEqual([]);
  });
});
