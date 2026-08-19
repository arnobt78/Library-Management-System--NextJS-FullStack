/**
 * Shared Admin User 360 body — KPI grids + parallel card rows.
 * Used by /admin/users/[id], /admin/account-requests/[userId], and
 * /admin/admin-requests/[id] (entry=directory | registration | privilege).
 */

import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock,
  LifeBuoy,
  Lightbulb,
  Percent,
  Star,
} from "lucide-react";
import AdminUserDetailHeaderClient from "@/components/admin/AdminUserDetailHeaderClient";
import {
  AdminUserApplicantPanel,
  AdminUserRegistrationScrollAnchor,
  AdminUserSignupTimelinePanel,
  type AdminUser360Entry,
} from "@/components/admin/AdminUserRegistrationPanel";
import AdminUserPrivilegePanel from "@/components/admin/AdminUserPrivilegePanel";
import AdminUserReservationsPanel from "@/components/admin/AdminUserReservationsPanel";
import AdminUserActivityPanel from "@/components/admin/AdminUserActivityPanel";
import AdminUser360StatusKpiRow from "@/components/admin/AdminUser360StatusKpiRow";
import AdminUser360NextActionsList from "@/components/admin/AdminUser360NextActionsList";
import { AdminBookIdentityCell } from "@/components/admin/AdminBookIdentityCell";
import { BorrowLifecycleDates } from "@/components/admin/BorrowLifecycleDates";
import { DecisionActorStack } from "@/components/admin/DecisionActorStack";
import {
  AdminDetailEmptyState,
  USER_360_TABLE,
  USER_360_TABLE_SCROLL,
  USER_360_TH,
} from "@/components/admin/AdminDetailEmptyState";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import {
  BorrowStatusBadge,
  ReviewStatusBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/lib/ui/semanticBadges";
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { reviewRatingTone } from "@/lib/ui/reviewOptions";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import type {
  TicketPriority,
  TicketStatus,
} from "@/lib/validations/supportTicket";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import type { SignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import type { getAdminUserProfile } from "@/lib/admin/userProfile";
import type { User } from "@/lib/services/users";
import type { UserReservationItem } from "@/lib/services/reservations";
import type { AdminUserActivityEntry } from "@/lib/admin/adminUserActivity";
import { cn } from "@/lib/utils";

export type AdminUserProfileData = NonNullable<
  Awaited<ReturnType<typeof getAdminUserProfile>>
>;

function toReservationItems(
  rows: AdminUserProfileData["reservationHistory"],
): UserReservationItem[] {
  return rows.map((item) => ({
    id: item.id,
    status: item.status as UserReservationItem["status"],
    bookTitle: item.bookTitle,
    bookId: item.bookId,
    queuePosition: null,
    readyExpiresAt: item.readyExpiresAt ? String(item.readyExpiresAt) : null,
    bookAuthor: item.bookAuthor ?? null,
    coverUrl: item.bookCoverUrl ?? null,
    coverColor: item.bookCoverColor ?? null,
    genre: item.bookGenre ?? null,
    bookRating: item.bookRating ?? null,
    createdAt: item.createdAt ?? null,
  }));
}

function toActivityItems(
  rows: AdminUserProfileData["activityHistory"],
): AdminUserActivityEntry[] {
  return rows.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    details: log.details,
    createdAt: log.createdAt,
    actorId: log.actorId,
  }));
}

interface AdminUser360ShellProps {
  data: AdminUserProfileData;
  initialUser: User;
  initialSignupDetail: SignupRequestDetail;
  currentUserId: string;
  currentAdmin: AdminRequestReviewer | null;
  entry: AdminUser360Entry;
  /** Borrow pagination base path (users vs account-requests). */
  paginationBasePath: string;
}

