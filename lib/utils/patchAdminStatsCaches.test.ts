/**
 * Unit tests for admin.stats densify helpers (overview KPI + recent lists).
 * Parent: REQ-0033 Wave B
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { AdminDashboardStats } from "@/lib/admin/adminDashboardStatsTypes";
import { queryKeys } from "@/lib/query/keys";
import {
  patchAdminStatsOnBookChange,
  patchAdminStatsOnBookDelete,
  patchAdminStatsOnBorrowStatusChange,
  patchAdminStatsOnTicketStatusChange,
  patchAdminStatsOnUserRoleChange,
  patchAdminStatsOnUserStatusChange,
} from "@/lib/utils/patchAdminStatsCaches";

function seedStats(
  client: QueryClient,
  overrides: Partial<AdminDashboardStats> = {},
): AdminDashboardStats {
  const base: AdminDashboardStats = {
    totalUsers: 10,
    approvedUsers: 7,
    pendingUsers: 2,
    rejectedUsers: 1,
    adminUsers: 1,
    totalBooks: 5,
    totalCopies: 10,
    availableCopies: 8,
    borrowedCopies: 2,
    activeBooks: 5,
    inactiveBooks: 0,
    booksWithISBN: 5,
    booksWithPublisher: 5,
    averagePageCount: 200,
    activeBorrows: 1,
    pendingBorrows: 1,
    returnedBooks: 0,
    cancelledBorrows: 0,
    recentBorrows: [
      {
        id: "br-1",
        bookId: "b1",
        bookTitle: "Algorithms",
        bookAuthor: "CLRS",
        bookGenre: "CS",
        bookRating: 5,
        coverUrl: null,
        coverColor: "#000",
        status: "PENDING",
        borrowDate: null,
        createdAt: null,
        dueDate: null,
        returnDate: null,
        borrower: {
          id: "u1",
          fullName: "Ada",
          email: "ada@example.com",
          universityCard: null,
        },
      },
    ],
    recentUsers: [
      {
        id: "u1",
        fullName: "Ada",
        email: "ada@example.com",
        universityCard: null,
        status: "PENDING",
        createdAt: null,
        statusReviewedAt: null,
        reviewer: null,
      },
    ],
    categoryStats: [],
    booksByYear: [],
    booksByLanguage: [],
    topRatedBooks: [],
    inactiveTitles: [],
    reservationsWaiting: 0,
    ...overrides,
  };
  client.setQueryData(queryKeys.admin.stats, base);
  return base;
}

describe("patchAdminStatsCaches", () => {
  it("noop when admin.stats missing", () => {
    const client = new QueryClient();
    patchAdminStatsOnBorrowStatusChange(client, {
      recordId: "x",
      toStatus: "BORROWED",
    });
    expect(client.getQueryData(queryKeys.admin.stats)).toBeUndefined();
  });

  it("moves borrow KPI pending → borrowed and updates recent row", () => {
    const client = new QueryClient();
    seedStats(client);
    patchAdminStatsOnBorrowStatusChange(client, {
      recordId: "br-1",
      fromStatus: "PENDING",
      toStatus: "BORROWED",
    });
    const next = client.getQueryData<AdminDashboardStats>(
      queryKeys.admin.stats,
    );
    expect(next?.pendingBorrows).toBe(0);
    expect(next?.activeBorrows).toBe(2);
    expect(next?.recentBorrows[0]?.status).toBe("BORROWED");
    expect(next?.borrowedCopies).toBe(3);
    expect(next?.availableCopies).toBe(7);
  });

  it("applies return KPI when fromStatus is explicit despite optimistic list", () => {
    const client = new QueryClient();
    seedStats(client, {
      activeBorrows: 3,
      returnedBooks: 4,
      cancelledBorrows: 3,
      pendingBorrows: 0,
      recentBorrows: [
        {
          id: "br-ret",
          bookId: "b1",
          bookTitle: "Algorithms",
          bookAuthor: "CLRS",
          bookGenre: "CS",
          bookRating: 5,
          coverUrl: null,
          coverColor: "#000",
          status: "RETURNED",
          borrowDate: null,
          createdAt: null,
          dueDate: null,
          returnDate: null,
          borrower: {
            id: "u1",
            fullName: "Ada",
            email: "ada@example.com",
            universityCard: null,
          },
        },
      ],
    });
    // Simulates post-onMutate recent row already RETURNED — without fromStatus deltas no-op.
    patchAdminStatsOnBorrowStatusChange(client, {
      recordId: "br-ret",
      fromStatus: "BORROWED",
      toStatus: "RETURNED",
    });
    const next = client.getQueryData<AdminDashboardStats>(
      queryKeys.admin.stats,
    );
    expect(next?.activeBorrows).toBe(2);
    expect(next?.returnedBooks).toBe(5);
  });

  it("moves user KPI pending → approved without inventing reviewer", () => {
    const client = new QueryClient();
    seedStats(client);
    patchAdminStatsOnUserStatusChange(client, {
      userId: "u1",
      fromStatus: "PENDING",
      toStatus: "APPROVED",
    });
    const next = client.getQueryData<AdminDashboardStats>(
      queryKeys.admin.stats,
    );
    expect(next?.pendingUsers).toBe(1);
    expect(next?.approvedUsers).toBe(8);
    expect(next?.recentUsers[0]?.status).toBe("APPROVED");
    expect(next?.recentUsers[0]?.reviewer).toBeNull();
  });

  it("bumps adminUsers on role promote/demote", () => {
    const client = new QueryClient();
    seedStats(client);
    patchAdminStatsOnUserRoleChange(client, {
      fromRole: "USER",
      toRole: "ADMIN",
    });
    expect(
      client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats)
        ?.adminUsers,
    ).toBe(2);
    patchAdminStatsOnUserRoleChange(client, {
      fromRole: "ADMIN",
      toRole: "USER",
    });
    expect(
      client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats)
        ?.adminUsers,
    ).toBe(1);
  });

  it("densifies catalog create/update/delete for book KPIs", () => {
    const client = new QueryClient();
    seedStats(client);
    patchAdminStatsOnBookChange(client, {
      previous: null,
      next: {
        id: "b-new",
        isActive: true,
        totalCopies: 3,
        availableCopies: 3,
        isbn: "978",
        publisher: "MIT",
        pageCount: 100,
      },
    });
    let next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.totalBooks).toBe(6);
    expect(next?.activeBooks).toBe(6);
    expect(next?.totalCopies).toBe(13);
    expect(next?.availableCopies).toBe(11);
    expect(next?.booksWithISBN).toBe(6);
    expect(next?.booksWithPublisher).toBe(6);

    // Deactivate drops the title from the lendable copy pool (before snapshot).
    patchAdminStatsOnBookChange(client, {
      previous: {
        id: "b-new",
        isActive: true,
        totalCopies: 3,
        availableCopies: 3,
        isbn: "978",
        publisher: "MIT",
        pageCount: 100,
      },
      next: {
        id: "b-new",
        isActive: false,
        totalCopies: 3,
        availableCopies: 1,
        isbn: "978",
        publisher: "MIT",
        pageCount: 100,
      },
    });
    next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.activeBooks).toBe(5);
    expect(next?.inactiveBooks).toBe(1);
    expect(next?.totalCopies).toBe(10);
    expect(next?.availableCopies).toBe(8);
    expect(next?.borrowedCopies).toBe(2);

    // Inactive delete: titles only — pool already excluded copies.
    patchAdminStatsOnBookDelete(client, {
      id: "b-new",
      isActive: false,
      totalCopies: 3,
      availableCopies: 1,
      isbn: "978",
      publisher: "MIT",
      pageCount: 100,
    });
    next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.totalBooks).toBe(5);
    expect(next?.inactiveBooks).toBe(0);
    expect(next?.totalCopies).toBe(10);
    expect(next?.availableCopies).toBe(8);
  });

  it("create inactive skips lendable copies; reactivate restores them", () => {
    const client = new QueryClient();
    seedStats(client);
    patchAdminStatsOnBookChange(client, {
      previous: null,
      next: {
        id: "b-off",
        isActive: false,
        totalCopies: 5,
        availableCopies: 4,
      },
    });
    let next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.totalBooks).toBe(6);
    expect(next?.inactiveBooks).toBe(1);
    expect(next?.totalCopies).toBe(10);
    expect(next?.availableCopies).toBe(8);

    patchAdminStatsOnBookChange(client, {
      previous: {
        id: "b-off",
        isActive: false,
        totalCopies: 5,
        availableCopies: 4,
      },
      next: {
        id: "b-off",
        isActive: true,
        totalCopies: 5,
        availableCopies: 4,
      },
    });
    next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.activeBooks).toBe(6);
    expect(next?.inactiveBooks).toBe(0);
    expect(next?.totalCopies).toBe(15);
    expect(next?.availableCopies).toBe(12);
    expect(next?.borrowedCopies).toBe(3);
  });

  it("upserts Inactive titles on deactivate and clears on reactivate", () => {
    const client = new QueryClient();
    seedStats(client);
    patchAdminStatsOnBookChange(client, {
      previous: {
        id: "b-off",
        title: "Quiet Book",
        author: "Ada",
        isActive: true,
        totalCopies: 4,
        availableCopies: 4,
        genre: "CS",
        rating: 4,
        publicationYear: 2020,
        language: "English",
      },
      next: {
        id: "b-off",
        title: "Quiet Book",
        author: "Ada",
        isActive: false,
        totalCopies: 4,
        availableCopies: 4,
        genre: "CS",
        rating: 4,
        publicationYear: 2020,
        language: "English",
      },
    });
    let next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.inactiveBooks).toBe(1);
    expect(next?.inactiveTitles).toHaveLength(1);
    expect(next?.inactiveTitles[0]?.title).toBe("Quiet Book");
    expect(next?.inactiveTitles[0]?.totalCopies).toBe(4);
    expect(next?.inactiveTitles[0]?.rating).toBe(4);
    expect(next?.totalCopies).toBe(6);
    expect(next?.availableCopies).toBe(4);

    patchAdminStatsOnBookChange(client, {
      previous: {
        id: "b-off",
        title: "Quiet Book",
        author: "Ada",
        isActive: false,
        totalCopies: 4,
        availableCopies: 4,
        genre: "CS",
        rating: 4,
        publicationYear: 2020,
        language: "English",
      },
      next: {
        id: "b-off",
        title: "Quiet Book",
        author: "Ada",
        isActive: true,
        totalCopies: 4,
        availableCopies: 4,
        genre: "CS",
        rating: 4,
        publicationYear: 2020,
        language: "English",
      },
    });
    next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.inactiveBooks).toBe(0);
    expect(next?.inactiveTitles).toHaveLength(0);
    expect(next?.totalCopies).toBe(10);
    expect(next?.availableCopies).toBe(8);
  });

  it("create inactive seeds Inactive titles without lendable copies", () => {
    const client = new QueryClient();
    seedStats(client);
    patchAdminStatsOnBookChange(client, {
      previous: null,
      next: {
        id: "b-new-off",
        title: "Shelf Only",
        author: "Bob",
        isActive: false,
        totalCopies: 2,
        availableCopies: 2,
        genre: "Fiction",
        publicationYear: 2019,
        language: "German",
      },
    });
    const next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.inactiveTitles.some((b) => b.id === "b-new-off")).toBe(true);
    expect(next?.totalCopies).toBe(10);
    expect(next?.booksByLanguage.some(([lang]) => lang === "German")).toBe(
      true,
    );
  });

  it("skips lendable Available/Borrowed deltas when book is inactive", () => {
    const client = new QueryClient();
    seedStats(client);
    patchAdminStatsOnBorrowStatusChange(client, {
      recordId: "br-1",
      fromStatus: "PENDING",
      toStatus: "BORROWED",
      bookIsActive: false,
    });
    const next = client.getQueryData<AdminDashboardStats>(queryKeys.admin.stats);
    expect(next?.pendingBorrows).toBe(0);
    expect(next?.activeBorrows).toBe(2);
    expect(next?.availableCopies).toBe(8);
    expect(next?.borrowedCopies).toBe(2);
  });

  it("drops open ticket KPIs on delete", () => {
    const client = new QueryClient();
    seedStats(client, {
      openTicketCount: 2,
      ticketsOpen: 1,
      ticketsInProgress: 1,
      ticketsResolved: 0,
      ticketsUrgentOpen: 1,
    });
    patchAdminStatsOnTicketStatusChange(client, {
      fromStatus: "OPEN",
      toStatus: null,
      fromPriority: "URGENT",
      toPriority: null,
    });
    const next = client.getQueryData<AdminDashboardStats>(
      queryKeys.admin.stats,
    );
    expect(next?.openTicketCount).toBe(1);
    expect(next?.ticketsOpen).toBe(0);
    expect(next?.ticketsUrgentOpen).toBe(0);
  });
});
