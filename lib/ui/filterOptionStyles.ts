/**
 * Shared FilterSelect option builders — icons + text colors for catalog/admin filters.
 * `surface: "dark"` (public catalog) uses neutral muted chrome; `"light"` (admin) keeps accent colors.
 */

import type { LucideIcon } from "lucide-react";
import {
  List,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  User,
  Shield,
  BookOpen,
  Undo2,
  CircleCheck,
  CircleX,
  Layers,
  Star,
  ArrowUpAZ,
  ArrowDownWideNarrow,
  CalendarClock,
  Library,
  Cpu,
  Code2,
  Heart,
  AppWindow,
  Network,
  Globe,
} from "lucide-react";
import type { FilterSelectOption } from "@/components/ui/filter-select";

/** Catalog (dark) vs admin (light) option chrome. */
export type FilterSurface = "dark" | "light";

/** Distinct Lucide icon per known genre (fallback: Layers). */
const GENRE_ICONS: Record<string, LucideIcon> = {
  "Computer Science": Cpu,
  Programming: Code2,
  "Self Help": Heart,
  Software: AppWindow,
  "System Design": Network,
  "Web Development": Globe,
};

/** Shared green for genre icons — labels stay neutral (inherit select text). */
const GENRE_ICON_CLASS = "text-emerald-500";

/** Muted “all / default” icon tone by surface. */
function mutedIcon(surface: FilterSurface): string {
  return surface === "dark" ? "text-light-200/70" : "text-slate-500";
}

/** Muted label tone (light admin only — dark inherits trigger text). */
function mutedLabel(surface: FilterSurface): string | undefined {
  return surface === "dark" ? undefined : "text-slate-500";
}

export function genreFilterOptions(
  genres: string[],
  allLabel = "All Genres",
  surface: FilterSurface = "light"
): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: allLabel,
      icon: Library,
      iconClassName: mutedIcon(surface),
      itemClassName: mutedLabel(surface),
    },
    ...genres.map((genre) => ({
      value: genre,
      label: genre,
      icon: GENRE_ICONS[genre] ?? Layers,
      iconClassName: GENRE_ICON_CLASS,
      // No itemClassName — genre labels match other options
    })),
  ];
}

/** Resolve genre chip icon for active-filter badges (All Books meta row). */
export function genreFilterIcon(genre: string): LucideIcon {
  return GENRE_ICONS[genre] ?? Layers;
}

export function availabilityFilterOptions(
  allLabel = "All Books",
  surface: FilterSurface = "light"
): FilterSelectOption[] {
  const allMuted = mutedIcon(surface);
  const allLabelClass = mutedLabel(surface);

  return [
    {
      value: "all",
      label: allLabel,
      icon: List,
      itemClassName: allLabelClass,
      iconClassName: allMuted,
    },
    {
      value: "available",
      label: "Available",
      icon: CircleCheck,
      // Dark: inherit label; keep emerald icon. Light: colored label + icon.
      itemClassName: surface === "dark" ? undefined : "text-emerald-500",
      iconClassName: "text-emerald-500",
    },
    {
      value: "unavailable",
      label: "Unavailable",
      icon: CircleX,
      itemClassName: surface === "dark" ? undefined : "text-rose-500",
      iconClassName: "text-rose-500",
    },
  ];
}

export function userStatusFilterOptions(): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: "All",
      icon: List,
      itemClassName: "text-slate-500",
      iconClassName: "text-slate-500",
    },
    {
      value: "APPROVED",
      label: "Approved",
      icon: CheckCircle,
      itemClassName: "text-emerald-500",
      iconClassName: "text-emerald-500",
    },
    {
      value: "PENDING",
      label: "Pending",
      icon: Clock,
      itemClassName: "text-amber-500",
      iconClassName: "text-amber-500",
    },
    {
      value: "REJECTED",
      label: "Rejected",
      icon: XCircle,
      itemClassName: "text-rose-500",
      iconClassName: "text-rose-500",
    },
  ];
}

export function userRoleFilterOptions(): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: "All",
      icon: Users,
      itemClassName: "text-slate-500",
      iconClassName: "text-slate-500",
    },
    {
      value: "USER",
      label: "Users",
      icon: User,
      itemClassName: "text-blue-500",
      iconClassName: "text-blue-500",
    },
    {
      value: "ADMIN",
      label: "Admins",
      icon: Shield,
      itemClassName: "text-purple-500",
      iconClassName: "text-purple-500",
    },
  ];
}

