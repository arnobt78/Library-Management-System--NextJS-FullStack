/**
 * semanticBadges — dynamic, color-coded status/priority/action badges shared
 * across Support Tickets, Book Reviews, and Activity History admin UIs.
 * Composes the existing components/ui/badge.tsx primitive (no new deps).
 * Parent: CR-0003 / REQ-0034
 */
import {
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  CircleDot,
  Clock,
  FilePlus,
  FilePen,
  Trash2,
  Minus,
  Shield,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/ui/ticketOptions";
import { REVIEW_STATUS_LABELS } from "@/lib/ui/reviewOptions";
import type { TicketPriority, TicketStatus } from "@/lib/validations/supportTicket";
import {
  ADMIN_PRIVILEGE_STATUS_LABELS,
  type AdminPrivilegeStatus,
} from "@/lib/admin/adminPrivilegeStatus";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";
type BadgeSurface = "light" | "dark";

// shrink-0 + nowrap — "In Progress" stays one line; columns don't reflow/shift
const badgeBase =
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium leading-none";

const TICKET_STATUS_LIGHT: Record<TicketStatus, string> = {
  OPEN: "border-blue-200 bg-blue-50/90 text-blue-700 shadow-sm backdrop-blur-sm",
  IN_PROGRESS:
    "border-amber-200 bg-amber-50/90 text-amber-700 shadow-sm backdrop-blur-sm",
  RESOLVED:
    "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-sm backdrop-blur-sm",
  CLOSED:
    "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm",
};

const TICKET_STATUS_DARK: Record<TicketStatus, string> = {
  OPEN: "border-blue-400/30 bg-blue-500/15 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
  IN_PROGRESS:
    "border-amber-400/30 bg-amber-500/15 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  RESOLVED:
    "border-emerald-400/30 bg-emerald-500/15 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
  CLOSED: "border-white/15 bg-white/5 text-light-200",
};

// Clock (not spinning Loader2) — keeps Status cells compact/inline in tables
const TICKET_STATUS_ICONS: Record<TicketStatus, typeof CircleDot> = {
  OPEN: CircleDot,
  IN_PROGRESS: Clock,
  RESOLVED: CheckCircle2,
  CLOSED: XCircle,
};

// LOW uses the same translucent glass family as status/priority peers (not flat gray-100)
const TICKET_PRIORITY_LIGHT: Record<TicketPriority, string> = {
  LOW: "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm",
  MEDIUM: "border-blue-200 bg-blue-50/90 text-blue-700 shadow-sm backdrop-blur-sm",
  HIGH: "border-orange-200 bg-orange-50/90 text-orange-700 shadow-sm backdrop-blur-sm",
  URGENT: "border-rose-200 bg-rose-50/90 text-rose-700 shadow-sm backdrop-blur-sm",
};

const TICKET_PRIORITY_DARK: Record<TicketPriority, string> = {
  LOW: "border-slate-400/30 bg-slate-500/15 text-slate-100 shadow-[0_0_12px_rgba(148,163,184,0.15)]",
  MEDIUM:
    "border-blue-400/30 bg-blue-500/15 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
  HIGH: "border-orange-400/30 bg-orange-500/15 text-orange-100 shadow-[0_0_12px_rgba(249,115,22,0.15)]",
  URGENT:
    "border-rose-400/30 bg-rose-500/15 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
};

const TICKET_PRIORITY_ICONS: Record<TicketPriority, typeof Minus> = {
  LOW: Minus,
  MEDIUM: ArrowUp,
  HIGH: AlertTriangle,
  URGENT: ShieldAlert,
};

export function TicketStatusBadge({
  status,
  className,
  variant = "light",
}: {
  status: TicketStatus;
  className?: string;
  variant?: BadgeSurface;
}) {
  const Icon = TICKET_STATUS_ICONS[status];
  const tone =
    variant === "dark" ? TICKET_STATUS_DARK[status] : TICKET_STATUS_LIGHT[status];
  const label = TICKET_STATUS_LABELS[status];
  return (
    <Badge className={cn(badgeBase, tone, className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

export function TicketPriorityBadge({
  priority,
  className,
  variant = "light",
}: {
  priority: TicketPriority;
  className?: string;
  variant?: BadgeSurface;
}) {
  const Icon = TICKET_PRIORITY_ICONS[priority];
  const tone =
    variant === "dark"
      ? TICKET_PRIORITY_DARK[priority]
      : TICKET_PRIORITY_LIGHT[priority];
  const label = TICKET_PRIORITY_LABELS[priority];
  return (
    <Badge className={cn(badgeBase, tone, className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

export function ReviewStatusBadge({
  status,
  className,
  variant = "light",
}: {
  status: ReviewStatusValue;
  className?: string;
  /** light = admin tables; dark = glass profile / book-detail surfaces */
  variant?: BadgeSurface;
}) {
  const config: Record<
    ReviewStatusValue,
    { icon: typeof Clock; light: string; dark: string }
  > = {
    PENDING: {
      icon: Clock,
      light: "border-amber-200 bg-amber-50/90 text-amber-700 shadow-sm backdrop-blur-sm",
      dark: "border-amber-400/30 bg-amber-500/15 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    },
    APPROVED: {
      icon: CheckCircle2,
      light:
        "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-sm backdrop-blur-sm",
      dark: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    },
    REJECTED: {
      icon: XCircle,
      light: "border-rose-200 bg-rose-50/90 text-rose-700 shadow-sm backdrop-blur-sm",
      dark: "border-rose-400/30 bg-rose-500/15 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    },
  };
  const { icon: Icon, light, dark } = config[status];
  const label = REVIEW_STATUS_LABELS[status];
  return (
    <Badge className={cn(badgeBase, variant === "dark" ? dark : light, className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

type BorrowStatusValue = "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED";
type AccountStatusValue = "PENDING" | "APPROVED" | "REJECTED";

const BORROW_STATUS_LABELS: Record<BorrowStatusValue, string> = {
  PENDING: "Pending",
  BORROWED: "Borrowed",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const ACCOUNT_STATUS_LABELS: Record<AccountStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function BorrowStatusBadge({
  status,
  className,
  variant = "light",
}: {
  status: BorrowStatusValue | string;
  className?: string;
  variant?: BadgeSurface;
}) {
  const normalized = (
    ["PENDING", "BORROWED", "RETURNED", "CANCELLED"].includes(status)
      ? status
      : "PENDING"
  ) as BorrowStatusValue;
  const config: Record<
    BorrowStatusValue,
    { icon: typeof Clock; light: string; dark: string }
  > = {
    PENDING: {
      icon: Clock,
      light:
        "border-amber-200 bg-amber-50/90 text-amber-700 shadow-sm backdrop-blur-sm",
      dark: "border-amber-400/30 bg-amber-500/15 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    },
    BORROWED: {
      icon: CircleDot,
      light:
        "border-blue-200 bg-blue-50/90 text-blue-700 shadow-sm backdrop-blur-sm",
      dark: "border-blue-400/30 bg-blue-500/15 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
    },
    RETURNED: {
      icon: CheckCircle2,
      light:
        "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-sm backdrop-blur-sm",
      dark: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    },
    CANCELLED: {
      icon: XCircle,
      light:
        "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm",
      dark: "border-white/15 bg-white/5 text-light-200",
    },
  };
  const { icon: Icon, light, dark } = config[normalized];
  return (
    <Badge className={cn(badgeBase, variant === "dark" ? dark : light, className)}>
      <Icon className="size-3" aria-hidden />
      {BORROW_STATUS_LABELS[normalized]}
    </Badge>
  );
}

/** Reservation queue status — light glass for User 360 / admin tables. */
type ReservationStatusValue =
  | "WAITING"
  | "READY"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

const RESERVATION_STATUS_LABELS: Record<ReservationStatusValue, string> = {
  WAITING: "Waiting",
  READY: "Ready",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const RESERVATION_STATUS_VALUES: ReservationStatusValue[] = [
  "WAITING",
  "READY",
  "FULFILLED",
  "CANCELLED",
  "EXPIRED",
];

export function ReservationStatusBadge({
  status,
  className,
  variant = "light",
}: {
  status: ReservationStatusValue | string;
  className?: string;
  variant?: BadgeSurface;
}) {
  const normalized = (
    RESERVATION_STATUS_VALUES.includes(status as ReservationStatusValue)
      ? status
      : "WAITING"
  ) as ReservationStatusValue;
  const config: Record<
    ReservationStatusValue,
    { icon: typeof Clock; light: string; dark: string }
  > = {
    WAITING: {
      icon: Clock,
      light:
        "border-amber-200 bg-amber-50/90 text-amber-700 shadow-sm backdrop-blur-sm",
      dark: "border-amber-400/30 bg-amber-500/15 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    },
    READY: {
      icon: CircleDot,
      light:
        "border-blue-200 bg-blue-50/90 text-blue-700 shadow-sm backdrop-blur-sm",
      dark: "border-blue-400/30 bg-blue-500/15 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
    },
    FULFILLED: {
      icon: CheckCircle2,
      light:
        "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-sm backdrop-blur-sm",
      dark: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    },
    CANCELLED: {
      icon: XCircle,
      light:
        "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm",
      dark: "border-white/15 bg-white/5 text-light-200",
    },
    EXPIRED: {
      icon: XCircle,
      light:
        "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm",
      dark: "border-white/15 bg-white/5 text-light-200",
    },
  };
  const { icon: Icon, light, dark } = config[normalized];
  return (
    <Badge className={cn(badgeBase, variant === "dark" ? dark : light, className)}>
      <Icon className="size-3" aria-hidden />
      {RESERVATION_STATUS_LABELS[normalized]}
    </Badge>
  );
}

type UserRoleValue = "ADMIN" | "USER";

const USER_ROLE_LABELS: Record<UserRoleValue, string> = {
  ADMIN: "Admin",
  USER: "User",
};

/** Glass role pill — replaces ad-hoc purple/blue spans on User Management. */
export function UserRoleBadge({
  role,
  className,
  variant = "light",
}: {
  role: UserRoleValue | string | null | undefined;
  className?: string;
  variant?: BadgeSurface;
}) {
  const normalized = (role === "ADMIN" ? "ADMIN" : "USER") as UserRoleValue;
  const config: Record<
    UserRoleValue,
    { icon: typeof Shield; light: string; dark: string }
  > = {
    ADMIN: {
      icon: Shield,
      light:
        "border-violet-200 bg-violet-50/90 text-violet-700 shadow-sm backdrop-blur-sm",
      dark: "border-violet-400/30 bg-violet-500/15 text-violet-100 shadow-[0_0_12px_rgba(139,92,246,0.15)]",
    },
    USER: {
      icon: UserRound,
      light:
        "border-blue-200 bg-blue-50/90 text-blue-700 shadow-sm backdrop-blur-sm",
      dark: "border-blue-400/30 bg-blue-500/15 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
    },
  };
  const { icon: Icon, light, dark } = config[normalized];
  return (
    <Badge className={cn(badgeBase, variant === "dark" ? dark : light, className)}>
      <Icon className="size-3" aria-hidden />
      {USER_ROLE_LABELS[normalized]}
    </Badge>
  );
}

export function AccountStatusBadge({
  status,
  className,
  variant = "light",
}: {
  status: AccountStatusValue | string;
  className?: string;
  variant?: BadgeSurface;
}) {
  const normalized = (
    ["PENDING", "APPROVED", "REJECTED"].includes(status) ? status : "PENDING"
  ) as AccountStatusValue;
  const config: Record<
    AccountStatusValue,
    { icon: typeof Clock; light: string; dark: string }
  > = {
    PENDING: {
      icon: Clock,
      light:
        "border-amber-200 bg-amber-50/90 text-amber-700 shadow-sm backdrop-blur-sm",
      dark: "border-amber-400/30 bg-amber-500/15 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    },
    APPROVED: {
      icon: CheckCircle2,
      light:
        "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-sm backdrop-blur-sm",
      dark: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    },
    REJECTED: {
      icon: XCircle,
      light: "border-rose-200 bg-rose-50/90 text-rose-700 shadow-sm backdrop-blur-sm",
      dark: "border-rose-400/30 bg-rose-500/15 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    },
  };
  const { icon: Icon, light, dark } = config[normalized];
  return (
    <Badge className={cn(badgeBase, variant === "dark" ? dark : light, className)}>
      <Icon className="size-3" aria-hidden />
      {ACCOUNT_STATUS_LABELS[normalized]}
    </Badge>
  );
}

/** Make-admin privilege signal — not registration AccountStatusBadge. */
export function AdminPrivilegeBadge({
  status,
  className,
  variant = "light",
}: {
  status: AdminPrivilegeStatus;
  className?: string;
  variant?: BadgeSurface;
}) {
  const config: Record<
    AdminPrivilegeStatus,
    { icon: typeof Clock; light: string; dark: string }
  > = {
    NOT_REQUESTED: {
      icon: Minus,
      light:
        "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm",
      dark: "border-slate-400/30 bg-slate-500/15 text-slate-100 shadow-[0_0_12px_rgba(148,163,184,0.15)]",
    },
    PENDING: {
      icon: Clock,
      light:
        "border-amber-200 bg-amber-50/90 text-amber-700 shadow-sm backdrop-blur-sm",
      dark: "border-amber-400/30 bg-amber-500/15 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    },
    APPROVED: {
      icon: Shield,
      light:
        "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-sm backdrop-blur-sm",
      dark: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    },
    REJECTED: {
      icon: ShieldAlert,
      light: "border-rose-200 bg-rose-50/90 text-rose-700 shadow-sm backdrop-blur-sm",
      dark: "border-rose-400/30 bg-rose-500/15 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    },
  };
  const { icon: Icon, light, dark } = config[status];
  return (
    <Badge className={cn(badgeBase, variant === "dark" ? dark : light, className)}>
      <Icon className="size-3" aria-hidden />
      {ADMIN_PRIVILEGE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function AuditActionBadge({
  action,
  className,
}: {
  action: AuditAction;
  className?: string;
}) {
  const config: Record<
    AuditAction,
    { label: string; icon: typeof FilePlus; tone: string }
  > = {
    CREATE: {
      label: "Created",
      icon: FilePlus,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    UPDATE: {
      label: "Updated",
      icon: FilePen,
      tone: "border-blue-200 bg-blue-50 text-blue-700",
    },
    DELETE: {
      label: "Deleted",
      icon: Trash2,
      tone: "border-rose-200 bg-rose-50 text-rose-700",
    },
  };
  const { label, icon: Icon, tone } = config[action];
  return (
    <Badge className={cn(badgeBase, tone, className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}
