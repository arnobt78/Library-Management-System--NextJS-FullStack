/**
 * Readable University ID + copy control for PersonAttribution `meta`
 * (delete dialogs, detail parties). Contrast-safe on light admin + dark glass.
 */

import CopyableText from "@/components/ui/CopyableText";
import { cn } from "@/lib/utils";

export default function UniversityIdMeta({
  universityId,
  variant = "light",
  className,
}: {
  universityId: number | null | undefined;
  variant?: "light" | "dark";
  className?: string;
}) {
  if (typeof universityId !== "number" || universityId <= 0) return null;

  const isDark = variant === "dark";

  return (
    <span
      className={cn(
        "inline-flex min-w-0 flex-wrap items-center gap-1 text-xs leading-none",
        isDark ? "text-light-200" : "text-gray-600",
        className,
      )}
    >
      <span className={isDark ? "text-light-200/80" : "text-gray-500"}>
        University ID
      </span>
      <CopyableText
        value={String(universityId)}
        label="university ID"
        className={cn(
          "font-medium",
          isDark ? "text-light-100" : "text-dark-200",
        )}
      />
    </span>
  );
}
