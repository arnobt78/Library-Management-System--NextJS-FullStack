/**
 * Book Review Zod schemas — SSR + API input validation.
 * Parent: CR-0003 / REQ-0034 — Book Review moderation
 */
import { z } from "zod";

// `ReviewStatusValue` (global, see `types.d.ts`) is the canonical review-status
// union used everywhere (SSR queries, API DTOs, `semanticBadges.tsx`). No
// separate Zod status enum/type is declared here — nothing in this codebase
// accepts a raw status transition string that needs schema validation; admin
// moderation is a fixed APPROVED/REJECTED action (`moderateReviewSchema` below).

/** Author create/edit payload — rating must be a whole star 1-5. */
export const reviewContentSchema = z.object({
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(2000, "Comment must be less than 2000 characters"),
});

/** Admin moderation payload — status transition only, no content edit. */
export const moderateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});
