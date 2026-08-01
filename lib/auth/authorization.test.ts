// Parent: REQ-0025; TC-0039 through TC-0042

import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/database/drizzle", () => ({ db: {} }));
vi.mock("@/database/schema", () => ({ users: {} }));

type AuthorizationModule = typeof import("./authorization");
let authorization: AuthorizationModule;

beforeAll(async () => {
  authorization = await import("./authorization");
});

const approvedAdmin = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  name: "Admin",
  role: "ADMIN" as const,
  status: "APPROVED" as const,
};

describe("server actor policy", () => {
  it("rejects a missing authenticated session", () => {
    expect(() => authorization.validateActor(null, approvedAdmin)).toThrow(
      "Authentication required"
    );
  });

  it("rejects a session whose database account no longer exists", () => {
    expect(() =>
      authorization.validateActor(approvedAdmin.id, null)
    ).toThrow("Authentication required");
  });

  it("uses the current database role instead of a stale admin token", () => {
    expect(() =>
      authorization.validateActor(
        approvedAdmin.id,
        { ...approvedAdmin, role: "USER" },
        "ADMIN"
      )
    ).toThrow("Admin access required");
  });

  it("rejects a currently suspended or unapproved database account", () => {
    expect(() =>
      authorization.validateActor(approvedAdmin.id, {
        ...approvedAdmin,
        status: "REJECTED",
      })
    ).toThrow("An approved account is required");
  });

  it("accepts an approved current database admin", () => {
    expect(
      authorization.validateActor(
        approvedAdmin.id,
        approvedAdmin,
        "ADMIN"
      )
    ).toEqual(approvedAdmin);
  });

  it("prevents an ordinary user from modifying another user's record", () => {
    const actor = authorization.validateActor(approvedAdmin.id, {
      ...approvedAdmin,
      role: "USER",
    });
    expect(() =>
      authorization.assertOwnerOrAdmin(
        actor,
        "20000000-0000-4000-8000-000000000002"
      )
    ).toThrow("You can only modify your own records");
  });

  it("allows owners and admins through the same ownership policy", () => {
    const owner = authorization.validateActor(approvedAdmin.id, {
      ...approvedAdmin,
      role: "USER",
    });
    expect(() => authorization.assertOwnerOrAdmin(owner, owner.id)).not.toThrow();
    expect(() =>
      authorization.assertOwnerOrAdmin(approvedAdmin, owner.id)
    ).not.toThrow();
  });
});
