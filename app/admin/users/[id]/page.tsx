// Parent: REQ-0028, REQ-0029, REQ-0031
// Wave B: AdminSurfacePanel + semantic status badges (REQ-0033)
// Make-admin queue lives at /admin/admin-requests (separate IA).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { parseEntityId, parseProfilePagination } from "@/lib/actionInputs";
import { getAdminUserProfile } from "@/lib/admin/userProfile";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import AdminUserDetailHeaderClient from "@/components/admin/AdminUserDetailHeaderClient";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import {
  AuditActionBadge,
  BorrowStatusBadge,
  ReviewStatusBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/lib/ui/semanticBadges";
import { Suspense } from "react";
import { formatBorrowDateTime } from "@/lib/profile/formatBorrowDates";
import { formatMediumDate, formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { TABLE_CELL_TITLE } from "@/lib/ui/tableCellStyles";
import {
  activityEntityHref,
  formatActivityEntityLabel,
  isActivityEntityLinkable,
} from "@/lib/ui/activityLogDisplay";
import type { TicketPriority, TicketStatus } from "@/lib/validations/supportTicket";
import type { User } from "@/lib/services/users";
import { cn } from "@/lib/utils";

export const runtime = "nodejs";

const REASON_SNIPPET_MAX = 80;

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function adminRequestStatusClass(status: string): string {
  if (status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50/90 text-emerald-700";
  }
  if (status === "REJECTED") {
    return "border-rose-200 bg-rose-50/90 text-rose-700";
  }
  return "border-amber-200 bg-amber-50/90 text-amber-700";
}

async function AdminUserDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  let userId: string;
  let pagination: { page: number; size: number };
  try {
    if (
      Object.keys(query).some((key) => key !== "page" && key !== "size") ||
      Array.isArray(query.page) ||
      Array.isArray(query.size)
    ) {
      notFound();
    }
    userId = parseEntityId(id);
    pagination = parseProfilePagination(query.page ?? 1, query.size ?? 25);
  } catch {
    notFound();
  }
  const [data, adminRow] = await Promise.all([
    getAdminUserProfile(userId, pagination.page, pagination.size),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityCard: users.universityCard,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);
  if (!data.user) notFound();

  const currentAdmin = adminRow
    ? {
        id: adminRow.id,
        fullName: adminRow.fullName,
        email: adminRow.email,
        universityCard: adminRow.universityCard ?? null,
      }
    : null;

  // Seed users.detail with densify-compatible User shape (status/role paint).
  const initialUser: User = {
    id: data.user.id,
    fullName: data.user.fullName,
    email: data.user.email,
    universityId: data.user.universityId,
    universityCard: data.user.universityCard ?? "",
    status: data.user.status,
    role: data.user.role,
    lastActivityDate: data.user.lastActivityDate
      ? String(data.user.lastActivityDate)
      : null,
    lastLogin: data.user.lastLogin,
    createdAt: data.user.createdAt,
  };

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
          initialUser={JSON.parse(JSON.stringify(initialUser))}
          currentUserId={session.user.id}
          currentAdmin={currentAdmin}
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
                      <td colSpan={5} className="py-8 text-center text-gray-500">
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
                          status={review.status as ReviewStatusValue}
                        />
                      </td>
                      <td className="whitespace-nowrap text-gray-600">
                        {formatMediumDate(review.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {data.reviewHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
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
                      <td colSpan={4} className="py-8 text-center text-gray-500">
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
          <AdminSurfacePanel>
            <h2 className="font-medium">Registration decision</h2>
            {(data.user.status === "APPROVED" ||
              data.user.status === "REJECTED") &&
            data.user.statusReviewedAt ? (
              <div className="mt-2 space-y-2 text-sm text-gray-600">
                <p>
                  {data.user.status === "APPROVED" ? "Approved" : "Rejected"} on{" "}
                  {formatBorrowDateTime(data.user.statusReviewedAt) ?? "—"}
                </p>
                <AdminRequestReviewerAttribution
                  reviewer={data.user.signupDecisionActor}
                  prefix={
                    data.user.status === "APPROVED"
                      ? "Approved by"
                      : "Rejected by"
                  }
                  size={28}
                  className="text-gray-600"
                  textClassName="text-gray-900"
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                No registration decision recorded yet
              </p>
            )}
          </AdminSurfacePanel>

          <AdminSurfacePanel>
            <h2 className="font-medium">Privilege / access requests</h2>
            <p className="mt-1 text-xs text-gray-500">
              Make-admin queue detail at{" "}
              <Link href="/admin/admin-requests" className={SKY_LINK_LIGHT}>
                /admin/admin-requests
              </Link>
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">Status</th>
                    <th>Reason</th>
                    <th>Reviewer</th>
                    <th>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requestHistory.map((req) => (
                    <tr key={req.id} className="border-b last:border-0">
                      <td className="py-3">
                        <Link
                          prefetch={false}
                          href={`/admin/admin-requests/${req.id}`}
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                            adminRequestStatusClass(req.status),
                            SKY_LINK_LIGHT,
                          )}
                        >
                          {req.status}
                        </Link>
                      </td>
                      <td className="max-w-40 text-xs text-gray-600">
                        {truncateText(
                          req.rejectionReason || req.requestReason || "—",
                          REASON_SNIPPET_MAX,
                        )}
                      </td>
                      <td>
                        {(req.status === "APPROVED" ||
                          req.status === "REJECTED") && (
                          <AdminRequestReviewerAttribution
                            reviewer={req.reviewer}
                            prefix=""
                            size={24}
                            className="text-xs text-gray-600"
                            textClassName="text-gray-900"
                          />
                        )}
                      </td>
                      <td className="whitespace-nowrap text-xs text-gray-500">
                        <div>
                          {formatMediumDateTime(req.createdAt)}
                        </div>
                        {req.reviewedAt ? (
                          <div>{formatMediumDateTime(req.reviewedAt)}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {data.requestHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        No access requests
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </AdminSurfacePanel>

          <AdminSurfacePanel>
            <h2 className="font-medium">Reservations</h2>
            {data.reservationHistory.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No reservations</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {data.reservationHistory.map((item) => (
                  <li key={item.id}>
                    <Link
                      prefetch={false}
                      href={`/books/${item.bookId}`}
                      className={cn("font-medium", SKY_LINK_LIGHT)}
                    >
                      {item.bookTitle}
                    </Link>
                    <span className="text-gray-500"> · {item.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </AdminSurfacePanel>

          <AdminSurfacePanel>
            <h2 className="font-medium">Activity</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">When</th>
                    <th>Action</th>
                    <th>Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activityHistory.map((log) => {
                    const details =
                      log.details && typeof log.details === "object"
                        ? (log.details as Record<string, unknown>)
                        : null;
                    const linkable = isActivityEntityLinkable({
                      action: log.action,
                      entityType: log.entityType,
                      entityId: log.entityId,
                      details,
                    });
                    const href = activityEntityHref(
                      log.entityType,
                      log.entityId,
                      details,
                    );
                    const entityLabel = formatActivityEntityLabel(
                      log.entityType,
                    );

                    return (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap py-2 text-xs text-gray-600">
                          {formatMediumDateTime(log.createdAt)}
                        </td>
                        <td>
                          <AuditActionBadge
                            action={
                              log.action as "CREATE" | "UPDATE" | "DELETE"
                            }
                          />
                        </td>
                        <td className="text-xs text-gray-700">
                          {linkable && href ? (
                            <Link
                              prefetch={false}
                              href={href}
                              className={SKY_LINK_LIGHT}
                            >
                              {entityLabel}
                            </Link>
                          ) : (
                            entityLabel
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {data.activityHistory.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-gray-500">
                        No activity recorded
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </AdminSurfacePanel>

          <AdminSurfacePanel className="text-sm text-gray-600">
            <h2 className="font-medium text-gray-900">Explainable insights</h2>
            <p className="mt-2">
              Top genres:{" "}
              {data.topGenres
                .map((item) => `${item.genre} (${item.count})`)
                .join(", ") || "No completed loans"}
            </p>
            <p className="mt-2">
              Library demand/copy {data.libraryInsights.demandToCopyRatio} · hold
              pressure {data.libraryInsights.holdPressure} · renewal rate{" "}
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
            href={`?page=${Math.max(1, data.pagination.page - 1)}&size=${data.pagination.size}`}
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
            href={`?page=${data.pagination.page + 1}&size=${data.pagination.size}`}
          >
            Next
          </Link>
        </nav>
      ) : null}
    </AdminPageShell>
  );
}

export default function AdminUserDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <AdminPageShell
          header={
            <div className="space-y-2">
              <Link href="/admin/users" className={cn("text-sm", SKY_LINK_LIGHT)}>
                ← All users
              </Link>
              <h1 className="text-xl font-medium text-dark-400">User profile</h1>
            </div>
          }
          kpis={
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            </div>
          }
        >
          <div className="admin-panel min-h-64" aria-label="Loading user profile" />
        </AdminPageShell>
      }
    >
      <AdminUserDetail {...props} />
    </Suspense>
  );
}
