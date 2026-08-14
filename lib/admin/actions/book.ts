"use server";

/**
 * Admin book write actions (create / update / read-by-id).
 *
 * Featured exclusivity:
 * When isFeatured is true, all other books are cleared in the same transaction
 * so the homepage hero has a single curated source of truth.
 * Inactive books cannot stay featured — isActive=false forces isFeatured=false.
 */

import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  getActionErrorMessage,
  requireAdminActor,
} from "@/lib/auth/authorization";
import { bookSchema, bookUpdateSchema } from "@/lib/validations";
import { assertPersistedMediaUrl } from "@/lib/media/serverValidation";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { logActivity } from "@/lib/admin/activityLog";
import {
  bookUpdatedByActorFromAdmin,
  loadBookWithUpdater,
} from "@/lib/books/loadBookWithUpdater";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Clears is_featured on other books for homepage exclusivity.
 * Do NOT touch updatedAt/updatedBy — exclusivity is not a catalog "edit"
 * and must not rewrite Added/Updated DNA on sibling rows.
 */
async function clearOtherFeatured(tx: Tx, keepId?: string) {
  if (keepId) {
    await tx
      .update(books)
      .set({ isFeatured: false })
      .where(and(ne(books.id, keepId), eq(books.isFeatured, true)));
  } else {
    await tx
      .update(books)
      .set({ isFeatured: false })
      .where(eq(books.isFeatured, true));
  }
}

export const createBook = async (params: BookParams) => {
  try {
    const actor = await requireAdminActor();
    const safeParams = bookSchema.parse(params);
    await Promise.all([
      assertPersistedMediaUrl(safeParams.coverUrl, "image"),
      assertPersistedMediaUrl(safeParams.videoUrl, "video"),
    ]);
    const wantFeatured = safeParams.isFeatured === true;
    // Inactive cannot be curated homepage hero.
    const isActive = safeParams.isActive ?? true;
    const isFeatured = wantFeatured && isActive;

    const newBook = await db.transaction(async (tx) => {
      if (isFeatured) {
        await clearOtherFeatured(tx);
      }

      const inserted = await tx
        .insert(books)
        .values({
          ...safeParams,
          availableCopies: safeParams.totalCopies,
          createdBy: actor.id,
          updatedBy: actor.id,
          isActive,
          isFeatured,
          updatedAt: new Date(),
        })
        .returning();

      return inserted[0];
    });

    await logActivity({
      actorId: actor.id,
      action: "CREATE",
      entityType: "book",
      entityId: newBook.id,
      details: { title: newBook.title, author: newBook.author },
    });
    revalidateMutationPaths("book.write");
    const catalogActor = bookUpdatedByActorFromAdmin(actor);
    return {
      success: true,
      data: JSON.parse(
        JSON.stringify({
          ...newBook,
          createdByActor: catalogActor,
          updatedByActor: catalogActor,
        }),
      ),
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
    const currentBook = await db
      .select({
        coverUrl: books.coverUrl,
        videoUrl: books.videoUrl,
      })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);
    if (!currentBook[0]) throw new Error("Book not found");

    // Existing legacy media remains editable; every newly supplied location
    // must pass the current trusted-origin, metadata, size, and signature policy.
    await Promise.all([
      safeParams.coverUrl && safeParams.coverUrl !== currentBook[0].coverUrl
        ? assertPersistedMediaUrl(safeParams.coverUrl, "image")
        : Promise.resolve(),
      safeParams.videoUrl && safeParams.videoUrl !== currentBook[0].videoUrl
        ? assertPersistedMediaUrl(safeParams.videoUrl, "video")
        : Promise.resolve(),
    ]);
    const wantFeatured = safeParams.isFeatured === true;
    // Inactive cannot remain featured; clear in the same write as isActive=false.
    const forceUnfeature = safeParams.isActive === false;
    const resolveFeaturedPatch = (): { isFeatured?: boolean } => {
      if (forceUnfeature) return { isFeatured: false };
      if (safeParams.isFeatured !== undefined) {
        return { isFeatured: wantFeatured };
      }
      return {};
    };
    const featuredPatch = resolveFeaturedPatch();
    const clearSiblings =
      !forceUnfeature &&
      wantFeatured &&
      safeParams.isFeatured !== undefined;

    const updatedBook = await db.transaction(async (tx) => {
      if (clearSiblings) {
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
            ...featuredPatch,
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
          ...featuredPatch,
        })
        .where(eq(books.id, bookId))
        .returning();

      if (rows.length === 0) {
        throw new Error("Book not found");
      }
      return rows[0];
    });

    await logActivity({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "book",
      entityId: updatedBook.id,
      details: { title: updatedBook.title },
    });
    revalidateMutationPaths("book.write");
    return {
      success: true,
      data: JSON.parse(
        JSON.stringify({
          ...updatedBook,
          updatedByActor: bookUpdatedByActorFromAdmin(actor),
        }),
      ),
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
    const data = await loadBookWithUpdater(bookId);

    if (!data) {
      return {
        success: false,
        message: "Book not found",
      };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(data)),
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
