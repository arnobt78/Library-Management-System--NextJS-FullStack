"use server";

import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { eq } from "drizzle-orm";

export const createBook = async (
  params: BookParams & { updatedBy?: string }
) => {
  try {
    const newBook = await db
      .insert(books)
      .values({
        ...params,
        availableCopies: params.totalCopies, // Initially all copies are available
        updatedBy: params.updatedBy || undefined,
        isActive: params.isActive ?? true, // Default to true if not provided
      })
      .returning();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newBook[0])),
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "An error occurred while creating the book",
    };
  }
};

export const updateBook = async (
  bookId: string,
  params: Partial<BookParams> & { updatedBy?: string }
) => {
  try {
    // If totalCopies is being updated, we need to adjust availableCopies
    if (params.totalCopies) {
      // First get current book data
      const currentBook = await db
        .select({
          totalCopies: books.totalCopies,
          availableCopies: books.availableCopies,
        })
        .from(books)
        .where(eq(books.id, bookId))
        .limit(1);

      if (currentBook.length === 0) {
        return {
          success: false,
          message: "Book not found",
        };
      }

      const currentData = currentBook[0];
      const borrowedCopies =
        currentData.totalCopies - currentData.availableCopies;
      const newAvailableCopies = Math.max(
        0,
        params.totalCopies - borrowedCopies
      );

      const updatedBook = await db
        .update(books)
        .set({
          ...params,
          availableCopies: newAvailableCopies,
          updatedBy: params.updatedBy || undefined,
          updatedAt: new Date(), // CRITICAL: Update timestamp on every update
        })
        .where(eq(books.id, bookId))
        .returning();

      return {
        success: true,
        data: JSON.parse(JSON.stringify(updatedBook[0])),
      };
    } else {
      // Simple update without totalCopies change
      const updatedBook = await db
        .update(books)
        .set({
          ...params,
          updatedBy: params.updatedBy || undefined,
          updatedAt: new Date(), // CRITICAL: Update timestamp on every update
        })
        .where(eq(books.id, bookId))
        .returning();

      return {
        success: true,
        data: JSON.parse(JSON.stringify(updatedBook[0])),
      };
    }
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "An error occurred while updating the book",
    };
  }
};

export const getBookById = async (bookId: string) => {
  try {
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
    console.log(error);

    return {
      success: false,
      message: "An error occurred while fetching the book",
    };
  }
};
