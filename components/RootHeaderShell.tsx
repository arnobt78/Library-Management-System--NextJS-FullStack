"use client";

/**
 * Sticky header chrome for public (dark) and admin (light) surfaces.
 * Dark: transparent at top, frosted when scrolled (default scrolled until measured).
 * Light: frosted white from first paint — calm over slate-50 admin pages (no solid flash).
 */

import { useLayoutEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HeaderTone = "dark" | "light";

type RootHeaderShellProps = {
  children: ReactNode;
  /** Admin uses light; public root keeps dark (default). */
  tone?: HeaderTone;
};

const RootHeaderShell = ({
  children,
  tone = "dark",
}: RootHeaderShellProps) => {
  const isLight = tone === "light";
  // Dark: default blurred until measured — prevents transparent flash mid-page.
  // Light: always solid (treat as scrolled) — calm first paint on admin.
  const [scrolled, setScrolled] = useState(true);

  useLayoutEffect(() => {
    if (isLight) return;

    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLight]);

  return (
    <header
      className={cn(
        "root-header items-center",
        isLight && "root-header--light",
        !isLight && scrolled && "root-header--scrolled",
      )}
    >
      {children}
    </header>
  );
};

export default RootHeaderShell;
