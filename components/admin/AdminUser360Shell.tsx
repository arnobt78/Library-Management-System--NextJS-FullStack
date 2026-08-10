/**
 * Shared Admin User 360 body — borrows/reviews/tickets + registration panel + privilege.
 * Used by /admin/users/[id], /admin/account-requests/[userId], and
 * /admin/admin-requests/[id] (entry=directory | registration | privilege).
 */

import Link from "next/link";
import AdminUserDetailHeaderClient from "@/components/admin/AdminUserDetailHeaderClient";
import AdminUserRegistrationPanel, {
  type AdminUser360Entry,
} from "@/components/admin/AdminUserRegistrationPanel";
import AdminUserPrivilegePanel from "@/components/admin/AdminUserPrivilegePanel";
import AdminUserReservationsPanel from "@/components/admin/AdminUserReservationsPanel";
import AdminUserActivityPanel from "@/components/admin/AdminUserActivityPanel";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import {
  BorrowStatusBadge,
  ReviewStatusBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/lib/ui/semanticBadges";
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import type { TicketPriority, TicketStatus } from "@/lib/validations/supportTicket";
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
    readyExpiresAt: item.readyExpiresAt
      ? String(item.readyExpiresAt)
      : null,
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
  const stats = [
    [
      "Outstanding fine",
      `$${outstandingFine.toFixed(2)}`,
      outstandingFine > 0 ? "text-rose-700" : undefined,
    ],
    ["Current", data.metrics.current],
    ["Pending", data.metrics.pending],
    ["Returned", data.metrics.returned],
    ["Overdue", data.metrics.overdue],
    ["On-time returns", `${data.metrics.on_time_rate}%`],
    ["Average loan", `${data.metrics.average_loan_days} days`],
  ] as const;

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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {stats.map(([label, value, valueClass]) => (
            <div
              key={String(label)}
              className={cn(
                "stat",
                label === "Outstanding fine" && "md:col-span-2 xl:col-span-1",
              )}
            >
              <p className="text-xs text-gray-500">{label}</p>
              <p
                className={cn(
                  "mt-1 font-medium",
                  label === "Outstanding fine" ? "text-2xl" : "text-xl",
                  valueClass,
                )}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      }
    >
      <div className="space-y-6">
        <AdminUserRegistrationPanel
          initialDetail={initialSignupDetail}
          initialUser={initialUser}
          entry={entry}
        />

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <AdminSurfacePanel>
              <h2 className="text-lg font-medium">Borrowing history</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Book</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th>Fine</th>
                      <th>Renewals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((record) => (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="py-3">
                          <Link
                            prefetch={false}
                            href={`/books/${record.bookId}`}
                            className={cn(TABLE_CELL_TITLE, SKY_LINK_LIGHT)}
                          >
                            {record.bookTitle}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {record.bookAuthor}
                          </p>
                        </td>
                        <td>
                          <BorrowStatusBadge status={record.status} />
                        </td>
                        <td>{record.dueDate ?? "—"}</td>
                        <td>${Number(record.fineAmount ?? 0).toFixed(2)}</td>
                        <td>{record.renewalCount}</td>
                      </tr>
                    ))}
                    {data.history.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-gray-500"
                        >
                          No borrowing history
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </AdminSurfacePanel>

            <AdminSurfacePanel>
              <h2 className="text-lg font-medium">Reviews</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Book</th>
                      <th>Rating</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reviewHistory.map((review) => (
                      <tr key={review.id} className="border-b last:border-0">
                        <td className="py-3">
                          <Link
                            prefetch={false}
                            href={`/admin/book-reviews/${review.id}`}
                            className={cn(TABLE_CELL_TITLE, SKY_LINK_LIGHT)}
                          >
                            {review.bookTitle}
                          </Link>
                          <Link
                            prefetch={false}
                            href={`/books/${review.bookId}`}
                            className="mt-0.5 block text-xs text-gray-500 hover:text-sky-700"
                          >
                            Public book page
                          </Link>
                        </td>
                        <td>{review.rating}/5</td>
                        <td>
                          <ReviewStatusBadge
                            status={
                              review.status as
                                | "PENDING"
                                | "APPROVED"
                                | "REJECTED"
                            }
                          />
                        </td>
                        <td className="whitespace-nowrap text-gray-600">
                          {formatMediumDate(review.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {data.reviewHistory.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-gray-500"
                        >
                          No reviews
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </AdminSurfacePanel>

            <AdminSurfacePanel>
              <h2 className="text-lg font-medium">Support tickets</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Subject</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Created</th>
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
                    {data.ticketHistory.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-gray-500"
                        >
                          No support tickets
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </AdminSurfacePanel>
          </div>

          <div className="space-y-6">
            <AdminUserPrivilegePanel
              userId={initialUser.id}
              initialHistory={data.requestHistory}
            />

            <AdminUserReservationsPanel
              userId={initialUser.id}
              initialReservations={toReservationItems(data.reservationHistory)}
            />

            <AdminUserActivityPanel
              userId={initialUser.id}
              initialActivity={toActivityItems(data.activityHistory)}
            />

            {/*
              Explainable insights: library-wide formula + SSR top genres.
              Not invent-densified (aggregates need refetch); remount / analytics
              invalidate on borrow domains refreshes this block.
            */}
            <AdminSurfacePanel className="text-sm text-gray-600">
              <h2 className="font-medium text-gray-900">Explainable insights</h2>
              <p className="mt-2">
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
            </AdminSurfacePanel>
          </div>
        </div>

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
