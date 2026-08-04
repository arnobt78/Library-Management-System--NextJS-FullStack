/**
 * NextAuth Configuration for University Library Management System
 *
 * This file handles user authentication using NextAuth.js with:
 * - Credentials-based authentication (email/password)
 * - Versioned scrypt password hashing with legacy rehash-on-login
 * - JWT session strategy
 * - Lazy imports keep database work out of request-policy evaluation
 *
 * Next.js 16 Proxy runs in Node.js, while lazy imports still avoid loading database
 * modules until credential authorization or JWT persistence actually needs them.
 */

import NextAuth, { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authorizeProxyPath } from "@/lib/auth/proxyAuthorization";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "@/lib/auth/password";

// A fixed non-secret encoding gives unknown accounts the same memory-hard work
// factor as known current-format accounts without creating database state.
const UNKNOWN_ACCOUNT_PASSWORD =
  "$scrypt$ln=15,r=8,p=3$AAAAAAAAAAAAAAAAAAAAAA==$GIpZ5EyglZOu7nqCf+1C1IkTDn311beDMPgSjF+YqTRR7/X8BNJzCx29t8Op97lMn0iZnX4SabswQxf6TasYQQ==";

/**
 * Lazy import pattern for database connection
 *
 * WHY LAZY IMPORTS?
 * - This file is imported by proxy.ts for request authorization
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
     * 3. Verify the versioned password encoding
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

        const plainPassword = credentials.password.toString();
        if (user.length === 0) {
          await verifyPassword(plainPassword, UNKNOWN_ACCOUNT_PASSWORD);
          return null;
        }

        const isPasswordValid = await verifyPassword(
          plainPassword,
          user[0].password,
        );

        if (!isPasswordValid) return null;

        // Compare-and-swap prevents concurrent valid logins from overwriting a newer hash.
        // Never fail sign-in if upgrade write fails (schema drift / transient DB errors).
        if (needsPasswordRehash(user[0].password)) {
          try {
            const { and } = await import("drizzle-orm");
            const upgradedPassword = await hashPassword(plainPassword);
            await db
              .update(users)
              .set({ password: upgradedPassword, updatedAt: new Date() })
              .where(
                and(
                  eq(users.id, user[0].id),
                  eq(users.password, user[0].password),
                ),
              );
          } catch {
            // Login still succeeds; password upgrade can retry on a later sign-in.
          }
        }

        // Return user object for NextAuth (will be stored in JWT token)
        // CRITICAL: Include role + status for client gates / pending toasts
        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: user[0].fullName,
          role: user[0].role,
          status: user[0].status,
        } as User & { role: string; status: string };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth: currentSession, request }) {
      return authorizeProxyPath(
        request.nextUrl.pathname,
        Boolean(currentSession?.user),
      );
    },
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
      // Initial sign-in: seed JWT from authorize payload
      if (user) {
        token.id = user.id;
        token.name = user.name;
        const u = user as User & { role?: string; status?: string };
        token.role = u.role;
        token.status = u.status;

        try {
          const db = await getDb();
          const users = await getUsersSchema();
          const eq = await getEq();

          if (user.id) {
            await db
              .update(users)
              .set({ lastLogin: new Date() })
              .where(eq(users.id, user.id));
          }
        } catch {
          // Don't fail authentication if last_login update fails
        }
      } else if (
        token.id &&
        (token.status === "PENDING" ||
          token.status === "REJECTED" ||
          !token.status)
      ) {
        // Refresh PENDING/REJECTED (or missing) status so client gates update after admin approval
        try {
          const db = await getDb();
          const users = await getUsersSchema();
          const eq = await getEq();
          const row = await db
            .select({ status: users.status, role: users.role })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);
          if (row[0]) {
            token.status = row[0].status;
            token.role = row[0].role;
          }
        } catch {
          // Keep existing token claims if refresh fails
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
        // CRITICAL: Add role + status for authorization / PENDING client gates
        const sessionUser = session.user as {
          role?: string;
          status?: string;
        };
        sessionUser.role = token.role as string;
        sessionUser.status = token.status as string;
      }

      return session;
    },
  },
});
