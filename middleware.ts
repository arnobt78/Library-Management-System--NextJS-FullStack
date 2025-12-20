/**
 * Next.js Middleware
 *
 * This middleware runs on every request before the page/API route is rendered.
 *
 * IMPORTANT: Middleware runs in Edge Runtime, NOT Node.js runtime!
 *
 * Edge Runtime Limitations:
 * - Cannot use Node.js modules (fs, crypto, pg, etc.)
 * - Limited API surface (no database connections)
 * - Fast execution but limited capabilities
 *
 * What this middleware does:
 * - Uses NextAuth's auth() function to check authentication
 * - Can redirect unauthenticated users
 * - Can protect routes based on user role
 *
 * Why export auth as middleware?
 * - NextAuth provides built-in middleware functionality
 * - Handles session validation automatically
 * - Can be extended with custom logic if needed
 *
 * Note: The auth.ts file uses lazy imports to avoid loading database
 * modules in Edge runtime. Database operations only happen in Node.js runtime
 * (API routes, Server Components, Server Actions).
 */
export { auth as middleware } from "@/auth";