export function borrowStatusFilterOptions(): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: "All",
      icon: List,
      itemClassName: "text-slate-500",
      iconClassName: "text-slate-500",
    },
    {
      value: "PENDING",
      label: "Pending",
      icon: Clock,
      itemClassName: "text-amber-500",
      iconClassName: "text-amber-500",
    },
    {
      value: "BORROWED",
      label: "Borrowed",
      icon: BookOpen,
      itemClassName: "text-blue-500",
      iconClassName: "text-blue-500",
    },
    {
      value: "RETURNED",
      label: "Returned",
      icon: Undo2,
      itemClassName: "text-emerald-500",
      iconClassName: "text-emerald-500",
    },
    {
      value: "CANCELLED",
      label: "Cancelled",
      icon: XCircle,
      itemClassName: "text-rose-500",
      iconClassName: "text-rose-500",
    },
  ];
}

export function ratingFilterOptions(
  surface: FilterSurface = "light"
): FilterSelectOption[] {
  // Dark catalog: light/muted star icons (same chrome as Genre/Availability text), not amber
  if (surface === "dark") {
    const icon = mutedIcon("dark");
    return [
      { value: "all", label: "All Ratings", icon: Star, iconClassName: icon },
      { value: "5", label: "5 Stars", icon: Star, iconClassName: icon },
      { value: "4", label: "4+ Stars", icon: Star, iconClassName: icon },
      { value: "3", label: "3+ Stars", icon: Star, iconClassName: icon },
      { value: "2", label: "2+ Stars", icon: Star, iconClassName: icon },
      { value: "1", label: "1+ Stars", icon: Star, iconClassName: icon },
    ];
  }

  return [
    {
      value: "all",
      label: "All Ratings",
      icon: Star,
      itemClassName: "text-slate-500",
      iconClassName: "text-slate-500",
    },
    {
      value: "5",
      label: "5 Stars",
      icon: Star,
      itemClassName: "text-amber-500",
      iconClassName: "text-amber-500",
    },
    {
      value: "4",
      label: "4+ Stars",
      icon: Star,
      itemClassName: "text-amber-500",
      iconClassName: "text-amber-500",
    },
    {
      value: "3",
      label: "3+ Stars",
      icon: Star,
      itemClassName: "text-amber-500",
      iconClassName: "text-amber-500",
    },
    {
      value: "2",
      label: "2+ Stars",
      icon: Star,
      itemClassName: "text-amber-500",
      iconClassName: "text-amber-500",
    },
    {
      value: "1",
      label: "1+ Stars",
      icon: Star,
      itemClassName: "text-amber-500",
      iconClassName: "text-amber-500",
    },
  ];
}

export function sortFilterOptions(
  surface: FilterSurface = "light"
): FilterSelectOption[] {
  // Dark catalog: equal neutral chrome for Title / Author / Rating / Newest
  if (surface === "dark") {
    const icon = mutedIcon("dark");
    return [
      {
        value: "title",
        label: "Title A-Z",
        icon: ArrowUpAZ,
        iconClassName: icon,
      },
      {
        value: "author",
        label: "Author A-Z",
        icon: ArrowUpAZ,
        iconClassName: icon,
      },
      {
        value: "rating",
        label: "Rating (High to Low)",
        icon: ArrowDownWideNarrow,
        iconClassName: icon,
      },
      {
        value: "date",
        label: "Newest First",
        icon: CalendarClock,
        iconClassName: icon,
      },
    ];
  }

  return [
    {
      value: "title",
      label: "Title A-Z",
      icon: ArrowUpAZ,
      itemClassName: "text-slate-500",
      iconClassName: "text-slate-500",
    },
    {
      value: "author",
      label: "Author A-Z",
      icon: ArrowUpAZ,
      itemClassName: "text-slate-500",
      iconClassName: "text-slate-500",
    },
    {
      value: "rating",
      label: "Rating (High to Low)",
      icon: ArrowDownWideNarrow,
      itemClassName: "text-amber-500",
      iconClassName: "text-amber-500",
    },
    {
      value: "date",
      label: "Newest First",
      icon: CalendarClock,
      itemClassName: "text-sky-500",
      iconClassName: "text-sky-500",
    },
  ];
}
