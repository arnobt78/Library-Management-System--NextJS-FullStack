/**
 * Admin page title + subtitle (Stockly PageSectionHeader rhythm).
 * Icon tile stretches to title+subtitle kebab height (no mt/gap between lines).
 * Parent: admin shell Stockly chrome
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-stretch gap-2 sm:mb-6 sm:gap-3",
        className,
      )}
    >
      {Icon ? (
        <span
          className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-primary-admin/20 bg-primary-admin/10 px-2 py-1.5 text-primary-admin sm:px-2.5"
          aria-hidden
        >
          <Icon className="size-4 sm:size-5" />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
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
  );
}
