"use client";

/**
 * User 360 reservations — table-fixed Book|Status inside half-width card.
 * Stack: glass badge → medium-date Requested → Ready until (READY).
 * Bound to circulation.userReservations densify key.
 */

import { useState } from "react";
import { Bookmark, Calendar } from "lucide-react";
import { AdminBookIdentityCell } from "@/components/admin/AdminBookIdentityCell";
import {
  AdminDetailEmptyState,
  USER_360_TABLE,
  USER_360_TABLE_SCROLL,
  USER_360_TH,
} from "@/components/admin/AdminDetailEmptyState";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { useAdminUserReservations } from "@/hooks/useQueries";
import type { UserReservationItem } from "@/lib/services/reservations";
import {
  formatMediumDate,
  formatMediumDateTime,
} from "@/lib/ui/formatMediumDate";
import { ReservationStatusBadge } from "@/lib/ui/semanticBadges";
import { cn } from "@/lib/utils";

interface AdminUserReservationsPanelProps {
  userId: string;
  initialReservations: UserReservationItem[];
}

export default function AdminUserReservationsPanel({
  userId,
  initialReservations,
}: AdminUserReservationsPanelProps) {
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: reservations = initialReservations } = useAdminUserReservations(
    userId,
    initialReservations,
    ssrUpdatedAt,
  );

  return (
    <AdminSurfacePanel>
      <TicketSectionHeader
        variant="light"
        icon={<Bookmark className="size-5" aria-hidden />}
        title={`Reservations (${reservations.length})`}
        subtitle="Hold queue and ready holds for this user"
      />
      {reservations.length === 0 ? (
        <AdminDetailEmptyState message="No reservations for this user yet." />
      ) : (
        <div className={USER_360_TABLE_SCROLL}>
          {/* table-fixed: Book truncates; Status stays inside card */}
          <table className={USER_360_TABLE}>
            <thead>
              <tr className="border-b">
                <th className={cn(USER_360_TH, "w-[58%] min-w-0")}>Book</th>
                <th className={cn(USER_360_TH, "w-[42%] min-w-0")}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((item) => {
                const requested = formatMediumDate(item.createdAt);
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="min-w-0 overflow-hidden py-3 align-middle">
                      <AdminBookIdentityCell
                        bookId={item.bookId}
                        title={item.bookTitle}
                        author={item.bookAuthor}
                        coverUrl={item.coverUrl}
                        coverColor={item.coverColor}
                        genre={item.genre}
                        rating={item.bookRating}
                        showBookDetailLink
                      />
                    </td>
                    <td className="min-w-0 overflow-hidden py-3 align-middle">
                      <div className="flex flex-col gap-1 leading-none">
                        <span className="inline-flex self-start">
                          <ReservationStatusBadge status={item.status} />
                        </span>
                        {item.createdAt && requested !== "—" ? (
                          <span className="inline-flex w-max max-w-full items-center gap-1 whitespace-nowrap text-xs text-sky-700">
                            <Calendar
                              className="size-3 shrink-0 text-sky-600"
                              aria-hidden
                            />
                            <span className="font-medium">Requested:</span>
                            <span className="text-gray-700">{requested}</span>
                          </span>
                        ) : null}
                        {item.status === "READY" && item.readyExpiresAt ? (
                          <p className="whitespace-nowrap text-xs text-amber-700">
                            Ready until{" "}
                            {formatMediumDateTime(item.readyExpiresAt)}
                          </p>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminSurfacePanel>
  );
}
