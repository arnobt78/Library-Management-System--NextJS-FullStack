/**
 * NextAuth Configuration for University Library Management System
 *
 * This file handles user authentication using NextAuth.js with:
 * - Credentials-based authentication (email/password)
 * - SHA-256 password hashing with salt
 * - JWT session strategy
 * - Lazy imports to support Edge runtime (middleware compatibility)
 *
 * IMPORTANT: This file uses lazy imports for database operations because:
 * - Next.js middleware runs in Edge runtime (doesn't support Node.js modules like 'pg')
 * - Database modules are only loaded when actually needed (in Node.js runtime contexts)
 * - This prevents "crypto module not supported" errors in Edge runtime
 */

import NextAuth, { User } from "next-auth";
import { sha256 } from "@noble/hashes/sha256";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * Helper function to concatenate two Uint8Arrays
 * Used for password hashing: combines password bytes with salt
 * @param a - First array (password bytes)
 * @param b - Second array (salt)
 * @returns Combined Uint8Array
 */
function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const c = new Uint8Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
}

/**
 * Lazy import pattern for database connection
 *
 * WHY LAZY IMPORTS?
 * - This file is imported by middleware.ts which runs in Edge runtime
 * - Edge runtime doesn't support Node.js modules (like 'pg' for PostgreSQL)
 * - By using dynamic imports, we only load the database when actually needed
 * - Database operations only happen in Node.js runtime (authorize/jwt callbacks)
 *
 * This prevents: "The edge runtime does not support Node.js 'crypto' module" errors
 */
async function getDb() {
  const { db } = await import("@/database/drizzle");
  return db;
}

async function getUsersSchema() {
  const { users } = await import("@/database/schema");
  return users;
}

async function getEq() {
  const { eq } = await import("drizzle-orm");
  return eq;
}

/**
 * NextAuth configuration export
 * Provides: handlers (for API routes), signIn, signOut, and auth (for server components)
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt", // Use JWT tokens instead of database sessions (faster, stateless)
  },
  providers: [
    /**
     * Credentials Provider - Email/Password Authentication
     *
     * Flow:
     * 1. User submits email/password
     * 2. Look up user in database by email
     * 3. Verify password using SHA-256 with salt
     * 4. Return user object if valid, null if invalid
     */
    CredentialsProvider({
      async authorize(credentials) {
        // Validate input
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        /**
         * Lazy load database only when authorize is called (Node.js runtime)
         * This is safe because authorize() only runs in API routes (Node.js runtime)
         * Not in middleware (Edge runtime)
         */
        const db = await getDb();
        const users = await getUsersSchema();
        const eq = await getEq();

        // Query user by email
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email.toString()))
          .limit(1);

        if (user.length === 0) return null;

        /**
         * Password Verification Process:
         *
         * Stored format: "salt:hash" (both base64 encoded)
         * 1. Split stored password into salt and hash
         * 2. Decode both from base64
         * 3. Hash the provided password with the stored salt
         * 4. Compare computed hash with stored hash
         *
         * This uses SHA-256 with salt for security:
         * - Salt prevents rainbow table attacks
         * - Each password has unique salt
         * - Even same passwords have different hashes
         */
        const [saltB64, hashB64] = user[0].password.split(":");
        const salt = Uint8Array.from(Buffer.from(saltB64, "base64"));
        const expectedHash = Buffer.from(hashB64, "base64");

        // Hash the provided password with the stored salt
        const passwordBytes = new TextEncoder().encode(
          credentials.password.toString()
        );
        const hashBuffer = sha256(concatUint8Arrays(passwordBytes, salt));
        const isPasswordValid = Buffer.from(hashBuffer).equals(expectedHash);

        if (!isPasswordValid) return null;

        // Return user object for NextAuth (will be stored in JWT token)
        // CRITICAL: Include role for admin authorization checks
        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: user[0].fullName,
          role: user[0].role, // Include role for authorization
        } as User & { role: string };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    /**
     * JWT Callback - Called when JWT token is created or updated
     *
     * This runs in Node.js runtime (API routes), so database access is safe
     *
     * Flow:
     * 1. When user signs in, 'user' object is provided
     * 2. Store user.id and user.name in JWT token
     * 3. Update last_login timestamp in database
     * 4. Return token (will be sent to client as cookie)
     */
    async jwt({ token, user }) {
      // Only runs on initial sign-in (when 'user' is provided)
      if (user) {
        // Store user data in JWT token
        token.id = user.id;
        token.name = user.name;
        // CRITICAL: Store role in JWT token for authorization checks
        token.role = (user as User & { role?: string }).role;

        /**
         * Update last_login timestamp when user signs in
         * This helps track user activity for analytics and security
         */
        try {
          /**
           * Lazy load database only when jwt callback is called (Node.js runtime)
           * Safe because this callback only runs in API routes, not middleware
           */
          const db = await getDb();
          const users = await getUsersSchema();
          const eq = await getEq();

          // Type guard: user.id is guaranteed to exist here (from authorize callback)
          if (user.id) {
            await db
              .update(users)
              .set({ lastLogin: new Date() })
              .where(eq(users.id, user.id));
          }
        } catch (error) {
          // Don't fail authentication if last_login update fails
          console.error("Failed to update last_login:", error);
        }
      }

      return token;
    },
    /**
     * Session Callback - Called whenever session is accessed
     *
     * This transforms the JWT token into the session object
     * that's available in Server Components via auth()
     *
     * Flow:
     * 1. Extract data from JWT token
     * 2. Add to session.user object
     * 3. Return session (available in getServerSession(), auth(), etc.)
     */
    async session({ session, token }) {
      if (session.user) {
        // Add user ID and name from JWT token to session
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        // CRITICAL: Add role to session for authorization checks
        // Type assertion needed because NextAuth types don't include role by default
        (session.user as { role?: string }).role = token.role as string;
      }

      return session;
    },
  },
});
