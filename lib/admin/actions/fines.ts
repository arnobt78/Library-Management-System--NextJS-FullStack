/**
 * Admin fine lifecycle actions — waive, adjust, paid, stamp, fine-free return.
 * Parent: REQ-0025, REQ-0029
 */
import { db } from "@/database/drizzle";
import { borrowRecords } from "@/database/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireAdminActor } from "@/lib/auth/authorization";
import { logActivity } from "@/lib/admin/activityLog";
import { getDailyFineAmount } from "@/lib/admin/actions/config";
import { computeLiveFineForRow, formatFineAmount } from "@/lib/fines/liveFine";
import { dueUtcBeforeTodaySql } from "@/lib/fines/dueCalendarSql";
import { getFineRateHistory } from "@/lib/fines/rateHistory";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { createInAppNotification } from "@/lib/notifications/inApp";

export type FineActionResult = {
  recordId: string;
  fineAmount: string;
  displayFineAmount: string;
  fineStatus: string;
};

async function loadBorrowForFineUpdate(recordId: string) {
  const [row] = await db
    .select({
      id: borrowRecords.id,
      userId: borrowRecords.userId,
      status: borrowRecords.status,
      dueDate: borrowRecords.dueDate,
      fineAmount: borrowRecords.fineAmount,
      fineStatus: borrowRecords.fineStatus,
      notes: borrowRecords.notes,
      bookTitle: sql<string>`(SELECT title FROM books WHERE id = ${borrowRecords.bookId})`,
    })
    .from(borrowRecords)
    .where(eq(borrowRecords.id, recordId))
    .limit(1)
    .for("update");
  return row ?? null;
}

async function computeDisplayFine(input: {
  status: string;
  dueDate: string | Date | null;
  storedFine: string | null;
  fineStatus?: string | null;
}): Promise<string> {
  const dailyRate = await getDailyFineAmount();
  const history = await getFineRateHistory();
  const amount = computeLiveFineForRow({
    status: input.status,
    dueDate: input.dueDate,
    storedFine: input.storedFine,
    dailyRate,
    fineStatus: input.fineStatus,
    rateHistory: history,
  });
  return formatFineAmount(amount);
}

export async function adjustBorrowFine(
  recordId: string,
  amount: number,
  reason?: string,
): Promise<{ success: true; data: FineActionResult } | { success: false; error: string }> {
  const actor = await requireAdminActor();
  if (!Number.isFinite(amount) || amount < 0) {
    return { success: false, error: "Fine amount must be a non-negative number" };
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: borrowRecords.id,
        status: borrowRecords.status,
        dueDate: borrowRecords.dueDate,
        fineStatus: borrowRecords.fineStatus,
        notes: borrowRecords.notes,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.id, recordId))
      .limit(1)
      .for("update");

    if (!row) return { ok: false as const, error: "Borrow record not found" };

    const fineAmount = amount.toFixed(2);
    const fineStatus =
      amount > 0
        ? row.status === "BORROWED"
          ? "ACCRUING"
          : "STAMPED"
        : "NONE";
    const noteLine = reason?.trim()
      ? `Fine adjusted by admin: ${reason.trim()}`
      : "Fine adjusted by admin";
    const notes = row.notes ? `${row.notes}\n${noteLine}` : noteLine;

    await tx
      .update(borrowRecords)
      .set({
        fineAmount,
        fineStatus,
        notes,
        updatedAt: new Date(),
        updatedBy: actor.email,
      })
      .where(eq(borrowRecords.id, recordId));

    return { ok: true as const, fineAmount, fineStatus, status: row.status, dueDate: row.dueDate };
  });

  if (!result.ok) return { success: false, error: result.error };

  const displayFineAmount = await computeDisplayFine({
    status: result.status,
    dueDate: result.dueDate,
    storedFine: result.fineAmount,
    fineStatus: result.fineStatus,
  });

  await logActivity({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "borrow",
    entityId: recordId,
    details: { status: "FINE_ADJUST", amount: result.fineAmount, reason },
  });
  revalidateMutationPaths("fine.write");

  return {
    success: true,
    data: {
      recordId,
      fineAmount: result.fineAmount,
      displayFineAmount,
      fineStatus: result.fineStatus,
    },
  };
}

