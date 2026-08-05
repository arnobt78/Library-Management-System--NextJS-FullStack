"use client";

/**
 * NotificationBell — always-visible navbar bell (stock-inventory parity).
 * Parent Header only mounts this for signed-in users; do NOT gate on
 * useSession() (loading/unauthenticated briefly → missing icon).
 * Unread badge is optional; the bell itself is the default chrome.
 * Parent: CR-0003 / REQ-0034
 */
import { useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNotifications, useUnreadNotificationCount } from "@/hooks/useQueries";
import NotificationDropdown from "@/components/NotificationDropdown";

export interface NotificationBellProps {
  variant?: "dark" | "light";
  className?: string;
  /** SSR-seeded unread count — paints the badge on first byte, no fetch flash. */
  initialUnreadCount?: number;
}

export default function NotificationBell({
  variant = "dark",
  className,
  initialUnreadCount,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  // Always poll unread when mounted (parent already auth-gated via SSR).
  const { data: unreadCount = 0 } = useUnreadNotificationCount(
    true,
    initialUnreadCount,
  );
  // Only fetch the full list once the bell is opened (avoids an unnecessary
  // fetch on every page load for every signed-in user).
  const { data: notifications = [], isLoading } = useNotifications(open);

  const isDark = variant === "dark";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className={cn(
            // Always-visible chrome — rose glass like stock-inventory navbar bell
            "relative flex size-8 items-center justify-center rounded-full border transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 sm:size-10",
            isDark
              ? "border-rose-400/30 bg-gradient-to-r from-rose-500/25 via-rose-500/15 to-rose-500/10 text-rose-300 shadow-[0_10px_30px_rgba(225,29,72,0.2)] backdrop-blur-md hover:border-rose-300/40 hover:from-rose-500/35 hover:via-rose-500/25 hover:to-rose-500/15 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              : "border-rose-400/25 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-rose-500/5 text-rose-500 shadow-[0_8px_20px_rgba(225,29,72,0.12)] hover:border-rose-400/40 hover:from-rose-500/25 hover:via-rose-500/15 hover:to-rose-500/10 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            className,
          )}
        >
          <Bell className="size-4 sm:size-5" aria-hidden />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-[1.1rem]",
                "border-2 bg-rose-500 text-white",
                isDark ? "border-gray-900" : "border-white",
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <NotificationDropdown
        notifications={notifications}
        isLoading={isLoading}
        unreadCount={unreadCount}
        variant={variant}
        onNavigate={() => setOpen(false)}
      />
    </DropdownMenu>
  );
}
