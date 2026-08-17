// Parent: REQ-0029, REQ-0031 — shared SQL fragments for live fine display

import { borrowRecords } from "@/database/schema";
import { sql, type SQL } from "drizzle-orm";

/**
 * SQL expression for UI/export live fine on one borrow row.
 * Open overdue BORROWED → (now − due) × dailyRate; else stored fine_amount.
 */
export function liveFineAmountSql(
  dailyRate: number,
  now: Date = new Date(),
): SQL {
  const dailyFineAmountSql = sql`${dailyRate}::numeric`;
  const nowSql = sql`${now}`;

  return sql`CASE
    WHEN ${borrowRecords.status} = 'BORROWED'
      AND ${borrowRecords.dueDate} IS NOT NULL
      AND ${borrowRecords.dueDate} < ${nowSql}
    THEN ((${nowSql}::date - ${borrowRecords.dueDate}::date) * ${dailyFineAmountSql})::text
    ELSE COALESCE(${borrowRecords.fineAmount}::text, '0.00')
  END`;
}

/** Sum live fines for open overdue borrows (Insights KPI parity). */
export function liveOutstandingFineSumSql(
  dailyRate: number,
  now: Date = new Date(),
): SQL {
  const dailyFineAmountSql = sql`${dailyRate}::numeric`;
  const nowSql = sql`${now}`;

  return sql`COALESCE(SUM(
    CASE
      WHEN ${borrowRecords.status} = 'BORROWED'
        AND ${borrowRecords.dueDate} IS NOT NULL
        AND ${borrowRecords.dueDate} < ${nowSql}
      THEN (${nowSql}::date - ${borrowRecords.dueDate}::date) * ${dailyFineAmountSql}
      ELSE 0
    END
  ), 0)`;
}
