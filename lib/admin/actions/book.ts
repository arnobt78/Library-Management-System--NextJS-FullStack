"use server";

/**
 * Admin book write actions (create / update / read-by-id).
 *
 * Featured exclusivity:
 * When isFeatured is true, all other books are cleared in the same transaction
 * so the homepage hero has a single curated source of truth.
 */

import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  getActionErrorMessage,
  requireAdminActor,
} from "@/lib/auth/authorization";
import { bookSchema, bookUpdateSchema } from "@/lib/validations";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Clears is_featured on every book except the optional keepId.
 * Must run inside an open transaction for exclusivity with insert/update.
 */
async function clearOtherFeatured(tx: Tx, keepId?: string) {
  if (keepId) {
    await tx
      .update(books)
      .set({ isFeatured: false, updatedAt: new Date() })
      .where(ne(books.id, keepId));
  } else {
    await tx
      .update(books)
      .set({ isFeatured: false, updatedAt: new Date() })
      .where(eq(books.isFeatured, true));
  }
}

export const createBook = async (params: BookParams) => {
  try {
    const actor = await requireAdminActor();
    const safeParams = bookSchema.parse(params);
    const wantFeatured = safeParams.isFeatured === true;

    const newBook = await db.transaction(async (tx) => {
      if (wantFeatured) {
        await clearOtherFeatured(tx);
      }

      const inserted = await tx
        .insert(books)
        .values({
          ...safeParams,
          availableCopies: safeParams.totalCopies,
          updatedBy: actor.id,
          isActive: safeParams.isActive ?? true,
          isFeatured: wantFeatured,
          updatedAt: new Date(),
        })
        .returning();

      return inserted[0];
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newBook)),
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(
        error,
        "An error occurred while creating the book"
      ),
    };
  }
};

export const updateBook = async (
  bookId: string,
  params: Partial<BookParams>
) => {
  try {
    const actor = await requireAdminActor();
    const safeParams = bookUpdateSchema.parse(params);
    const wantFeatured = safeParams.isFeatured === true;

    const updatedBook = await db.transaction(async (tx) => {
      if (wantFeatured) {
        await clearOtherFeatured(tx, bookId);
      }

      // Adjust availableCopies when totalCopies changes (preserve borrowed count)
      if (
        safeParams.totalCopies !== undefined &&
        safeParams.totalCopies !== null
      ) {
        const currentBook = await tx
          .select({
            totalCopies: books.totalCopies,
            availableCopies: books.availableCopies,
          })
          .from(books)
          .where(eq(books.id, bookId))
          .limit(1);

        if (currentBook.length === 0) {
          throw new Error("Book not found");
        }

        const currentData = currentBook[0];
        const borrowedCopies =
          currentData.totalCopies - currentData.availableCopies;
        const newAvailableCopies = Math.max(
          0,
          safeParams.totalCopies - borrowedCopies
        );

        const rows = await tx
          .update(books)
          .set({
            ...safeParams,
            availableCopies: newAvailableCopies,
            updatedBy: actor.id,
            updatedAt: new Date(),
            ...(safeParams.isFeatured !== undefined
              ? { isFeatured: wantFeatured }
              : {}),
          })
          .where(eq(books.id, bookId))
          .returning();

        if (rows.length === 0) {
          throw new Error("Book not found");
        }
        return rows[0];
      }

      const rows = await tx
        .update(books)
        .set({
          ...safeParams,
          updatedBy: actor.id,
          updatedAt: new Date(),
          ...(safeParams.isFeatured !== undefined
            ? { isFeatured: wantFeatured }
            : {}),
        })
        .where(eq(books.id, bookId))
        .returning();

      if (rows.length === 0) {
        throw new Error("Book not found");
      }
      return rows[0];
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedBook)),
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(
        error,
        "An error occurred while updating the book"
      ),
    };
  }
};

export const getBookById = async (bookId: string) => {
  try {
    await requireAdminActor();
    const book = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (book.length === 0) {
      return {
        success: false,
        message: "Book not found",
      };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(book[0])),
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(
        error,
        "An error occurred while fetching the book"
      ),
    };
  }
};

/**
 * Resolves the homepage hero book: curated featured + active, else newest active.
 * Never loads the full catalog — LIMIT 1 only.
 */
export const getHomepageHeroBook = async (): Promise<Book | null> => {
  const featured = await db
    .select()
    .from(books)
    .where(and(eq(books.isFeatured, true), eq(books.isActive, true)))
    .limit(1);

  if (featured[0]) {
    return featured[0] as Book;
  }

  const newest = await db
    .select()
    .from(books)
    .where(eq(books.isActive, true))
    .orderBy(desc(books.createdAt))
    .limit(1);

  return (newest[0] as Book) ?? null;
};
