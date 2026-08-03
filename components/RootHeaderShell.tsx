"use client";

/**
 * Sticky header chrome for the public root layout.
 * Starts blurred (scrolled=true) until layout proves scrollY is at top —
 * avoids transparent header flash over content after refresh/restore.
 */

import { useLayoutEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RootHeaderShellProps = {
  children: ReactNode;
};

const RootHeaderShell = ({ children }: RootHeaderShellProps) => {
  // Default blurred until measured — prevents transparent flash mid-page
  const [scrolled, setScrolled] = useState(true);

  useLayoutEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn("root-header", scrolled && "root-header--scrolled")}
    >
      {children}
    </header>
  );
};

export default RootHeaderShell;