export async function waiveBorrowFine(
  recordId: string,
  reason?: string,
): Promise<{ success: true; data: FineActionResult } | { success: false; error: string }> {
  const actor = await requireAdminActor();

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: borrowRecords.id, notes: borrowRecords.notes })
      .from(borrowRecords)
      .where(eq(borrowRecords.id, recordId))
      .limit(1)
      .for("update");

    if (!row) return { ok: false as const, error: "Borrow record not found" };

    const noteLine = reason?.trim()
      ? `Fine waived by admin: ${reason.trim()}`
      : "Fine waived by admin";
    const notes = row.notes ? `${row.notes}\n${noteLine}` : noteLine;

    await tx
      .update(borrowRecords)
      .set({
        fineAmount: "0.00",
        fineStatus: "WAIVED",
        notes,
        updatedAt: new Date(),
        updatedBy: actor.email,
      })
      .where(eq(borrowRecords.id, recordId));

    return { ok: true as const };
  });

  if (!result.ok) return { success: false, error: result.error };

  await logActivity({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "borrow",
    entityId: recordId,
    details: { status: "FINE_WAIVED", reason },
  });
  revalidateMutationPaths("fine.write");

  return {
    success: true,
    data: {
      recordId,
      fineAmount: "0.00",
      displayFineAmount: "0.00",
      fineStatus: "WAIVED",
    },
  };
}

export async function markFinePaid(
  recordId: string,
  reason?: string,
): Promise<{ success: true; data: FineActionResult } | { success: false; error: string }> {
  const actor = await requireAdminActor();
  const row = await loadBorrowForFineUpdate(recordId);
  if (!row) return { success: false, error: "Borrow record not found" };

  const display = await computeDisplayFine({
    status: row.status,
    dueDate: row.dueDate,
    storedFine: row.fineAmount,
    fineStatus: row.fineStatus,
  });
  const noteLine = reason?.trim()
    ? `Fine marked paid by admin: ${reason.trim()}`
    : "Fine marked paid by admin";
  const notes = row.notes ? `${row.notes}\n${noteLine}` : noteLine;

  await db
    .update(borrowRecords)
    .set({
      fineAmount: display,
      fineStatus: "PAID",
      notes,
      updatedAt: new Date(),
      updatedBy: actor.email,
    })
    .where(eq(borrowRecords.id, recordId));

  await logActivity({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "borrow",
    entityId: recordId,
    details: { status: "FINE_PAID", amount: display, reason },
  });
  revalidateMutationPaths("fine.write");

  return {
    success: true,
    data: {
      recordId,
      fineAmount: display,
      displayFineAmount: display,
      fineStatus: "PAID",
    },
  };
}

/** Promote open overdue NONE rows to ACCRUING (skip WAIVED/PAID). */
export async function syncOverdueAccruingStatus(): Promise<{ synced: number }> {
  const rows = await db
    .select({ id: borrowRecords.id })
    .from(borrowRecords)
    .where(
      and(
        eq(borrowRecords.status, "BORROWED"),
        sql`${borrowRecords.dueDate} IS NOT NULL`,
        dueUtcBeforeTodaySql,
        eq(borrowRecords.fineStatus, "NONE"),
      ),
    );

  if (rows.length === 0) {
    return { synced: 0 };
  }

  await db
    .update(borrowRecords)
    .set({
      fineStatus: "ACCRUING",
      updatedAt: new Date(),
      updatedBy: "system",
    })
    .where(
      and(
        eq(borrowRecords.status, "BORROWED"),
        sql`${borrowRecords.dueDate} IS NOT NULL`,
        dueUtcBeforeTodaySql,
        eq(borrowRecords.fineStatus, "NONE"),
      ),
    );

  return { synced: rows.length };
}

