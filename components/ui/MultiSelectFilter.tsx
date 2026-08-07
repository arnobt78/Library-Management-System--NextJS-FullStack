/**
 * MultiSelectFilter — checkbox multi-select dropdown for list toolbars
 * (status/priority filters). Label lives in the trigger when empty (no top label).
 * Check indicator is on the right (parity with FilterSelect). Parent: CR-0003.
 * modal={false}: avoid body scroll-lock so sticky admin header / hamburger stay visible.
 */
"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** Tailwind classes for the icon (e.g. text-emerald-500) */
  iconClassName?: string;
}

export interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Icon shown on the empty / multi-select trigger (e.g. List / Flag) */
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
  triggerClassName?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  icon: FilterIcon,
  iconClassName,
  className,
  triggerClassName,
}: MultiSelectFilterProps) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const single =
    selected.length === 1
      ? options.find((o) => o.value === selected[0])
      : undefined;

  const TriggerIcon = single?.icon ?? FilterIcon;
  const triggerIconClass =
    single?.iconClassName ?? iconClassName ?? "text-slate-500";

  const summary =
    selected.length === 0
      ? label
      : selected.length === 1
        ? (single?.label ?? label)
        : `${label} (${selected.length})`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-between gap-2 border-gray-300 bg-white text-sm font-normal text-gray-700 hover:bg-gray-50",
            selected.length > 0 && "border-primary-admin/40 text-dark-400",
            triggerClassName,
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {TriggerIcon ? (
              <TriggerIcon
                className={cn("size-4 shrink-0 opacity-90", triggerIconClass)}
                aria-hidden
              />
            ) : null}
            <span className="truncate">{summary}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer gap-2"
            >
              {Icon ? (
                <Icon
                  className={cn("size-3.5 shrink-0", option.iconClassName)}
                  aria-hidden
                />
              ) : null}
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
        {selected.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-2 py-1.5 text-left text-xs font-medium text-gray-500 hover:text-rose-600"
            >
              Clear selection
            </button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
