/**
 * Activity History display helpers — entity linkability, tooltip copy, details text.
 * Parent: CR-0003 / REQ-0034 activity table polish
 *
 * Entity routes map admin surfaces (not public pages). Types without a dedicated
 * detail page (borrow → book-requests queue; admin-request → user 360 via
 * details.userId; reservation → book edit via details.bookId) still get
 * navigable Entity cells when a sensible admin URL exists.
 */

/** Admin detail/edit/list surfaces for activity entity types. */
export const ACTIVITY_ENTITY_DETAIL_ROUTE: Record<
  string,
  (id: string) => string
> = {
  book: (id) => `/admin/books/${id}/edit`,
  user: (id) => `/admin/users/${id}`,
  ticket: (id) => `/admin/support-tickets/${id}`,
  review: (id) => `/admin/book-reviews/${id}`,
  // No per-record borrow detail — open the admin borrow queue.
  borrow: () => `/admin/book-requests`,
};

/**
 * Entity types that stay linkable even when details.status is REJECTED/CANCELLED
 * (admin detail/list surfaces still exist for these records).
 */
const STATUS_LINKABLE_ENTITY_TYPES = new Set([
  "borrow",
  "admin-request",
  "user",
  "review",
  "reservation",
]);

const UNAVAILABLE_STATUSES = new Set(["REJECTED", "CANCELLED"]);

/** Ops / export / recs summary rows (null entityId) → Automation surface. */
function isAutomationSummaryStatus(status: string | null): boolean {
  if (!status) return false;
  return (
    status.startsWith("EXPORT_") ||
    status.startsWith("RECOMMENDATIONS_") ||
    status.startsWith("TRENDING_") ||
    status.startsWith("FINE_") ||
    status.endsWith("_REMINDERS")
  );
}

const PREFERRED_DETAIL_KEYS = [
  "title",
  "name",
  "subject",
  "author",
  "email",
  "status",
  "role",
  "from",
  "to",
  "count",
  "amount",
  "dueDate",
] as const;

export function formatActivityEntityLabel(entityType: string): string {
  return (
    entityType.charAt(0).toUpperCase() +
    entityType.slice(1).replace(/-/g, " ")
  );
}

function detailStatus(
  details: Record<string, unknown> | null | undefined,
): string | null {
  const raw = details?.status;
  return typeof raw === "string" ? raw.toUpperCase() : null;
}

function detailUserId(
  details: Record<string, unknown> | null | undefined,
): string | null {
  const raw = details?.userId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function detailBookId(
  details: Record<string, unknown> | null | undefined,
): string | null {
  const raw = details?.bookId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * Resolve admin href for an activity entity.
 * admin-request → `/admin/users/{details.userId}` (request id alone has no page).
 * borrow → `/admin/book-requests` (queue; entityId optional).
 * reservation → `/admin/books/{details.bookId}/edit` (no reservation detail page).
 */
export function activityEntityHref(
  entityType: string,
  entityId: string | null | undefined,
  details?: Record<string, unknown> | null,
): string | undefined {
  // Automation ops/export/recs summaries (null entityId) before borrow queue.
  if (isAutomationSummaryStatus(detailStatus(details))) {
    return "/admin/automation";
  }
  if (entityType === "admin-request") {
    const userId = detailUserId(details);
    return userId ? `/admin/users/${userId}` : undefined;
  }
  if (entityType === "borrow") {
    // Queue link works even for summary rows (null entityId).
    return ACTIVITY_ENTITY_DETAIL_ROUTE.borrow(entityId ?? "");
  }
  if (entityType === "reservation") {
    const bookId = detailBookId(details);
    return bookId ? `/admin/books/${bookId}/edit` : undefined;
  }
  if (!entityId) return undefined;
  return ACTIVITY_ENTITY_DETAIL_ROUTE[entityType]?.(entityId);
}

/**
 * False when opening the entity would 404 or the record is no longer navigable
 * (deleted / rejected / cancelled for types without surfaces / no route).
 */
export function isActivityEntityLinkable(args: {
  action: string;
  entityType: string;
  entityId: string | null | undefined;
  details?: Record<string, unknown> | null;
}): boolean {
  const { action, entityType, entityId, details } = args;
  if (action === "DELETE") return false;
  if (!activityEntityHref(entityType, entityId, details)) return false;
  const status = detailStatus(details);
  if (
    status &&
    UNAVAILABLE_STATUSES.has(status) &&
    !STATUS_LINKABLE_ENTITY_TYPES.has(entityType)
  ) {
    return false;
  }
  return true;
}

/** Tooltip when Entity is shown as static (not a sky link). */
export function activityEntityUnavailableReason(args: {
  action: string;
  entityType: string;
  entityId: string | null | undefined;
  details?: Record<string, unknown> | null;
}): string {
  const label = formatActivityEntityLabel(args.entityType).toLowerCase();
  if (args.action === "DELETE") {
    return `This ${label} was deleted and is no longer available.`;
  }
  const status = detailStatus(args.details);
  if (
    status === "REJECTED" &&
    !STATUS_LINKABLE_ENTITY_TYPES.has(args.entityType)
  ) {
    return `This ${label} was rejected and is no longer available to open.`;
  }
  if (
    status === "CANCELLED" &&
    !STATUS_LINKABLE_ENTITY_TYPES.has(args.entityType)
  ) {
    return `This ${label} was cancelled and is no longer available to open.`;
  }
  if (args.entityType === "admin-request" && !detailUserId(args.details)) {
    return "No linked user for this admin request activity.";
  }
  if (args.entityType === "reservation" && !detailBookId(args.details)) {
    return "No linked book for this reservation activity.";
  }
  if (
    !args.entityId &&
    args.entityType !== "borrow" &&
    args.entityType !== "reservation" &&
    !isAutomationSummaryStatus(detailStatus(args.details))
  ) {
    return "No linked record id for this activity.";
  }
  if (
    args.entityType !== "admin-request" &&
    args.entityType !== "borrow" &&
    args.entityType !== "reservation" &&
    !ACTIVITY_ENTITY_DETAIL_ROUTE[args.entityType]
  ) {
    return `No detail page for ${label} activity.`;
  }
  return "This record is no longer available.";
}

function formatDetailValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

/**
 * Multi-line details for the table cell (text-xs wrap). Prefer known keys first.
 */
export function formatActivityDetails(
  details: Record<string, unknown> | null | undefined,
): string {
  if (!details) return "—";
  const lines: string[] = [];
  const used = new Set<string>();

  for (const key of PREFERRED_DETAIL_KEYS) {
    if (!(key in details)) continue;
    const text = formatDetailValue(details[key]);
    if (text == null || text === "") continue;
    used.add(key);
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    lines.push(`${label}: ${text}`);
  }

  for (const [key, value] of Object.entries(details)) {
    if (used.has(key)) continue;
    // Href helpers — skip cluttering Details.
    if (key === "userId" || key === "bookId") continue;
    const text = formatDetailValue(value);
    if (text == null || text === "") continue;
    lines.push(`${key}: ${text}`);
  }

  return lines.length > 0 ? lines.join("\n") : "—";
}
