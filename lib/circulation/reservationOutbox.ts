// Parent: REQ-0030, REQ-0032
import "server-only";

import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/database/drizzle";
import {
  books,
  reservations,
  reservationEvents,
  users,
} from "@/database/schema";
import {
  sendIdempotentEmailViaResend,
  type EmailDeliveryReceipt,
} from "@/lib/services/email-service";
import { RESERVATION_OUTBOX_LOCK_TIMEOUT_MS } from "@/lib/circulation/outboxPolicy";
import { createInAppNotification } from "@/lib/notifications/inApp";

const DEFAULT_BATCH_SIZE = 20;
const DELIVERY_CONCURRENCY = 5;
const MAX_RETRY_DELAY_MINUTES = 6 * 60;
const MAX_DELIVERY_ATTEMPTS = 8;

export interface ReservationOutboxItem {
  id: string;
  reservationId: string;
  eventKey: string;
  attemptCount: number;
  reservationStatus:
    "WAITING" | "READY" | "FULFILLED" | "CANCELLED" | "EXPIRED";
  readyExpiresAt: Date | null;
  recipientUserId: string;
  recipientEmail: string;
  recipientName: string;
  bookTitle: string;
}

export interface ReservationOutboxResult {
  claimed: number;
  delivered: number;
  retried: number;
  skipped: number;
  deadLettered: number;
}

export interface ReservationOutboxDependencies {
  claim: (batchSize: number) => Promise<ReservationOutboxItem[]>;
  send: (item: ReservationOutboxItem) => Promise<EmailDeliveryReceipt | null>;
  complete: (
    item: ReservationOutboxItem,
    receipt: EmailDeliveryReceipt | null,
  ) => Promise<void>;
  retry: (
    item: ReservationOutboxItem,
    reason: string,
  ) => Promise<"retried" | "dead-lettered">;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function cleanHeaderText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function retryDelayMinutes(attemptCount: number): number {
  return Math.min(
    5 * 2 ** Math.max(0, attemptCount - 1),
    MAX_RETRY_DELAY_MINUTES,
  );
}

export function deliveryFailureDisposition(
  attemptCount: number,
): "retried" | "dead-lettered" {
  return attemptCount >= MAX_DELIVERY_ATTEMPTS ? "dead-lettered" : "retried";
}

export async function claimReservationEvents(
  batchSize: number,
): Promise<ReservationOutboxItem[]> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: reservationEvents.id })
      .from(reservationEvents)
      .where(
        and(
          isNull(reservationEvents.deliveredAt),
          isNull(reservationEvents.deadLetteredAt),
          eq(reservationEvents.eventType, "RESERVATION_READY"),
          // Scheduling and leases use PostgreSQL time so workers on different
          // hosts cannot miss or double-delay rows because of clock skew.
          lte(reservationEvents.nextAttemptAt, sql`CURRENT_TIMESTAMP`),
          or(
            isNull(reservationEvents.lockedAt),
            lte(
              reservationEvents.lockedAt,
              sql`CURRENT_TIMESTAMP - (${RESERVATION_OUTBOX_LOCK_TIMEOUT_MS} * INTERVAL '1 millisecond')`,
            ),
          ),
        ),
      )
      .orderBy(
        asc(reservationEvents.nextAttemptAt),
        asc(reservationEvents.createdAt),
      )
      .limit(batchSize)
      .for("update", { skipLocked: true });

    const ids = rows.map(({ id }) => id);
    if (ids.length === 0) return [];
    await tx
      .update(reservationEvents)
      .set({
        lockedAt: sql`CURRENT_TIMESTAMP`,
        attemptCount: sql`${reservationEvents.attemptCount} + 1`,
      })
      .where(inArray(reservationEvents.id, ids));
    // Read the payload before releasing the claim transaction so a concurrent
    // administrative delete cannot turn a successful claim into an empty job.
    return tx
      .select({
        id: reservationEvents.id,
        reservationId: reservations.id,
        eventKey: reservationEvents.eventKey,
        attemptCount: reservationEvents.attemptCount,
        reservationStatus: reservations.status,
        readyExpiresAt: reservations.readyExpiresAt,
        recipientUserId: users.id,
        recipientEmail: users.email,
        recipientName: users.fullName,
        bookTitle: books.title,
      })
      .from(reservationEvents)
      .innerJoin(
        reservations,
        eq(reservationEvents.reservationId, reservations.id),
      )
      .innerJoin(users, eq(reservations.userId, users.id))
      .innerJoin(books, eq(reservations.bookId, books.id))
      .where(inArray(reservationEvents.id, ids));
  });
}

