import dummyBooks from "../dummybooks.json";
import ImageKit from "imagekit";
import { books } from "@/database/schema";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
export const db = drizzle(pool);

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

const uploadToImageKit = async (
  url: string,
  fileName: string,
  folder: string
) => {
  try {
    let fileToUpload: string | Buffer = url;
    // If url is a local file path, read as base64
    if (!/^https?:\/\//.test(url)) {
      // Remove leading './' or '/' and resolve relative to project root
      let localPath = url.startsWith("./") ? url.slice(2) : url;
      if (localPath.startsWith("/")) localPath = localPath.slice(1);
      const absPath = path.resolve(process.cwd(), localPath);
      const fileBuffer = fs.readFileSync(absPath);
      fileToUpload = fileBuffer.toString("base64");
    }
    const response = await imagekit.upload({
      file: fileToUpload,
      fileName,
      folder,
    });
    return response.filePath;
  } catch (error) {
    console.error("Error uploading image to ImageKit:", error);
  }
};

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
