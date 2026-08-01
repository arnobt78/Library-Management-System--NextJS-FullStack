// Parent: REQ-0025; TC-0045

import { describe, expect, it } from "vitest";
import { parseDeleteBookArgs } from "./deleteBookCli";

const BOOK_ID = "78e5c2c9-ac5d-4fe6-8b87-23587399ddf0";

describe("delete-book CLI contract", () => {
  it("requires an explicit valid target UUID", () => {
    expect(() => parseDeleteBookArgs([])).toThrow("explicit --id");
    expect(() => parseDeleteBookArgs(["--id", "not-a-uuid"])).toThrow(
      "valid UUID"
    );
  });

  it("accepts only the documented target and force-return options", () => {
    expect(
      parseDeleteBookArgs(["--id", BOOK_ID, "--force-return"])
    ).toEqual({ id: BOOK_ID, forceReturn: true });
  });

  it("rejects command-line secrets", () => {
    expect(() =>
      parseDeleteBookArgs(["--id", BOOK_ID, "--secret", "do-not-use"])
    ).toThrow("Unsupported argument: --secret");
  });
});