export async function sendReservationReadyEmail(
  item: ReservationOutboxItem,
  deliver = sendIdempotentEmailViaResend,
): Promise<EmailDeliveryReceipt | null> {
  const [current] = await db
    .select({
      status: reservations.status,
      readyExpiresAt: reservations.readyExpiresAt,
    })
    .from(reservations)
    .where(eq(reservations.id, item.reservationId))
    .limit(1);
  if (
    current?.status !== "READY" ||
    !current.readyExpiresAt ||
    current.readyExpiresAt <= new Date()
  ) {
    return null;
  }

  const name = cleanHeaderText(item.recipientName);
  const title = cleanHeaderText(item.bookTitle);
  const expires = current.readyExpiresAt.toISOString();
  const text = `Hello ${name}, ${title} is ready for pickup. Your reservation expires at ${expires}.`;
  const html = `<p>Hello ${escapeHtml(name)},</p><p><strong>${escapeHtml(title)}</strong> is ready for pickup.</p><p>Your reservation expires at ${escapeHtml(expires)}.</p>`;
  return deliver(
    item.recipientEmail,
    `Reservation ready: ${title}`,
    html,
    text,
    item.eventKey,
  );
}

async function completeReservationEvent(
  item: ReservationOutboxItem,
  receipt: EmailDeliveryReceipt | null,
): Promise<void> {
  await db
    .update(reservationEvents)
    .set({
      deliveredAt: new Date(),
      lockedAt: null,
      lastError: null,
      provider: receipt?.provider ?? "SKIPPED",
      providerMessageId: receipt?.messageId ?? null,
    })
    .where(
      and(
        eq(reservationEvents.id, item.id),
        isNull(reservationEvents.deliveredAt),
      ),
    );
}

async function retryReservationEvent(
  item: ReservationOutboxItem,
  reason: string,
): Promise<"retried" | "dead-lettered"> {
  if (deliveryFailureDisposition(item.attemptCount) === "dead-lettered") {
    await db
      .update(reservationEvents)
      .set({
        lockedAt: null,
        deadLetteredAt: new Date(),
        lastError: reason.slice(0, 100),
      })
      .where(
        and(
          eq(reservationEvents.id, item.id),
          isNull(reservationEvents.deliveredAt),
          isNull(reservationEvents.deadLetteredAt),
        ),
      );
    return "dead-lettered";
  }
  const nextAttemptAt = new Date(
    Date.now() + retryDelayMinutes(item.attemptCount) * 60_000,
  );
  await db
    .update(reservationEvents)
    .set({ lockedAt: null, nextAttemptAt, lastError: reason.slice(0, 100) })
    .where(
      and(
        eq(reservationEvents.id, item.id),
        isNull(reservationEvents.deliveredAt),
        isNull(reservationEvents.deadLetteredAt),
      ),
    );
  return "retried";
}

const productionDependencies: ReservationOutboxDependencies = {
  claim: claimReservationEvents,
  send: sendReservationReadyEmail,
  complete: completeReservationEvent,
  retry: retryReservationEvent,
};

export async function deliverReservationOutbox(
  batchSize = DEFAULT_BATCH_SIZE,
  dependencies: ReservationOutboxDependencies = productionDependencies,
): Promise<ReservationOutboxResult> {
  const safeBatchSize = Number.isFinite(batchSize)
    ? Math.min(100, Math.max(1, Math.trunc(batchSize)))
    : DEFAULT_BATCH_SIZE;
  const items = await dependencies.claim(safeBatchSize);
  const result: ReservationOutboxResult = {
    claimed: items.length,
    delivered: 0,
    retried: 0,
    skipped: 0,
    deadLettered: 0,
  };

  for (let index = 0; index < items.length; index += DELIVERY_CONCURRENCY) {
    await Promise.all(
      items.slice(index, index + DELIVERY_CONCURRENCY).map(async (item) => {
        if (
          item.reservationStatus !== "READY" ||
          !item.readyExpiresAt ||
          item.readyExpiresAt <= new Date()
        ) {
          await dependencies.complete(item, null);
          result.skipped += 1;
          return;
        }
        try {
          const receipt = await dependencies.send(item);
          if (!receipt) {
            await dependencies.complete(item, null);
            result.skipped += 1;
            return;
          }
          await dependencies.complete(item, receipt);
          void createInAppNotification({
            userId: item.recipientUserId,
            type: "HOLD_READY",
            title: "Hold ready for pickup",
            message: `"${item.bookTitle}" is ready — pick it up before it expires.`,
            link: "/my-profile?tab=holds",
          });
          result.delivered += 1;
        } catch {
          const disposition = await dependencies.retry(item, "DELIVERY_FAILED");
          result[disposition === "retried" ? "retried" : "deadLettered"] += 1;
        }
      }),
    );
  }
  return result;
}
