"use client";

/**
 * Back-navigation without a second wipe of densified caches.
 *
 * Mutation handlers already `invalidateMutation` then re-seed ticket lists via
 * `patchTicketCaches*`. Calling invalidate again here would `removeQueries`
 * inactive lists and force a stale-SSR → refetch flash on Back.
 * Parent: CR-0003 / REQ-0034 — H5 flash fix
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MutationDomainName } from "@/lib/utils/queryInvalidation";

export function useBackWithRefresh(
  _domain: MutationDomainName,
  fallbackHref: string,
) {
  const router = useRouter();

  return useCallback(() => {
    // Prefer push to the list route so we land on densified TanStack cache
    // instead of a history entry that may restore a stale RSC payload.
    router.push(fallbackHref);
  }, [router, fallbackHref]);
}
