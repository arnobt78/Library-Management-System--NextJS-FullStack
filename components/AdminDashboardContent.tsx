"use client";

/**
 * AdminDashboardContent Component
 *
 * Client component that displays admin dashboard statistics and overview.
 * Uses React Query for data fetching and caching, with SSR initial data support.
 *
 * Features:
 * - Uses useAdminStats hook with initialData from SSR
 * - Displays skeleton loaders while fetching
 * - Shows error state if fetch fails
 * - Displays comprehensive statistics, charts, and recent activity
 * Parent: REQ-0033 admin glass polish
 */

import React from "react";
import {
  AlertTriangle,
  Ban,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  Clock,
  HeartPulse,
  Home,
  Languages,
  Library,
  Package,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import AdminStatsSkeleton from "@/components/skeletons/AdminStatsSkeleton";
import {
  useAdminStats,
  useOpenTicketCount,
  usePendingReviewCount,
} from "@/hooks/useQueries";
import type { AdminStats } from "@/lib/services/admin";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { RecentBorrowRow } from "@/components/admin/RecentBorrowRow";
import { RecentUserRow } from "@/components/admin/RecentUserRow";
import { OverviewTopRatedRow } from "@/components/admin/OverviewTopRatedRow";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { getAdminNavItemByRoute } from "@/lib/navigation/admin-nav-config";

interface AdminDashboardContentProps {
  /** Initial admin stats from SSR (shared shape with GET /api/admin/stats) */
  initialStats?: AdminStats;
  /** Success message from URL params */
  successMessage?: string;
}

const AdminDashboardContent: React.FC<AdminDashboardContentProps> = ({
  initialStats,
  successMessage,
}) => {
  // Stable mount stamp — RQ treats SSR as fresh (parity MyProfileTabs borrows)
  const [ssrTimestamp] = React.useState<number>(() => Date.now());

  // Use React Query hook with SSR initial data
  const {
    data: stats,
    isLoading,
    isError,
    error,
  } = useAdminStats(
    initialStats,
    initialStats ? ssrTimestamp : undefined,
  );
  // Prefer admin.stats (densified on ticket/review CRUD) over separate count hooks
  // so Overview KPI value + badges cannot briefly disagree after mutations.
  const { data: openTicketCount, isLoading: ticketCountLoading } =
    useOpenTicketCount(initialStats?.openTicketCount);
  const { data: pendingReviewCount, isLoading: reviewCountLoading } =
    usePendingReviewCount(initialStats?.pendingReviewCount);

  // Show skeleton while loading (only if no initial data)
  if (isLoading && !initialStats) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <AdminStatsSkeleton key={`stat-${i}`} variant="stat" />
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <AdminStatsSkeleton key={`chart-${i}`} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (isError && !initialStats) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-center sm:p-8">
          <p className="mb-2 text-base font-medium text-red-500 sm:text-lg">
            Failed to load admin statistics
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  // Prefer RQ (fresh after invalidate/densify); SSR is seed + fallback
  const statsData = stats ?? initialStats;

  if (!statsData) {
    return null;
  }

  const {
    totalUsers = 0,
    approvedUsers = 0,
    pendingUsers = 0,
    rejectedUsers = 0,
    adminUsers = 0,
    totalBooks = 0,
    totalCopies = 0,
    availableCopies = 0,
    borrowedCopies = 0,
    activeBooks = 0,
    inactiveBooks = 0,
    booksWithISBN = 0,
    booksWithPublisher = 0,
    averagePageCount = 0,
    activeBorrows = 0,
    pendingBorrows = 0,
    returnedBooks = 0,
    cancelledBorrows = 0,
    reservationsWaiting = 0,
    pendingAdminRequests = 0,
    rejectedAdminRequests = 0,
    approvedAdminRequests = 0,
    ticketsOpen = 0,
    ticketsInProgress = 0,
    ticketsResolved = 0,
    ticketsUrgentOpen = 0,
    reviewsApproved = 0,
    reviewsRejected = 0,
    openTicketCount: statsOpenTicketCount,
    pendingReviewCount: statsPendingReviewCount,
    recentBorrows = [],
    recentUsers = [],
    categoryStats = [],
    booksByYear = [],
    booksByLanguage = [],
    topRatedBooks = [],
  } = statsData;

  // Densified admin.stats wins over dedicated count queries (same mutation paint).
  const openTicketsValue =
    statsOpenTicketCount ?? openTicketCount ?? initialStats?.openTicketCount ?? 0;
  const pendingReviewsValue =
    statsPendingReviewCount ??
    pendingReviewCount ??
    initialStats?.pendingReviewCount ??
    0;

  const pct = (part: number, whole: number) =>
    whole > 0 ? (part / whole) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title={getAdminNavItemByRoute("/admin")?.label ?? "Library Overview"}
        description={getAdminNavItemByRoute("/admin")?.description}
        icon={Home}
      />
      {/* Success Message */}
      {successMessage === "admin-granted" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg
                className="size-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule={"evenodd" as const}
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule={"evenodd" as const}
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Admin Access Granted!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  You are now an admin! You can access all admin features and
                  manage the library system.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Statistics Cards — glass status badges (REQ-0033 count homes) */}
      <StatCardGrid>
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          hue="blue"
          badges={[
            {
              label: `${approvedUsers} approved`,
              hue: "emerald",
              icon: CheckCircle2,
            },
            {
              label: `${pendingUsers} pending sign-ups`,
              hue: "amber",
              icon: Clock,
            },
            ...(rejectedUsers > 0
              ? [
                  {
                    label: `${rejectedUsers} rejected`,
                    hue: "rose" as const,
                    icon: XCircle,
                  },
                ]
              : []),
          ]}
        />
        <StatCard
          title="Total Books"
          value={totalBooks}
          icon={BookMarked}
          hue="emerald"
          badges={[
            {
              label: `${activeBooks} active`,
              hue: "emerald",
              icon: CheckCircle2,
            },
            {
              label: `${inactiveBooks} inactive`,
              hue: "rose",
              icon: Ban,
            },
          ]}
        />
        <StatCard
          title="Active Borrows"
          value={activeBorrows}
          icon={BookOpenCheck}
          hue="violet"
          badges={[
            {
              label: `${pendingBorrows} pending`,
              hue: "amber",
              icon: Clock,
            },
            {
              label: `${returnedBooks} returned`,
              hue: "emerald",
              icon: CheckCircle2,
            },
            {
              label: `${cancelledBorrows} cancelled`,
              hue: "slate",
              icon: Ban,
            },
          ]}
        />
        <StatCard
          title="Admins"
          value={adminUsers}
          icon={ShieldCheck}
          hue="slate"
          badges={[
            {
              label: `${pendingAdminRequests} pending requests`,
              hue: "amber",
              icon: Clock,
            },
            {
              label: `${rejectedAdminRequests} rejected`,
              hue: "rose",
              icon: XCircle,
            },
          ]}
        />
        <StatCard
          title="Open Tickets"
          value={openTicketsValue}
          valueLoading={
            ticketCountLoading &&
            statsOpenTicketCount === undefined &&
            openTicketCount === undefined
          }
          icon={Ticket}
          hue="rose"
          badges={[
            {
              label: `${ticketsOpen} open`,
              hue: "rose",
              icon: Ticket,
            },
            {
              label: `${ticketsInProgress} in progress`,
              hue: "amber",
              icon: Clock,
            },
            {
              label: `${ticketsResolved} resolved`,
              hue: "emerald",
              icon: CheckCircle2,
            },
            {
              label: `${ticketsUrgentOpen} urgent open`,
              hue: "rose",
              icon: AlertTriangle,
            },
          ]}
        />
        <StatCard
          title="Pending Reviews"
          value={pendingReviewsValue}
          valueLoading={
            reviewCountLoading &&
            statsPendingReviewCount === undefined &&
            pendingReviewCount === undefined
          }
          icon={Star}
          hue="amber"
          badges={[
            {
              label: `${reviewsApproved} approved`,
              hue: "emerald",
              icon: CheckCircle2,
            },
            {
              label: `${reviewsRejected} rejected`,
              hue: "rose",
              icon: XCircle,
            },
          ]}
        />
      </StatCardGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <AdminSurfacePanel variant="stat">
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Library className="size-5" />}
            title="Book Availability"
            iconToneClassName="border-emerald-200 bg-emerald-50 text-emerald-600"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Books in catalog</span>
              <span className="font-medium">{totalBooks}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-emerald-600"
                style={{ width: `${totalBooks > 0 ? 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Available copies</span>
              <span className="font-medium">{availableCopies}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-600"
                style={{ width: `${pct(availableCopies, totalCopies)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Borrowed copies</span>
              <span className="font-medium">{borrowedCopies}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${pct(borrowedCopies, totalCopies)}%` }}
              />
            </div>
          </div>
        </AdminSurfacePanel>

        <AdminSurfacePanel variant="stat">
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Users className="size-5" />}
            title="User Status"
            iconToneClassName="border-blue-200 bg-blue-50 text-blue-600"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Approved users</span>
              <span className="font-medium">{approvedUsers}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-600"
                style={{ width: `${pct(approvedUsers, totalUsers)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Pending sign-ups</span>
              <span className="font-medium">{pendingUsers}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-yellow-600"
                style={{ width: `${pct(pendingUsers, totalUsers)}%` }}
              />
            </div>

            {rejectedUsers > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rejected users</span>
                  <span className="font-medium">{rejectedUsers}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-rose-500"
                    style={{ width: `${pct(rejectedUsers, totalUsers)}%` }}
                  />
                </div>
              </>
            ) : null}

            <div className="flex items-center justify-between">
              <span className="text-sm">Admin requests pending</span>
              <span className="font-medium">{pendingAdminRequests}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-amber-500"
                style={{
                  width: `${pct(
                    pendingAdminRequests,
                    pendingAdminRequests +
                      rejectedAdminRequests +
                      approvedAdminRequests,
                  )}%`,
                }}
              />
            </div>
          </div>
        </AdminSurfacePanel>

        <AdminSurfacePanel variant="stat">
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Package className="size-5" />}
            title="Book Information"
            iconToneClassName="border-violet-200 bg-violet-50 text-violet-600"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Books with ISBN</span>
              <span className="font-medium">{booksWithISBN}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-indigo-600"
                style={{ width: `${pct(booksWithISBN, totalBooks)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Books with Publisher</span>
              <span className="font-medium">{booksWithPublisher}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-purple-600"
                style={{ width: `${pct(booksWithPublisher, totalBooks)}%` }}
              />
            </div>

            {averagePageCount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Page Count</span>
                <span className="font-medium">
                  {Math.round(averagePageCount)}
                </span>
              </div>
            ) : null}
          </div>
        </AdminSurfacePanel>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <AdminSurfacePanel variant="stat">
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<BookOpen className="size-5" />}
            title="Recent Borrows"
            iconToneClassName="border-sky-200 bg-sky-50 text-sky-600"
          />
          <div className="space-y-2">
            {recentBorrows.length === 0 ? (
              <p className="text-sm text-gray-500">No recent borrows</p>
            ) : (
              recentBorrows.map((borrow) => (
                <RecentBorrowRow key={borrow.id} borrow={borrow} />
              ))
            )}
          </div>
        </AdminSurfacePanel>

        <AdminSurfacePanel variant="stat">
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Users className="size-5" />}
            title="Recent Users"
            iconToneClassName="border-slate-200 bg-slate-50 text-slate-600"
          />
          <div className="space-y-2">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No recent users</p>
            ) : (
              recentUsers.map((user) => (
                <RecentUserRow key={user.id} user={user} />
              ))
            )}
          </div>
        </AdminSurfacePanel>
      </div>

      {/* Book Categories Section */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <AdminSurfacePanel variant="stat" topStroke>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Library className="size-5" />}
            title="Book Categories"
            iconToneClassName="border-indigo-200 bg-indigo-50 text-indigo-600"
          />
          <div className="space-y-2">
            {categoryStats.length === 0 ? (
              <p className="text-sm text-gray-500">No books found</p>
            ) : (
              categoryStats.map((category) => (
                <div
                  key={category.genre}
                  className="flex items-center justify-between rounded-xl bg-gray-50/90 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">
                        {category.genre}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium leading-none text-blue-600">
                          {category.count} books
                        </span>
                        {category.avgRating > 0 ? (
                          <span className="inline-flex items-center gap-0.5 leading-none text-amber-600">
                            <Star
                              className="size-3 shrink-0 fill-amber-500 text-amber-500"
                              aria-hidden
                            />
                            <span className="text-xs font-medium leading-none sm:text-sm">
                              {category.avgRating.toFixed(1)}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                      <span>{category.totalCopies} total copies</span>
                      <span>{category.availableCopies} available</span>
                    </div>
                    <div className="mt-2 h-1 w-full rounded-full bg-gray-200">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{
                          width: `${pct(category.count, totalBooks)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminSurfacePanel>

        <AdminSurfacePanel variant="stat" topStroke>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Calendar className="size-5" />}
            title="Books by Publication Year"
            iconToneClassName="border-emerald-200 bg-emerald-50 text-emerald-600"
          />
          <div className="space-y-2">
            {booksByYear.length === 0 ? (
              <p className="text-sm text-gray-500">No publication year data</p>
            ) : (
              booksByYear.map(([year, count]) => (
                <div
                  key={year}
                  className="flex items-center justify-between rounded-xl bg-gray-50/90 p-3"
                >
                  <span className="font-medium text-gray-900">{year}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-green-600">
                      {count} books
                    </span>
                    <div className="h-2 w-16 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${pct(count, totalBooks)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminSurfacePanel>
      </div>

      {/* Additional Statistics Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        <AdminSurfacePanel variant="stat" topStroke>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Languages className="size-5" />}
            title="Books by Language"
            iconToneClassName="border-violet-200 bg-violet-50 text-violet-600"
          />
          <div className="space-y-2">
            {booksByLanguage.length === 0 ? (
              <p className="text-sm text-gray-500">No language data</p>
            ) : (
              booksByLanguage.map(([language, count]) => (
                <div
                  key={language}
                  className="flex items-center justify-between rounded-xl bg-gray-50/90 p-2"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {language}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-purple-600">
                      {count}
                    </span>
                    <div className="h-1 w-12 rounded-full bg-gray-200">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${pct(count, totalBooks)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminSurfacePanel>

        <AdminSurfacePanel variant="stat" topStroke>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<Star className="size-5" />}
            title="Top Rated Books"
            iconToneClassName="border-amber-200 bg-amber-50 text-amber-600"
          />
          <div className="space-y-2">
            {topRatedBooks.length === 0 ? (
              <p className="text-sm text-gray-500">No rated books</p>
            ) : (
              topRatedBooks.map((book) => (
                <OverviewTopRatedRow key={book.id} book={book} />
              ))
            )}
          </div>
        </AdminSurfacePanel>

        <AdminSurfacePanel variant="stat" topStroke>
          <TicketSectionHeader
            className="mb-0"
            align="center"
            icon={<HeartPulse className="size-5" />}
            title="Library Health"
            iconToneClassName="border-rose-200 bg-rose-50 text-rose-600"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Collection Diversity</span>
              <span className="text-sm font-medium text-indigo-600">
                {categoryStats.length} categories
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                style={{
                  width: `${Math.min((categoryStats.length / 10) * 100, 100)}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Availability Rate</span>
              <span className="text-sm font-medium text-green-600">
                {Math.round(pct(availableCopies, totalCopies))}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                style={{ width: `${pct(availableCopies, totalCopies)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">User Engagement</span>
              <span className="text-sm font-medium text-purple-600">
                {Math.round(pct(activeBorrows, totalUsers))}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{
                  width: `${Math.min(pct(activeBorrows, totalUsers), 100)}%`,
                }}
              />
            </div>

            {/* Extra state metrics — real counts only (REQ-0033 Library Health) */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending Borrow Queue</span>
              <span className="text-sm font-medium text-amber-600">
                {pendingBorrows}
                {activeBorrows + pendingBorrows > 0
                  ? ` · ${Math.round(pct(pendingBorrows, activeBorrows + pendingBorrows))}%`
                  : ""}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{
                  width: `${pct(pendingBorrows, activeBorrows + pendingBorrows)}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Reservations Waiting</span>
              <span className="text-sm font-medium text-sky-600">
                {reservationsWaiting}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
                style={{
                  width: `${Math.min(
                    (reservationsWaiting / Math.max(reservationsWaiting, 5)) *
                      100,
                    100,
                  )}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Return Completion</span>
              <span className="text-sm font-medium text-emerald-600">
                {Math.round(
                  pct(returnedBooks, returnedBooks + activeBorrows),
                )}
                %
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                style={{
                  width: `${pct(returnedBooks, returnedBooks + activeBorrows)}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Catalog Active</span>
              <span className="text-sm font-medium text-violet-600">
                {activeBooks}/{totalBooks}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500"
                style={{ width: `${pct(activeBooks, totalBooks)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Signup Approved</span>
              <span className="text-sm font-medium text-blue-600">
                {Math.round(pct(approvedUsers, totalUsers))}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                style={{ width: `${pct(approvedUsers, totalUsers)}%` }}
              />
            </div>

            {pendingUsers > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Signup Pending</span>
                  <span className="text-sm font-medium text-amber-600">
                    {pendingUsers}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500"
                    style={{ width: `${pct(pendingUsers, totalUsers)}%` }}
                  />
                </div>
              </>
            ) : null}

            {rejectedUsers > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Signup Rejected</span>
                  <span className="text-sm font-medium text-rose-600">
                    {rejectedUsers}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-red-500"
                    style={{ width: `${pct(rejectedUsers, totalUsers)}%` }}
                  />
                </div>
              </>
            ) : null}

            {cancelledBorrows > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Cancelled Borrows
                  </span>
                  <span className="text-sm font-medium text-slate-600">
                    {cancelledBorrows}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-slate-400 to-slate-500"
                    style={{
                      width: `${pct(
                        cancelledBorrows,
                        cancelledBorrows + returnedBooks + activeBorrows + pendingBorrows,
                      )}%`,
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        </AdminSurfacePanel>
      </div>
    </div>
  );
};

export default AdminDashboardContent;
