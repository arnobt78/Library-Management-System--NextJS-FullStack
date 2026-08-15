"use client";

/**
 * NotificationDropdown — bell popover content shared by NotificationBell in
 * both the root (dark) and admin (light) headers.
 * Stock feature parity (counts, New, Check, Trash, Close) with BookWise rose glass.
 * Parent: CR-0003 / REQ-0034
 */
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  Shield,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/timeAgo";
import type { NotificationItem } from "@/lib/services/notifications";
import {
  NotificationCountBadge,
  NotificationCountBadgeLight,
  NotificationNewBadge,
} from "@/lib/ui/notificationBadges";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/useMutations";

export interface NotificationDropdownProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  isError?: boolean;
  unreadCount: number;
  totalCount: number;
  variant: "dark" | "light";
  onClose: () => void;
}

function notificationIcon(type: string): LucideIcon {
  switch (type) {
    case "TICKET_CREATED":
    case "TICKET_UPDATED":
    case "TICKET_REPLY":
      return MessageSquare;
    case "REVIEW_SUBMITTED":
    case "REVIEW_MODERATED":
      return Star;
    case "ADMIN_REQUEST_SUBMITTED":
    case "ADMIN_REQUEST_DECIDED":
      return Shield;
    default:
      return Bell;
  }
}

function notificationIconTone(type: string, isDark: boolean): string {
  switch (type) {
    case "TICKET_CREATED":
    case "TICKET_UPDATED":
    case "TICKET_REPLY":
      return isDark ? "text-sky-300" : "text-sky-600";
    case "REVIEW_SUBMITTED":
    case "REVIEW_MODERATED":
      return isDark ? "text-amber-300" : "text-amber-600";
    case "ADMIN_REQUEST_SUBMITTED":
    case "ADMIN_REQUEST_DECIDED":
      return isDark ? "text-violet-300" : "text-violet-600";
    default:
      return isDark ? "text-rose-300" : "text-rose-500";
  }
}

export default function NotificationDropdown({
  notifications,
  isLoading,
  isError = false,
  unreadCount,
  totalCount,
  variant,
  onClose,
}: NotificationDropdownProps) {
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const isDark = variant === "dark";
  const CountBadge = isDark
    ? NotificationCountBadge
    : NotificationCountBadgeLight;
  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenuContent
      align="end"
      sideOffset={8}
      onCloseAutoFocus={(e) => e.preventDefault()}
      className={cn(
        "flex w-80 flex-col overflow-hidden p-0 sm:w-96",
        isDark
          ? "border-rose-400/30 bg-gray-900/95 text-light-100 shadow-[0_30px_80px_rgba(225,29,72,0.28)] backdrop-blur-md"
          : "border-rose-400/25 bg-white/95 text-dark-400 shadow-[0_30px_80px_rgba(225,29,72,0.18)] backdrop-blur-md",
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-2 border-b px-3 py-3 sm:px-4",
          isDark ? "border-rose-400/20" : "border-rose-400/15",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-sm font-medium sm:text-base">Notifications</h3>
          <p
            className={cn(
              "flex flex-wrap items-center gap-1.5 text-xs",
              isDark ? "text-light-200/70" : "text-gray-500",
            )}
          >
            <CountBadge>{totalCount}</CountBadge>
            <span>total</span>
            {hasUnread ? (
              <>
                <span aria-hidden>·</span>
                <CountBadge hue="rose">{unreadCount}</CountBadge>
                <span>unread</span>
              </>
            ) : null}
          </p>
        </div>
        {hasUnread ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 shrink-0 gap-1 px-2 text-xs",
              isDark
                ? "text-rose-300 hover:bg-white/5 hover:text-rose-200"
                : "text-rose-600 hover:bg-rose-50/80 hover:text-rose-700",
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
              <CheckCheck className="size-3.5" />
            )}
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div
            className={cn(
              "px-4 py-10 text-center",
              isDark ? "text-light-200/70" : "text-gray-500",
            )}
          >
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : isError ? (
          <div className="px-4 py-8 text-center text-sm text-rose-500">
            Failed to load notifications
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
          <div
            className={cn(
              "divide-y",
              isDark ? "divide-rose-400/10" : "divide-rose-400/10",
            )}
          >
            {notifications.map((notification) => {
              const Icon = notificationIcon(notification.type);
              const iconTone = notificationIconTone(notification.type, isDark);

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "px-3 py-3 transition-colors sm:px-4",
                    isDark ? "hover:bg-white/5" : "hover:bg-rose-50/50",
                    !notification.isRead &&
                      (isDark ? "bg-rose-500/5" : "bg-rose-50/40"),
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        iconTone,
                        !notification.isRead
                          ? isDark
                            ? "bg-rose-500/20"
                            : "bg-rose-100"
                          : isDark
                            ? "bg-gray-700"
                            : "bg-gray-100",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          onClick={onClose}
                          className="block transition-opacity hover:opacity-80"
                        >
                          <p className="mb-0.5 text-sm font-medium">
                            {notification.title}
                          </p>
                          <p
                            className={cn(
                              "line-clamp-2 text-xs",
                              isDark ? "text-light-200/80" : "text-gray-600",
                            )}
                          >
                            {notification.message}
                          </p>
                        </Link>
                      ) : (
                        <>
                          <p className="mb-0.5 text-sm font-medium">
                            {notification.title}
                          </p>
                          <p
                            className={cn(
                              "line-clamp-2 text-xs",
                              isDark ? "text-light-200/80" : "text-gray-600",
                            )}
                          >
                            {notification.message}
                          </p>
                        </>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-[10px] sm:text-xs",
                            isDark ? "text-light-200/50" : "text-gray-400",
                          )}
                        >
                          {timeAgo(notification.createdAt)}
                        </span>
                        {!notification.isRead ? (
                          <NotificationNewBadge
                            surface={isDark ? "dark" : "light"}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      {!notification.isRead ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Mark as read"
                          disabled={markReadMutation.isPending}
                          className={cn(
                            "size-7 p-0",
                            isDark
                              ? "text-light-200/80 hover:bg-white/10 hover:text-light-100"
                              : "text-gray-500 hover:bg-gray-100 hover:text-dark-400",
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markReadMutation.mutate({ id: notification.id });
                          }}
                        >
                          <Check className="size-3.5" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete notification"
                        disabled={deleteMutation.isPending}
                        className={cn(
                          "size-7 p-0",
                          isDark
                            ? "text-rose-400 hover:bg-white/10 hover:text-rose-300"
                            : "text-rose-600 hover:bg-rose-50 hover:text-rose-700",
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteMutation.mutate({ id: notification.id });
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {notifications.length > 0 ? (
        <div
          className={cn(
            "border-t",
            isDark ? "border-rose-400/20" : "border-rose-400/15",
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={cn(
              "h-10 w-full justify-center gap-2 rounded-none text-sm",
              isDark
                ? "text-light-200/80 hover:bg-white/5 hover:text-light-100"
                : "text-gray-600 hover:bg-rose-50/50 hover:text-dark-400",
            )}
          >
            <X className="size-4 shrink-0" aria-hidden />
            Close
          </Button>
        </div>
      ) : null}
    </DropdownMenuContent>
  );
}
