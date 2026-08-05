/**
 * SearchInput — shared debounced search box for admin/user list toolbars.
 * Parent: CR-0003 / REQ-0034
 *
 * `variant="dark"` matches all-books catalog search chrome on the root shell;
 * `variant="light"` (default) keeps admin white-panel styling.
 */
"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Debounce delay in ms (default 300, matches /all-books instant search) */
  debounceMs?: number;
  id?: string;
  /** light = admin panels; dark = root catalog / support-tickets glass */
  variant?: "light" | "dark";
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  debounceMs = 300,
  id,
  variant = "light",
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  // Adjust state during render (React-recommended pattern) instead of an
  // effect, so a parent-driven reset (e.g. clear filters) never triggers a
  // synchronous setState-in-effect cascade.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  const handleClear = () => {
    setDraft("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange("");
  };

  const isDark = variant === "dark";

  return (
    <div className={cn("relative", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2",
          isDark ? "text-light-200/70" : "text-gray-400",
        )}
        aria-hidden
      />
      <Input
        id={id}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 pl-9 pr-8",
          isDark &&
            "catalog-search-input border-gray-700 bg-dark-300 text-light-100 placeholder:text-light-200/50 focus-visible:ring-primary/40",
        )}
        aria-label={placeholder}
      />
      {draft ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors",
            isDark
              ? "text-light-200/70 hover:text-light-100"
              : "text-gray-400 hover:text-gray-600",
          )}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
