/**
 * Instant densify for support-ticket list/detail/openCount caches.
 *
 * Call AFTER `await invalidateMutation("ticket.write")`, but always pass
 * `baselines` snapped BEFORE invalidate. Invalidation `removeQueries` wipes
 * inactive lists; upserting into `[]` would leave only the touched row and
 * other tickets would flash in late after refetch.
 * Parent: CR-0003 / REQ-0034
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  writeDensifiedEmpty,
  writeMappedList,
} from "@/lib/utils/queryCacheLists";

function isActiveQueueStatus(status: string | undefined): boolean {
  return status === "OPEN" || status === "IN_PROGRESS";
}

function toListItem(ticket: SupportTicketDetail): SupportTicketListItem {
  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    userId: ticket.userId,
    userName: ticket.userName,
    userEmail: ticket.userEmail,
    userUniversityCard: ticket.userUniversityCard,
    assignedToId: ticket.assignedToId,
    assignedToName: ticket.assignedToName,
    assignedToEmail: ticket.assignedToEmail,
    assignedToUniversityCard: ticket.assignedToUniversityCard,
    relatedBookId: ticket.relatedBookId,
    relatedBookTitle: ticket.relatedBookTitle,
    replyCount: ticket.replyCount,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function bumpOpenCount(queryClient: QueryClient, delta: number): void {
  if (delta === 0) return;
  queryClient.setQueryData<number>(queryKeys.tickets.openCount, (old) =>
    Math.max(0, (old ?? 0) + delta),
  );
}

/** Insert-or-replace a list row. */
function upsertTicketRow(
  rows: SupportTicketListItem[],
  row: SupportTicketListItem,
): SupportTicketListItem[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [row, ...rows];
  return rows.map((r, i) => (i === idx ? { ...r, ...row } : r));
}

/**
 * Pre-invalidate list snapshots — pick the longest list per scope so filtered
 * keys never shrink the densify baseline below the full unfiltered set.
 */
export type TicketListBaselines = {
  admin: SupportTicketListItem[] | undefined;
  /** userId → densest cached list for that user */
  users: Record<string, SupportTicketListItem[]>;
};

export function snapshotTicketListBaselines(
  queryClient: QueryClient,
): TicketListBaselines {
  let admin: SupportTicketListItem[] | undefined = queryClient.getQueryData(
    queryKeys.tickets.adminList({}),
  );

  for (const [, rows] of queryClient.getQueriesData<SupportTicketListItem[]>({
    queryKey: queryKeys.tickets.adminRoot,
  })) {
    if (!rows?.length) continue;
    if (!admin || rows.length > admin.length) admin = rows;
  }

  const users: Record<string, SupportTicketListItem[]> = {};
  for (const [key, rows] of queryClient.getQueriesData<SupportTicketListItem[]>({
    queryKey: queryKeys.tickets.userRoot,
  })) {
    if (!rows?.length) continue;
    const userId = userIdFromTicketListKey(key);
    if (!userId) continue;
    if (!users[userId] || rows.length > users[userId].length) {
      users[userId] = rows;
    }
  }

  return { admin, users };
}

function userIdFromTicketListKey(key: QueryKey): string | undefined {
  // ["user-support-tickets", userId, filters]
  if (!Array.isArray(key) || key.length < 2) return undefined;
  return typeof key[1] === "string" ? key[1] : undefined;
}

/**
 * Apply mapper to every cached list AND force-seed canonical `{}` keys.
 * When post-invalidate cache is empty, fall back to pre-invalidate baselines
 * so sibling rows are not dropped.
 */
function mapTicketLists(
  queryClient: QueryClient,
  mapper: (rows: SupportTicketListItem[]) => SupportTicketListItem[],
  userId?: string | null,
  baselines?: TicketListBaselines,
): void {
  queryClient.setQueriesData<SupportTicketListItem[]>(
    { queryKey: queryKeys.tickets.adminRoot },
    (old) => (old ? mapper(old) : old),
  );
  queryClient.setQueriesData<SupportTicketListItem[]>(
    { queryKey: queryKeys.tickets.userRoot },
    (old) => (old ? mapper(old) : old),
  );

  const adminKey = queryKeys.tickets.adminList({});
  writeMappedList(
    queryClient,
    adminKey,
    queryClient.getQueryData<SupportTicketListItem[]>(adminKey),
    baselines?.admin,
    mapper,
  );

  if (userId) {
    const userKey = queryKeys.tickets.userList(userId, {});
    writeMappedList(
      queryClient,
      userKey,
      queryClient.getQueryData<SupportTicketListItem[]>(userKey),
      baselines?.users[userId],
      mapper,
    );
  }
}

