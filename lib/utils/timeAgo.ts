/**
 * Client-only relative time formatter ("2h ago", "Just now"). Safe from
 * hydration mismatches only when rendered after mount (e.g. inside a
 * client-fetched list like the notification bell / activity log — never in
 * SSR-rendered markup that must match the client on first paint).
 * Parent: CR-0003 / REQ-0034
 */
export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) return "";

  const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
