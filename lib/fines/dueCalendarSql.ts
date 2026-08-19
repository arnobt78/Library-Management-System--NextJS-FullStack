// Parent: REQ-0033 polish — UTC calendar day of timestamptz due/return
import { borrowRecords } from "@/database/schema";
import { sql, type SQL } from "drizzle-orm";

/** UTC calendar day of due_date (stored at UTC noon). */
export const dueUtcDateSql: SQL = sql`(
  ${borrowRecords.dueDate} AT TIME ZONE 'UTC'
)::date`;

/** UTC calendar day of return_date. */
export const returnUtcDateSql: SQL = sql`(
  ${borrowRecords.returnDate} AT TIME ZONE 'UTC'
)::date`;

export const dueUtcBeforeTodaySql: SQL = sql`${dueUtcDateSql} < CURRENT_DATE`;

export const dueUtcOnOrAfterTodaySql: SQL = sql`${dueUtcDateSql} >= CURRENT_DATE`;

export const dueUtcWithinTwoDaysSql: SQL = sql`${dueUtcDateSql} <= CURRENT_DATE + INTERVAL '2 days'`;
