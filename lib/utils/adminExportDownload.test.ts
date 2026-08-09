/**
 * Unit tests for admin export activity metadata helper.
 */

import { describe, expect, it } from "vitest";
import { adminExportActivityMeta } from "@/lib/utils/adminExportDownload";

describe("adminExportActivityMeta", () => {
  it("maps kinds to entityType + EXPORT_* status", () => {
    expect(adminExportActivityMeta("books")).toEqual({
      entityType: "book",
      status: "EXPORT_BOOKS",
    });
    expect(adminExportActivityMeta("users")).toEqual({
      entityType: "user",
      status: "EXPORT_USERS",
    });
    expect(adminExportActivityMeta("borrows-range")).toEqual({
      entityType: "borrow",
      status: "EXPORT_BORROWS_RANGE",
    });
  });
});
