import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — solid + glassmorphic variants (see docs/UI_STYLING_GUIDE.md).
 * Prefer glass* variants on dark root surfaces; keep default/secondary for admin light UIs.
 */
// eslint-disable-next-line tailwindcss/classnames-order
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-100 text-green-800 hover:bg-green-200",
        warning:
          "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        pending:
          "border-transparent bg-orange-100 text-orange-800 hover:bg-orange-200",
        /** Glass: active / borrowed (blue) */
        glassBorrowed:
          "border-blue-400/30 bg-gradient-to-r from-blue-500/25 via-blue-500/10 to-blue-500/5 text-white backdrop-blur-sm shadow-[0_10px_30px_rgba(59,130,246,0.2)]",
        /** Glass: pending approval (amber) */
        glassPending:
          "border-amber-400/30 bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-amber-500/5 text-white backdrop-blur-sm shadow-[0_10px_30px_rgba(245,158,11,0.2)]",
        /** Glass: returned / success (emerald) */
        glassReturned:
          "border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 via-emerald-500/10 to-emerald-500/5 text-white backdrop-blur-sm shadow-[0_10px_30px_rgba(16,185,129,0.2)]",
        /** Glass: genre / neutral accent (violet) */
        glassGenre:
          "border-violet-400/30 bg-gradient-to-r from-violet-500/25 via-violet-500/10 to-violet-500/5 text-white backdrop-blur-sm shadow-[0_10px_30px_rgba(139,92,246,0.2)]",
        /** Glass: muted / outline on dark */
        glassMuted:
          "border-gray-400/30 bg-gradient-to-r from-gray-500/25 via-gray-500/10 to-gray-500/5 text-white/80 backdrop-blur-sm shadow-[0_10px_30px_rgba(107,114,128,0.2)]",
        /** Glass: cancelled / soft-cancel borrow (slate-rose) */
        glassCancelled:
          "border-slate-400/40 bg-gradient-to-r from-slate-500/30 via-rose-500/10 to-slate-500/5 text-slate-100 backdrop-blur-sm shadow-[0_10px_30px_rgba(148,163,184,0.25)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
