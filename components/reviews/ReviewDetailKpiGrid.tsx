/**
 * Admin book-review detail KPI row — Status · Rating · Genre · Approver.
 * Uses DetailKpiShell for ticket-detail chrome parity.
 * Parent: CR-0003 / review detail redesign
 */
"use client";

import type { ReactNode } from "react";
import { CircleDot, Library, ShieldCheck, Star } from "lucide-react";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import StarRow from "@/components/ui/StarRow";
import { ReviewStatusBadge } from "@/lib/ui/semanticBadges";
import { cn } from "@/lib/utils";

export function ReviewDetailKpiGrid({
  status,
  rating,
  genre,
  approverSlot,
  variant = "light",
}: {
  status: ReviewStatusValue;
  rating: number;
  genre?: string | null;
  /** PersonAttribution or “Pending moderation” placeholder */
  approverSlot: ReactNode;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <DetailKpiShell
        variant={variant}
        icon={<CircleDot className="size-4" />}
        label="Status"
        hint="Moderation decision"
      >
        <ReviewStatusBadge status={status} variant={variant} />
      </DetailKpiShell>

      <DetailKpiShell
        variant={variant}
        icon={<Star className="size-4" />}
        label="Rating"
        hint="Stars from the reviewer"
      >
        <div className="flex flex-wrap items-center gap-2">
          <StarRow
            rating={rating}
            starClassName="size-4"
            filledClassName="fill-yellow-400 text-yellow-400"
            emptyClassName={
              isDark
                ? "fill-gray-500 text-gray-500"
                : "fill-gray-300 text-gray-300"
            }
            className="shrink-0"
          />
          <span
            className={cn(
              "text-lg font-medium tabular-nums",
              isDark ? "text-light-100" : "text-dark-400",
            )}
          >
            {rating}
          </span>
        </div>
      </DetailKpiShell>

      <DetailKpiShell
        variant={variant}
        icon={<Library className="size-4" />}
        label="Genre"
        hint="Catalog category"
      >
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            isDark ? "text-light-100" : "text-violet-700",
          )}
        >
          {genre?.trim() || "—"}
        </p>
      </DetailKpiShell>

      <DetailKpiShell
        variant={variant}
        icon={<ShieldCheck className="size-4" />}
        label="Approver"
        hint={
          status === "PENDING"
            ? "Awaiting moderation"
            : status === "APPROVED"
              ? "Who approved this review"
              : "Who rejected this review"
        }
      >
        <div className="min-w-0">{approverSlot}</div>
      </DetailKpiShell>
    </div>
  );
}
