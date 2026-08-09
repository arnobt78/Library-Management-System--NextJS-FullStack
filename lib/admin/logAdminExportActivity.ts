/**
 * Shared audit writer for admin data-export routes.
 * Parent: CR-0003 / REQ-0034 — Automation exports → Activity History
 *
 * Call AFTER a successful export payload is built and BEFORE the file response
 * is returned, so RSC revalidate cannot race the insert.
 */
import "server-only";

import { logActivity } from "@/lib/admin/activityLog";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

export type AdminExportEntityType = "book" | "user" | "borrow";

export async function logAdminExportActivity(input: {
  actorId: string;
  entityType: AdminExportEntityType;
  /** Stable status token for Entity href + Details (e.g. EXPORT_BOOKS). */
  status: string;
  format: string;
  /** Optional row count when cheap to know. */
  count?: number;
}): Promise<void> {
  await logActivity({
    actorId: input.actorId,
    action: "UPDATE",
    entityType: input.entityType,
    entityId: null,
    details: {
      status: input.status,
      format: input.format,
      ...(typeof input.count === "number" ? { count: input.count } : {}),
    },
  });
  revalidateMutationPaths("operations.write");
}
