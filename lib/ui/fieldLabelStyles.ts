/**
 * Shared admin detail micro-label tokens.
 * leading-none keeps uppercase glyphs optically centered with Lucide icons
 * (default line-height makes text look high vs size-3.5 icons — no pt- hacks).
 */

/** Text-only micro-label (About / Reviewer / etc.). */
export const FIELD_LABEL_TEXT =
  "text-[11px] font-medium uppercase leading-none tracking-wide text-gray-500";

/**
 * Icon + label row — use with Lucide `size-3.5 shrink-0`.
 * flex (not inline-flex) so sibling values/badges stack on the next line.
 * items-center + leading-none = true vertical middle of icon+text.
 */
export const FIELD_LABEL_ROW = `flex items-center gap-1.5 ${FIELD_LABEL_TEXT}`;
