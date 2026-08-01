// Parent: REQ-0028, REQ-0029, REQ-0031

import Link from "next/link";
import { notFound } from "next/navigation";
import { parseEntityId, parseProfilePagination } from "@/lib/actionInputs";
import { getAdminUserProfile } from "@/lib/admin/userProfile";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";

export const runtime = "nodejs";

async function AdminUserDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
  const data = await getAdminUserProfile(
    userId,
    pagination.page,
    pagination.size,
  );
  if (!data.user) notFound();

  const stats = [
    ["Current", data.metrics.current],
    ["Pending", data.metrics.pending],
    ["Returned", data.metrics.returned],
    ["Overdue", data.metrics.overdue],
    [
      "Outstanding fine",
      `$${Number(data.metrics.outstanding_fine ?? 0).toFixed(2)}`,
    ],
    ["On-time returns", `${data.metrics.on_time_rate}%`],
    ["Average loan", `${data.metrics.average_loan_days} days`],
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/users"
            className="text-sm text-blue-600 hover:underline"
          >
            ← All users
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-dark-400">
            {data.user.fullName}
          </h1>
          <p className="text-sm text-gray-500">
            {data.user.email} · University ID {data.user.universityId}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge>{data.user.role}</Badge>
          <Badge variant="outline">{data.user.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {stats.map(([label, value]) => (
          <div key={String(label)} className="stat">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Borrowing history</h2>
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
                        className="font-medium hover:underline"
                      >
                        {record.bookTitle}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {record.bookAuthor}
                      </p>
                    </td>
                    <td>
                      <Badge variant="outline">{record.status}</Badge>
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
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-4">
            <h2 className="font-semibold">Explainable insights</h2>
            <p className="mt-2 text-sm text-gray-600">
              Top genres:{" "}
              {data.topGenres
                .map((item) => `${item.genre} (${item.count})`)
                .join(", ") || "No completed loans"}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Library demand/copy {data.libraryInsights.demandToCopyRatio} ·
              hold pressure {data.libraryInsights.holdPressure} · renewal rate{" "}
              {data.libraryInsights.renewalRate}%
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Formula {data.libraryInsights.formulaVersion},{" "}
              {data.libraryInsights.periodStart} to{" "}
              {data.libraryInsights.periodEnd}. Deterministic aggregates only;
              no personal data is sent to an external AI provider.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <h2 className="font-semibold">Reservations</h2>
            {data.reservationHistory.map((item) => (
              <p key={item.id} className="mt-2 text-sm">
                {item.bookTitle} · {item.status}
              </p>
            ))}
            {data.reservationHistory.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No reservations</p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-white p-4">
            <h2 className="font-semibold">Reviews and access requests</h2>
            <p className="mt-2 text-sm text-gray-600">
              {data.reviewHistory.length} recent reviews ·{" "}
              {data.requestHistory.length} access requests
            </p>
          </div>
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
                : "text-blue-600 hover:underline"
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
                : "text-blue-600 hover:underline"
            }
            href={`?page=${data.pagination.page + 1}&size=${data.pagination.size}`}
          >
            Next
          </Link>
        </nav>
      ) : null}
    </section>
  );
}

export default function AdminUserDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <section
          className="min-h-[32rem] space-y-6 rounded-2xl bg-white p-4 sm:p-6"
          aria-label="Loading user profile"
        >
          <Link
            href="/admin/users"
            className="text-sm text-blue-600 hover:underline"
          >
            ← All users
          </Link>
          <h1 className="text-2xl font-semibold text-dark-400">User profile</h1>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </section>
      }
    >
      <AdminUserDetail {...props} />
    </Suspense>
  );
}
