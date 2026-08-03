"use client";

/**
 * ScrollToTop — jump to top on pathname change / hard refresh.
 * Disables browser scrollRestoration so mid-page restore cannot race after layout.
 * useLayoutEffect scrolls before paint (avoids navbar content flash).
 */

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
