/**
 * "All admin" assignee placeholder — UsersRound icon + label (table + Select).
 * Parent: CR-0003 / REQ-0034
 */
"use client";

import { UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function AllAdminLabel({
  variant = "light",
  className,
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm",
        variant === "dark" ? "text-light-200/80" : "text-gray-600",
        className,
      )}
    >
      <UsersRound
        className={cn(
          "size-4 shrink-0",
          variant === "dark" ? "text-primary" : "text-primary-admin",
        )}
        aria-hidden
      />
      All admin
    </span>
  );
}
