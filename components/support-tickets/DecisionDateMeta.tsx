/**
 * Approve/reject traced timestamp under PersonAttribution stacks.
 * Token parity with TicketDateMeta stack line (text-xs, size-3 icons, label:).
 * Emerald + ShieldCheck / rose + XCircle — no mt-0.5 (PersonAttribution leading-none).
 * Parent: admin people + review tables
 */
import { ShieldCheck, XCircle } from "lucide-react";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

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
        "inline-flex items-center gap-1 text-xs leading-none",
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
