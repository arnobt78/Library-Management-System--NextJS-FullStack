/**
 * Single source of truth for Support Ticket status/priority labels + iconized
 * FilterSelect / MultiSelectFilter option builders (dark catalog vs light admin).
 * Parent: CR-0003 / REQ-0034 — glass UI polish
 */
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  CircleDot,
  Clock,
  List,
  Minus,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { FilterSelectOption } from "@/components/ui/filter-select";
import type { FilterSurface } from "@/lib/ui/filterOptionStyles";
import type { TicketPriority, TicketStatus } from "@/lib/validations/supportTicket";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TICKET_STATUS_OPTIONS: { value: TicketStatus; label: string }[] = (
  Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]
).map((value) => ({ value, label: TICKET_STATUS_LABELS[value] }));

export const TICKET_PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = (
  Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]
).map((value) => ({ value, label: TICKET_PRIORITY_LABELS[value] }));

function mutedIcon(surface: FilterSurface): string {
  return surface === "dark" ? "text-light-200/70" : "text-slate-500";
}

function mutedLabel(surface: FilterSurface): string | undefined {
  return surface === "dark" ? undefined : "text-slate-500";
}

// Clock for In Progress (not spinning Loader2) — keeps filters/badges inline
const STATUS_ICONS: Record<TicketStatus, LucideIcon> = {
  OPEN: CircleDot,
  IN_PROGRESS: Clock,
  RESOLVED: CheckCircle2,
  CLOSED: XCircle,
};

const STATUS_ICON_CLASS: Record<TicketStatus, string> = {
  OPEN: "text-blue-500",
  IN_PROGRESS: "text-amber-500",
  RESOLVED: "text-emerald-500",
  CLOSED: "text-slate-500",
};

const PRIORITY_ICONS: Record<TicketPriority, LucideIcon> = {
  LOW: Minus,
  MEDIUM: ArrowUp,
  HIGH: AlertTriangle,
  URGENT: ShieldAlert,
};

const PRIORITY_ICON_CLASS: Record<TicketPriority, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-rose-500",
};

/** User FilterSelect (includes "all") — Lucide icons like all-books Genre/Availability. */
export function ticketStatusFilterOptions(
  surface: FilterSurface = "dark",
): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: "All Statuses",
      icon: List,
      iconClassName: mutedIcon(surface),
      itemClassName: mutedLabel(surface),
    },
    ...(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((value) => ({
      value,
      label: TICKET_STATUS_LABELS[value],
      icon: STATUS_ICONS[value],
      iconClassName: STATUS_ICON_CLASS[value],
      itemClassName: surface === "dark" ? undefined : STATUS_ICON_CLASS[value],
    })),
  ];
}

/** User FilterSelect priority (includes "all") — Lucide icons. */
export function ticketPriorityFilterOptions(
  surface: FilterSurface = "dark",
): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: "All Priorities",
      icon: List,
      iconClassName: mutedIcon(surface),
      itemClassName: mutedLabel(surface),
    },
    ...(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((value) => ({
      value,
      label: TICKET_PRIORITY_LABELS[value],
      icon: PRIORITY_ICONS[value],
      iconClassName: PRIORITY_ICON_CLASS[value],
      itemClassName: surface === "dark" ? undefined : PRIORITY_ICON_CLASS[value],
    })),
  ];
}

/** Admin MultiSelectFilter status options (no "all" sentinel). */
export function ticketStatusMultiOptions(surface: FilterSurface = "light"): {
  value: TicketStatus;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
}[] {
  void surface; // reserved for future dark multi-select; admin is light today
  return (Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((value) => ({
    value,
    label: TICKET_STATUS_LABELS[value],
    icon: STATUS_ICONS[value],
    iconClassName: STATUS_ICON_CLASS[value],
  }));
}

/** Admin MultiSelectFilter priority options. */
export function ticketPriorityMultiOptions(surface: FilterSurface = "light"): {
  value: TicketPriority;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
}[] {
  void surface; // reserved for future dark multi-select; admin is light today
  return (Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((value) => ({
    value,
    label: TICKET_PRIORITY_LABELS[value],
    icon: PRIORITY_ICONS[value],
    iconClassName: PRIORITY_ICON_CLASS[value],
  }));
}
