/**
 * Shared unfiltered filter objects for admin list StatCards.
 * KPIs subscribe via a dedicated RQ hook with these keys so mutations
 * that invalidate `adminRoot` refresh full-universe totals while the table
 * uses a separate filtered key (+ keepPreviousData).
 */

import type { BookFilters } from "@/lib/services/books";
import type { UserFilters } from "@/lib/services/users";

/** Matches AdminBooksList unfiltered useAllBooks key (limit/page only). */
export const ADMIN_BOOKS_UNFILTERED: BookFilters = {
  limit: 1000,
  page: 1,
};

/** Matches AdminUsersList default unfiltered key (sort=created). */
export const ADMIN_USERS_UNFILTERED: UserFilters = {
  sort: "created",
};

/** Matches useBorrowRequests when status/search are cleared. */
export const ADMIN_BORROW_REQUESTS_UNFILTERED: {
  status?: undefined;
  search?: undefined;
} = {};
