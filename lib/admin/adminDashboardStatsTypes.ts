/**
 * Typed Library Overview / admin.stats payload.
 * Shared by SSR page, GET /api/admin/stats, RQ, and densify patches.
 * Parent: REQ-0033 Wave B — stats parity
 */

export type OverviewRecentBorrow = {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookGenre: string | null;
  bookRating: number;
  coverUrl: string | null;
  coverColor: string | null;
  status: string;
  borrowDate: string | null;
  createdAt: string | null;
  dueDate: string | null;
  returnDate: string | null;
  borrower: {
    id: string;
    fullName: string;
    email: string;
    universityCard: string | null;
  };
};

export type OverviewRecentUser = {
  id: string;
  fullName: string;
  email: string;
  universityCard: string | null;
  status: string;
  createdAt: string | null;
  statusReviewedAt: string | null;
  reviewer: {
    id: string;
    fullName: string;
    email: string;
    universityCard: string | null;
  } | null;
};

export type AdminDashboardCategoryStat = {
  genre: string;
  count: number;
  totalCopies: number;
  availableCopies: number;
  avgRating: number;
  totalRating: number;
  ratingCount: number;
};

export type AdminDashboardTopRatedBook = {
  id: string;
  title: string;
  author: string;
  rating: number;
  coverUrl: string | null;
  coverColor: string | null;
  genre: string | null;
};

/** Off-shelf / inactive catalog titles for Overview mid-panel (shelf copies). */
export type AdminDashboardInactiveTitle = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverColor: string | null;
  genre: string | null;
  /** Catalog rating (0 = unset); shown as star beside genre when > 0. */
  rating: number;
  totalCopies: number;
  availableCopies: number;
};

/** Full dashboard stats — same shape from SSR and client refetch. */
export type AdminDashboardStats = {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  rejectedUsers: number;
  adminUsers: number;
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  activeBooks: number;
  inactiveBooks: number;
  booksWithISBN: number;
  booksWithPublisher: number;
  averagePageCount: number;
  activeBorrows: number;
  pendingBorrows: number;
  returnedBooks: number;
  cancelledBorrows: number;
  recentBorrows: OverviewRecentBorrow[];
  recentUsers: OverviewRecentUser[];
  categoryStats: AdminDashboardCategoryStat[];
  booksByYear: Array<[string, number]>;
  booksByLanguage: Array<[string, number]>;
  topRatedBooks: AdminDashboardTopRatedBook[];
  /** Cap 5 — inactive shelf list (not lendable KPI pool). */
  inactiveTitles: AdminDashboardInactiveTitle[];
  reservationsWaiting: number;
  openTicketCount?: number;
  pendingReviewCount?: number;
  /** Make-admin queue — pending privilege requests */
  pendingAdminRequests?: number;
  rejectedAdminRequests?: number;
  approvedAdminRequests?: number;
  /** Ticket breakdown (openTicketCount remains OPEN+IN_PROGRESS) */
  ticketsOpen?: number;
  ticketsInProgress?: number;
  ticketsResolved?: number;
  ticketsUrgentOpen?: number;
  /** Lifetime review moderation totals (pending stays in pendingReviewCount) */
  reviewsApproved?: number;
  reviewsRejected?: number;
};
