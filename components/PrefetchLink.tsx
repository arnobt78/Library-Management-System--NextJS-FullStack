"use client";

/**
 * Link that intent-prefetches TanStack queries on hover/focus (playbook §7).
 * Fire-and-forget — never blocks navigation.
 * Must stay a Client Component (useQueryClient); safe to import from RSC Header.
 */

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import type { ComponentProps, FocusEvent, MouseEvent } from "react";
import { queryKeys } from "@/lib/query/keys";
import { getBook, getBooksList } from "@/lib/services/books";
import { getAdminBookReviews, getBookReviews } from "@/lib/services/reviews";
import { getBorrowRequests, getUserBorrows } from "@/lib/services/borrows";
import { getPendingUsers, getUsersList } from "@/lib/services/users";
import { getAdminStats } from "@/lib/services/admin";
import {
  getAdminSupportTickets,
  getUserSupportTickets,
} from "@/lib/services/supportTickets";

export type PrefetchKind =
  | "all-books"
  | "admin-reviews"
  | "admin-books"
  | "admin-users"
  | "admin-book-requests"
  | "admin-account-requests"
  | "admin-dashboard"
  | "admin-tickets"
  | "user-tickets"
  | "my-profile"
  | "book-detail";

/** `/books/<uuid>` — warm detail + reviews before soft-nav (no stale flash). */
const BOOK_DETAIL_HREF =
  /^\/books\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const PREFETCH_BY_HREF: Record<string, PrefetchKind> = {
  "/all-books": "all-books",
  "/admin/book-reviews": "admin-reviews",
  "/admin/books": "admin-books",
  "/admin/users": "admin-users",
  "/admin/book-requests": "admin-book-requests",
  "/admin/account-requests": "admin-account-requests",
  "/admin": "admin-dashboard",
  "/admin/support-tickets": "admin-tickets",
  "/support-tickets": "user-tickets",
  "/my-profile": "my-profile",
};

type PrefetchLinkProps = ComponentProps<typeof Link> & {
  prefetchKind?: PrefetchKind;
  /** Required for my-profile borrow list warm. */
  userId?: string;
};

export default function PrefetchLink({
  prefetchKind,
  userId,
  onMouseEnter,
  onFocus,
  href,
  ...props
}: PrefetchLinkProps) {
  const queryClient = useQueryClient();

  const warm = () => {
    const path = typeof href === "string" ? href.split("?")[0]! : "";
    const bookMatch = BOOK_DETAIL_HREF.exec(path);
    const kind =
      prefetchKind ??
      (bookMatch ? ("book-detail" as const) : PREFETCH_BY_HREF[path]);
    if (!kind) return;

    switch (kind) {
      case "book-detail": {
        const bookId = bookMatch?.[1];
        if (!bookId) break;
        // staleTime 0 — densify/invalidate must win over a warm 30s cache.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.books.detail(bookId),
          queryFn: () => getBook(bookId),
          staleTime: 0,
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.reviews.book(bookId),
          queryFn: () => getBookReviews(bookId),
          staleTime: 0,
        });
        break;
      }
      case "all-books":
      case "admin-books":
        // staleTime 0 — after book.write densify, hover prefetch must not reuse
        // a 30s-fresh pre-mutation catalog (stale create/delete on soft-nav).
        void queryClient.prefetchQuery({
          queryKey: queryKeys.books.adminList({}),
          queryFn: () => getBooksList({}),
          staleTime: 0,
        });
        break;
      case "admin-reviews":
        // staleTime 0 — after review.write densify/invalidate, hover prefetch
        // must not reuse a 30s-fresh stale queue (late row on soft-nav).
        void queryClient.prefetchQuery({
          queryKey: queryKeys.reviews.adminList({}),
          queryFn: () => getAdminBookReviews({}),
          staleTime: 0,
        });
        break;
      case "admin-users":
        void queryClient.prefetchQuery({
          queryKey: queryKeys.users.adminList({}),
          queryFn: () => getUsersList({}),
          staleTime: 30_000,
        });
        break;
      case "admin-book-requests":
        // staleTime 0 — after borrow.create densify, hover prefetch must not
        // reuse a 30s-fresh pre-create universe (stale list/KPIs on soft-nav).
        void queryClient.prefetchQuery({
          queryKey: queryKeys.borrows.requests({
            status: "PENDING",
            search: undefined,
          }),
          queryFn: () => getBorrowRequests("PENDING"),
          staleTime: 0,
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.borrows.requests({
            status: undefined,
            search: undefined,
          }),
          queryFn: () => getBorrowRequests(),
          staleTime: 0,
        });
        break;
      case "admin-account-requests":
        void queryClient.prefetchQuery({
          queryKey: queryKeys.users.pending(),
          queryFn: () => getPendingUsers(),
          staleTime: 30_000,
        });
        break;
      case "admin-dashboard":
        // staleTime 0 — densified overview KPIs must win over a warm 30s cache.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.admin.stats,
          queryFn: () => getAdminStats(),
          staleTime: 0,
        });
        break;
      case "admin-tickets":
        void queryClient.prefetchQuery({
          queryKey: queryKeys.tickets.adminList({}),
          queryFn: () => getAdminSupportTickets({}),
          staleTime: 30_000,
        });
        break;
      case "user-tickets":
        void queryClient.prefetchQuery({
          queryKey: queryKeys.tickets.userRoot,
          queryFn: () => getUserSupportTickets({}),
          staleTime: 30_000,
        });
        break;
      case "my-profile":
        if (!userId) break;
        void queryClient.prefetchQuery({
          queryKey: queryKeys.borrows.user(userId),
          queryFn: () => getUserBorrows(userId),
          staleTime: 30_000,
        });
        break;
      default:
        break;
    }
  };

  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    warm();
    onMouseEnter?.(e);
  };
  const handleFocus = (e: FocusEvent<HTMLAnchorElement>) => {
    warm();
    onFocus?.(e);
  };

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    />
  );
}
