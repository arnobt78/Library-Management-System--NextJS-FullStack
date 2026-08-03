"use client";

/**
 * Sticky header chrome for the public root layout.
 * Transparent at scroll top; light frosted blur once content scrolls underneath.
 */

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RootHeaderShellProps = {
  children: ReactNode;
};

const RootHeaderShell = ({ children }: RootHeaderShellProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
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
