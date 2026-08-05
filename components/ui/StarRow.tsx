/**
 * Shared 5-star rating display — replaces four near-identical `StarRow`
 * copies (MyReviewsTab, AdminBookReviewDetailContent, BookReviewList,
 * ReviewsSection) that only differed in icon size/gap/fill color.
 * Parent: CR-0003 / REQ-0034 — Book Review moderation
 */
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRowProps {
  rating: number;
  /** Icon size class — defaults to the most common "sm" (size-3.5). */
  starClassName?: string;
  /** Fill/text color for filled stars — defaults to amber-400. */
  filledClassName?: string;
  /** Fill/text color for empty stars — defaults to gray-200. */
  emptyClassName?: string;
  /** Container gap/layout override. */
  className?: string;
}

export default function StarRow({
  rating,
  starClassName = "size-3.5",
  filledClassName = "fill-amber-400 text-amber-400",
  emptyClassName = "fill-gray-200 text-gray-200",
  className,
}: StarRowProps) {
  // Always keep horizontal flex — callers used to pass className="shrink-0"
  // alone, which replaced the default and stacked Lucide stars vertically.
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            starClassName,
            star <= rating ? filledClassName : emptyClassName,
          )}
        />
      ))}
    </div>
  );
}
