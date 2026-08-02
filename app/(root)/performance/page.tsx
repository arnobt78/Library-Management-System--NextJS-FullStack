// Parent: REQ-0028, REQ-0033
// Standalone Performance UI lives on /api-status; keep this path for old bookmarks.

import { redirect } from "next/navigation";

export default function PerformancePage() {
  redirect("/api-status");
}
