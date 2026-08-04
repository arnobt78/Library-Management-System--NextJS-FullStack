import { toast } from "@/hooks/use-toast";

/** Prefer an explicit title; never fall back to bare "Book". */
export function resolveActionBookTitle(
  explicit?: string | null,
  cached?: string | null,
): string {
  const title = explicit?.trim() || cached?.trim();
  return title && title.length > 0 ? title : "this book";
}

export const showToast = {
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
    uploadSuccess: (type: "image" | "video", fileName: string) => {
      toast({
        title: `✅ ${type === "image" ? "Image" : "Video"} Uploaded!`,
        description: `${fileName} has been uploaded successfully and is ready to use.`,
      });
    },
    uploadError: (message: string) => {
      toast({
        title: "📁 Upload Failed",
        description: message,
        variant: "destructive",
      });
    },
    fileTooLarge: (type: "image" | "video", maxSize: string) => {
      toast({
        title: "📁 File Too Large",
        description: `${type === "image" ? "Image" : "Video"} files must be smaller than ${maxSize}. Please compress your file and try again.`,
        variant: "destructive",
      });
    },
  },
};
