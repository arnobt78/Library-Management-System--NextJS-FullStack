/**
 * Densify helper for admin sidebar nav counts (setQueryData, no removeQueries).
 * Prefer absolute patches after list/count densify — overwrites active
 * invalidate refetch (avoids double-delta on sidebar).
 * Parent: admin shell Stockly chrome
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  EMPTY_ADMIN_NAV_COUNTS,
  type AdminNavCounts,
} from "@/lib/admin/adminNavCountTypes";

export function patchAdminNavCounts(
  queryClient: QueryClient,
  patch: Partial<AdminNavCounts>,
): void {
  queryClient.setQueryData<AdminNavCounts>(
    queryKeys.admin.navCounts,
    (prev) => ({
      ...(prev ?? EMPTY_ADMIN_NAV_COUNTS),
      ...patch,
    }),
  );
}
