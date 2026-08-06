/**
 * Playbook §8.3 densify checklist — every mutation family must declare whether
 * list/detail/badge densify is required or explicitly noop.
 *
 * Adapters live in patch*Caches / optimistic helpers; gateway callers MUST
 * match this registry (tests assert coverage).
 */

import type { MutationDomainName } from "@/lib/utils/queryInvalidation";

export type DensifyRequirement = "required" | "noop";

/**
 * required = commitMutationCache densify must patch related keys when payload exists
 * noop = invalidate-only is acceptable (ops/bulk) but still go through gateway when practical
 */
export const MUTATION_DENSIFY_REGISTRY = {
  "book.write": "required",
  "user.write": "required",
  "borrow.lifecycle": "required",
  "reservation.lifecycle": "required",
  "renewal.write": "required",
  "review.write": "required",
  "admin-request.write": "required",
  "fine.write": "noop",
  "recommendation.write": "noop",
  "operations.write": "noop",
  "ticket.write": "required",
  "notification.write": "required",
} as const satisfies Record<MutationDomainName, DensifyRequirement>;

export function densifyRequirementFor(
  mutation: MutationDomainName,
): DensifyRequirement {
  return MUTATION_DENSIFY_REGISTRY[mutation];
}
