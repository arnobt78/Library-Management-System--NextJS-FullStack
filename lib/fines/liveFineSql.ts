// Parent: REQ-0029, REQ-0031 — export-only SQL aggregate (UI uses JS pro-rata in lib/fines)

import { borrowRecords } from "@/database/schema";
import { sql, type SQL } from "drizzle-orm";
import { dueUtcDateSql } from "@/lib/fines/dueCalendarSql";

/**
 * Sum flat-rate live fines for open overdue borrows — analytics export only.
 * UI/KPIs use computeLiveFineForRow / mapDisplayFine (pro-rata + fine_rate_history).
 */
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
        AND ${dueUtcDateSql} < (${nowSql} AT TIME ZONE 'UTC')::date
      THEN ((${nowSql} AT TIME ZONE 'UTC')::date - ${dueUtcDateSql}) * ${dailyFineAmountSql}
      ELSE 0
    END
  ), 0)`;
}
