/**
 * Book catalog Activity label mapper (client + server safe — no DB).
 * Parent: Admin Book Detail FIFO-25 Activity
 */

export function bookAuditLabel(
  action: string,
  details?: Record<string, unknown> | null,
): string {
  const status =
    typeof details?.status === "string" ? details.status : null;

  if (action === "CREATE") return "Book created";
  if (action === "DELETE") return "Book deleted";
  if (status === "ACTIVE") return "Status → Active";
  if (status === "INACTIVE") return "Status → Inactive";
  if (status) return `Status → ${String(status).split("_").join(" ")}`;
  if (action === "UPDATE") return "Book updated";
  return "Book updated";
}
