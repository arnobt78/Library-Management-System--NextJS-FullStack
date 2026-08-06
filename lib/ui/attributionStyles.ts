/**
 * Shared PersonAttribution / ReviewDateMeta tone tokens.
 * Keeps “Approved by” prefixes locked to Submitted chip size/color.
 * Parent: REQ-0035 / REQ-0033 attribution polish
 */

/** Prefix + ReviewDateMeta chip size (Submitted / Approved / …). */
export const ATTRIBUTION_META_SIZE = "text-[10px] sm:text-xs";

/** Dark glass meta label (Submitted, Approved by). */
export const ATTRIBUTION_META_TONE_DARK = "text-light-100";

/** Light admin-panel meta label. */
export const ATTRIBUTION_META_TONE_LIGHT = "text-gray-500";

/** Non-linked name on dark glass — not a sky link affordance. */
export const ATTRIBUTION_NAME_STATIC_DARK =
  "text-light-100 transition-colors hover:text-sky-100/80";

/** Non-linked name on light admin panels. */
export const ATTRIBUTION_NAME_STATIC_LIGHT =
  "text-gray-900 transition-colors hover:text-sky-700/80";

/** Name + email responsive size across stack/inline layouts (name line). */
export const ATTRIBUTION_PERSON_SIZE = "text-xs sm:text-sm";

/**
 * Email under name (stack) and inline email — always text-xs, muted.
 * Kept below the name label in PersonAttribution stack layout.
 */
export const ATTRIBUTION_EMAIL_SIZE = "text-xs";

/** Email + copy icon (and · separator) — always muted, both glass variants. */
export const ATTRIBUTION_EMAIL_TONE = "text-muted-foreground";

/** Table / attribution names — normal weight (headers keep font-medium). */
export const ATTRIBUTION_NAME_WEIGHT = "font-normal";
