/**
 * Optimistic Sign-up Requests cache updates:
 * remove from pending queue + prepend Recent decisions so UI paints before refetch.
 * Also paints signup-request detail (status + timeline) so detail route does not stay PENDING.
 * Server ledger + await invalidateMutation("user.write") remains source of truth.
 *
 * decisionActor MUST come from the logged-in admin session — null would flash “an admin”.
 * Last-item empty pending lists are densify-empty-marked so soft-nav cannot SSR-reseed.
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import type {
  SignupRequestDetail,
  SignupStatusDecision,
} from "@/lib/admin/signupStatusDecisions";
import { queryKeys } from "@/lib/query/keys";
import type { User } from "@/lib/services/users";
import { markDensifiedEmpty } from "@/lib/utils/queryCacheLists";
import { syncPendingSignUpsNav } from "@/lib/utils/patchUserCaches";
import { RECENT_SIGNUP_DECISIONS_LIMIT } from "@/lib/admin/signupDecisionConstants";

export type SignupDecisionOptimisticContext = {
  previousPending: Array<[QueryKey, User[] | undefined]>;
  previousDecisions: Array<[QueryKey, SignupStatusDecision[] | undefined]>;
  previousSignupDetail: SignupRequestDetail | undefined;
  signupDetailKey: QueryKey;
};

function findCachedPendingUser(
  queryClient: QueryClient,
  userId: string,
): User | undefined {
  const pendingQueries = queryClient.getQueriesData<User[]>({
    queryKey: queryKeys.users.pendingRoot,
  });
  for (const [, data] of pendingQueries) {
    const hit = data?.find((u) => u.id === userId);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Cancel pending + decisions queries, snapshot for rollback, apply optimistic paint.
 */
export async function applyOptimisticSignupDecision(
  queryClient: QueryClient,
  args: {
    userId: string;
    status: "APPROVED" | "REJECTED";
    userName?: string;
    /** Logged-in admin — avoids “an admin” flash before ledger refetch. */
    decisionActor?: AdminRequestReviewer | null;
  },
): Promise<SignupDecisionOptimisticContext> {
  const signupDetailKey = queryKeys.users.signupRequestDetail(args.userId);

  await Promise.all([
    queryClient.cancelQueries({ queryKey: queryKeys.users.pendingRoot }),
    queryClient.cancelQueries({
      queryKey: queryKeys.users.signupDecisionsRoot,
    }),
    queryClient.cancelQueries({ queryKey: signupDetailKey }),
  ]);

  const previousPending = queryClient.getQueriesData<User[]>({
    queryKey: queryKeys.users.pendingRoot,
  });
  const previousDecisions = queryClient.getQueriesData<SignupStatusDecision[]>({
    queryKey: queryKeys.users.signupDecisionsRoot,
  });
  const previousSignupDetail =
    queryClient.getQueryData<SignupRequestDetail>(signupDetailKey);

  const cached = findCachedPendingUser(queryClient, args.userId);
  const decidedAt = new Date();
  const optimistic: SignupStatusDecision = {
    id: `optimistic-${args.userId}-${decidedAt.getTime()}`,
    userId: args.userId,
    fullName: cached?.fullName ?? args.userName ?? "User",
    email: cached?.email ?? "",
    universityId: cached?.universityId ?? 0,
    universityCard: cached?.universityCard ?? null,
    status: args.status,
    createdAt: cached?.createdAt ? new Date(cached.createdAt) : decidedAt,
    decidedAt,
    decisionActor: args.decisionActor ?? null,
  };

  queryClient.setQueriesData<User[]>(
    { queryKey: queryKeys.users.pendingRoot },
    (old) => (old ? old.filter((u) => u.id !== args.userId) : old),
  );

  // Last pending approve/reject → mark intentional [] (soft-nav SSR reseed guard).
  for (const [key, rows] of queryClient.getQueriesData<User[]>({
    queryKey: queryKeys.users.pendingRoot,
  })) {
    if (Array.isArray(rows) && rows.length === 0) {
      markDensifiedEmpty(key);
    }
  }

  queryClient.setQueriesData<SignupStatusDecision[]>(
    { queryKey: queryKeys.users.signupDecisionsRoot },
    (old) => {
      const next = [optimistic, ...(old ?? [])];
      return next.slice(0, RECENT_SIGNUP_DECISIONS_LIMIT);
    },
  );

  // Detail page: status + timeline so Approve/Reject UI updates without remount.
  queryClient.setQueryData<SignupRequestDetail>(signupDetailKey, (prev) => {
    const base: SignupRequestDetail = prev ?? {
      id: args.userId,
      fullName: cached?.fullName ?? args.userName ?? "User",
      email: cached?.email ?? "",
      universityId: cached?.universityId ?? 0,
      universityCard: cached?.universityCard ?? null,
      status: args.status,
      role: (cached?.role as SignupRequestDetail["role"]) ?? "USER",
      createdAt: cached?.createdAt ? new Date(cached.createdAt) : decidedAt,
      decisions: [],
    };
    return {
      ...base,
      status: args.status,
      decisions: [
        {
          id: optimistic.id,
          status: args.status,
          decidedAt,
          decisionActor: args.decisionActor ?? null,
        },
        ...base.decisions,
      ],
    };
  });

  // Zero-lag Registration Queue pill before onSuccess densify.
  syncPendingSignUpsNav(queryClient);

  return {
    previousPending,
    previousDecisions,
    previousSignupDetail,
    signupDetailKey,
  };
}

/** Restore pending + decisions + detail snapshots after a failed approve/reject. */
export function rollbackOptimisticSignupDecision(
  queryClient: QueryClient,
  context: SignupDecisionOptimisticContext | undefined,
): void {
  context?.previousPending?.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
  context?.previousDecisions?.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
  if (context?.signupDetailKey) {
    queryClient.setQueryData(
      context.signupDetailKey,
      context.previousSignupDetail,
    );
  }
}
