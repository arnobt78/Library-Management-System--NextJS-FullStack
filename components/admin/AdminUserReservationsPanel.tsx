"use client";

/**
 * User 360 reservations list — bound to circulation.userReservations densify key.
 */

import { useState } from "react";
import Link from "next/link";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { useAdminUserReservations } from "@/hooks/useQueries";
import type { UserReservationItem } from "@/lib/services/reservations";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
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
      <h2 className="font-medium">Reservations</h2>
      {reservations.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No reservations</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {reservations.map((item) => (
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
  );
}
