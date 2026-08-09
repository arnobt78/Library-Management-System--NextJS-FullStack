/**
 * Shared Library Overview stats builder — SSR page + GET /api/admin/stats.
 * Keeps enriched recent rows + KPI fields identical so RQ refetch cannot wipe SSR.
 * Parent: REQ-0033 Wave B — stats parity (no Redis)
 */

import type {
  AdminDashboardStats,
  OverviewRecentBorrow,
  OverviewRecentUser,
} from "@/lib/admin/adminDashboardStatsTypes";
import {
  isBookActive,
  sumLendableCopies,
} from "@/lib/admin/lendableBookCopies";

/** Minimal user row needed for overview aggregates + recent users. */
export type AdminStatsUserRow = {
  id: string;
  fullName: string;
  email: string;
  universityCard: string | null;
  status: string | null;
  role: string | null;
  createdAt: Date | string | null;
  statusReviewedBy: string | null;
  statusReviewedAt: Date | string | null;
};

/** Borrow join row from getAllBorrowRequests (enriched fields optional for older caches). */
export type AdminStatsBorrowRow = {
  id: string;
  userId: string;
  bookId: string;
  status: string;
  borrowDate: Date | string | null;
  createdAt: Date | string | null;
  dueDate: Date | string | null;
  returnDate: Date | string | null;
  userName: string;
  userEmail: string;
  userUniversityCard?: string | null;
  bookTitle: string;
  bookAuthor: string;
  bookGenre: string | null;
  bookRating?: number | null;
  bookCoverUrl: string | null;
  bookCoverColor: string | null;
};

/** Catalog book row for copy/category analytics. */
export type AdminStatsBookRow = {
  id: string;
  title: string;
  author: string;
  genre: string | null;
  rating: number | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  totalCopies: number;
  availableCopies: number;
  isActive: boolean | null;
  isbn: string | null;
  publisher: string | null;
  pageCount: number | null;
  publicationYear: number | string | null;
  language: string | null;
};

export type BuildAdminDashboardStatsInput = {
  users: AdminStatsUserRow[];
  borrowRequests: AdminStatsBorrowRow[];
  books: AdminStatsBookRow[];
  reservationsWaiting?: number;
  openTicketCount?: number;
  pendingReviewCount?: number;
  pendingAdminRequests?: number;
  rejectedAdminRequests?: number;
  approvedAdminRequests?: number;
  ticketsOpen?: number;
  ticketsInProgress?: number;
  ticketsResolved?: number;
  ticketsUrgentOpen?: number;
  reviewsApproved?: number;
  reviewsRejected?: number;
  /** Cap for recent activity lists (overview cards). */
  recentLimit?: number;
};

/** Serialize Date / string to ISO for RSC + JSON clients. */
export function toAdminStatsIso(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function mapOverviewRecentBorrow(
  borrow: AdminStatsBorrowRow,
): OverviewRecentBorrow {
  return {
    id: borrow.id,
    bookId: borrow.bookId,
    bookTitle: borrow.bookTitle,
    bookAuthor: borrow.bookAuthor,
    bookGenre: borrow.bookGenre,
    bookRating: borrow.bookRating ?? 0,
    coverUrl: borrow.bookCoverUrl,
    coverColor: borrow.bookCoverColor,
    status: borrow.status,
    borrowDate: toAdminStatsIso(borrow.borrowDate),
    createdAt: toAdminStatsIso(borrow.createdAt),
    dueDate: toAdminStatsIso(borrow.dueDate),
    returnDate: toAdminStatsIso(borrow.returnDate),
    borrower: {
      id: borrow.userId,
      fullName: borrow.userName,
      email: borrow.userEmail,
      universityCard: borrow.userUniversityCard ?? null,
    },
  };
}

export function mapOverviewRecentUser(
  user: AdminStatsUserRow,
  usersById: Map<string, AdminStatsUserRow>,
): OverviewRecentUser {
  const reviewerId = user.statusReviewedBy;
  const reviewerRow = reviewerId ? usersById.get(reviewerId) : undefined;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    universityCard: user.universityCard,
    status: user.status || "PENDING",
    createdAt: toAdminStatsIso(user.createdAt),
    statusReviewedAt: toAdminStatsIso(user.statusReviewedAt),
    reviewer: reviewerRow
      ? {
          id: reviewerRow.id,
          fullName: reviewerRow.fullName,
          email: reviewerRow.email,
          universityCard: reviewerRow.universityCard,
        }
      : null,
  };
}

