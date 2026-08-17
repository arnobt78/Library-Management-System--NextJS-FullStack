/**
 * Assert every MUTATION_DOMAIN_REGISTRY family has a densify checklist entry,
 * and every `required` family has a known densify adapter symbol in the tree.
 */

import { describe, expect, it } from "vitest";
import { MUTATION_DENSIFY_REGISTRY } from "@/lib/query/mutationDensifyRegistry";
import { MUTATION_DOMAIN_REGISTRY } from "@/lib/utils/queryInvalidation";
import { densifyBookWrite } from "@/lib/utils/patchBookCaches";
import { densifyUserWrite } from "@/lib/utils/patchUserCaches";
import { patchBorrowCachesOnStatusChange } from "@/lib/utils/patchBorrowCaches";
import { densifyReservationCreate } from "@/lib/utils/patchReservationCaches";
import { patchReviewCachesOnDelete } from "@/lib/utils/patchReviewCaches";
import { densifyAdminRequestCreate } from "@/lib/utils/patchAdminRequestCaches";
import { patchTicketCachesOnDelete } from "@/lib/utils/patchTicketCaches";
import { densifyNotificationDelete } from "@/lib/utils/patchNotificationCaches";
import { densifyFineConfig, densifyOverdueFines } from "@/lib/utils/patchFineCaches";
import { densifyReminderStats } from "@/lib/utils/patchOpsCaches";
import { densifyRecommendationWrite } from "@/lib/utils/patchRecommendationCaches";

/** required families → at least one exported densify entrypoint (compile-time presence). */
const REQUIRED_DENSIFY_ADAPTERS = {
  "book.write": densifyBookWrite,
  "user.write": densifyUserWrite,
  "borrow.lifecycle": patchBorrowCachesOnStatusChange,
  "reservation.lifecycle": densifyReservationCreate,
  "renewal.write": true, // patchBorrowCachesOnRenewal in MyProfileTabs
  "review.write": patchReviewCachesOnDelete,
  "admin-request.write": densifyAdminRequestCreate,
  "ticket.write": patchTicketCachesOnDelete,
  "notification.write": densifyNotificationDelete,
  "fine.write": densifyFineConfig,
  "operations.write": densifyReminderStats,
  "recommendation.write": densifyRecommendationWrite,
} as const;

describe("MUTATION_DENSIFY_REGISTRY", () => {
  it("covers every mutation family in MUTATION_DOMAIN_REGISTRY", () => {
    const families = Object.keys(MUTATION_DOMAIN_REGISTRY).sort();
    const densify = Object.keys(MUTATION_DENSIFY_REGISTRY).sort();
    expect(densify).toEqual(families);
  });

  it("every required family has a densify adapter (noop families excluded)", () => {
    for (const [family, requirement] of Object.entries(
      MUTATION_DENSIFY_REGISTRY,
    )) {
      if (requirement !== "required") continue;
      expect(
        REQUIRED_DENSIFY_ADAPTERS[
          family as keyof typeof REQUIRED_DENSIFY_ADAPTERS
        ],
      ).toBeTruthy();
    }
  });

  it("fine.write exposes config and overdue stamp densify adapters", () => {
    expect(densifyFineConfig).toBeTypeOf("function");
    expect(densifyOverdueFines).toBeTypeOf("function");
  });
});
