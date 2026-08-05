/**
 * Table cell wrapper around `formatMediumDate` — keeps list date typography
 * consistent across ticket/review admin tables.
 * Parent: CR-0003 / REQ-0034 cosmetic DRY
 */
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

export function MediumDateCell({
  value,
  className,
}: {
  value: string | Date | null | undefined;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap text-sm text-gray-500", className)}>
      {formatMediumDate(value)}
    </span>
  );
}
