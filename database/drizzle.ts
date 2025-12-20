import config from "@/lib/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!config.env.databaseUrl) {
  throw new Error(
    "No database connection string was provided. Please check your DATABASE_URL environment variable."
  );
}

const pool = new Pool({
  connectionString: config.env.databaseUrl,
});

export const db = drizzle(pool, { casing: "snake_case" });
