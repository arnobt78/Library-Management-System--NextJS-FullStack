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
import { prefetchAdminUser360Caches } from "@/lib/query/prefetchAdminUser360Caches";
import { getBookBorrowStats, getBooksList } from "@/lib/services/books";
import { getAdminBookReviews, getBookReviews, getAdminReviewDetail } from "@/lib/services/reviews";
import { getBorrowRequests, getBorrowRequestDetail, getUserBorrows } from "@/lib/services/borrows";
import {
  getPendingAdminRequests,
  getPendingUsers,
  getRecentAdminRequestDecisions,
  getUsersList,
} from "@/lib/services/users";
import { getAdminRequestDetail } from "@/lib/admin/actions/admin-requests";
import { getSignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import { getAdminStats } from "@/lib/services/admin";
import { getCompleteAnalytics } from "@/lib/services/analytics";
import {
  getAdminSupportTickets,
  getSupportTicketDetail,
  getUserSupportTickets,
} from "@/lib/services/supportTickets";
import { mergeDensifiedDetail } from "@/lib/utils/mergeDensifiedDetail";
import { fetchBookDetailPreservingDensify } from "@/lib/books/fetchBookDetailPreservingDensify";
import { ADMIN_BOOKS_UNFILTERED, ADMIN_USERS_UNFILTERED } from "@/lib/ui/adminListUniverse";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";

export type PrefetchKind =
  | "all-books"
  | "admin-reviews"
  | "admin-books"
  | "admin-users"
  | "admin-book-requests"
  | "admin-account-requests"
  | "admin-admin-requests"
  | "admin-dashboard"
  | "admin-business-insights"
  | "admin-tickets"
  | "user-tickets"
  | "my-profile"
  | "book-detail"
  | "signup-request-detail"
  | "admin-request-detail"
  | "admin-user-detail"
  | "borrow-request-detail"
  | "admin-review-detail"
  | "admin-book-catalog-detail"
  | "support-ticket-detail";

const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** `/books/<uuid>` — warm detail + reviews before soft-nav (no stale flash). */
const BOOK_DETAIL_HREF = new RegExp(`^/books/(${UUID})$`, "i");
/** Admin catalog detail (not `/edit`). */
const ADMIN_BOOK_CATALOG_DETAIL_HREF = new RegExp(
  `^/admin/books/(${UUID})$`,
  "i",
);
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
/** Borrow Queue detail. */
const BORROW_REQUEST_DETAIL_HREF = new RegExp(
  `^/admin/book-requests/(${UUID})$`,
  "i",
);
/** Book Reviews moderation detail. */
const ADMIN_REVIEW_DETAIL_HREF = new RegExp(
  `^/admin/book-reviews/(${UUID})$`,
  "i",
);
/** Support ticket detail (admin or user). */
const SUPPORT_TICKET_DETAIL_HREF = new RegExp(
  `^/(?:admin/)?support-tickets/(${UUID})$`,
  "i",
);

const PREFETCH_BY_HREF: Record<string, PrefetchKind> = {
  "/all-books": "all-books",
  "/admin/book-reviews": "admin-reviews",
  "/admin/books": "admin-books",
  "/admin/users": "admin-users",
  "/admin/book-requests": "admin-book-requests",
  "/admin/account-requests": "admin-account-requests",
  "/admin/admin-requests": "admin-admin-requests",
  "/admin": "admin-dashboard",
  "/admin/business-insights": "admin-business-insights",
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
    const borrowRequestDetailMatch = BORROW_REQUEST_DETAIL_HREF.exec(path);
    const adminReviewDetailMatch = ADMIN_REVIEW_DETAIL_HREF.exec(path);
    const adminBookCatalogMatch = ADMIN_BOOK_CATALOG_DETAIL_HREF.exec(path);
    const supportTicketDetailMatch = SUPPORT_TICKET_DETAIL_HREF.exec(path);
    const kind =
      prefetchKind ??
      (bookMatch
        ? ("book-detail" as const)
        : adminBookCatalogMatch
          ? ("admin-book-catalog-detail" as const)
          : signupDetailMatch
            ? ("signup-request-detail" as const)
            : adminRequestDetailMatch
              ? ("admin-request-detail" as const)
              : adminUserDetailMatch
                ? ("admin-user-detail" as const)
                : borrowRequestDetailMatch
                  ? ("borrow-request-detail" as const)
                  : adminReviewDetailMatch
                    ? ("admin-review-detail" as const)
                    : supportTicketDetailMatch
                      ? ("support-ticket-detail" as const)
                      : PREFETCH_BY_HREF[path]);
    if (!kind) return;

    switch (kind) {
      case "book-detail": {
        const bookId = bookMatch?.[1];
        if (!bookId) break;
        // staleTime 0 — densify/invalidate must win over a warm 30s cache.
        // Same books.detail key as admin catalog — preserve actors + Activity.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.books.detail(bookId),
          queryFn: () => fetchBookDetailPreservingDensify(queryClient, bookId),
          staleTime: 0,
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.reviews.book(bookId),
          queryFn: () => getBookReviews(bookId),
          staleTime: 0,
        });
        break;
      }
      case "admin-book-catalog-detail": {
        const bookId = adminBookCatalogMatch?.[1];
        if (!bookId) break;
        // staleTime 0 — book.write densify must win over warm admin detail.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.books.detail(bookId),
          queryFn: () => fetchBookDetailPreservingDensify(queryClient, bookId),
          staleTime: 0,
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.books.borrowStats(bookId),
          queryFn: () => getBookBorrowStats(bookId),
          staleTime: 0,
        });
        break;
      }
      case "signup-request-detail": {
        const subjectUserId = signupDetailMatch?.[1];
        if (!subjectUserId) break;
        // staleTime 0 — approve/reject densify must win over warm detail.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.users.signupRequestDetail(subjectUserId),
          queryFn: async () => {
            const detail = await getSignupRequestDetail(subjectUserId);
            if (!detail) throw new Error("Signup request not found");
            return detail;
          },
          staleTime: 0,
        });
        // Registration entry is User 360 — same side caches as directory.
        prefetchAdminUser360Caches(queryClient, subjectUserId);
        break;
      }
      case "admin-request-detail": {
        const requestId = adminRequestDetailMatch?.[1];
        if (!requestId) break;
        // Privilege entry is User 360 — warm request + side caches.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.admin.requestDetail(requestId),
          queryFn: async () => {
            const result = await getAdminRequestDetail(requestId);
            if (!result.success || !result.data) {
              throw new Error(result.error || "Admin request not found");
            }
            const req = result.data;
            if (req.userId) {
              prefetchAdminUser360Caches(queryClient, req.userId);
            }
            return req;
          },
          staleTime: 0,
        });
        break;
      }
      case "admin-user-detail": {
        const subjectUserId = adminUserDetailMatch?.[1];
        if (!subjectUserId) break;
        // Prefer list-cache seed only when detail cache is empty — never wipe
        // densified User 360 header (statusReviewed*) with list-thin rows.
        const userDetailKey = queryKeys.users.detail(subjectUserId);
        const prevUser = queryClient.getQueryData(userDetailKey);
        if (!prevUser) {
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
            const hit = page?.users?.find((u) => u.id === subjectUserId);
            if (hit) {
              queryClient.setQueryData(userDetailKey, hit);
              break;
            }
          }
        }
        prefetchAdminUser360Caches(queryClient, subjectUserId);
        break;
      }
      case "borrow-request-detail": {
        const recordId = borrowRequestDetailMatch?.[1];
        if (!recordId) break;
        const detailKey = queryKeys.borrows.requestDetail(recordId);
        // Prefer list-cache seed then network — densify must win (staleTime 0).
        // Preserve densified actors + Activity when list/API omit them.
        const prevDetail =
          queryClient.getQueryData<BorrowRecordWithDetails>(detailKey);
        for (const [, rows] of queryClient.getQueriesData<
          BorrowRecordWithDetails[]
        >({ queryKey: queryKeys.borrows.requestsRoot })) {
          const hit = rows?.find((r) => r.id === recordId);
          if (hit) {
            queryClient.setQueryData(
              detailKey,
              mergeDensifiedDetail(prevDetail, hit, [
                "auditEvents",
                "approvedByActor",
                "approvedAt",
                "cancelledAt",
                "renewedAt",
                "returnedByActor",
                "cancelledByActor",
              ]),
            );
            break;
          }
        }
        void queryClient.prefetchQuery({
          queryKey: detailKey,
          queryFn: async () => {
            const fresh = await getBorrowRequestDetail(recordId);
            const cached =
              queryClient.getQueryData<BorrowRecordWithDetails>(detailKey);
            return mergeDensifiedDetail(cached, fresh, [
              "auditEvents",
              "approvedByActor",
              "approvedAt",
              "cancelledAt",
              "renewedAt",
              "returnedByActor",
              "cancelledByActor",
            ]);
          },
          staleTime: 0,
        });
        break;
      }
      case "admin-review-detail": {
        const reviewId =
          adminReviewDetailMatch?.[1] ??
          ADMIN_REVIEW_DETAIL_HREF.exec(path)?.[1];
        if (!reviewId) break;
        const reviewKey = queryKeys.reviews.adminDetail(reviewId);
        const prevReview =
          queryClient.getQueryData<AdminBookReviewItem>(reviewKey);
        for (const [, rows] of queryClient.getQueriesData<
          AdminBookReviewItem[]
        >({ queryKey: queryKeys.reviews.adminRoot })) {
          const hit = rows?.find((r) => r.id === reviewId);
          if (hit) {
            queryClient.setQueryData(
              reviewKey,
              mergeDensifiedDetail(prevReview, hit, [
                "reviewedBy",
                "reviewedByName",
                "reviewedByEmail",
                "reviewedByUniversityCard",
                "reviewedAt",
                "auditEvents",
              ]),
            );
            break;
          }
        }
        void queryClient.prefetchQuery({
          queryKey: reviewKey,
          queryFn: async () => {
            const fresh = await getAdminReviewDetail(reviewId);
            const cached =
              queryClient.getQueryData<AdminBookReviewItem>(reviewKey);
            return mergeDensifiedDetail(cached, fresh, [
              "reviewedBy",
              "reviewedByName",
              "reviewedByEmail",
              "reviewedByUniversityCard",
              "reviewedAt",
              "auditEvents",
            ]);
          },
          staleTime: 0,
        });
        break;
      }
      case "support-ticket-detail": {
        const ticketId =
          supportTicketDetailMatch?.[1] ??
          SUPPORT_TICKET_DETAIL_HREF.exec(path)?.[1];
        if (!ticketId) break;
        const ticketKey = queryKeys.tickets.detail(ticketId);
        const prevTicket =
          queryClient.getQueryData<SupportTicketDetail>(ticketKey);
        for (const root of [
          queryKeys.tickets.adminRoot,
          queryKeys.tickets.userRoot,
        ] as const) {
          for (const [, rows] of queryClient.getQueriesData<
            Array<{ id: string }>
          >({ queryKey: root })) {
            const hit = rows?.find((r) => r.id === ticketId);
            if (hit) {
              queryClient.setQueryData(
                ticketKey,
                mergeDensifiedDetail(
                  prevTicket,
                  hit as SupportTicketDetail,
                  [
                    "auditEvents",
                    "replies",
                    "notes",
                    "updatedById",
                    "updatedByName",
                    "updatedByEmail",
                    "updatedByUniversityCard",
                  ],
                ),
              );
              break;
            }
          }
        }
        void queryClient.prefetchQuery({
          queryKey: ticketKey,
          queryFn: async () => {
            const fresh = await getSupportTicketDetail(ticketId);
            const cached =
              queryClient.getQueryData<SupportTicketDetail>(ticketKey);
            return mergeDensifiedDetail(cached, fresh, [
              "auditEvents",
              "replies",
              "notes",
              "updatedById",
              "updatedByName",
              "updatedByEmail",
              "updatedByUniversityCard",
            ]);
          },
          staleTime: 0,
        });
        break;
      }
      case "all-books":
      case "admin-books":
        // staleTime 0 — after book.write densify, hover prefetch must not reuse
        // a 30s-fresh pre-mutation catalog (stale create/delete on soft-nav).
        // Warm the SAME key AdminBooksList KPIs use (ADMIN_BOOKS_UNFILTERED).
        void queryClient.prefetchQuery({
          queryKey: queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED),
          queryFn: () => getBooksList(ADMIN_BOOKS_UNFILTERED),
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
        // Warm the same key as AdminUsersList / ADMIN_USERS_UNFILTERED (sort=created).
        void queryClient.prefetchQuery({
          queryKey: queryKeys.users.adminList(ADMIN_USERS_UNFILTERED),
          queryFn: () => getUsersList(ADMIN_USERS_UNFILTERED),
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
      case "admin-business-insights":
        // Charts evict+refetch on visit; warm default snapshot to hide latency.
        void queryClient.prefetchQuery({
          queryKey: queryKeys.admin.businessInsights({}),
          queryFn: () => getCompleteAnalytics({}),
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
