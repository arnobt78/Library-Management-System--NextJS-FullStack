// Parent: REQ-0029 — fine rate history (migration 0018)

import { db } from "@/database/drizzle";
import { fineRateHistory } from "@/database/schema";
import { desc } from "drizzle-orm";
import { getDailyFineAmount } from "@/lib/admin/actions/config";
import type { FineRateHistoryRow } from "./types";

export async function getFineRateHistory(): Promise<FineRateHistoryRow[]> {
  const rows = await db
    .select({
      rate: fineRateHistory.rate,
      effectiveFrom: fineRateHistory.effectiveFrom,
      createdBy: fineRateHistory.createdBy,
    })
    .from(fineRateHistory)
    .orderBy(desc(fineRateHistory.effectiveFrom));

  return rows.map((row) => ({
    rate: Number.parseFloat(String(row.rate)),
    effectiveFrom: row.effectiveFrom,
    createdBy: row.createdBy,
  }));
}

export async function getCurrentDailyRate(): Promise<number> {
  return getDailyFineAmount();
}

/** Insert append-only history row before config update (Wave C). */
export async function appendFineRateHistory(
  rate: number,
  effectiveFrom: Date,
  createdBy: string | null,
): Promise<void> {
  await db.insert(fineRateHistory).values({
    rate: rate.toFixed(2),
    effectiveFrom: effectiveFrom.toISOString().slice(0, 10),
    createdBy,
  });
}
