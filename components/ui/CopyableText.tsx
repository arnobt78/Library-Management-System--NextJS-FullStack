"use client";

/**
 * Copyable inline text + clipboard icon (university ID parity with PersonAttribution email).
 * Parent: admin people table polish
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  ATTRIBUTION_EMAIL_SIZE,
  ATTRIBUTION_EMAIL_TONE,
} from "@/lib/ui/attributionStyles";
import { cn } from "@/lib/utils";

export default function CopyableText({
  value,
  className,
  label = "value",
}: {
  value: string;
  className?: string;
  /** Aria label noun, e.g. "university ID". */
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be denied; keep value visible.
    }
  };

  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 text-gray-800",
        ATTRIBUTION_EMAIL_SIZE,
        className,
      )}
    >
      <span className="min-w-0 break-all text-inherit">{value}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void copy();
        }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
          ATTRIBUTION_EMAIL_TONE,
          "hover:text-sky-500",
        )}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        title={copied ? "Copied" : `Copy ${label}`}
      >
        {copied ? (
          <Check className="size-3.5 text-green-500" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </button>
    </span>
  );
}
