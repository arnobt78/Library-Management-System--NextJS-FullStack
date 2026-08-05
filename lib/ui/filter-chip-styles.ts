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
      ? "border-white/15 bg-white/10 text-light-100"
      : "border-gray-200 bg-gray-50 text-gray-700",
  );
}

export function filterChipXClass(surface: FilterChipSurface): string {
  return surface === "dark"
    ? "size-3 shrink-0 text-light-200/80"
    : "size-3 shrink-0 text-gray-600";
}
