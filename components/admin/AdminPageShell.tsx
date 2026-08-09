/**
 * AdminPageShell — shared admin list/dashboard stack.
 *
 * Order: header → optional StatCardGrid (sibling) → panel children.
 * Never wrap KPIs in `.admin-panel` / overflow-x-hidden roots (clips card shadows).
 * Parent: REQ-0033 admin chrome parity
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageShell({
  header,
  kpis,
  children,
  className,
}: {
  /** Typically AdminPageHeader */
  header: ReactNode;
  /** StatCardGrid — always outside white list panels */
  kpis?: ReactNode;
  /** .admin-panel / AdminSurfacePanel / chart bodies only */
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4 sm:space-y-6", className)}>
      {header}
      {kpis}
      {children}
    </section>
  );
}
