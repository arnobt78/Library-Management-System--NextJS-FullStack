"use client";

/**
 * Shared reply thread — used by both the admin ticket detail (light) and the
 * personal ticket detail (dark glass). Pass `variant="dark"` on root pages.
 * Parent: CR-0003 / REQ-0034 — glass UI polish
 */

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/UserAvatar";
import { useCreateSupportTicketReply } from "@/hooks/useMutations";
import { cn } from "@/lib/utils";
import { Check, Copy, Loader2, Send, ShieldCheck } from "lucide-react";

/** Compact email + clipboard for reply headers (matches PersonAttribution). */
function ReplyEmailCopy({ email, isDark }: { email: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be denied.
    }
  };
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 text-[11px] leading-none",
        isDark ? "text-light-200/70" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{email}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void copy();
        }}
        className="inline-flex shrink-0 rounded p-0.5 hover:text-sky-500"
        aria-label={copied ? "Email copied" : `Copy ${email}`}
        title={copied ? "Copied" : "Copy email"}
      >
        {copied ? (
          <Check className="size-3 text-green-500" aria-hidden />
        ) : (
          <Copy className="size-3" aria-hidden />
        )}
      </button>
    </span>
  );
}

interface SupportTicketReplyThreadProps {
  ticketId: string;
  /**
   * Always the live `ticket.replies` array from the parent's `useSupportTicket`
   * query — replies have no separate query/cache of their own, so this thread
   * never issues a second network fetch for the same data.
   */
  replies: SupportTicketReplyRow[];
  currentUserId: string;
  /** Ticket is CLOSED — hide the composer but keep the read-only thread. */
  disabled?: boolean;
  /** light = admin panel; dark = user glass detail */
  variant?: "light" | "dark";
}

export default function SupportTicketReplyThread({
  ticketId,
  replies,
  currentUserId,
  disabled,
  variant = "light",
}: SupportTicketReplyThreadProps) {
  const [body, setBody] = useState("");
  const replyMutation = useCreateSupportTicketReply();
  const isDark = variant === "dark";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || replyMutation.isPending) return;

    replyMutation.mutate(
      { ticketId, body: trimmed },
      { onSuccess: () => setBody("") },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {replies.length === 0 ? (
          <p
            className={cn(
              "py-4 text-center text-sm",
              isDark ? "text-light-200/70" : "text-gray-500",
            )}
          >
            No replies yet. Start the conversation below.
          </p>
        ) : (
          replies.map((reply) => {
            const isSelf = reply.userId === currentUserId;
            const isAdmin = reply.userRole === "ADMIN";
            return (
              <div
                key={reply.id}
                className={`flex items-start gap-2 ${isSelf ? "flex-row-reverse" : ""}`}
              >
                <UserAvatar
                  universityCard={reply.userUniversityCard}
                  fullName={reply.userName}
                  email={reply.userEmail}
                  size={32}
                  className="shrink-0 border border-black/10"
                />
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl border px-3 py-2",
                    isSelf
                      ? isDark
                        ? "border-primary/30 bg-primary/10"
                        : "border-primary-admin/20 bg-primary-admin/5"
                      : isDark
                        ? "border-white/10 bg-white/5"
                        : "border-gray-200 bg-gray-50",
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                    <div className="flex min-w-0 flex-col leading-none">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-xs font-semibold leading-none",
                            isDark ? "text-sky-400" : "text-sky-700",
                          )}
                        >
                          {reply.userName}
                        </span>
                        {isAdmin ? (
                          <ShieldCheck
                            className={cn(
                              "size-3 shrink-0",
                              isDark ? "text-primary" : "text-primary-admin",
                            )}
                            aria-label="Support team"
                          />
                        ) : null}
                      </div>
                      {reply.userEmail ? (
                        <ReplyEmailCopy
                          email={reply.userEmail}
                          isDark={isDark}
                        />
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[10px]",
                        isDark ? "text-light-200/50" : "text-gray-400",
                      )}
                    >
                      {new Date(reply.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "whitespace-pre-wrap text-sm",
                      isDark ? "text-light-200" : "text-gray-700",
                    )}
                  >
                    {reply.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {disabled ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-center text-xs",
            isDark
              ? "border-white/10 bg-white/5 text-light-200/70"
              : "border-gray-200 bg-gray-50 text-gray-500",
          )}
        >
          This ticket is closed. Reopen it to continue the conversation.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a reply…"
            rows={3}
            maxLength={2000}
            disabled={replyMutation.isPending}
            className={cn(
              "w-full resize-none text-sm",
              isDark
                ? "border-white/15 bg-dark-300/80 text-light-100 placeholder:text-light-200/50"
                : "border-gray-300 bg-white",
            )}
          />
          {/* Glass CTA — same family as New Ticket (profile-action-btn--submit) */}
          <button
            type="submit"
            disabled={!body.trim() || replyMutation.isPending}
            className={cn(
              "profile-action-btn profile-action-btn--submit inline-flex w-full items-center justify-center gap-1.5 sm:w-auto sm:self-end",
              !isDark &&
                "border-primary-admin/40 bg-gradient-to-r from-primary-admin/90 to-amber-700/90 text-white shadow-md hover:opacity-95",
            )}
          >
            {replyMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {replyMutation.isPending ? "Sending…" : "Send Reply"}
          </button>
        </form>
      )}
    </div>
  );
}