/** Stamp open overdue ACCRUING rows to stored fine_amount (cron / force). */
export async function stampOpenOverdueFines(options?: {
  force?: boolean;
  actorEmail?: string;
}): Promise<{ stamped: number; skipped: number }> {
  const today = new Date();
  const dailyRate = await getDailyFineAmount();
  const history = await getFineRateHistory();

  const rows = await db
    .select({
      id: borrowRecords.id,
      dueDate: borrowRecords.dueDate,
      fineAmount: borrowRecords.fineAmount,
      fineStatus: borrowRecords.fineStatus,
    })
    .from(borrowRecords)
    .where(
      and(
        eq(borrowRecords.status, "BORROWED"),
        sql`${borrowRecords.dueDate} IS NOT NULL`,
        dueUtcBeforeTodaySql,
        options?.force
          ? sql`1=1`
          : eq(borrowRecords.fineStatus, "ACCRUING"),
      ),
    )
    .for("update");

  let stamped = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.dueDate) {
      skipped += 1;
      continue;
    }
    if (row.fineStatus === "WAIVED" || row.fineStatus === "PAID") {
      skipped += 1;
      continue;
    }

    const amount = computeLiveFineForRow({
      status: "BORROWED",
      dueDate: row.dueDate,
      storedFine: row.fineAmount,
      dailyRate,
      fineStatus: row.fineStatus,
      rateHistory: history,
      now: today,
    });
    const fineAmount = formatFineAmount(amount);

    await db
      .update(borrowRecords)
      .set({
        fineAmount,
        fineStatus: amount > 0 ? "STAMPED" : "NONE",
        updatedAt: new Date(),
        updatedBy: options?.actorEmail ?? "system",
      })
      .where(eq(borrowRecords.id, row.id));

    stamped += 1;
  }

  if (stamped > 0) {
    revalidateMutationPaths("fine.write");
  }

  return { stamped, skipped };
}

/** Notify users with open overdue borrows after a rate change. */
export async function notifyOpenOverdueUsersOfRateChange(
  newRate: number,
): Promise<void> {
  const rows = await db
    .select({
      userId: borrowRecords.userId,
    })
    .from(borrowRecords)
    .where(
      and(
        eq(borrowRecords.status, "BORROWED"),
        sql`${borrowRecords.dueDate} IS NOT NULL`,
        dueUtcBeforeTodaySql,
      ),
    );

  const userIds = [...new Set(rows.map((r) => r.userId))];
  await Promise.all(
    userIds.map((userId) =>
      createInAppNotification({
        userId,
        type: "REMINDER_DUE",
        title: "Daily fine rate updated",
        message: `The library daily overdue fine rate is now $${newRate.toFixed(2)} per day. Live balances in your profile reflect the new rate.`,
        link: "/my-profile?tab=active-borrows",
      }),
    ),
  );
  if (userIds.length > 0) {
    revalidateMutationPaths("notification.write");
  }
}

/** Preview rows for automation reminder dialog. */
export async function getReminderPreview(type: "due" | "overdue") {
  const { getBooksDueSoon, getOverdueBooks } = await import("./reminders");
  if (type === "due") {
    const rows = await getBooksDueSoon();
    return rows.map((r) => ({
      recordId: r.recordId,
      bookTitle: r.bookTitle,
      userName: r.userName,
      userEmail: r.userEmail,
      dueDate: r.dueDate,
      days: Math.ceil(Number(r.daysUntilDue ?? 0)),
      liveFine: "0.00",
    }));
  }
  const rows = await getOverdueBooks();
  return rows.map((r) => ({
    recordId: r.recordId,
    bookTitle: r.bookTitle,
    userName: r.userName,
    userEmail: r.userEmail,
    dueDate: r.dueDate,
    days: Math.ceil(Number(r.daysOverdue ?? 0)),
    liveFine: r.fineAmount ?? "0.00",
  }));
}
