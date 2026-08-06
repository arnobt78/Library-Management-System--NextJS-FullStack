"use client";

/**
 * MyProfileTabs — borrow history with URL-synced tabs (?tab=), glass KPIs, RQ + SSR.
 * Tabs: active-borrows | pending-requests | borrow-history (aliases active|pending|history).
 */

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import BookCover from "@/components/BookCover";
import CountdownTimer from "@/components/CountdownTimer";
import BorrowSkeleton from "@/components/skeletons/BorrowSkeleton";
import AccountRegistrationNotice from "@/components/AccountRegistrationNotice";
import GlassSectionHeader from "@/components/GlassSectionHeader";
import MyReviewsTab from "@/components/MyReviewsTab";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import {
  formatBorrowDate,
  formatBorrowDateTime,
} from "@/lib/profile/formatBorrowDates";
import { cn } from "@/lib/utils";
import { withRippleClick } from "@/lib/ui/ripple";
import {
  BookOpen,
  Clock,
  Calendar,
  AlertTriangle,
  Star,
  BookOpenText,
  Sparkles,
  RotateCcw,
  Loader2,
  CheckCircle2,
  History,
  Hourglass,
  BarChart3,
  Library,
  Timer,
  BadgeDollarSign,
  BookMarked,
  RefreshCw,
  MessageSquareText,
  CalendarCheck2,
  CalendarClock,
  Layers,
  AlarmClockCheck,
  RotateCwFadingClock,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserBorrows, useUserBookReviews } from "@/hooks/useQueries";
import { useReturnBook } from "@/hooks/useMutations";
import type { BorrowRecordFull } from "@/lib/services/borrows";
import { useQueryClient } from "@tanstack/react-query";
import { renewBorrowedBook } from "@/lib/actions/circulation";
import { beginMutation, isLatestMutation } from "@/lib/utils/mutationOrdering";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import { snapshotBorrowListBaselines } from "@/lib/utils/patchBorrowCaches";
import { writeMappedList } from "@/lib/utils/queryCacheLists";
import { showToast } from "@/lib/toast";
import { queryKeys } from "@/lib/query/keys";
import { computeBorrowStats } from "@/lib/profile/borrowStats";
import {
  parseProfileTab,
  profileTabHref,
  type ProfileTab,
} from "@/lib/profile/profileTabs";

// Define the actual data structure from the database query
interface BorrowRecordWithBook {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date;
  dueDate: Date | null; // Can be null for pending requests
  returnDate?: Date | null;
  status: "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED";
  borrowedBy?: string | null;
  returnedBy?: string | null;
  fineAmount: number;
  notes?: string | null;
  renewalCount: number;
  lastReminderSent?: Date | null;
  updatedAt: Date | null;
  updatedBy?: string | null;
  createdAt: Date | null;
  book: {
    id: string;
    title: string;
    author: string;
    genre: string;
    rating: number;
    totalCopies: number;
    availableCopies: number;
    description: string;
    coverColor: string;
    coverUrl: string;
    videoUrl: string;
    summary: string;
    isbn?: string | null;
    publicationYear?: number | null;
    publisher?: string | null;
    language?: string | null;
    pageCount?: number | null;
    edition?: string | null;
    isActive: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
    updatedBy?: string | null;
  };
}

interface MyProfileTabsProps {
  /**
   * User ID (required for React Query)
   */
  userId: string;
  /**
   * DB-backed account status (gates borrow RQ; PENDING/REJECTED get friendly shell)
   */
  accountStatus?: string | null;
  /**
   * Email for registration notice (optional)
   */
  accountEmail?: string | null;
  /**
   * Account createdAt for registration notice strip
   */
  accountCreatedAt?: Date | string | null;
  /**
   * When registration was approved/rejected (statusReviewedAt)
   */
  accountDecidedAt?: Date | string | null;
  /**
   * Admin who approved/rejected registration
   */
  accountDecisionActor?: AdminRequestReviewer | null;
  /**
   * Initial active borrows from SSR (prevents duplicate fetch)
   */
  initialActiveBorrows?: BorrowRecordWithBook[];
  /**
   * Initial pending requests from SSR (prevents duplicate fetch)
   */
  initialPendingRequests?: BorrowRecordWithBook[];
  /**
   * Initial borrow history from SSR (prevents duplicate fetch)
   */
  initialBorrowHistory?: BorrowRecordWithBook[];
  /**
   * SSR-fetched own reviews (any status) — hydrates the "My Reviews" tab so
   * it paints instantly with no client-fetch loading flash on first visit.
   * The live count (KPI card + tab badge) is derived from this same query
   * so it can never drift from the list after a create/delete/moderation.
   */
  initialReviews?: AdminBookReviewItem[];
  /**
   * Legacy props for backward compatibility (deprecated, use initial* props instead)
   */
  activeBorrows?: BorrowRecordWithBook[];
  pendingRequests?: BorrowRecordWithBook[];
  borrowHistory?: BorrowRecordWithBook[];
}

