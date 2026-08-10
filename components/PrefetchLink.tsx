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
import {
  getPendingAdminRequests,
  getPendingUsers,
  getRecentAdminRequestDecisions,
  getUsersList,
} from "@/lib/services/users";
import { getAdminRequestDetail } from "@/lib/admin/actions/admin-requests";
import { getAdminUserDetailCache } from "@/lib/admin/actions/user-detail";
import { getSignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
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
  | "admin-admin-requests"
  | "admin-dashboard"
  | "admin-tickets"
  | "user-tickets"
  | "my-profile"
  | "book-detail"
  | "signup-request-detail"
  | "admin-request-detail"
  | "admin-user-detail";

const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** `/books/<uuid>` — warm detail + reviews before soft-nav (no stale flash). */
const BOOK_DETAIL_HREF = new RegExp(`^/books/(${UUID})$`, "i");
/** Registration Queue signup applicant detail. */
const SIGNUP_REQUEST_DETAIL_HREF = new RegExp(
  `^/admin/account-requests/(${UUID})$`,
  "i",
);
/** Make-admin request detail. */
const ADMIN_REQUEST_DETAIL_HREF = new RegExp(
  `^/admin/admin-requests/(${UUID})$`,
  "i",
);
/** User 360 profile. */
const ADMIN_USER_DETAIL_HREF = new RegExp(`^/admin/users/(${UUID})$`, "i");

const PREFETCH_BY_HREF: Record<string, PrefetchKind> = {
  "/all-books": "all-books",
  "/admin/book-reviews": "admin-reviews",
  "/admin/books": "admin-books",
  "/admin/users": "admin-users",
  "/admin/book-requests": "admin-book-requests",
  "/admin/account-requests": "admin-account-requests",
  "/admin/admin-requests": "admin-admin-requests",
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
    const signupDetailMatch = SIGNUP_REQUEST_DETAIL_HREF.exec(path);
    const adminRequestDetailMatch = ADMIN_REQUEST_DETAIL_HREF.exec(path);
    const adminUserDetailMatch = ADMIN_USER_DETAIL_HREF.exec(path);
    const kind =
      prefetchKind ??
      (bookMatch
        ? ("book-detail" as const)
        : signupDetailMatch
          ? ("signup-request-detail" as const)
          : adminRequestDetailMatch
            ? ("admin-request-detail" as const)
            : adminUserDetailMatch
              ? ("admin-user-detail" as const)
              : PREFETCH_BY_HREF[path]);
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
      case "signup-request-detail": {
        const userId = signupDetailMatch?.[1];
        if (!userId) break;
        // staleTime 0 — approve/reject densify must win over warm detail.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.users.signupRequestDetail(userId),
          queryFn: async () => {
            const detail = await getSignupRequestDetail(userId);
            if (!detail) throw new Error("Signup request not found");
            return detail;
          },
          staleTime: 0,
        });
        break;
      }
      case "admin-request-detail": {
        const requestId = adminRequestDetailMatch?.[1];
        if (!requestId) break;
        void queryClient.prefetchQuery({
          queryKey: queryKeys.admin.requestDetail(requestId),
          queryFn: async () => {
            const result = await getAdminRequestDetail(requestId);
            if (!result.success || !result.data) {
              throw new Error(result.error || "Admin request not found");
            }
            return result.data;
          },
          staleTime: 0,
        });
        break;
      }
      case "admin-user-detail": {
        const userId = adminUserDetailMatch?.[1];
        if (!userId) break;
        // Prefer list-cache seed then network — densify must win (staleTime 0).
        for (const [, page] of queryClient.getQueriesData<{
          users?: Array<{
            id: string;
            fullName: string;
            email: string;
            universityId: number;
            universityCard: string;
            status: string | null;
            role: string | null;
            lastActivityDate: string | null;
            lastLogin: Date | null;
            createdAt: Date | null;
          }>;
        }>({ queryKey: queryKeys.users.adminRoot })) {
          const hit = page?.users?.find((u) => u.id === userId);
          if (hit) {
            queryClient.setQueryData(queryKeys.users.detail(userId), hit);
            break;
          }
        }
        void queryClient.prefetchQuery({
          queryKey: queryKeys.users.detail(userId),
          queryFn: async () => {
            const user = await getAdminUserDetailCache(userId);
            if (!user) throw new Error("User not found");
            return user;
          },
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
        // staleTime 0 — after user/admin-request densify, hover prefetch must
        // not reuse a 30s-fresh pre-mutation All Users list.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.users.adminList({}),
          queryFn: () => getUsersList({}),
          staleTime: 0,
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
        // staleTime 0 — signup approve/reject densify must win over warm cache.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.users.pending(),
          queryFn: () => getPendingUsers(),
          staleTime: 0,
        });
        break;
      case "admin-admin-requests":
        // staleTime 0 — admin-request.write densify must win over warm cache.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.admin.pendingRequests,
          queryFn: () => getPendingAdminRequests(),
          staleTime: 0,
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.admin.recentRequestDecisions,
          queryFn: () => getRecentAdminRequestDecisions(),
          staleTime: 0,
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
        // staleTime 0 — ticket.write densify must win over warm queue cache.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.tickets.adminList({}),
          queryFn: () => getAdminSupportTickets({}),
          staleTime: 0,
        });
        break;
      case "user-tickets":
        void queryClient.prefetchQuery({
          queryKey: queryKeys.tickets.userRoot,
          queryFn: () => getUserSupportTickets({}),
          staleTime: 0,
        });
        break;
      case "my-profile":
        if (!userId) break;
        void queryClient.prefetchQuery({
          queryKey: queryKeys.borrows.user(userId),
          queryFn: () => getUserBorrows(userId),
          // staleTime 0 — densify/invalidate must win over a warm 30s cache.
          staleTime: 0,
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
