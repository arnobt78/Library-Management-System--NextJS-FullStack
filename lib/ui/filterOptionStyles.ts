/**
 * Shared FilterSelect option builders — icons + text colors for catalog/admin filters.
 * Keeps call sites DRY and visually consistent.
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
} from "lucide-react";
import type { FilterSelectOption } from "@/components/ui/filter-select";

/** Soft genre tint by name — mid tones readable on light and dark triggers. */
const GENRE_COLORS: Record<string, string> = {
  "Computer Science": "text-sky-500",
  Programming: "text-violet-500",
  "Self Help": "text-amber-500",
  Software: "text-indigo-400",
  "System Design": "text-fuchsia-500",
  "Web Development": "text-cyan-500",
};

export function genreFilterOptions(
  genres: string[],
  allLabel = "All Genres"
): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: allLabel,
      icon: Library,
      itemClassName: "text-slate-500",
    },
    ...genres.map((genre) => ({
      value: genre,
      label: genre,
      icon: Layers as LucideIcon,
      itemClassName: GENRE_COLORS[genre] ?? "text-slate-500",
    })),
  ];
}

export function availabilityFilterOptions(
  allLabel = "All Books"
): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: allLabel,
      icon: List,
      itemClassName: "text-slate-500",
    },
    {
      value: "available",
      label: "Available",
      icon: CircleCheck,
      itemClassName: "text-emerald-500",
    },
    {
      value: "unavailable",
      label: "Unavailable",
      icon: CircleX,
      itemClassName: "text-rose-500",
    },
  ];
}

export function userStatusFilterOptions(): FilterSelectOption[] {
  return [
    { value: "all", label: "All", icon: List, itemClassName: "text-slate-500" },
    {
      value: "APPROVED",
      label: "Approved",
      icon: CheckCircle,
      itemClassName: "text-emerald-500",
    },
    {
      value: "PENDING",
      label: "Pending",
      icon: Clock,
      itemClassName: "text-amber-500",
    },
    {
      value: "REJECTED",
      label: "Rejected",
      icon: XCircle,
      itemClassName: "text-rose-500",
    },
  ];
}

export function userRoleFilterOptions(): FilterSelectOption[] {
  return [
    { value: "all", label: "All", icon: Users, itemClassName: "text-slate-500" },
    {
      value: "USER",
      label: "Users",
      icon: User,
      itemClassName: "text-blue-500",
    },
    {
      value: "ADMIN",
      label: "Admins",
      icon: Shield,
      itemClassName: "text-purple-500",
    },
  ];
}

export function borrowStatusFilterOptions(): FilterSelectOption[] {
  return [
    { value: "all", label: "All", icon: List, itemClassName: "text-slate-500" },
    {
      value: "PENDING",
      label: "Pending",
      icon: Clock,
      itemClassName: "text-amber-500",
    },
    {
      value: "BORROWED",
      label: "Borrowed",
      icon: BookOpen,
      itemClassName: "text-blue-500",
    },
    {
      value: "RETURNED",
      label: "Returned",
      icon: Undo2,
      itemClassName: "text-emerald-500",
    },
  ];
}

export function ratingFilterOptions(): FilterSelectOption[] {
  return [
    {
      value: "all",
      label: "All Ratings",
      icon: Star,
      itemClassName: "text-slate-500",
    },
    {
      value: "5",
      label: "5 Stars",
      icon: Star,
      itemClassName: "text-amber-500",
    },
    {
      value: "4",
      label: "4+ Stars",
      icon: Star,
      itemClassName: "text-amber-500",
    },
    {
      value: "3",
      label: "3+ Stars",
      icon: Star,
      itemClassName: "text-amber-500",
    },
    {
      value: "2",
      label: "2+ Stars",
      icon: Star,
      itemClassName: "text-amber-500",
    },
    {
      value: "1",
      label: "1+ Stars",
      icon: Star,
      itemClassName: "text-amber-500",
    },
  ];
}

export function sortFilterOptions(): FilterSelectOption[] {
  return [
    {
      value: "title",
      label: "Title A-Z",
      icon: ArrowUpAZ,
      itemClassName: "text-slate-500",
    },
    {
      value: "author",
      label: "Author A-Z",
      icon: ArrowUpAZ,
      itemClassName: "text-slate-500",
    },
    {
      value: "rating",
      label: "Rating (High to Low)",
      icon: ArrowDownWideNarrow,
      itemClassName: "text-amber-500",
    },
    {
      value: "date",
      label: "Newest First",
      icon: CalendarClock,
      itemClassName: "text-sky-500",
    },
  ];
}
