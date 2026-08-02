// Parent: REQ-0020; TC-0025

const PROTECTED_APP_PREFIXES = [
  "/admin",
  "/all-books",
  "/books",
  "/my-profile",
  "/make-admin",
] as const;

export function isProtectedAppPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    PROTECTED_APP_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );
}

/** API routes retain their route-specific role/ownership policies. */
export function authorizeProxyPath(
  pathname: string,
  isAuthenticated: boolean
): boolean {
  return !isProtectedAppPath(pathname) || isAuthenticated;
}
