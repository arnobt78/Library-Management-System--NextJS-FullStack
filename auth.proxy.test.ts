// Parent: REQ-0020; TC-0025

import { beforeAll, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ config: null as AuthConfig | null }));

interface AuthConfig {
  callbacks: {
    authorized: (input: {
      auth: { user?: { id: string } } | null;
      request: { nextUrl: { pathname: string } };
    }) => boolean;
  };
}

vi.mock("next-auth", () => ({
  default: vi.fn((config: AuthConfig) => {
    captured.config = config;
    return {
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    };
  }),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => config),
}));

beforeAll(async () => {
  await import("./auth");
});

describe("Auth.js proxy callback wiring", () => {
  it("rejects anonymous protected requests and accepts authenticated ones", () => {
    const authorized = captured.config?.callbacks.authorized;
    expect(authorized).toBeTypeOf("function");

    expect(
      authorized?.({ auth: null, request: { nextUrl: { pathname: "/admin" } } })
    ).toBe(false);
    expect(
      authorized?.({
        auth: { user: { id: "10000000-0000-4000-8000-000000000001" } },
        request: { nextUrl: { pathname: "/admin" } },
      })
    ).toBe(true);
    expect(
      authorized?.({ auth: null, request: { nextUrl: { pathname: "/sign-in" } } })
    ).toBe(true);
  });
});
