// Parent: REQ-0020; TC-0025

import { describe, expect, it } from "vitest";
import { authorizeProxyPath, isProtectedAppPath } from "./proxyAuthorization";

describe("Next.js proxy route authorization", () => {
  it.each(["/", "/all-books", "/books/book-1", "/my-profile", "/admin/users"])(
    "rejects an unauthenticated protected request to %s",
    (pathname) => {
      expect(isProtectedAppPath(pathname)).toBe(true);
      expect(authorizeProxyPath(pathname, false)).toBe(false);
    }
  );

  it("allows authenticated protected requests", () => {
    expect(authorizeProxyPath("/admin", true)).toBe(true);
    expect(authorizeProxyPath("/books/book-1", true)).toBe(true);
  });

  it.each(["/sign-in", "/sign-up", "/api/auth/imagekit", "/api/workflows/onboarding", "/api/status/health"])(
    "keeps public and independently-authorized route %s reachable",
    (pathname) => expect(authorizeProxyPath(pathname, false)).toBe(true)
  );
});
