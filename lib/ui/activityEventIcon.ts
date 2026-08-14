/**
 * Lucide icon for TicketActivityTimeline event headers.
 * Maps kind + label prefixes (borrow / ticket / review DNA).
 * Parent: borrow detail UI tweaks
 */

import {
  Ban,
  BookMarked,
  CheckCircle,
  Clock,
  History,
  MessageSquare,
  Pencil,
  PlusCircle,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Resolve a meaningful icon for an activity event label.
 * Prefer specific Status → * / create labels; fall back to kind then History.
 */
export function activityEventIcon(
  kind: TicketActivityEvent["kind"],
  label: string,
): LucideIcon {
  const lower = label.toLowerCase();

  if (lower.includes("cancelled") || lower.includes("rejected")) return Ban;
  if (lower.includes("borrowed")) return BookMarked;
  if (lower.includes("approved")) return CheckCircle;
  if (lower.includes("returned")) return Undo2;
  if (lower.includes("pending")) return Clock;
  if (
    lower.includes("created") ||
    kind === "created"
  ) {
    return PlusCircle;
  }
  if (lower.includes("deleted")) return XCircle;
  if (kind === "replied" || lower.includes("replied")) return MessageSquare;
  if (kind === "updated" || lower.includes("updated")) return Pencil;

  return History;
}
