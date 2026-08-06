"use client";

/**
 * Root-header admin quick menu — labels synced to ADMIN_NAV_ITEMS.
 * Trigger colors follow Header `tone` (dark public / light admin).
 * Parent: admin shell Stockly chrome
 */

import PrefetchLink from "@/components/PrefetchLink";
import Link from "next/link";
import { useState } from "react";
import { ADMIN_NAV_ITEMS } from "@/lib/navigation/admin-nav-config";
import type { HeaderTone } from "@/components/RootHeaderShell";
import { cn } from "@/lib/utils";

const DROPDOWN_CLASS =
  "block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm";

const AdminDropdown = ({ tone = "dark" }: { tone?: HeaderTone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isLight = tone === "light";

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="px-1.5 py-1 sm:px-2">
        <PrefetchLink
          href="/admin"
          prefetchKind="admin-dashboard"
          className={cn(
            "text-sm transition-colors sm:text-base",
            isLight
              ? "text-dark-400 hover:text-gray-700"
              : "text-light-100 hover:text-light-200",
          )}
        >
          Admin Dashboard
        </PrefetchLink>
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] w-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-lg sm:w-56">
          <div className="absolute inset-x-0 -top-1 h-1" />
          <div className="py-1.5 sm:py-2">
            {ADMIN_NAV_ITEMS.map((item) =>
              item.prefetchKind ? (
                <PrefetchLink
                  key={item.route}
                  href={item.route}
                  prefetchKind={item.prefetchKind}
                  className={DROPDOWN_CLASS}
                >
                  {item.label}
                </PrefetchLink>
              ) : (
                <Link key={item.route} href={item.route} className={DROPDOWN_CLASS}>
                  {item.label}
                </Link>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDropdown;
