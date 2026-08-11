"use client";

/**
 * Approve/reject traced timestamp under PersonAttribution stacks.
 * Token parity with TicketDateMeta stack line (text-xs, size-3 icons, label:).
 * Emerald + ShieldCheck / rose + XCircle — no mt-0.5 (PersonAttribution leading-none).
 * nowrap — “Approved: Aug 11, 2026, 3:33 PM” stays one line in table cells.
 * "use client" — single client/SSR module (avoids Turbopack hydration class skew).
 * Parent: admin people + review tables
 */
import { ShieldCheck, XCircle } from "lucide-react";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

/** Shared base — SSR + client must emit the same class string. */
const DECISION_DATE_META_BASE =
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs leading-none";

export function DecisionDateMeta({
  status,
  at,
  className,
}: {
  status: "APPROVED" | "REJECTED" | string;
  at: string | Date | null | undefined;
  className?: string;
}) {
  if (!at) return null;
  const rejected = status === "REJECTED";
  return (
    <p
      className={cn(
        DECISION_DATE_META_BASE,
        rejected ? "text-rose-700" : "text-emerald-700",
        className,
      )}
    >
      {rejected ? (
        <XCircle className="size-3 shrink-0 opacity-80" aria-hidden />
      ) : (
        <ShieldCheck className="size-3 shrink-0 opacity-80" aria-hidden />
      )}
      <span className="opacity-70">
        {rejected ? "Rejected:" : "Approved:"}
      </span>{" "}
      {formatMediumDateTime(at)}
    </p>
  );
}
