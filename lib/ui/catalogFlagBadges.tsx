/**
 * Light glass Active / Featured badges for admin Book Catalog detail header.
 * Same translucent family as semanticBadges ticket status (no dark glass on light admin).
 */
import { CheckCircle2, Star, StarOff, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const badgeBase =
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium leading-none";

const ACTIVE_LIGHT =
  "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-sm backdrop-blur-sm";
const INACTIVE_LIGHT =
  "border-rose-200 bg-rose-50/90 text-rose-700 shadow-sm backdrop-blur-sm";
const FEATURED_LIGHT =
  "border-sky-200 bg-sky-50/90 text-sky-700 shadow-sm backdrop-blur-sm";
const NOT_FEATURED_LIGHT =
  "border-slate-200/80 bg-slate-50/90 text-slate-600 shadow-sm backdrop-blur-sm";

/** Catalog lending flag — Active / Inactive. */
export function CatalogActiveBadge({
  isActive,
  className,
}: {
  isActive: boolean;
  className?: string;
}) {
  const Icon = isActive ? CheckCircle2 : XCircle;
  return (
    <Badge
      className={cn(
        badgeBase,
        isActive ? ACTIVE_LIGHT : INACTIVE_LIGHT,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

/** Homepage feature flag — Featured · Homepage / Not featured. */
export function CatalogFeaturedBadge({
  isFeatured,
  className,
}: {
  isFeatured: boolean;
  className?: string;
}) {
  const Icon = isFeatured ? Star : StarOff;
  return (
    <Badge
      className={cn(
        badgeBase,
        isFeatured ? FEATURED_LIGHT : NOT_FEATURED_LIGHT,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {isFeatured ? "Featured · Homepage" : "Not featured"}
    </Badge>
  );
}
