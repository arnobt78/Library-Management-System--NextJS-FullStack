/**
 * Database Connection Configuration
 * 
 * This file sets up the PostgreSQL database connection using:
 * - pg (node-postgres): PostgreSQL client for Node.js
 * - drizzle-orm/node-postgres: Drizzle ORM adapter for PostgreSQL
 * 
 * Connection Details:
 * - Uses connection pooling for efficient database access
 * - Configured for Hetzner VPS PostgreSQL (migrated from NeonDB)
 * - Connection string format: postgresql://user:password@host:port/database
 * 
 * IMPORTANT: This file must NOT be imported in Edge runtime contexts
 * (like middleware). Use lazy imports in auth.ts instead.
 */

import config from "@/lib/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Validate database connection string exists
if (!config.env.databaseUrl) {
  throw new Error(
    "No database connection string was provided. Please check your DATABASE_URL environment variable."
  );
}

/**
 * Connection Pool Configuration
 * 
 * Pool manages multiple database connections:
 * - Reuses connections instead of creating new ones each time
 * - Improves performance by reducing connection overhead
 * - Automatically handles connection errors and retries
 * 
 * Connection string format:
 * postgresql://username:password@host:port/database_name
 * 
 * For Hetzner VPS:
 * - Production (Vercel): Use port 25432 (external access)
 * - Local development: Use port 25432 or SSH tunnel
 */
const pool = new Pool({
  connectionString: config.env.databaseUrl,
});

/**
 * Drizzle ORM Database Instance
 * 
 * Export the database instance for use throughout the application
 * 
 * Configuration:
 * - casing: "snake_case" - Converts camelCase to snake_case for database columns
 *   Example: userId -> user_id, createdAt -> created_at
 * 
 * Usage:
 * import { db } from "@/database/drizzle";
 * const users = await db.select().from(users).where(eq(users.id, userId));
 */
export const db = drizzle(pool, { casing: "snake_case" });
