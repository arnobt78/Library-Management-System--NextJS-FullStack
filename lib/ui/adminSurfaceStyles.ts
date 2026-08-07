/**
 * Shared admin white-panel / KPI surface tokens.
 * Keep class strings in sync with `.admin-panel` / `.admin-stat-card` / `.kpi-card`
 * in `styles/admin.css` and `app/globals.css`.
 *
 * Do NOT put `btn-ripple` on panel hosts — that class is for the spawned ripple
 * span only (scale(0) flash if misapplied to the button).
 * Parent: REQ-0033 admin glass polish
 */

import { CARD_PAD_CLASS } from "@/lib/ui/cardPadStyles";

/** Outer table / analytics shell — borderless, soft depth + hover. */
export const ADMIN_PANEL_SHELL =
  "w-full rounded-2xl bg-white shadow-md transition-shadow duration-200 hover:shadow-lg";

/** Panel shell + canonical pad (matches `.admin-panel`). */
export const ADMIN_PANEL_CLASS = `${ADMIN_PANEL_SHELL} ${CARD_PAD_CLASS}`;

/**
 * Overview mid/analytics cards — same shell as `.admin-panel` with flex-1
 * for equal-height chart rows (alias of `.admin-stat-card` / upgraded `.stat`).
 */
export const ADMIN_STAT_CARD_CLASS = `${ADMIN_PANEL_CLASS} flex-1 space-y-4`;

/** Optional subtle top accent for non-KPI analytics cards. */
export const ADMIN_PANEL_TOP_STROKE =
  "relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-sky-400 before:to-violet-400";
