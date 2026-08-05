/**
 * Single source of truth for Book Review moderation status labels + dropdown
 * option lists. Mirrors `lib/ui/ticketOptions.ts` so badge labels and the
 * admin filter Select stay in lockstep.
 * Parent: CR-0003 / REQ-0034 cosmetic DRY
 */

export const REVIEW_STATUS_LABELS: Record<ReviewStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const REVIEW_STATUS_OPTIONS: {
  value: ReviewStatusValue;
  label: string;
}[] = (Object.keys(REVIEW_STATUS_LABELS) as ReviewStatusValue[]).map(
  (value) => ({ value, label: REVIEW_STATUS_LABELS[value] }),
);

/** FilterSelect options including the "all" sentinel used by BookReviewList. */
export const REVIEW_STATUS_FILTER_OPTIONS: {
  value: string;
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  ...REVIEW_STATUS_OPTIONS,
];
