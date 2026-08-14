/**
 * Ticket Activity feed — who created / updated / replied, with avatar + time.
 * Header: Show details / Hide details toggle (justify-between).
 * Optional fifoLimit → subtitle "FIFO latest N" (borrow/review detail DNA).
 * Event headers use shared activityEventIcon beside the label.
 * Parent: CR-0003 / REQ-0034; borrow detail UI tweaks
 */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import PersonAttribution from "@/components/PersonAttribution";
import { AllAdminLabel } from "@/components/support-tickets/AllAdminLabel";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { activityEventIcon } from "@/lib/ui/activityEventIcon";
import { CARD_PAD_CLASS } from "@/lib/ui/cardPadStyles";
import { cn } from "@/lib/utils";

export function TicketActivityTimeline({
  events,
  variant = "light",
  adminUserHref = false,
  fifoLimit,
}: {
  events: TicketActivityEvent[];
  variant?: "light" | "dark";
  /** When true, actor names link to /admin/users/[id] */
  adminUserHref?: boolean;
  /** When set, subtitle includes FIFO latest N (User 360 DNA). */
  fifoLimit?: number;
}) {
  const isDark = variant === "dark";
  const [detailsOpen, setDetailsOpen] = useState(true);

  const subtitle =
    typeof fifoLimit === "number" && fifoLimit > 0
      ? `Created, updates, and replies · FIFO latest ${fifoLimit}`
      : "Created, updates, and replies with date & time";

  return (
    <div
      className={cn(
        "rounded-xl border",
        CARD_PAD_CLASS,
        isDark ? "border-white/10 bg-dark-300/60" : "border-gray-200 bg-white",
      )}
    >
      <TicketSectionHeader
        variant={variant}
        icon={<History className="size-5" />}
        title="Activity"
        subtitle={subtitle}
        trailing={
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              isDark
                ? "border-white/15 bg-white/5 text-light-100 hover:bg-white/10"
                : "border-gray-200 bg-gray-50 text-dark-400 hover:bg-gray-100",
            )}
            aria-expanded={detailsOpen}
          >
            {detailsOpen ? (
              <>
                <ChevronUp className="size-3.5" aria-hidden />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" aria-hidden />
                Show details
              </>
            )}
          </button>
        }
      />

      {events.length === 0 ? (
        <p
          className={cn(
            "py-4 text-center text-sm",
            isDark ? "text-light-200/70" : "text-gray-500",
          )}
        >
          No activity yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => {
            const Icon = activityEventIcon(event.kind, event.label);
            return (
              <li
                key={event.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5",
                  isDark
                    ? "border-white/10 bg-white/5"
                    : "border-gray-100 bg-gray-50/80",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p
                    className={cn(
                      "inline-flex min-w-0 items-center gap-1.5 text-sm font-medium",
                      isDark ? "text-light-100" : "text-dark-400",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        isDark ? "text-light-200/80" : "text-gray-500",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">{event.label}</span>
                  </p>
                  <time
                    dateTime={event.at}
                    className={cn(
                      "shrink-0 text-[11px] tabular-nums",
                      isDark ? "text-light-200/60" : "text-gray-400",
                    )}
                  >
                    {new Date(event.at).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>

                {detailsOpen ? (
                  <div
                    className={cn(
                      // Root pages are dark without html.dark — use variant, not dark:
                      "mt-2 space-y-1.5 border-t border-dashed pt-2",
                      isDark ? "border-white/10" : "border-gray-200",
                    )}
                  >
                    {event.actorId && event.actorName ? (
                      <PersonAttribution
                        layout="stack"
                        variant={variant}
                        size={36}
                        href={
                          adminUserHref
                            ? `/admin/users/${event.actorId}`
                            : null
                        }
                        person={{
                          id: event.actorId,
                          fullName: event.actorName,
                          email: event.actorEmail ?? "",
                          universityCard: event.actorUniversityCard,
                        }}
                      />
                    ) : (
                      <AllAdminLabel variant={variant} />
                    )}
                    {event.detail ? (
                      <p
                        className={cn(
                          "line-clamp-3 text-xs",
                          isDark ? "text-light-200/70" : "text-gray-500",
                        )}
                      >
                        {event.detail}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