/**
 * Build the full AdminDashboardStats object from already-fetched DB rows.
 * Call from both the admin page and /api/admin/stats.
 */
export function buildAdminDashboardStats(
  input: BuildAdminDashboardStatsInput,
): AdminDashboardStats {
  const users = input.users ?? [];
  const borrowRequests = input.borrowRequests ?? [];
  const allBooks = input.books ?? [];
  const recentLimit = input.recentLimit ?? 5;

  const totalUsers = users.length;
  const approvedUsers = users.filter((u) => u.status === "APPROVED").length;
  const pendingUsers = users.filter((u) => u.status === "PENDING").length;
  const rejectedUsers = users.filter((u) => u.status === "REJECTED").length;
  const adminUsers = users.filter((u) => u.role === "ADMIN").length;

  const totalBooks = allBooks.length;
  // Lending KPIs — active titles only (inactive stay in title counts/badges).
  const { totalCopies, availableCopies, borrowedCopies } =
    sumLendableCopies(allBooks);

  const activeBooks = allBooks.filter((book) => isBookActive(book)).length;
  const inactiveBooks = allBooks.filter((book) => !isBookActive(book)).length;
  const booksWithISBN = allBooks.filter((book) => book.isbn).length;
  const booksWithPublisher = allBooks.filter((book) => book.publisher).length;
  const booksWithPages = allBooks.filter((book) => book.pageCount);
  const averagePageCount =
    booksWithPages.length > 0
      ? booksWithPages.reduce((sum, book) => sum + (book.pageCount || 0), 0) /
        booksWithPages.length
      : 0;

  const activeBorrows = borrowRequests.filter(
    (r) => r.status === "BORROWED",
  ).length;
  const pendingBorrows = borrowRequests.filter(
    (r) => r.status === "PENDING",
  ).length;
  const returnedBooks = borrowRequests.filter(
    (r) => r.status === "RETURNED",
  ).length;
  const cancelledBorrows = borrowRequests.filter(
    (r) => r.status === "CANCELLED",
  ).length;

  const usersById = new Map(users.map((u) => [u.id, u]));
  const recentBorrows = borrowRequests
    .slice(0, recentLimit)
    .map(mapOverviewRecentBorrow);
  const recentUsers = users
    .slice(0, recentLimit)
    .map((u) => mapOverviewRecentUser(u, usersById));

  const categoryAcc = allBooks.reduce(
    (acc, book) => {
      const genre = book.genre || "Unknown";
      if (!acc[genre]) {
        acc[genre] = {
          count: 0,
          totalCopies: 0,
          availableCopies: 0,
          avgRating: 0,
          totalRating: 0,
          ratingCount: 0,
        };
      }
      acc[genre].count += 1;
      // Category copy rolls match Overview lendable pool (active only).
      if (isBookActive(book)) {
        acc[genre].totalCopies += book.totalCopies;
        acc[genre].availableCopies += book.availableCopies;
      }
      if (book.rating && book.rating > 0) {
        acc[genre].totalRating += book.rating;
        acc[genre].ratingCount += 1;
      }
      return acc;
    },
    {} as Record<
      string,
      {
        count: number;
        totalCopies: number;
        availableCopies: number;
        avgRating: number;
        totalRating: number;
        ratingCount: number;
      }
    >,
  );

  Object.keys(categoryAcc).forEach((genre) => {
    if (categoryAcc[genre].ratingCount > 0) {
      categoryAcc[genre].avgRating =
        categoryAcc[genre].totalRating / categoryAcc[genre].ratingCount;
    }
  });

  const categoryStats = Object.entries(categoryAcc)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([genre, stats]) => ({ genre, ...stats }));

  const booksByYearAcc = allBooks.reduce(
    (acc, book) => {
      const year = book.publicationYear ?? "Unknown";
      const key = String(year);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const booksByYear = Object.entries(booksByYearAcc)
    .sort(([a], [b]) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return parseInt(b, 10) - parseInt(a, 10);
    })
    .slice(0, 5) as Array<[string, number]>;

  const booksByLanguageAcc = allBooks.reduce(
    (acc, book) => {
      const language = book.language || "Unknown";
      acc[language] = (acc[language] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const booksByLanguage = Object.entries(booksByLanguageAcc)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) as Array<[string, number]>;

  const topRatedBooks = allBooks
    .filter((book) => book.rating && book.rating > 0)
    // Rating desc first, then A-Z for stable ties (slice keeps true top-rated).
    .sort((a, b) => {
      const ratingDelta = (b.rating || 0) - (a.rating || 0);
      if (ratingDelta !== 0) return ratingDelta;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 5)
    .map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      rating: book.rating || 0,
      coverUrl: book.coverUrl ?? null,
      coverColor: book.coverColor ?? null,
      genre: book.genre ?? null,
    }));

  // Shelf inventory for deactivated titles (not lendable Available KPIs).
  const inactiveTitles = allBooks
    .filter((book) => !isBookActive(book))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 5)
    .map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl ?? null,
      coverColor: book.coverColor ?? null,
      genre: book.genre ?? null,
      rating: book.rating || 0,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
    }));

  return {
    totalUsers,
    approvedUsers,
    pendingUsers,
    rejectedUsers,
    adminUsers,
    totalBooks,
    totalCopies,
    availableCopies,
    borrowedCopies,
    activeBooks,
    inactiveBooks,
    booksWithISBN,
    booksWithPublisher,
    averagePageCount,
    activeBorrows,
    pendingBorrows,
    returnedBooks,
    cancelledBorrows,
    recentBorrows,
    recentUsers,
    categoryStats,
    booksByYear,
    booksByLanguage,
    topRatedBooks,
    inactiveTitles,
    reservationsWaiting: input.reservationsWaiting ?? 0,
    ...(input.openTicketCount !== undefined
      ? { openTicketCount: input.openTicketCount }
      : {}),
    ...(input.pendingReviewCount !== undefined
      ? { pendingReviewCount: input.pendingReviewCount }
      : {}),
    ...(input.pendingAdminRequests !== undefined
      ? { pendingAdminRequests: input.pendingAdminRequests }
      : {}),
    ...(input.rejectedAdminRequests !== undefined
      ? { rejectedAdminRequests: input.rejectedAdminRequests }
      : {}),
    ...(input.approvedAdminRequests !== undefined
      ? { approvedAdminRequests: input.approvedAdminRequests }
      : {}),
    ...(input.ticketsOpen !== undefined
      ? { ticketsOpen: input.ticketsOpen }
      : {}),
    ...(input.ticketsInProgress !== undefined
      ? { ticketsInProgress: input.ticketsInProgress }
      : {}),
    ...(input.ticketsResolved !== undefined
      ? { ticketsResolved: input.ticketsResolved }
      : {}),
    ...(input.ticketsUrgentOpen !== undefined
      ? { ticketsUrgentOpen: input.ticketsUrgentOpen }
      : {}),
    ...(input.reviewsApproved !== undefined
      ? { reviewsApproved: input.reviewsApproved }
      : {}),
    ...(input.reviewsRejected !== undefined
      ? { reviewsRejected: input.reviewsRejected }
      : {}),
  };
}
