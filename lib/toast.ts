import { toast } from "@/hooks/use-toast";

/** Prefer an explicit title; never fall back to bare "Book". */
export function resolveActionBookTitle(
  explicit?: string | null,
  cached?: string | null,
): string {
  const title = explicit?.trim() || cached?.trim();
  return title && title.length > 0 ? title : "this book";
}

type PendingToastHandle = {
  id: string;
  dismiss: () => void;
  success: (title: string, description: string) => void;
  error: (title: string, description: string) => void;
};

export const showToast = {
  /**
   * Sticky loading toast — stays until `.success` / `.error` / `.dismiss`.
   * Uses Radix `duration: Infinity` so network work is not cut off mid-flight.
   */
  pending: (title: string, description: string): PendingToastHandle => {
    const handle = toast({
      title: `⏳ ${title}`,
      description,
      duration: Infinity,
    });
    return {
      id: handle.id,
      dismiss: handle.dismiss,
      success: (nextTitle, nextDescription) => {
        handle.update({
          id: handle.id,
          title: `✅ ${nextTitle}`,
          description: nextDescription,
          variant: "default",
          duration: 5_000,
          open: true,
        });
      },
      error: (nextTitle, nextDescription) => {
        handle.update({
          id: handle.id,
          title: `❌ ${nextTitle}`,
          description: nextDescription,
          variant: "destructive",
          duration: 5_000,
          open: true,
        });
      },
    };
  },

  success: (title: string, description: string) => {
    toast({
      title: `✅ ${title}`,
      description,
    });
  },

  error: (title: string, description: string) => {
    toast({
      title: `❌ ${title}`,
      description,
      variant: "destructive",
    });
  },

  warning: (title: string, description: string) => {
    toast({
      title: `⚠️ ${title}`,
      description,
      variant: "destructive",
    });
  },

  info: (title: string, description: string) => {
    toast({
      title: `ℹ️ ${title}`,
      description,
    });
  },

  // Specific action toasts
  auth: {
    signInSuccess: (name?: string) => {
      const who = name?.trim() || "friend";
      toast({
        title: `🎉 Welcome back, ${who}!`,
        description: "Enjoy discovering books & happy learning!",
      });
    },
    signUpSuccess: (name?: string) => {
      const who = name?.trim() || "friend";
      toast({
        title: `🎉 Welcome, ${who}!`,
        description:
          "Your account is ready — enjoy discovering books & happy learning!",
      });
    },
    pendingApproval: (name?: string) => {
      const who = name?.trim();
      toast({
        title: who
          ? `Registration pending, ${who}`
          : "Registration pending",
        description:
          "An admin must approve your account before borrowing or requesting admin access.",
      });
    },
    logoutSuccess: (name?: string) => {
      const who = name?.trim() || "friend";
      toast({
        title: `👋 Goodbye, ${who}!`,
        description: "Hope to see you soon again!",
      });
    },
  },

  book: {
    borrowSuccess: (bookTitle: string) => {
      const title = resolveActionBookTitle(bookTitle);
      toast({
        title: `📚 Borrow request sent`,
        description: `"${title}" is awaiting admin approval. We'll notify you when it's ready.`,
      });
    },
    createSuccess: (bookTitle: string) => {
      const title = resolveActionBookTitle(bookTitle);
      toast({
        title: `📖 "${title}" added`,
        description: `Successfully added to the library collection.`,
      });
    },
    borrowError: (message: string) => {
      toast({
        title: "❌ Cannot borrow",
        description: message,
        variant: "destructive",
      });
    },
    returnSuccess: (bookTitle: string) => {
      const title = resolveActionBookTitle(bookTitle);
      toast({
        title: `📗 Returned: ${title}`,
        description: `"${title}" is back on the shelf. Thanks for returning it!`,
      });
    },
    returnWithFine: (
      bookTitle: string,
      daysOverdue: number,
      fineAmount: number,
    ) => {
      const title = resolveActionBookTitle(bookTitle);
      toast({
        title: `⚠️ Returned with fine: ${title}`,
        description: `"${title}" was ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue. Fine: $${fineAmount.toFixed(2)}.`,
        variant: "destructive",
      });
    },
    returnError: (message: string) => {
      toast({
        title: "❌ Cannot return",
        description: message,
        variant: "destructive",
      });
    },
    renewSuccess: (bookTitle: string, dueDate: string) => {
      const title = resolveActionBookTitle(bookTitle);
      toast({
        title: `✨ Renewed: ${title}`,
        description: `"${title}" is extended. New due date: ${dueDate}.`,
      });
    },
    renewError: (message: string) => {
      toast({
        title: "❌ Renewal failed",
        description: message,
        variant: "destructive",
      });
    },
    reviewSuccess: (bookTitle: string) => {
      const title = resolveActionBookTitle(bookTitle);
      toast({
        title: `⭐ Review submitted`,
        description: `Thanks for reviewing "${title}". Your feedback helps other readers.`,
      });
    },
    reviewUpdated: (bookTitle: string) => {
      const title = resolveActionBookTitle(bookTitle);
      toast({
        title: `✏️ Review updated`,
        description: `Your review for "${title}" was saved.`,
      });
    },
    reviewDeleted: (bookTitle: string) => {
      const title = resolveActionBookTitle(bookTitle);
      toast({
        title: `🗑️ Review deleted`,
        description: `Your review for "${title}" was removed.`,
      });
    },
    reviewError: (message: string) => {
      toast({
        title: "❌ Review failed",
        description: message,
        variant: "destructive",
      });
    },
  },

  admin: {
    requestSubmitted: (userEmail?: string | null) => {
      const who = userEmail?.trim() || "your account";
      toast({
        title: "🛡️ Admin request submitted",
        description: `Request for ${who} is awaiting review by an administrator.`,
      });
    },
    requestCancelled: () => {
      toast({
        title: "↩️ Admin request cancelled",
        description:
          "Your pending request was withdrawn. You can submit a new request anytime.",
      });
    },
    requestError: (message: string) => {
      toast({
        title: "❌ Admin request failed",
        description: message,
        variant: "destructive",
      });
    },
  },

  /** /api-status manual refresh + client metrics reset */
  status: {
    refreshSuccess: (opts: {
      overallStatus: string;
      healthyCount: number;
      totalCount: number;
      responseTimeMs?: number;
    }) => {
      const status = opts.overallStatus?.trim() || "UNKNOWN";
      const ms =
        typeof opts.responseTimeMs === "number"
          ? ` · ${Math.round(opts.responseTimeMs)}ms avg`
          : "";
      toast({
        title: "📡 Status refreshed",
        description: `${status} — ${opts.healthyCount}/${opts.totalCount} services healthy${ms}`,
      });
    },
    refreshError: (message?: string) => {
      toast({
        title: "❌ Status refresh failed",
        description:
          message?.trim() ||
          "Could not reload service health. Check your connection and try again.",
        variant: "destructive",
      });
    },
    metricsReset: () => {
      toast({
        title: "🧹 Client metrics cleared",
        description:
          "Browser-collected page load, query, and cache counters were reset. Server health is unchanged.",
      });
    },
  },

  file: {
    /**
     * ImageKit upload success — folder-aware title; single ✅ only (raw toast, not showToast.success).
     * Callers must not prepend emoji to avoid double glyphs.
     */
    uploadSuccess: (opts: {
      type: "image" | "video";
      folder: string;
      fileName: string;
      filePath: string;
    }) => {
      const folder = opts.folder.replace(/^\/+|\/+$/g, "");
      const title =
        folder === "books/covers"
          ? "Book cover uploaded"
          : folder === "books/videos"
            ? "Book trailer uploaded"
            : folder === "ids"
              ? "University ID uploaded"
              : opts.type === "image"
                ? "Image uploaded"
                : "Video uploaded";
      toast({
        title: `✅ ${title}`,
        description: `"${opts.fileName}" saved · ${opts.filePath} · ready to use`,
      });
    },
    uploadError: (type: "image" | "video", message?: string) => {
      const kind = type === "image" ? "Image" : "Video";
      toast({
        title: `❌ ${kind} upload failed`,
        description:
          message?.trim() ||
          `The ${kind.toLowerCase()} could not be uploaded. Please try again.`,
        variant: "destructive",
      });
    },
    /** Upload auth sliding window exhausted (5 grants / 10 minutes). */
    uploadRateLimited: (type: "image" | "video") => {
      const kind = type === "image" ? "Image" : "Video";
      toast({
        title: `❌ ${kind} upload rate limited`,
        description:
          "Too many upload authorizations in the last 10 minutes (limit 5). Wait a few minutes, then try again.",
        variant: "destructive",
      });
    },
    unsupportedType: (type: "image" | "video") => {
      toast({
        title: "❌ Unsupported file",
        description:
          type === "image"
            ? "Choose a JPEG, PNG, or WebP image."
            : "Choose an MP4 or WebM video.",
        variant: "destructive",
      });
    },
    invalidSignature: () => {
      toast({
        title: "❌ Invalid file",
        description:
          "The file content does not match its declared media type.",
        variant: "destructive",
      });
    },
    fileTooLarge: (type: "image" | "video", maxSize: string) => {
      const kind = type === "image" ? "Image" : "Video";
      toast({
        title: "❌ File too large",
        description: `${kind} files must be smaller than ${maxSize}. Compress the file and try again.`,
        variant: "destructive",
      });
    },
  },
};
