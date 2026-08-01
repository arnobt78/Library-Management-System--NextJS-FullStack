import dummyBooks from "../dummybooks.json";
import { books } from "@/database/schema";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";

config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
export const db = drizzle(pool);

const seed = async () => {
  console.log("Seeding data...");

  try {
    for (const book of dummyBooks) {
      await db.insert(books).values({
        ...book,
        coverUrl: book.coverUrl,
        videoUrl: book.videoUrl,
      });
    }

    console.log("Data seeded successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
};

seed();
