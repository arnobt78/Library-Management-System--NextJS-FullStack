/**
 * Shared period FilterSelect options (Today / 7 / 30 / All).
 * Used by admin Activity History and My Profile tab list filters.
 */
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  List,
} from "lucide-react";
import type { FilterSelectOption } from "@/components/ui/filter-select";
import type { FilterSurface } from "@/lib/ui/filterOptionStyles";

export type ListPeriod = "today" | "7days" | "30days" | "all";

function mutedIcon(surface: FilterSurface): string {
  return surface === "dark" ? "text-light-200/70" : "text-slate-500";
}

/** Period options with surface-aware icon tones. */
export function periodFilterOptions(
  surface: FilterSurface = "light",
): FilterSelectOption[] {
  const muted = mutedIcon(surface);
  return [
    {
      value: "today",
      label: "Today",
      icon: CalendarDays,
      iconClassName: surface === "dark" ? "text-sky-300" : "text-sky-500",
    },
    {
      value: "7days",
      label: "Last 7 Days",
      icon: CalendarRange,
      iconClassName: surface === "dark" ? "text-violet-300" : "text-violet-500",
    },
    {
      value: "30days",
      label: "Last 30 Days",
      icon: CalendarClock,
      iconClassName: surface === "dark" ? "text-amber-300" : "text-amber-500",
    },
    {
      value: "all",
      // Dark (profile): All Time; light (admin activity): All History
      label: surface === "dark" ? "All Time" : "All History",
      icon: List,
      iconClassName: muted,
    },
  ];
}
