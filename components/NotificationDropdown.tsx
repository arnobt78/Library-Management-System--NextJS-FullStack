"use client";

/**
 * NotificationDropdown — bell popover content shared by NotificationBell in
 * both the root (dark) and admin (light) headers.
 * Parent: CR-0003 / REQ-0034
 */
import Link from "next/link";
import { Bell, Check, Loader2, Trash2 } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/timeAgo";
import type { NotificationItem } from "@/lib/services/notifications";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/useMutations";

export interface NotificationDropdownProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  unreadCount: number;
  variant: "dark" | "light";
  onNavigate?: () => void;
}

export default function NotificationDropdown({
  notifications,
  isLoading,
  unreadCount,
  variant,
  onNavigate,
}: NotificationDropdownProps) {
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const isDark = variant === "dark";

  return (
    <DropdownMenuContent
      align="end"
      className={cn(
        "flex w-80 flex-col p-0 sm:w-96",
        isDark
          ? "border-gray-600 bg-gray-800/95 text-light-100"
          : "border-gray-200 bg-white text-dark-400",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 sm:px-4">
        <DropdownMenuLabel className="p-0 text-sm font-semibold">
          Notifications
        </DropdownMenuLabel>
        {unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 px-2 text-xs",
              isDark
                ? "text-light-200 hover:bg-gray-700 hover:text-light-100"
                : "text-gray-500 hover:bg-gray-100 hover:text-dark-400",
            )}
            disabled={markAllReadMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              markAllReadMutation.mutate();
            }}
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Mark all read
          </Button>
        ) : null}
      </div>
      <DropdownMenuSeparator className={isDark ? "bg-gray-600" : undefined} />

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center gap-2 px-4 py-10 text-center",
              isDark ? "text-light-200/70" : "text-gray-400",
            )}
          >
            <Bell className="size-8 opacity-40" aria-hidden />
            <p className="text-sm">You&apos;re all caught up.</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const content = (
              <div
                className={cn(
                  "group relative flex gap-2 px-3 py-2.5 text-left transition-colors sm:px-4",
                  isDark ? "hover:bg-gray-700/70" : "hover:bg-gray-50",
                  !notification.isRead &&
                    (isDark ? "bg-gray-700/30" : "bg-blue-50/60"),
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    notification.isRead ? "bg-transparent" : "bg-blue-500",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-xs font-semibold sm:text-sm">
                    {notification.title}
                  </p>
                  <p
                    className={cn(
                      "line-clamp-2 text-[11px] sm:text-xs",
                      isDark ? "text-light-200/80" : "text-gray-500",
                    )}
                  >
                    {notification.message}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] sm:text-xs",
                      isDark ? "text-light-200/50" : "text-gray-400",
                    )}
                  >
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete notification"
                  className={cn(
                    "absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100",
                    isDark
                      ? "text-light-200/70 hover:bg-gray-600 hover:text-rose-300"
                      : "text-gray-400 hover:bg-gray-200 hover:text-rose-600",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteMutation.mutate({ id: notification.id });
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );

            const handleClick = () => {
              if (!notification.isRead) {
                markReadMutation.mutate({ id: notification.id });
              }
              onNavigate?.();
            };

            return notification.link ? (
              <Link
                key={notification.id}
                href={notification.link}
                onClick={handleClick}
                className="block"
              >
                {content}
              </Link>
            ) : (
              <button
                key={notification.id}
                type="button"
                onClick={handleClick}
                className="block w-full"
              >
                {content}
              </button>
            );
          })
        )}
      </div>
    </DropdownMenuContent>
  );
}
