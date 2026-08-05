/**
 * Created / Updated two-line date stack for ticket list densify (with icons).
 * Parent: CR-0003 / REQ-0034
 */
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";

export function TicketCreatedUpdatedCell({
  createdAt,
  updatedAt,
  variant = "light",
}: {
  createdAt: string | Date | null | undefined;
  updatedAt: string | Date | null | undefined;
  variant?: "light" | "dark";
}) {
  return (
    <TicketDateMeta
      layout="stack"
      variant={variant}
      createdAt={createdAt}
      updatedAt={updatedAt}
    />
  );
}
