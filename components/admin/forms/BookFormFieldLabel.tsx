/**
 * Book create/edit field label — Lucide icon + text + optional rose required *.
 * Optical middle via items-center + leading-none (same idea as FIELD_LABEL_ROW).
 * Parent: REQ-0033 book form UI polish
 */
"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FormLabel } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function BookFormFieldLabel({
  icon: Icon,
  children,
  required = false,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  /** Zod-required catalog fields get a rose asterisk after the label. */
  required?: boolean;
  className?: string;
}) {
  return (
    <FormLabel
      className={cn(
        "flex items-center gap-1.5 text-sm font-normal leading-none text-dark-500 sm:text-base",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-gray-500" aria-hidden />
      <span>{children}</span>
      {required ? (
        <span className="text-rose-600" aria-hidden>
          *
        </span>
      ) : null}
    </FormLabel>
  );
}
