/**
 * Fire-and-forget User 360 side-cache warm (directory / registration / privilege).
 * staleTime 0 so densify/invalidate wins over hover prefetch.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { getAdminUserDetailCache } from "@/lib/admin/actions/user-detail";
import { getAdminUserPrivilegeHistory } from "@/lib/admin/actions/admin-privilege-history";
import { getAdminUserReservations } from "@/lib/admin/actions/admin-user-reservations";
import { getAdminUserActivityHistory } from "@/lib/admin/actions/admin-user-activity";

/** Prefetch detail + privilege history + reservations + activity for a user. */
export function prefetchAdminUser360Caches(
  queryClient: QueryClient,
  userId: string,
): void {
  if (!userId) return;

  void queryClient.prefetchQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: async () => {
      const user = await getAdminUserDetailCache(userId);
      if (!user) throw new Error("User not found");
      return user;
    },
    staleTime: 0,
  });
  void queryClient.prefetchQuery({
    queryKey: queryKeys.users.adminPrivilegeHistory(userId),
    queryFn: () => getAdminUserPrivilegeHistory(userId),
    staleTime: 0,
  });
  void queryClient.prefetchQuery({
    queryKey: queryKeys.circulation.userReservations(userId),
    queryFn: () => getAdminUserReservations(userId),
    staleTime: 0,
  });
  void queryClient.prefetchQuery({
    queryKey: queryKeys.activityLog.user(userId),
    queryFn: () => getAdminUserActivityHistory(userId),
    staleTime: 0,
  });
}
