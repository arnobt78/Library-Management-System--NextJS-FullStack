"use client";

/**
 * FilterSelect — reusable shadcn Select for simple value/label filter lists.
 * Supports optional Lucide icon + colored label per option.
 * Used by catalog and admin list filters so native <select> is never needed.
 */

import type { LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterSelectOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** Tailwind text color classes for the item label / icon */
  itemClassName?: string;
};

type FilterSelectProps = {
  /** Accessible label shown above the trigger */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  /** "dark" = public catalog; "light" = admin tables */
  variant?: "dark" | "light";
  className?: string;
  triggerClassName?: string;
  id?: string;
};

export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  variant = "light",
  className,
  triggerClassName,
  id,
}: FilterSelectProps) {
  const isDark = variant === "dark";

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "block text-sm font-medium",
          isDark ? "text-light-100" : "text-gray-700"
        )}
      >
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          className={cn(
            isDark
              ? "h-10 border-gray-700 bg-dark-300 text-light-100 focus:ring-primary"
              : "h-10 border-gray-300 bg-white text-gray-900 focus:ring-primary-admin",
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent
          className={cn(
            isDark
              ? "border-gray-700 bg-dark-300 text-light-100"
              : "border-gray-200 bg-white text-gray-900"
          )}
        >
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <SelectItem
                key={option.value}
                value={option.value}
                textValue={option.label}
                className={cn(
                  "cursor-pointer",
                  isDark
                    ? "focus:bg-dark-100 focus:text-light-100"
                    : "focus:bg-gray-100 focus:text-gray-900"
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-2",
                    option.itemClassName
                  )}
                >
                  {Icon ? (
                    <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                  ) : null}
                  <span>{option.label}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
