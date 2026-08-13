/**
 * Shared Book Details / Library DB / Borrow Stats / Status field contract.
 * Admin light panel + public dark overview consume the same values (no duplicate maps).
 * Parent: Book Details DNA densify
 */

import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import type { BookBorrowStats } from "@/lib/services/books";

/** Long US date for Library Database rows (matches public Book Overview). */
export function formatLongLibraryDate(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export type BookAvailabilityLabel = "Available" | "Low" | "Unavailable";

/** Availability cue from available/total — shared by dark stats + light admin panel. */
export function getBookAvailabilityStatus(
  availableCopies: number,
  totalCopies: number,
): { label: BookAvailabilityLabel; tone: "emerald" | "amber" | "rose" } {
  if (availableCopies <= 0) {
    return { label: "Unavailable", tone: "rose" };
  }
  const lowByCount = availableCopies <= 2;
  const lowByShare =
    totalCopies > 0 &&
    availableCopies <= Math.max(1, Math.floor(totalCopies * 0.1));
  if (lowByCount || lowByShare) {
    return { label: "Low", tone: "amber" };
  }
  return { label: "Available", tone: "emerald" };
}

/** Minimal book shape for the view-model (global Book or borrow-detail seed). */
export type BookDetailsSource = {
  id?: string;
  title?: string | null;
  author?: string | null;
  genre?: string | null;
  rating?: number | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  isbn?: string | null;
  publicationYear?: number | null;
  publisher?: string | null;
  language?: string | null;
  pageCount?: number | null;
  edition?: string | null;
  totalCopies?: number | null;
  availableCopies?: number | null;
  isActive?: boolean | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type BookDetailsField = {
  key: string;
  label: string;
  value: string;
  copyable?: boolean;
};

export type BookDetailsViewModel = {
  identity: {
    id: string;
    title: string;
    author: string;
    genre: string;
    rating: number | null;
    coverUrl: string;
    coverColor: string;
  };
  catalog: BookDetailsField[];
  libraryDb: BookDetailsField[];
  borrowStats: BookDetailsField[];
  availability: {
    label: BookAvailabilityLabel;
    tone: "emerald" | "amber" | "rose";
  };
  status: {
    isActive: boolean;
    label: "Active" | "Inactive";
  };
  inactiveWarning: boolean;
};

function displayOrNa(value: string | number | null | undefined): string {
  if (value == null || value === "") return "N/A";
  return String(value);
}

/**
 * Build display groups for Book Details DNA (admin + public overview).
 */
export function buildBookDetailsViewModel(
  book: BookDetailsSource,
  stats?: BookBorrowStats | null,
): BookDetailsViewModel {
  const available = book.availableCopies ?? 0;
  const total = book.totalCopies ?? 0;
  const availability = getBookAvailabilityStatus(available, total);
  const isActive = book.isActive !== false;

  return {
    identity: {
      id: book.id ?? "",
      title: book.title?.trim() || "Untitled",
      author: book.author?.trim() || "Unknown",
      genre: book.genre?.trim() || "—",
      rating: book.rating ?? null,
      coverUrl: book.coverUrl ?? "",
      coverColor: book.coverColor ?? "#1e293b",
    },
    catalog: [
      {
        key: "isbn",
        label: "ISBN",
        value: displayOrNa(book.isbn),
        copyable: Boolean(book.isbn),
      },
      {
        key: "published",
        label: "Published",
        value: displayOrNa(book.publicationYear),
      },
      {
        key: "publisher",
        label: "Publisher",
        value: displayOrNa(book.publisher),
      },
      {
        key: "language",
        label: "Language",
        value: displayOrNa(book.language),
      },
      {
        key: "pages",
        label: "Pages",
        value: displayOrNa(book.pageCount),
      },
      {
        key: "edition",
        label: "Edition",
        value: displayOrNa(book.edition),
      },
      {
        key: "total",
        label: "Total Books",
        value: displayOrNa(book.totalCopies),
      },
      {
        key: "available",
        label: "Available Books",
        value: displayOrNa(book.availableCopies),
      },
    ],
    libraryDb: [
      {
        key: "added",
        label: "Added to Library",
        value: formatLongLibraryDate(book.createdAt),
      },
      {
        key: "updated",
        label: "Last Updated",
        value: formatLongLibraryDate(book.updatedAt),
      },
    ],
    borrowStats: [
      {
        key: "totalBorrows",
        label: "Total Times Borrowed",
        value: String(stats?.totalBorrows ?? 0),
      },
      {
        key: "activeBorrows",
        label: "Currently Borrowed",
        value: String(stats?.activeBorrows ?? 0),
      },
      {
        key: "availability",
        label: "Availability Status",
        value: availability.label,
      },
      {
        key: "returnedBorrows",
        label: "Successfully Returned",
        value: String(stats?.returnedBorrows ?? 0),
      },
    ],
    availability,
    status: {
      isActive,
      label: isActive ? "Active" : "Inactive",
    },
    inactiveWarning: !isActive,
  };
}

/**
 * Seed BookDetailsSource from admin borrow-request detail row (SSR fallback).
 */
export function bookDetailsSourceFromBorrowRequest(row: {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookGenre: string;
  bookRating?: number | null;
  bookCoverUrl: string | null;
  bookCoverColor: string | null;
  bookAvailableCopies?: number | null;
  bookTotalCopies?: number | null;
  bookIsbn?: string | null;
  bookPublicationYear?: number | null;
  bookPublisher?: string | null;
  bookLanguage?: string | null;
  bookPageCount?: number | null;
  bookEdition?: string | null;
  bookIsActive?: boolean | null;
  bookCreatedAt?: string | Date | null;
  bookUpdatedAt?: string | Date | null;
}): BookDetailsSource {
  return {
    id: row.bookId,
    title: row.bookTitle,
    author: row.bookAuthor,
    genre: row.bookGenre,
    rating: row.bookRating ?? null,
    coverUrl: row.bookCoverUrl,
    coverColor: row.bookCoverColor,
    availableCopies: row.bookAvailableCopies ?? null,
    totalCopies: row.bookTotalCopies ?? null,
    isbn: row.bookIsbn ?? null,
    publicationYear: row.bookPublicationYear ?? null,
    publisher: row.bookPublisher ?? null,
    language: row.bookLanguage ?? null,
    pageCount: row.bookPageCount ?? null,
    edition: row.bookEdition ?? null,
    isActive: row.bookIsActive ?? true,
    createdAt: row.bookCreatedAt ?? null,
    updatedAt: row.bookUpdatedAt ?? null,
  };
}

/** Medium date helper re-export for admin panel timestamps if needed. */
export { formatMediumDate };
