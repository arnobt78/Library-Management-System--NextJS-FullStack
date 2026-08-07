/**
 * Compact genre chip for Library Overview (Recent Borrows / Top Rated).
 * Same Library icon + badge rhythm as ReviewBookCard / ReviewBookIdentity
 * (light admin: outline + violet; dark glass uses glassGenre elsewhere).
 * Parent: REQ-0033 overview consistency
 */

import { Library } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function OverviewGenreChip({
  genre,
  className,
}: {
  genre: string | null | undefined;
  className?: string;
}) {
  if (!genre) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-1.5 py-0.5 text-[10px] font-normal text-violet-700 sm:px-2 sm:text-xs",
        className,
      )}
    >
      <Library className="size-3 shrink-0" aria-hidden />
      {genre}
    </Badge>
  );
}
