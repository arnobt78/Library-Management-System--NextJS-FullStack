// Parent: REQ-0020
// Next.js 16 runs Proxy on the Node.js runtime; Auth.js retains the existing route policy.
// Matcher skips static/media so auth is not evaluated on every font/chunk request.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match app/API navigations only.
     * Exclude Next internals and common public static file extensions.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2?|map)$).*)",
  ],
};
