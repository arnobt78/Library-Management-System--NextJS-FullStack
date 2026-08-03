"use client";

/**
 * FilterSelect — reusable shadcn Select for simple value/label filter lists.
 * Supports optional Lucide icon + per-option icon/label colors.
 * Trigger height h-9 matches Input / Button for aligned toolbars.
 * labelLayout="inline" puts the label beside the trigger (Sort by meta row).
 *
 * Dark hover: data-[highlighted] keeps icons visible as light text (group override),
 * so emerald/rose accents don’t disappear against the highlight bg.
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
  /** Tailwind classes for the label text */
  itemClassName?: string;
  /** Tailwind classes for the icon only (e.g. emerald genre icons) */
  iconClassName?: string;
};

type FilterSelectProps = {
  /** Accessible label shown above (stacked) or beside (inline) the trigger */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  /** "dark" = public catalog; "light" = admin tables */
  variant?: "dark" | "light";
  /** stacked = label above; inline = label left of trigger */
  labelLayout?: "stacked" | "inline";
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
  labelLayout = "stacked",
  className,
  triggerClassName,
  id,
}: FilterSelectProps) {
  const isDark = variant === "dark";
  const isInline = labelLayout === "inline";

  return (
    <div
      className={cn(
        isInline ? "flex flex-row items-center gap-2" : "space-y-1.5",
        className
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          "block text-sm font-medium",
          isInline ? "mb-0 shrink-0" : "mb-0",
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
              ? "h-9 border-gray-700 bg-dark-300 text-light-100 focus:ring-primary"
              : "h-9 border-gray-300 bg-white text-gray-900 focus:ring-primary-admin",
            isInline && "min-w-0 flex-1",
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
                  "group cursor-pointer",
                  isDark
                    ? // Override base accent-foreground (was hiding icons on hover)
                      "focus:bg-dark-100 focus:text-light-100 data-[highlighted]:bg-dark-100 data-[highlighted]:text-light-100"
                    : "focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
                )}
              >
                <span className="flex items-center gap-2">
                  {Icon ? (
                    <Icon
                      className={cn(
                        "size-4 shrink-0 opacity-90",
                        option.iconClassName,
                        // Hover/highlight: icon matches item text (light), stays visible
                        isDark &&
                          "group-data-[highlighted]:text-light-100 group-focus:text-light-100"
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cn(
                      isDark && !option.itemClassName && "text-light-100",
                      option.itemClassName,
                      isDark &&
                        option.itemClassName &&
                        "group-data-[highlighted]:text-light-100 group-focus:text-light-100"
                    )}
                  >
                    {option.label}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