const MyProfileTabs: React.FC<MyProfileTabsProps> = ({
  userId,
  accountStatus = null,
  accountEmail = null,
  accountCreatedAt = null,
  accountDecidedAt = null,
  accountDecisionActor = null,
  // initialActiveBorrows / initialPendingRequests are kept in the interface for
  // backward compatibility; superseded by initialBorrowHistory as the single source.
  initialActiveBorrows: _initialActiveBorrows,
  initialPendingRequests: _initialPendingRequests,
  initialBorrowHistory,
  initialReviews,
  // Legacy props kept for external callers — allBorrows memo is the authoritative source.
  activeBorrows: _legacyActiveBorrows,
  pendingRequests: _legacyPendingRequests,
  borrowHistory: _legacyBorrowHistory,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use React Query mutation for returning book
  const returnBookMutation = useReturnBook();
  const queryClient = useQueryClient();
  const [isRenewPending, startRenewTransition] = React.useTransition();
  const [renewingRecordId, setRenewingRecordId] = React.useState<string | null>(
    null,
  );
  const [returningRecordId, setReturningRecordId] = React.useState<
    string | null
  >(null);

  // Build typed SSR initialData once per mount so React Query treats it as fresh.
  // BorrowRecordFull extends BorrowRecord with an optional nested `book`, matching
  // what the API's INNER JOIN actually returns, so no any-casting is needed.
  const ssrSource = initialBorrowHistory ?? _legacyBorrowHistory;
  const ssrInitialData: BorrowRecordFull[] | undefined = ssrSource
    ? ssrSource.map((record): BorrowRecordFull => ({
        id: record.id,
        userId: record.userId,
        bookId: record.bookId,
        borrowDate: record.borrowDate,
        dueDate: record.dueDate
          ? new Date(record.dueDate).toISOString().split("T")[0]
          : null,
        returnDate: record.returnDate
          ? new Date(record.returnDate).toISOString().split("T")[0]
          : null,
        status: record.status,
        borrowedBy: record.borrowedBy ?? null,
        returnedBy: record.returnedBy ?? null,
        fineAmount:
          typeof record.fineAmount === "number"
            ? record.fineAmount.toString()
            : String(record.fineAmount || "0"),
        notes: record.notes ?? null,
        renewalCount: record.renewalCount,
        lastReminderSent: record.lastReminderSent ?? null,
        updatedAt: record.updatedAt,
        updatedBy: record.updatedBy ?? null,
        createdAt: record.createdAt,
        // Preserve the nested book from SSR — this is what prevents "Unknown Book"
        // on first navigation before the background API fetch completes.
        book: record.book,
      }))
    : undefined;

  // Stable timestamp captured once at mount via useState lazy initialiser.
  // The function is only called on the first render (never on re-renders), keeping
  // the value stable across the component's lifetime.
  // Passed as initialDataUpdatedAt to tell React Query the SSR snapshot is fresh,
  // preventing an immediate background refetch that could overwrite valid book data.
  const [ssrTimestamp] = React.useState<number>(() => Date.now());

  // Use React Query to fetch all user borrows (no status filter to get all).
  // The API returns borrow records WITH book details (from /api/borrow-records INNER JOIN).
  // React Query invalidates and refetches on mutations, ensuring immediate UI updates.
  const {
    data: reactQueryBorrows,
    isLoading,
    isError,
    error,
  } = useUserBorrows(
    userId,
    undefined, // no status filter — fetch all, filter client-side
    ssrInitialData,
    ssrInitialData ? ssrTimestamp : undefined,
    accountStatus,
  );

  // Same queryKey as MyReviewsTab's own hook call below — TanStack Query
  // dedupes to one request/cache entry, so the KPI card + tab badge here stay
  // in sync with create/delete/moderation mutations without a second fetch.
  const { data: liveReviews = initialReviews ?? [] } = useUserBookReviews(
    userId,
    initialReviews,
  );
  const liveTotalReviews = liveReviews.length;

  const registrationLocked =
    accountStatus === "PENDING" || accountStatus === "REJECTED";

  // Transform React Query data (BorrowRecordFull[]) into the local BorrowRecordWithBook shape.
  // TanStack Query provides structural sharing, so a pure memoized transform keeps stable
  // references across renders and avoids unnecessary downstream recalculations.
  const allBorrowsFromQuery: BorrowRecordWithBook[] = React.useMemo(() => {
    if (!reactQueryBorrows || reactQueryBorrows.length === 0) {
      return [];
    }

    const getStableDate = (
      dateString: string | Date | null | undefined,
    ): Date | null => {
      if (!dateString) return null;
      const timestamp =
        typeof dateString === "string"
          ? new Date(dateString).getTime()
          : dateString.getTime();
      return new Date(timestamp);
    };

    // reactQueryBorrows is BorrowRecordFull[] — `record.book` is properly typed,
    // no any-casting needed. The API's INNER JOIN guarantees book is present
    // whenever the record is returned.
    return reactQueryBorrows.map((record): BorrowRecordWithBook => ({
      id: record.id,
      userId: record.userId,
      bookId: record.bookId,
      borrowDate: getStableDate(record.borrowDate) || new Date(),
      dueDate: getStableDate(record.dueDate),
      returnDate: getStableDate(record.returnDate),
      status: record.status,
      borrowedBy: record.borrowedBy,
      returnedBy: record.returnedBy,
      fineAmount:
        typeof record.fineAmount === "string"
          ? parseFloat(record.fineAmount)
          : record.fineAmount || 0,
      notes: record.notes,
      renewalCount: record.renewalCount || 0,
      lastReminderSent: getStableDate(record.lastReminderSent),
      updatedAt: getStableDate(record.updatedAt),
      updatedBy: record.updatedBy,
      createdAt: getStableDate(record.createdAt),
      // Use the API's book JOIN result; fall back to a sentinel only when truly absent
      // (should not happen with INNER JOIN, but guards against orphaned cache entries).
      book: record.book ?? {
        id: record.bookId,
        title: "Unknown Book",
        author: "Unknown Author",
        genre: "",
        rating: 0,
        totalCopies: 0,
        availableCopies: 0,
        description: "",
        coverColor: "",
        coverUrl: "",
        videoUrl: "",
        summary: "",
        isActive: true,
        createdAt: null,
        updatedAt: null,
      },
    }));
  }, [reactQueryBorrows]);

  // Single authoritative source for all three tab filters.
  // Prefers React Query data ONLY when it contains valid book data (title !== sentinel).
  // Falls back to SSR initialBorrowHistory when the cache lacks the book JOIN field
  // (e.g. stale entry from an older code version without the INNER JOIN).
  const allBorrows: BorrowRecordWithBook[] = React.useMemo(() => {
    const hasValidBooks =
      allBorrowsFromQuery.length > 0 &&
      allBorrowsFromQuery.some(
        (r) => r.book?.title && r.book.title !== "Unknown Book",
      );
    if (hasValidBooks) return allBorrowsFromQuery;
    return initialBorrowHistory ?? _legacyBorrowHistory ?? [];
  }, [allBorrowsFromQuery, initialBorrowHistory, _legacyBorrowHistory]);

  // Filter borrows by status (client-side) — all derived from the single guarded source.
  const activeBorrows: BorrowRecordWithBook[] = React.useMemo(
    () => allBorrows.filter((r) => r.status === "BORROWED"),
    [allBorrows],
  );

  const pendingRequests: BorrowRecordWithBook[] = React.useMemo(
    () => allBorrows.filter((r) => r.status === "PENDING"),
    [allBorrows],
  );

  const borrowHistory: BorrowRecordWithBook[] = React.useMemo(
    () =>
      allBorrows.filter(
        (r) => r.status === "RETURNED" || r.status === "CANCELLED",
      ),
    [allBorrows],
  );

  // URL is source of truth for the open tab (refresh-safe, shareable)
  const activeTabValue = parseProfileTab(searchParams.get("tab"));

  const handleTabChange = React.useCallback(
    (value: string) => {
      const tab = parseProfileTab(value);
      router.replace(profileTabHref(tab), { scroll: false });
    },
    [router],
  );

  // Normalize missing/legacy ?tab= to canonical value without scrolling
  React.useEffect(() => {
    const raw = searchParams.get("tab");
    const canonical = parseProfileTab(raw);
    if (raw !== canonical) {
      router.replace(profileTabHref(canonical), { scroll: false });
    }
  }, [searchParams, router]);

  const borrowStats = React.useMemo(
    () => computeBorrowStats(allBorrows, liveTotalReviews),
    [allBorrows, liveTotalReviews],
  );

  const sortedHistory = React.useMemo(
    () =>
      [...borrowHistory].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      ),
    [borrowHistory],
  );

  // PENDING/REJECTED: keep chrome + zero KPIs + tabs; show registration notice (no borrow RQ / no red 403)
  if (registrationLocked) {
    const lockedKpiValues: Array<{
      key: string;
      title: string;
      hint: string;
      value: string | number;
      icon: React.ReactNode;
      tone: string;
    }> = [
      {
        key: "total",
        title: "Total Borrows",
        hint: "All requests ever placed",
        value: 0,
        icon: <Layers className="size-4 shrink-0" />,
        tone: "from-slate-500/25 via-slate-500/10 to-slate-500/5 border-slate-400/30 text-slate-100 shadow-[0_10px_30px_rgba(148,163,184,0.15)]",
      },
      {
        key: "pending",
        title: "Pending",
        hint: "Awaiting admin approval",
        value: 0,
        icon: <Hourglass className="size-4 shrink-0" />,
        tone: "from-amber-500/25 via-amber-500/10 to-amber-500/5 border-amber-400/30 text-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.2)]",
      },
      {
        key: "active",
        title: "Active Loans",
        hint: "Checked out right now",
        value: 0,
        icon: <BookMarked className="size-4 shrink-0" />,
        tone: "from-blue-500/25 via-blue-500/10 to-blue-500/5 border-blue-400/30 text-blue-100 shadow-[0_10px_30px_rgba(59,130,246,0.2)]",
      },
      {
        key: "returned",
        title: "Returned",
        hint: "Successfully checked in",
        value: 0,
        icon: <CheckCircle2 className="size-4 shrink-0" />,
        tone: "from-emerald-500/25 via-emerald-500/10 to-emerald-500/5 border-emerald-400/30 text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.2)]",
      },
      {
        key: "reviews",
        title: "Reviews Written",
        hint: "Your published ratings",
        value: liveTotalReviews,
        icon: <MessageSquareText className="size-4 shrink-0" />,
        tone: "from-indigo-500/25 via-indigo-500/10 to-indigo-500/5 border-indigo-400/30 text-indigo-100 shadow-[0_10px_30px_rgba(99,102,241,0.2)]",
      },
      {
        key: "totalFines",
        title: "Total Fines",
        hint: "Sum of accrued fines",
        value: "—",
        icon: <BadgeDollarSign className="size-4 shrink-0" />,
        tone: "from-rose-500/25 via-rose-500/10 to-rose-500/5 border-rose-400/30 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.2)]",
      },
    ];

    return (
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-semibold text-light-100 sm:text-3xl">
            My Borrowing History
          </h1>
          <p className="text-sm text-light-200 sm:text-base">
            Track active loans, pending requests, and your full borrow history
          </p>
        </div>

        <section className="profile-stats-panel mb-4 sm:mb-6">
          <GlassSectionHeader
            className="mb-3 sm:mb-4"
            icon={<BarChart3 className="size-5" />}
            title="Borrow Statistics"
            subtitle="Available after your registration is approved"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3">
            {lockedKpiValues.map((item) => (
              <div key={item.key} className={`profile-kpi-card ${item.tone}`}>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 opacity-90">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight sm:text-sm">
                      {item.title}
                    </p>
                    <p className="text-[10px] leading-snug opacity-75 sm:text-xs">
                      {item.hint}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-lg font-semibold leading-none sm:text-xl">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Tabs
          value={activeTabValue}
          onValueChange={handleTabChange}
          className="w-full"
          suppressHydrationWarning
        >
          <TabsList className="profile-tabs-list mb-4 sm:mb-6">
            <TabsTrigger
              value="active-borrows"
              className="profile-tab-trigger profile-tab-active-borrows"
            >
              <BookOpen className="size-4 shrink-0" />
              <span>Active Borrows (0)</span>
            </TabsTrigger>
            <TabsTrigger
              value="pending-requests"
              className="profile-tab-trigger profile-tab-pending"
            >
              <Hourglass className="size-4 shrink-0" />
              <span>Pending Requests (0)</span>
            </TabsTrigger>
            <TabsTrigger
              value="borrow-history"
              className="profile-tab-trigger profile-tab-history"
            >
              <History className="size-4 shrink-0" />
              <span>Borrow History (0)</span>
            </TabsTrigger>
          </TabsList>

          {(
            [
              {
                value: "active-borrows" as const,
                title: "Active loans",
                subtitle: "Books currently checked out to you",
                icon: <BookOpen className="size-5 text-blue-300" />,
              },
              {
                value: "pending-requests" as const,
                title: "Pending requests",
                subtitle: "Awaiting librarian approval before checkout",
                icon: <Hourglass className="size-5 text-amber-300" />,
              },
              {
                value: "borrow-history" as const,
                title: "Borrow history",
                subtitle: "Completed returns and past loans",
                icon: <History className="size-5 text-violet-300" />,
              },
            ] as const
          ).map((section) => (
            <TabsContent key={section.value} value={section.value} className="mt-0">
              <div className="space-y-3 sm:space-y-4">
                <GlassSectionHeader
                  icon={section.icon}
                  title={section.title}
                  subtitle={section.subtitle}
                />
                <div className="profile-borrow-row p-4 sm:p-6">
                  <AccountRegistrationNotice
                    accountStatus={
                      accountStatus === "REJECTED" ? "REJECTED" : "PENDING"
                    }
                    context="profile"
                    email={accountEmail}
                    createdAt={accountCreatedAt}
                    decidedAt={accountDecidedAt}
                    decisionActor={accountDecisionActor}
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Show skeleton while loading (only if no data at all - not during refetch)
  // CRITICAL: Use isLoading (not isFetching) to only show skeleton on initial load
  // isFetching would show skeleton during refetch, causing flicker
  if (
    isLoading &&
    !reactQueryBorrows &&
    (!initialBorrowHistory || initialBorrowHistory.length === 0)
  ) {
    return (
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-semibold text-light-100 sm:text-3xl">
            My Borrowing History
          </h1>
          <p className="text-sm text-light-200 sm:text-base">
            Track active loans, pending requests, and your full borrow history
          </p>
        </div>
        <Tabs
          value={activeTabValue}
          onValueChange={handleTabChange}
          className="w-full"
          suppressHydrationWarning
        >
          <TabsList className="profile-tabs-list mb-4 sm:mb-6">
            <TabsTrigger
              value="active-borrows"
              className="profile-tab-trigger profile-tab-active-borrows"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="pending-requests"
              className="profile-tab-trigger profile-tab-pending"
            >
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="borrow-history"
              className="profile-tab-trigger profile-tab-history"
            >
              History
            </TabsTrigger>
            <TabsTrigger
              value="my-reviews"
              className="profile-tab-trigger profile-tab-reviews"
            >
              My Reviews
            </TabsTrigger>
          </TabsList>
          <TabsContent value={activeTabValue} className="mt-4 sm:mt-6">
            {activeTabValue === "my-reviews" ? (
              <MyReviewsTab userId={userId} initialReviews={initialReviews} />
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(3)].map((_, i) => (
                  <BorrowSkeleton key={`sk-${i}`} variant="profile" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Unexpected fetch failures only (PENDING/REJECTED never reach here)
  if (isError && (!initialBorrowHistory || initialBorrowHistory.length === 0)) {
    return (
      <div className="w-full">
        <div className="empty-panel profile-borrow-row" role="status">
          <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
            Failed to load borrow records
          </p>
          <p className="text-xs text-light-200 sm:text-sm">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string | null) =>
    formatBorrowDate(date) ?? "N/A";
  const formatDateTime = (date: Date | string | null) =>
    formatBorrowDateTime(date);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="glassPending">
            <Hourglass className="size-3" />
            Pending Approval
          </Badge>
        );
      case "BORROWED":
        return (
          <Badge variant="glassBorrowed">
            <BookOpen className="size-3" />
            Currently Borrowed
          </Badge>
        );
      case "RETURNED":
        return (
          <Badge variant="glassReturned">
            <CheckCircle2 className="size-3" />
            Book Returned
          </Badge>
        );
      default:
        return <Badge variant="glassMuted">{status}</Badge>;
    }
  };

  // CRITICAL: Memoize BorrowCard component to prevent unnecessary re-renders
  // This prevents flicker when React Query refetches but data hasn't changed
  const BorrowCard: React.FC<{
    record: BorrowRecordWithBook;
    showCountdown?: boolean;
    isReturning?: boolean;
    isRenewing?: boolean;
  }> = React.memo(
    ({
      record,
      showCountdown = false,
      isReturning = false,
      isRenewing = false,
    }) => {
      const handleViewDetails = () => {
        router.push(`/books/${record.book.id}`);
      };

      const handleReturnBook = () => {
        if (returningRecordId || returnBookMutation.isPending) return;

        setReturningRecordId(record.id);

        // Use mutation to return book
        returnBookMutation.mutate(
          {
            recordId: record.id,
            bookTitle: record.book.title,
          },
          {
            onSettled: () => {
              setReturningRecordId(null);
            },
          },
          // CRITICAL: No onSuccess callback needed here
          // The useReturnBook mutation already handles all cache invalidation
          // via invalidateAfterBorrowChange() which invalidates:
          // - borrows queries (including user-borrows)
          // - books queries (availability changes)
          // - reviews queries (eligibility may change)
          // - analytics queries
          // - admin queries
          // Manual invalidation here would cause redundant refetches
        );
      };

      const handleRenewBook = () => {
        if (isRenewPending) return;
        const mutationKey = `borrow:${record.id}`;
        const mutationGeneration = beginMutation(mutationKey);
        setRenewingRecordId(record.id);
        startRenewTransition(async () => {
          try {
            const result = await renewBorrowedBook(
              record.id,
              crypto.randomUUID(),
            );
            if (!isLatestMutation(mutationKey, mutationGeneration)) return;
            if (!result.success) {
              showToast.book.renewError(result.error);
              return;
            }
            // Gold: snapshot (after optional optimistic paint) → invalidate → densify.
            queryClient.setQueryData<BorrowRecordFull[]>(
              queryKeys.borrows.user(userId, undefined),
              (current) =>
                current?.map((item) =>
                  item.id === record.id
                    ? {
                        ...item,
                        dueDate: result.data.dueDate,
                        renewalCount: result.data.renewalCount,
                      }
                    : item,
                ),
            );
            await commitMutationCache(queryClient, "renewal.write", {
              snapshot: snapshotBorrowListBaselines,
              densify: (baselines) => {
                const key = queryKeys.borrows.user(userId);
                writeMappedList(
                  queryClient,
                  key,
                  queryClient.getQueryData<BorrowRecordFull[]>(key),
                  baselines.users[userId],
                  (rows) =>
                    rows.map((item) =>
                      item.id === record.id
                        ? {
                            ...item,
                            dueDate: result.data.dueDate,
                            renewalCount: result.data.renewalCount,
                          }
                        : item,
                    ),
                );
              },
            });
            showToast.book.renewSuccess(record.book.title, result.data.dueDate);
          } finally {
            setRenewingRecordId(null);
          }
        });
      };

      // Calculate if book is overdue (only for BORROWED status with dueDate)
      const today = new Date();
      // Use UTC dates for consistent comparison
      const todayUTC = new Date(
        today.getTime() + today.getTimezoneOffset() * 60000,
      );
      const dueDateUTC = record.dueDate ? new Date(record.dueDate) : null;

      const isOverdue =
        record.status === "BORROWED" && dueDateUTC && todayUTC > dueDateUTC;

      // Calculate days overdue using date-level comparison (exactly like backend SQL)
      // Backend: (${now}::date - ${borrowRecords.dueDate}::date)
      // Use UTC dates to avoid timezone issues
      const todayDateUTC = new Date(
        Date.UTC(
          todayUTC.getUTCFullYear(),
          todayUTC.getUTCMonth(),
          todayUTC.getUTCDate(),
        ),
      );
      const dueDateOnlyUTC = dueDateUTC
        ? new Date(
            Date.UTC(
              dueDateUTC.getUTCFullYear(),
              dueDateUTC.getUTCMonth(),
              dueDateUTC.getUTCDate(),
            ),
          )
        : null;

      const daysOverdue =
        isOverdue && dueDateOnlyUTC
          ? Math.floor(
              (todayDateUTC.getTime() - dueDateOnlyUTC.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;

      const daysRemaining =
        record.status === "BORROWED" && dueDateUTC && !isOverdue
          ? Math.ceil(
              (dueDateUTC.getTime() - todayUTC.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;
      const calculatedFine = isOverdue ? daysOverdue * 1.0 : 0;

      const rowAccent =
        record.status === "PENDING"
          ? "profile-borrow-row--pending"
          : record.status === "RETURNED" || record.status === "CANCELLED"
            ? "profile-borrow-row--returned"
            : record.status === "BORROWED" && isOverdue
              ? "profile-borrow-row--overdue"
              : record.status === "BORROWED" && daysRemaining <= 2 && !isOverdue
                ? "profile-borrow-row--borrowed-soon"
                : record.status === "BORROWED"
                  ? "profile-borrow-row--borrowed"
                  : "";

      const approvedAt = formatDateTime(record.updatedAt);
      const requestedAt = formatDateTime(record.borrowDate);
      const returnedOn = formatBorrowDate(record.returnDate);

      return (
        <div
          role="article"
          className={cn("profile-borrow-row", rowAccent)}
        >
          <div className="p-2.5 text-light-100 sm:p-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Full Height Book Cover */}
              {/* CRITICAL: Don't use key prop - React.memo in BookCover handles re-render prevention
                Using key would cause component remount on every data change, causing flicker */}
              <div className="relative w-full shrink-0 sm:w-48">
                <BookCover
                  variant="regular"
                  coverColor={record.book.coverColor}
                  coverImage={record.book.coverUrl}
                  className="h-64 w-full sm:h-full"
                />
              </div>

              {/* Main Content */}
              <div className="min-w-0 flex-1">
                {/* Header with Status Badge */}
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold sm:text-xl">
                      <Link
                        href={`/books/${record.book.id}`}
                        prefetch={false}
                        className="text-light-100 transition-colors hover:text-light-100/70"
                      >
                        {record.book.title}
                      </Link>
                    </h3>
                    <p className="text-xs sm:text-sm">
                      <span className="text-light-100/70">by </span>
                      <span className="text-light-200 sm:text-base">
                        {record.book.author}
                      </span>
                    </p>
                  </div>
                  {/* Status Badge in Top Right */}
                  <div className="w-fit shrink-0 sm:ml-2">
                    {getStatusBadge(record.status)}
                  </div>
                </div>

                {/* Genre and Rating */}
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="glassGenre" className="px-1.5 py-0.5 sm:px-2">
                    <Library className="size-3" />
                    {record.book.genre}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="size-3 fill-current text-yellow-400 sm:size-4" />
                    <span className="text-xs text-yellow-400 sm:text-sm">
                      {record.book.rating}
                    </span>
                  </div>
                </div>

                {/* Compact Information — labels muted, values bright for contrast */}
                <div className="mb-2 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-4 sm:text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3 text-blue-400 sm:size-4" />
                    <span className="font-medium text-light-200">
                      Borrowed:
                    </span>
                    <span className="text-light-100">
                      {formatDate(record.borrowDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="size-3 text-purple-400 sm:size-4" />
                    <span className="font-medium text-light-200">Due:</span>
                    <span className="text-light-100">
                      {record.dueDate ? formatDate(record.dueDate) : "Not set"}
                    </span>
                  </div>
                  {record.book.isbn && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="size-3 text-green-400 sm:size-4" />
                      <span className="font-medium text-light-200">ISBN:</span>
                      <span className="font-mono text-light-100">
                        {record.book.isbn.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Countdown Timer */}
                {/* CRITICAL: Don't use key prop - React.memo in CountdownTimer handles re-render prevention
                  Using key would cause component remount on every data change, causing flicker */}
                {showCountdown &&
                  record.status === "BORROWED" &&
                  record.dueDate && (
                    <div className="mb-2">
                      <CountdownTimer
                        dueDate={record.dueDate}
                        borrowDate={record.borrowDate}
                      />
                    </div>
                  )}

                {/* Status messages — semantic icons + dated copy */}
                <div className="mb-2">
                  {record.status === "PENDING" && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded bg-yellow-500/10 px-2 py-1 sm:gap-2">
                      <RotateCwFadingClock className="size-3 shrink-0 text-yellow-400 sm:size-4" />
                      <span className="text-xs text-yellow-400 sm:text-sm">
                        Awaiting admin approval
                        {requestedAt ? ` · requested ${requestedAt}` : ""}
                      </span>
                    </div>
                  )}

                  {record.status === "BORROWED" && record.dueDate && (
                    <div
                      className={`flex flex-wrap items-center gap-1.5 rounded px-2 py-1 sm:gap-2 ${
                        isOverdue
                          ? "bg-red-500/10"
                          : daysRemaining <= 2
                            ? "bg-orange-500/10"
                            : "bg-blue-500/10"
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="size-3 shrink-0 text-red-400 sm:size-4" />
                      ) : (
                        <Timer
                          className={`size-3 shrink-0 sm:size-4 ${
                            daysRemaining <= 2
                              ? "text-orange-400"
                              : "text-blue-400"
                          }`}
                        />
                      )}
                      <span
                        className={`text-xs sm:text-sm ${
                          isOverdue
                            ? "text-red-400"
                            : daysRemaining <= 2
                              ? "text-orange-400"
                              : "text-blue-400"
                        }`}
                      >
                        {isOverdue
                          ? `Overdue · ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} late · was due ${formatDate(record.dueDate)}`
                          : daysRemaining <= 2
                            ? `Due soon · ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left · ${formatDate(record.dueDate)}`
                            : `Due on ${formatDate(record.dueDate)}`}
                        {approvedAt ? ` · approved ${approvedAt}` : ""}
                      </span>
                    </div>
                  )}

                  {record.status === "RETURNED" && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded bg-green-500/10 px-2 py-1 sm:gap-2">
                      <AlarmClockCheck className="size-3 shrink-0 text-emerald-400 sm:size-4" />
                      <span className="text-xs text-emerald-400 sm:text-sm">
                        Successfully returned
                        {returnedOn ? ` · ${returnedOn}` : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Fine and Renewal Info */}
                <div className="mb-2 flex flex-wrap gap-2">
                  {(record.fineAmount > 0 || calculatedFine > 0) && (
                    <div className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 sm:px-2 sm:py-1">
                      <AlertTriangle className="inline size-3 text-red-400 sm:size-4" />
                      <span className="text-xs font-medium text-red-400 sm:text-sm">
                        $
                        {(record.fineAmount > 0
                          ? record.fineAmount
                          : calculatedFine
                        ).toFixed(2)}
                      </span>
                      <span className="text-xs text-red-300/70 sm:text-sm">
                        {isOverdue ? "overdue fine" : "fine"}
                      </span>
                    </div>
                  )}

                  {record.renewalCount > 0 && (
                    <div className="flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 sm:px-2 sm:py-1">
                      <RotateCcw className="inline size-3 text-purple-400 sm:size-4" />
                      <span className="text-xs font-medium text-purple-400 sm:text-sm">
                        {record.renewalCount}
                      </span>
                      <span className="text-xs text-purple-300/70 sm:text-sm">
                        renewals
                      </span>
                    </div>
                  )}
                </div>

                {/* Glass action CTAs — shared btn-ripple via withRippleClick */}
                <div className="flex flex-wrap gap-2">
                  {record.status === "BORROWED" && (
                    <>
                      <button
                        type="button"
                        onClick={withRippleClick(
                          handleReturnBook,
                          isReturning,
                        )}
                        disabled={isReturning}
                        className={`profile-action-btn ${
                          isOverdue
                            ? "profile-action-btn--return-overdue"
                            : "profile-action-btn--return"
                        }`}
                      >
                        {isReturning ? (
                          <Loader2 className="size-3 animate-spin sm:size-4" />
                        ) : (
                          <RotateCcw className="size-3 sm:size-4" />
                        )}
                        <span>
                          {isReturning ? "Returning…" : "Return Book"}
                        </span>
                      </button>
                      {!isOverdue ? (
                        <button
                          type="button"
                          onClick={withRippleClick(
                            handleRenewBook,
                            isRenewPending || isRenewing,
                          )}
                          disabled={isRenewPending || isRenewing}
                          className="profile-action-btn profile-action-btn--renew"
                        >
                          {isRenewing ? (
                            <Loader2 className="size-3 animate-spin sm:size-4" />
                          ) : (
                            <Sparkles className="size-3 sm:size-4" />
                          )}
                          {isRenewing ? "Renewing…" : "Renew Loan"}
                        </button>
                      ) : null}
                    </>
                  )}

                  {record.status !== "RETURNED" && (
                    <button
                      type="button"
                      onClick={withRippleClick(handleViewDetails)}
                      className="profile-action-btn profile-action-btn--details"
                    >
                      <BookOpenText className="size-3 sm:size-4" />
                      <span>View Details</span>
                    </button>
                  )}

                  {record.status === "RETURNED" && (
                    <button
                      type="button"
                      onClick={withRippleClick(handleViewDetails)}
                      className="profile-action-btn profile-action-btn--review"
                    >
                      <Star className="size-3 sm:size-4" />
                      <span>Review Book</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
    (prevProps, nextProps) => {
      // CRITICAL: Custom comparison to prevent re-renders when data hasn't actually changed
      // React.memo comparison returns TRUE if props are EQUAL (skip re-render)
      // Returns FALSE if props are DIFFERENT (re-render)
      // Compare all critical fields that affect rendering

      // Quick reference equality check first (fastest)
      if (
        prevProps.record === nextProps.record &&
        prevProps.showCountdown === nextProps.showCountdown &&
        prevProps.isReturning === nextProps.isReturning &&
        prevProps.isRenewing === nextProps.isRenewing
      ) {
        return true; // Same reference, skip re-render
      }

      // Deep comparison for critical fields
      const recordEqual =
        prevProps.record.id === nextProps.record.id &&
        prevProps.record.status === nextProps.record.status &&
        prevProps.record.borrowDate?.getTime() ===
          nextProps.record.borrowDate?.getTime() &&
        prevProps.record.dueDate?.getTime() ===
          nextProps.record.dueDate?.getTime() &&
        prevProps.record.returnDate?.getTime() ===
          nextProps.record.returnDate?.getTime() &&
        prevProps.record.updatedAt?.getTime() ===
          nextProps.record.updatedAt?.getTime() &&
        prevProps.record.fineAmount === nextProps.record.fineAmount &&
        prevProps.record.book.id === nextProps.record.book.id &&
        prevProps.record.book.title === nextProps.record.book.title &&
        prevProps.record.book.author === nextProps.record.book.author &&
        prevProps.record.book.coverUrl === nextProps.record.book.coverUrl &&
        prevProps.record.book.coverColor === nextProps.record.book.coverColor &&
        prevProps.record.book.genre === nextProps.record.book.genre &&
        prevProps.record.book.rating === nextProps.record.book.rating;

      // Return true if all props are equal (skip re-render)
      return (
        recordEqual &&
        prevProps.showCountdown === nextProps.showCountdown &&
        prevProps.isReturning === nextProps.isReturning &&
        prevProps.isRenewing === nextProps.isRenewing
      );
    },
  );

  // Set display name for React DevTools
  BorrowCard.displayName = "BorrowCard";

  const kpiItems: Array<{
    key: string;
    title: string;
    hint: string;
    value: string | number;
    icon: React.ReactNode;
    tone: string;
  }> = [
    {
      key: "total",
      title: "Total Borrows",
      hint: "All requests ever placed",
      value: borrowStats.totalBorrows,
      icon: <Layers className="size-4 shrink-0" />,
      tone: "from-slate-500/25 via-slate-500/10 to-slate-500/5 border-slate-400/30 text-slate-100 shadow-[0_10px_30px_rgba(148,163,184,0.15)]",
    },
    {
      key: "pending",
      title: "Pending",
      hint: "Awaiting admin approval",
      value: borrowStats.pending,
      icon: <Hourglass className="size-4 shrink-0" />,
      tone: "from-amber-500/25 via-amber-500/10 to-amber-500/5 border-amber-400/30 text-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.2)]",
    },
    {
      key: "active",
      title: "Active Loans",
      hint: "Checked out right now",
      value: borrowStats.active,
      icon: <BookMarked className="size-4 shrink-0" />,
      tone: "from-blue-500/25 via-blue-500/10 to-blue-500/5 border-blue-400/30 text-blue-100 shadow-[0_10px_30px_rgba(59,130,246,0.2)]",
    },
    {
      key: "returned",
      title: "Returned",
      hint: "Successfully checked in",
      value: borrowStats.returned,
      icon: <CheckCircle2 className="size-4 shrink-0" />,
      tone: "from-emerald-500/25 via-emerald-500/10 to-emerald-500/5 border-emerald-400/30 text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.2)]",
    },
    {
      key: "overdue",
      title: "Overdue Now",
      hint: "Past due — return ASAP",
      value: borrowStats.overdueNow,
      icon: <AlertTriangle className="size-4 shrink-0" />,
      tone: "from-red-500/25 via-red-500/10 to-red-500/5 border-red-400/30 text-red-100 shadow-[0_10px_30px_rgba(239,68,68,0.2)]",
    },
    {
      key: "dueSoon",
      title: "Due in 48h",
      hint: "Due today or tomorrow",
      value: borrowStats.dueSoon,
      icon: <Timer className="size-4 shrink-0" />,
      tone: "from-orange-500/25 via-orange-500/10 to-orange-500/5 border-orange-400/30 text-orange-100 shadow-[0_10px_30px_rgba(249,115,22,0.2)]",
    },
    {
      key: "withFines",
      title: "With Fines",
      hint: "Loans carrying a balance",
      value: borrowStats.withFines,
      icon: <BadgeDollarSign className="size-4 shrink-0" />,
      tone: "from-rose-500/25 via-rose-500/10 to-rose-500/5 border-rose-400/30 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.2)]",
    },
    {
      key: "totalFines",
      title: "Total Fines",
      hint: "Sum of accrued fines",
      value: `$${borrowStats.totalFines.toFixed(2)}`,
      icon: <BadgeDollarSign className="size-4 shrink-0" />,
      tone: "from-rose-500/25 via-rose-500/10 to-rose-500/5 border-rose-400/30 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.2)]",
    },
    {
      key: "renewals",
      title: "Total Renewals",
      hint: "Extensions across loans",
      value: borrowStats.totalRenewals,
      icon: <RefreshCw className="size-4 shrink-0" />,
      tone: "from-violet-500/25 via-violet-500/10 to-violet-500/5 border-violet-400/30 text-violet-100 shadow-[0_10px_30px_rgba(139,92,246,0.2)]",
    },
    {
      key: "avgRenew",
      title: "Avg Renewals",
      hint: "Per borrow request",
      value: borrowStats.avgRenewalsPerLoan,
      icon: <Sparkles className="size-4 shrink-0" />,
      tone: "from-purple-500/25 via-purple-500/10 to-purple-500/5 border-purple-400/30 text-purple-100 shadow-[0_10px_30px_rgba(168,85,247,0.2)]",
    },
    {
      key: "unique",
      title: "Unique Books",
      hint: "Distinct titles borrowed",
      value: borrowStats.uniqueBooks,
      icon: <Library className="size-4 shrink-0" />,
      tone: "from-cyan-500/25 via-cyan-500/10 to-cyan-500/5 border-cyan-400/30 text-cyan-100 shadow-[0_10px_30px_rgba(6,182,212,0.2)]",
    },
    {
      key: "reviews",
      title: "Reviews Written",
      hint: "Your published ratings",
      value: borrowStats.totalReviews,
      icon: <MessageSquareText className="size-4 shrink-0" />,
      tone: "from-indigo-500/25 via-indigo-500/10 to-indigo-500/5 border-indigo-400/30 text-indigo-100 shadow-[0_10px_30px_rgba(99,102,241,0.2)]",
    },
    {
      key: "onTime",
      title: "On-time Returns",
      hint: "Returned by due date",
      value: borrowStats.onTimeReturns,
      icon: <CalendarCheck2 className="size-4 shrink-0" />,
      tone: "from-teal-500/25 via-teal-500/10 to-teal-500/5 border-teal-400/30 text-teal-100 shadow-[0_10px_30px_rgba(20,184,166,0.2)]",
    },
    {
      key: "late",
      title: "Late Returns",
      hint: "Returned after due date",
      value: borrowStats.lateReturns,
      icon: <CalendarClock className="size-4 shrink-0" />,
      tone: "from-red-500/20 via-red-500/10 to-red-500/5 border-red-400/25 text-red-100 shadow-[0_10px_30px_rgba(239,68,68,0.15)]",
    },
    {
      key: "month",
      title: "Returned This Month",
      hint: "Check-ins in UTC month",
      value: borrowStats.returnedThisMonth,
      icon: <History className="size-4 shrink-0" />,
      tone: "from-sky-500/25 via-sky-500/10 to-sky-500/5 border-sky-400/30 text-sky-100 shadow-[0_10px_30px_rgba(14,165,233,0.2)]",
    },
    {
      key: "wait",
      title: "Oldest Pending",
      hint: "Days waiting on approval",
      value: borrowStats.pendingOldestWaitDays,
      icon: <Clock className="size-4 shrink-0" />,
      tone: "from-yellow-500/25 via-yellow-500/10 to-yellow-500/5 border-yellow-400/30 text-yellow-100 shadow-[0_10px_30px_rgba(234,179,8,0.2)]",
    },
  ];

  const sectionMeta: Record<
    ProfileTab,
    { title: string; subtitle: string; icon: React.ReactNode }
  > = {
    "active-borrows": {
      title: "Active loans",
      subtitle: "Books currently checked out to you",
      icon: <BookOpen className="size-5 text-blue-300" />,
    },
    "pending-requests": {
      title: "Pending requests",
      subtitle: "Awaiting librarian approval before checkout",
      icon: <Hourglass className="size-5 text-amber-300" />,
    },
    "borrow-history": {
      title: "Borrow history",
      subtitle: "Completed returns and past loans",
      icon: <History className="size-5 text-violet-300" />,
    },
    "my-reviews": {
      title: "My reviews",
      subtitle: "Every review you've submitted, including pending moderation",
      icon: <MessageSquareText className="size-5 text-indigo-300" />,
    },
  };

  return (
    <div className="w-full">
      {/* Match All Books hero: title + light-200 subtitle, single mb stack */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-semibold text-light-100 sm:text-3xl">
          My Borrowing History
        </h1>
        <p className="text-sm text-light-200 sm:text-base">
          Track active loans, pending requests, and your full borrow history
        </p>
      </div>

      {/* KPIs above tabs — live from RQ borrows + SSR reviews (review.write → /my-profile) */}
      <section className="profile-stats-panel mb-4 sm:mb-6">
        <GlassSectionHeader
          className="mb-3 sm:mb-4"
          icon={<BarChart3 className="size-5" />}
          title="Borrow Statistics"
          subtitle="Live snapshot of your library activity"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-4">
          {kpiItems.map((item) => (
            <div key={item.key} className={`profile-kpi-card ${item.tone}`}>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 opacity-90">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight sm:text-sm">
                    {item.title}
                  </p>
                  <p className="text-[10px] leading-snug opacity-75 sm:text-xs">
                    {item.hint}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-lg font-semibold leading-none sm:text-xl">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Tabs
        value={activeTabValue}
        onValueChange={handleTabChange}
        className="w-full"
        suppressHydrationWarning
      >
        {/* Standalone glass pills — no outer muted/white track */}
        <TabsList className="profile-tabs-list mb-4 sm:mb-6">
          <TabsTrigger
            value="active-borrows"
            className="profile-tab-trigger profile-tab-active-borrows"
          >
            <BookOpen className="size-4 shrink-0" />
            <span>Active Borrows ({activeBorrows.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="pending-requests"
            className="profile-tab-trigger profile-tab-pending"
          >
            <Hourglass className="size-4 shrink-0" />
            <span>Pending Requests ({pendingRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="borrow-history"
            className="profile-tab-trigger profile-tab-history"
          >
            <History className="size-4 shrink-0" />
            <span>Borrow History ({borrowHistory.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="my-reviews"
            className="profile-tab-trigger profile-tab-reviews"
          >
            <MessageSquareText className="size-4 shrink-0" />
            <span>My Reviews ({liveTotalReviews})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active-borrows" className="mt-0">
          <div className="space-y-3 sm:space-y-4">
            <GlassSectionHeader
              icon={sectionMeta["active-borrows"].icon}
              title={sectionMeta["active-borrows"].title}
              subtitle={sectionMeta["active-borrows"].subtitle}
            />
            {activeBorrows.length === 0 ? (
              <div
                role="status"
                className="profile-borrow-row p-4 text-center sm:p-6"
              >
                <p className="text-sm text-light-200 sm:text-base">
                  No active borrows
                </p>
              </div>
            ) : (
              activeBorrows.map((record) => (
                <BorrowCard
                  key={record.id}
                  record={record}
                  showCountdown={true}
                  isReturning={returningRecordId === record.id}
                  isRenewing={renewingRecordId === record.id}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending-requests" className="mt-0">
          <div className="space-y-3 sm:space-y-4">
            <GlassSectionHeader
              icon={sectionMeta["pending-requests"].icon}
              title={sectionMeta["pending-requests"].title}
              subtitle={sectionMeta["pending-requests"].subtitle}
            />
            {pendingRequests.length === 0 ? (
              <div
                role="status"
                className="profile-borrow-row p-4 text-center sm:p-6"
              >
                <p className="text-sm text-light-200 sm:text-base">
                  No pending requests
                </p>
              </div>
            ) : (
              pendingRequests.map((record) => (
                <BorrowCard key={record.id} record={record} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="borrow-history" className="mt-0">
          <div className="space-y-3 sm:space-y-4">
            <GlassSectionHeader
              icon={sectionMeta["borrow-history"].icon}
              title={sectionMeta["borrow-history"].title}
              subtitle={sectionMeta["borrow-history"].subtitle}
            />
            {sortedHistory.length === 0 ? (
              <div
                role="status"
                className="profile-borrow-row p-4 text-center sm:p-6"
              >
                <p className="text-sm text-light-200 sm:text-base">
                  No borrow history
                </p>
              </div>
            ) : (
              sortedHistory.map((record) => (
                <BorrowCard key={record.id} record={record} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-reviews" className="mt-0">
          <div className="space-y-3 sm:space-y-4">
            <GlassSectionHeader
              icon={sectionMeta["my-reviews"].icon}
              title={sectionMeta["my-reviews"].title}
              subtitle={sectionMeta["my-reviews"].subtitle}
            />
            <MyReviewsTab userId={userId} initialReviews={initialReviews} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyProfileTabs;