/** Find a ticket's status from detail or any cached list (for delete openCount). */
export function findCachedTicketStatus(
  queryClient: QueryClient,
  ticketId: string,
): string | undefined {
  const detail = queryClient.getQueryData<SupportTicketDetail>(
    queryKeys.tickets.detail(ticketId),
  );
  if (detail?.status) return detail.status;

  for (const root of [
    queryKeys.tickets.adminRoot,
    queryKeys.tickets.userRoot,
  ] as const) {
    const lists = queryClient.getQueriesData<SupportTicketListItem[]>({
      queryKey: root,
    });
    for (const [, rows] of lists) {
      const hit = rows?.find((r) => r.id === ticketId);
      if (hit) return hit.status;
    }
  }
  return undefined;
}

/** After create — seed detail + list rows (call after invalidate). */
export function patchTicketCachesOnCreate(
  queryClient: QueryClient,
  ticket: SupportTicketDetail,
  baselines?: TicketListBaselines,
): void {
  queryClient.setQueryData(queryKeys.tickets.detail(ticket.id), ticket);
  const row = toListItem(ticket);
  mapTicketLists(
    queryClient,
    (rows) => upsertTicketRow(rows, row),
    ticket.userId,
    baselines,
  );
  if (isActiveQueueStatus(ticket.status)) {
    bumpOpenCount(queryClient, 1);
  }
}

/** After update — replace detail + upsert into baseline lists. */
export function patchTicketCachesOnUpdate(
  queryClient: QueryClient,
  ticket: SupportTicketDetail,
  previousStatus?: string,
  baselines?: TicketListBaselines,
): void {
  queryClient.setQueryData(queryKeys.tickets.detail(ticket.id), ticket);
  const row = toListItem(ticket);
  mapTicketLists(
    queryClient,
    (rows) => upsertTicketRow(rows, row),
    ticket.userId,
    baselines,
  );

  const wasActive = isActiveQueueStatus(previousStatus);
  const isActive = isActiveQueueStatus(ticket.status);
  if (wasActive && !isActive) bumpOpenCount(queryClient, -1);
  else if (!wasActive && isActive) bumpOpenCount(queryClient, 1);
}

/** After delete — drop detail + list rows; force densify-empty when never cached. */
export function patchTicketCachesOnDelete(
  queryClient: QueryClient,
  ticketId: string,
  previousStatus?: string,
  userId?: string | null,
  baselines?: TicketListBaselines,
): void {
  queryClient.removeQueries({ queryKey: queryKeys.tickets.detail(ticketId) });
  mapTicketLists(
    queryClient,
    (rows) => rows.filter((r) => r.id !== ticketId),
    userId,
    baselines,
  );

  // Delete from detail before list ever mounted — soft-nav list must not SSR-reseed.
  const adminKey = queryKeys.tickets.adminList({});
  if (queryClient.getQueryData(adminKey) === undefined && !baselines?.admin) {
    writeDensifiedEmpty(queryClient, adminKey);
  }
  if (userId) {
    const userKey = queryKeys.tickets.userList(userId, {});
    if (
      queryClient.getQueryData(userKey) === undefined &&
      !baselines?.users[userId]
    ) {
      writeDensifiedEmpty(queryClient, userKey);
    }
  }

  if (isActiveQueueStatus(previousStatus)) {
    bumpOpenCount(queryClient, -1);
  }
}

/**
 * After reply — set detail.replies + upsert list replyCount/updatedAt.
 */
export function patchTicketCachesOnReply(
  queryClient: QueryClient,
  ticketId: string,
  replies: SupportTicketReplyRow[],
  userId?: string | null,
  baselines?: TicketListBaselines,
): void {
  const updatedAt = new Date().toISOString();
  queryClient.setQueryData<SupportTicketDetail | undefined>(
    queryKeys.tickets.detail(ticketId),
    (prev) =>
      prev
        ? {
            ...prev,
            replies,
            replyCount: replies.length,
            updatedAt,
          }
        : prev,
  );

  const detail = queryClient.getQueryData<SupportTicketDetail>(
    queryKeys.tickets.detail(ticketId),
  );
  mapTicketLists(
    queryClient,
    (rows) => {
      const existing = rows.find((r) => r.id === ticketId);
      if (existing) {
        return rows.map((r) =>
          r.id === ticketId
            ? { ...r, replyCount: replies.length, updatedAt }
            : r,
        );
      }
      if (!detail) return rows;
      return upsertTicketRow(rows, {
        ...toListItem(detail),
        replyCount: replies.length,
        updatedAt,
      });
    },
    userId ?? detail?.userId,
    baselines,
  );
}
