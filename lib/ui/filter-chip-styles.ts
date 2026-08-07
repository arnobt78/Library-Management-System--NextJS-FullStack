/**
 * Shared filter-chip row styles (stock-inventory REQ-0043 parity).
 * Dark = root glass lists; light = admin white panels.
 * X dismiss hover: rose; Reset hover: sky/primary.
 * Parent: CR-0003 / REQ-0034
 */
import { cn } from "@/lib/utils";

export type FilterChipSurface = "dark" | "light";

export const FILTER_CHIP_ROW_CLASS =
  "mt-3 flex flex-wrap items-center gap-2 sm:mt-3";

/**
 * Dark glassmorphic chip pill (all-books / profile) — frosted fill + soft glow.
 * Matches Badge `glass*` / profile CTA language without solid white secondary.
 */
export function filterChipGlassPillClass(
  tone: "muted" | "genre" | "warn" | "rating" = "muted",
): string {
  const tones = {
    muted:
      "border-gray-400/30 bg-gradient-to-r from-gray-500/30 via-gray-500/15 to-gray-600/20 text-light-100 shadow-[0_10px_28px_rgba(107,114,128,0.22)]",
    genre:
      "border-emerald-400/30 bg-gradient-to-r from-emerald-500/30 via-emerald-500/15 to-green-600/20 text-light-100 shadow-[0_10px_28px_rgba(16,185,129,0.22)]",
    warn:
      "border-rose-400/30 bg-gradient-to-r from-rose-500/30 via-rose-500/15 to-red-600/20 text-light-100 shadow-[0_10px_28px_rgba(244,63,94,0.22)]",
    rating:
      "border-amber-400/30 bg-gradient-to-r from-amber-500/30 via-amber-500/15 to-yellow-600/20 text-light-100 shadow-[0_10px_28px_rgba(245,158,11,0.22)]",
  } as const;
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1 text-xs backdrop-blur-sm sm:text-sm",
    tones[tone],
  );
}

/** Dark glass Clear / Reset CTA — same host as `.profile-action-btn--clear`.
 * Do NOT add `btn-ripple` here — that class is for the spawned ripple span only
 * (absolute + scale(0)); use `withRippleClick` on the button instead.
 */
export const FILTER_CLEAR_GLASS_BTN_CLASS =
  "profile-action-btn profile-action-btn--clear h-auto gap-1.5 px-3 py-1.5 text-xs font-medium text-white sm:text-sm";

export function filterChipGroupLabelClass(surface: FilterChipSurface): string {
  return surface === "dark"
    ? "text-xs text-light-200/80"
    : "text-xs text-gray-600";
}

export function filterChipDismissBtnClass(surface: FilterChipSurface): string {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full pr-1.5 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2",
    surface === "dark"
      ? "focus-visible:ring-primary/40 hover:bg-rose-500/15 hover:text-rose-300"
      : "focus-visible:ring-sky-500/40 hover:bg-rose-500/10 hover:text-rose-600",
  );
}

export function filterChipResetBtnClass(surface: FilterChipSurface): string {
  return cn(
    "h-8 gap-1.5 px-2 text-xs",
    surface === "dark"
      ? "text-light-200/80 hover:bg-primary/15 hover:text-primary"
      : "text-gray-700 hover:bg-sky-500/10 hover:text-sky-600",
  );
}

export function filterChipCollapsedClass(surface: FilterChipSurface): string {
  return cn(
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs backdrop-blur-md",
    surface === "dark"
      ? "border-white/15 bg-white/10 text-light-100 shadow-[0_8px_24px_rgba(255,255,255,0.06)]"
      : "border-gray-200 bg-gray-50 text-gray-700",
  );
}

export function filterChipXClass(surface: FilterChipSurface): string {
  return surface === "dark"
    ? "size-3 shrink-0 text-light-200/80"
    : "size-3 shrink-0 text-gray-600";
}

export function filterChipDismissXBtnClass(surface: FilterChipSurface): string {
  return cn(
    "inline-flex size-5 items-center justify-center rounded-full transition-colors",
    surface === "dark"
      ? "hover:bg-rose-500/20 hover:text-rose-300"
      : "hover:bg-black/10",
  );
}
