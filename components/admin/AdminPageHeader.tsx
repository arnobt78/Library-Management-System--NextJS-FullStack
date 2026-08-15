/**
 * Admin page title + subtitle (Stockly PageSectionHeader rhythm).
 * Optional trailing actions (Create CTA) sit justify-between without widening title stack.
 * Parent: admin shell Stockly chrome; admin books catalog polish
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Right-aligned CTA (e.g. Create a New Book) — self-center, no title space-y stretch. */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-between gap-3 sm:mb-6",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-stretch gap-2 sm:gap-3">
        {Icon ? (
          <span
            className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-primary-admin/20 bg-primary-admin/10 px-2 py-1.5 text-primary-admin sm:px-2.5"
            aria-hidden
          >
            <Icon className="size-4 sm:size-5" />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col justify-center">
          <h1 className="text-sm font-medium leading-tight text-dark-400 sm:text-lg">
            {title}
          </h1>
          {description ? (
            <p className="text-xs leading-tight text-gray-500 sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0 self-center">{actions}</div> : null}
    </div>
  );
}
