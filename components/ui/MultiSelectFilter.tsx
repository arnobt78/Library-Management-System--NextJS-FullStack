/**
 * MultiSelectFilter — checkbox multi-select dropdown for list toolbars
 * (status/priority/rating filters). Built on the existing Radix
 * dropdown-menu checkbox item — no new Radix package required.
 * Parent: CR-0003 / REQ-0034
 */
"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
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
  className?: string;
  triggerClassName?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
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

  const summary =
    selected.length === 0
      ? label
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? label
        : `${label} (${selected.length})`;

  return (
    <DropdownMenu>
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
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
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
