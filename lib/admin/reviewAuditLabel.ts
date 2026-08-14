/**
 * Review Activity label mapper (client + server safe — no DB).
 * Parent: review detail KPI cleanup + Activity FIFO-25
 */

export function reviewAuditLabel(
  action: string,
  details?: Record<string, unknown> | null,
): string {
  const status =
    typeof details?.status === "string" ? details.status : null;

  if (action === "CREATE") return "Review created";
  if (action === "DELETE") return "Review deleted";
  if (status === "APPROVED") return "Status → Approved";
  if (status === "REJECTED") return "Status → Rejected";
  if (status === "PENDING") return "Status → Pending";
  if (status) return `Status → ${String(status).split("_").join(" ")}`;
  if (action === "UPDATE") return "Review updated";
  return "Review updated";
}