export default function AdminUser360Shell({
  data,
  initialUser,
  initialSignupDetail,
  currentUserId,
  currentAdmin,
  entry,
  paginationBasePath,
}: AdminUser360ShellProps) {
  const outstandingFine = Number(data.metrics.outstanding_fine ?? 0);
  const overdue = Number(data.metrics.overdue ?? 0);
  const initialFineMetrics = {
    outstandingFine,
    overdueCount: overdue,
  };
  const avgLoanDays = data.metrics.average_loan_days;
  const waitingHolds = data.reservationHistory.filter(
    (r) => r.status === "WAITING",
  ).length;
  const readyHolds = data.reservationHistory.filter(
    (r) => r.status === "READY",
  ).length;

  return (
    <AdminPageShell
      header={
        <AdminUserDetailHeaderClient
          initialUser={initialUser}
          currentUserId={currentUserId}
          currentAdmin={currentAdmin}
          entry={entry}
        />
      }
      kpis={
        <div className="space-y-3">
          {/* Status / action — Reg + Privilege densify; Fine/Overdue live KPIs */}
          <AdminUser360StatusKpiRow
            initialUser={initialUser}
            initialSignupDetail={initialSignupDetail}
            initialFineMetrics={initialFineMetrics}
          />
          {/* Borrow health — Current · Pending · Returned · On-time */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailKpiShell
              variant="light"
              icon={<BookMarked className="size-4" />}
              label="Current"
              hint="Checked out"
            >
              <span className="text-2xl font-semibold tabular-nums text-gray-900">
                {data.metrics.current}
              </span>
            </DetailKpiShell>
            <DetailKpiShell
              variant="light"
              icon={<Clock className="size-4" />}
              label="Pending"
              hint="Awaiting borrow approval"
            >
              <span className="text-2xl font-semibold tabular-nums text-gray-900">
                {data.metrics.pending}
              </span>
            </DetailKpiShell>
            <DetailKpiShell
              variant="light"
              icon={<CheckCircle2 className="size-4" />}
              label="Returned"
              hint="Completed loans"
            >
              <span className="text-2xl font-semibold tabular-nums text-gray-900">
                {data.metrics.returned}
              </span>
            </DetailKpiShell>
            <DetailKpiShell
              variant="light"
              icon={<Percent className="size-4" />}
              label="On-time returns"
              hint="Return punctuality"
            >
              <span className="text-2xl font-semibold tabular-nums text-gray-900">
                {data.metrics.on_time_rate}%
              </span>
            </DetailKpiShell>
          </div>
        </div>
      }
    >
      <AdminUserRegistrationScrollAnchor entry={entry} />

      <div className="space-y-6">
        {/* A: Applicant ‖ Insights */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminUserApplicantPanel initialDetail={initialSignupDetail} />
          <AdminSurfacePanel className="text-sm text-gray-600">
            <TicketSectionHeader
              variant="light"
              icon={<Lightbulb className="size-5" aria-hidden />}
              title="Explainable Insights"
              subtitle="Deterministic library aggregates (SSR)"
            />
            <p>
              Top genres:{" "}
              {data.topGenres
                .map((item) => `${item.genre} (${item.count})`)
                .join(", ") || "No completed loans"}
            </p>
            <p className="mt-2">
              Library demand/copy {data.libraryInsights.demandToCopyRatio} ·
              hold pressure {data.libraryInsights.holdPressure} · renewal rate{" "}
              {data.libraryInsights.renewalRate}%
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Formula {data.libraryInsights.formulaVersion},{" "}
              {data.libraryInsights.periodStart} to{" "}
              {data.libraryInsights.periodEnd}. Deterministic aggregates only.
            </p>
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Next actions (advisory)
              </p>
              <AdminUser360NextActionsList
                userId={initialUser.id}
                initialFineMetrics={initialFineMetrics}
                pending={Number(data.metrics.pending ?? 0)}
                waitingHolds={waitingHolds}
                readyHolds={readyHolds}
              />
            </div>
          </AdminSurfacePanel>
        </div>

        {/* B: Signup Timeline ‖ Privilege */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminUserSignupTimelinePanel initialDetail={initialSignupDetail} />
          <AdminUserPrivilegePanel
            userId={initialUser.id}
            initialHistory={data.requestHistory}
          />
        </div>

        {/* C: Borrowing ‖ Reservations */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminSurfacePanel>
            <TicketSectionHeader
              variant="light"
              icon={<BookOpen className="size-5" aria-hidden />}
              title={`Borrowing History (${data.pagination.total})`}
              subtitle={`Avg loan ${avgLoanDays} days · loans, fines, and renewals`}
            />
            {data.history.length === 0 ? (
              <AdminDetailEmptyState message="No borrowing history for this user yet." />
            ) : (
              <div className={USER_360_TABLE_SCROLL}>
                {/* table-fixed: Book truncates; Status budgeted; cells middle-aligned */}
                <table className={USER_360_TABLE}>
                  <thead>
                    <tr className="border-b">
                      <th className={cn(USER_360_TH, "w-[44%] min-w-0")}>
                        Book
                      </th>
                      <th className={cn(USER_360_TH, "w-[34%] min-w-0")}>
                        Status
                      </th>
                      <th
                        className={cn(
                          USER_360_TH,
                          "w-[10%] whitespace-nowrap tabular-nums",
                        )}
                      >
                        Fine
                      </th>
                      <th
                        className={cn(
                          USER_360_TH,
                          "w-[12%] whitespace-nowrap text-right tabular-nums",
                        )}
                      >
                        Renewals
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((record) => (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="min-w-0 overflow-hidden py-3 align-middle">
                          <AdminBookIdentityCell
                            bookId={record.bookId}
                            title={record.bookTitle}
                            author={record.bookAuthor}
                            coverUrl={record.bookCoverUrl}
                            coverColor={record.bookCoverColor}
                            genre={record.bookGenre}
                            rating={record.bookRating}
                          />
                        </td>
                        <td className="min-w-0 py-3 align-middle">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex self-start">
                              <BorrowStatusBadge status={record.status} />
                            </span>
                            <BorrowLifecycleDates
                              status={record.status}
                              createdAt={record.createdAt}
                              borrowDate={record.borrowDate}
                              updatedAt={record.updatedAt}
                              approvedAt={record.approvedAt}
                              cancelledAt={record.cancelledAt}
                              renewedAt={record.renewedAt}
                              dueDate={record.dueDate}
                              returnDate={record.returnDate}
                            />
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-3 align-middle tabular-nums">
                          {/* Loader-normalized: live days × rate for open overdue. */}
                          ${Number(record.fineAmount ?? 0).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap py-3 text-right align-middle tabular-nums">
                          {record.renewalCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSurfacePanel>

          <AdminUserReservationsPanel
            userId={initialUser.id}
            initialReservations={toReservationItems(data.reservationHistory)}
          />
        </div>

        {/* D: Reviews ‖ Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminSurfacePanel>
            <TicketSectionHeader
              variant="light"
              icon={<Star className="size-5" aria-hidden />}
              title={`Reviews (${data.reviewHistory.length})`}
              subtitle="Book reviews submitted by this user"
            />
            {data.reviewHistory.length === 0 ? (
              <AdminDetailEmptyState message="No reviews from this user yet." />
            ) : (
              <div className={USER_360_TABLE_SCROLL}>
                {/* Borrowing-style budgets: Book 44% / Rating 12% / Status 44% */}
                <table className={USER_360_TABLE}>
                  <thead>
                    <tr className="border-b">
                      <th className={cn(USER_360_TH, "w-[44%] min-w-0")}>
                        Book
                      </th>
                      <th
                        className={cn(
                          USER_360_TH,
                          "w-[12%] whitespace-nowrap",
                        )}
                      >
                        Rating
                      </th>
                      <th className={cn(USER_360_TH, "w-[44%] min-w-0")}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reviewHistory.map((review) => {
                      const ratingTone = reviewRatingTone(review.rating);
                      return (
                        <tr key={review.id} className="border-b last:border-0">
                          <td className="min-w-0 overflow-hidden py-3 align-middle">
                            {/* Title → public book; secondary → admin review detail */}
                            <AdminBookIdentityCell
                              bookId={review.bookId}
                              title={review.bookTitle}
                              author={review.bookAuthor}
                              coverUrl={review.bookCoverUrl}
                              coverColor={review.bookCoverColor}
                              genre={review.bookGenre}
                              rating={review.bookRating}
                            />
                            <Link
                              prefetch={false}
                              href={`/admin/book-reviews/${review.id}`}
                              className={cn(
                                "mt-1 block truncate text-xs",
                                SKY_LINK_LIGHT,
                              )}
                            >
                              View review detail
                            </Link>
                          </td>
                          <td className="whitespace-nowrap py-3 align-middle">
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 text-sm font-normal tabular-nums",
                                ratingTone,
                              )}
                            >
                              <Star
                                className={cn(
                                  "size-3.5 fill-current",
                                  ratingTone,
                                )}
                                aria-hidden
                              />
                              {review.rating}/5
                            </span>
                          </td>
                          <td className="min-w-0 overflow-hidden py-3 align-middle">
                            {(() => {
                              const status = review.status as
                                | "PENDING"
                                | "APPROVED"
                                | "REJECTED";
                              const decided =
                                status === "APPROVED" || status === "REJECTED";
                              // Privilege / Book Reviews DNA: badge+Submitted or DecisionActorStack
                              if (!decided) {
                                return (
                                  <div className="flex min-w-0 flex-col gap-1 leading-none">
                                    <span className="inline-flex self-start">
                                      <ReviewStatusBadge status={status} />
                                    </span>
                                    <TicketDateMeta
                                      createdAt={review.createdAt}
                                      createdLabel="Submitted"
                                      hideUpdated
                                    />
                                  </div>
                                );
                              }
                              return (
                                <DecisionActorStack
                                  status={status}
                                  badge={<ReviewStatusBadge status={status} />}
                                  actor={review.reviewer}
                                  actorHref={
                                    review.reviewer?.id
                                      ? `/admin/users/${review.reviewer.id}`
                                      : null
                                  }
                                  decidedAt={review.reviewedAt}
                                  showActor={Boolean(review.reviewer)}
                                />
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSurfacePanel>

          <AdminUserActivityPanel
            userId={initialUser.id}
            initialActivity={toActivityItems(data.activityHistory)}
          />
        </div>

        {/* E: Support Tickets full width */}
        <AdminSurfacePanel>
          <TicketSectionHeader
            variant="light"
            icon={<LifeBuoy className="size-5" aria-hidden />}
            title={`Support Tickets (${data.ticketHistory.length})`}
            subtitle="Tickets opened by this user"
          />
          {data.ticketHistory.length === 0 ? (
            <AdminDetailEmptyState message="No support tickets from this user yet." />
          ) : (
            <div className={USER_360_TABLE_SCROLL}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className={USER_360_TH}>Subject</th>
                    <th className={USER_360_TH}>Status</th>
                    <th className={USER_360_TH}>Priority</th>
                    <th className={USER_360_TH}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ticketHistory.map((ticket) => (
                    <tr key={ticket.id} className="border-b last:border-0">
                      <td className="py-3">
                        <Link
                          prefetch={false}
                          href={`/admin/support-tickets/${ticket.id}`}
                          className={cn(TABLE_CELL_TITLE, SKY_LINK_LIGHT)}
                        >
                          {ticket.subject}
                        </Link>
                      </td>
                      <td>
                        <TicketStatusBadge
                          status={ticket.status as TicketStatus}
                        />
                      </td>
                      <td>
                        <TicketPriorityBadge
                          priority={ticket.priority as TicketPriority}
                        />
                      </td>
                      <td className="whitespace-nowrap text-gray-600">
                        {formatMediumDate(ticket.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfacePanel>

        {data.pagination.total > data.pagination.size ? (
          <nav
            aria-label="Borrowing history pages"
            className="flex items-center justify-end gap-3"
          >
            <Link
              prefetch={false}
              aria-disabled={data.pagination.page <= 1}
              className={
                data.pagination.page <= 1
                  ? "pointer-events-none text-gray-400"
                  : cn(SKY_LINK_LIGHT)
              }
              href={`${paginationBasePath}?page=${Math.max(1, data.pagination.page - 1)}&size=${data.pagination.size}`}
            >
              Previous
            </Link>
            <span className="text-sm text-gray-500">
              Page {data.pagination.page} of{" "}
              {Math.ceil(data.pagination.total / data.pagination.size)}
            </span>
            <Link
              prefetch={false}
              aria-disabled={
                data.pagination.page * data.pagination.size >=
                data.pagination.total
              }
              className={
                data.pagination.page * data.pagination.size >=
                data.pagination.total
                  ? "pointer-events-none text-gray-400"
                  : cn(SKY_LINK_LIGHT)
              }
              href={`${paginationBasePath}?page=${data.pagination.page + 1}&size=${data.pagination.size}`}
            >
              Next
            </Link>
          </nav>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
