/**
 * Book detail + Created-by / Updated-by PersonAttribution joins.
 * Shared by admin getBookById SSR and GET /api/books/[id] so invalidate refetch
 * cannot wipe densified createdByActor / updatedByActor after book.write.
 */
import { db } from "@/database/drizzle";
import { books, users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AuthorizedActor } from "@/lib/auth/authorization";

export type BookCatalogActor = {
  id: string;
  fullName: string;
  email: string;
  universityCard: string | null;
};

/** @deprecated Prefer BookCatalogActor — kept for existing imports. */
export type BookUpdatedByActor = BookCatalogActor;

/** Stamp densify actor from DB-backed admin (never invent universityCard). */
export function bookCatalogActorFromAdmin(
  actor: AuthorizedActor,
): BookCatalogActor {
  return {
    id: actor.id,
    fullName: actor.name?.trim() || "Admin",
    email: actor.email,
    universityCard: actor.universityCard ?? null,
  };
}

/** @deprecated Prefer bookCatalogActorFromAdmin. */
export function bookUpdatedByActorFromAdmin(
  actor: AuthorizedActor,
): BookCatalogActor {
  return bookCatalogActorFromAdmin(actor);
}

function mapJoinedActor(
  id: string | null,
  fullName: string | null,
  email: string | null,
  universityCard: string | null,
): BookCatalogActor | null {
  if (!id || !email) return null;
  return {
    id,
    fullName: fullName?.trim() || "Admin",
    email,
    universityCard: universityCard ?? null,
  };
}

/**
 * Load one book with left-joined creator + updater for catalog detail stamps.
 * Returns null when the book id does not exist.
 */
export async function loadBookWithUpdater(
  bookId: string,
): Promise<
  | (Book & {
      createdByActor: BookCatalogActor | null;
      updatedByActor: BookCatalogActor | null;
    })
  | null
> {
  const creator = alias(users, "book_creator");
  const updater = alias(users, "book_updater");
  const rows = await db
    .select({
      book: books,
      creatorId: creator.id,
      creatorFullName: creator.fullName,
      creatorEmail: creator.email,
      creatorUniversityCard: creator.universityCard,
      updaterId: updater.id,
      updaterFullName: updater.fullName,
      updaterEmail: updater.email,
      updaterUniversityCard: updater.universityCard,
    })
    .from(books)
    .leftJoin(creator, eq(books.createdBy, creator.id))
    .leftJoin(updater, eq(books.updatedBy, updater.id))
    .where(eq(books.id, bookId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    ...(row.book as Book),
    createdByActor: mapJoinedActor(
      row.creatorId,
      row.creatorFullName,
      row.creatorEmail,
      row.creatorUniversityCard,
    ),
    updatedByActor: mapJoinedActor(
      row.updaterId,
      row.updaterFullName,
      row.updaterEmail,
      row.updaterUniversityCard,
    ),
  };
}
