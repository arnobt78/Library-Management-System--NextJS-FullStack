/**
 * Shared REST catalog for /api-docs.
 * Paths mirror current app/api route handlers; reservation lifecycle is mostly server actions
 * (only the cron recovery route is listed under Cron).
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type ApiDocJson =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null;

export type ApiEndpointDoc = {
  method: HttpMethod;
  path: string;
  description: string;
  auth?: boolean;
  adminOnly?: boolean;
  requestBody?: ApiDocJson;
  response?: ApiDocJson;
};

export type ApiEndpointCategoryId =
  | "authentication"
  | "books"
  | "borrows"
  | "reviews"
  | "supportTickets"
  | "notifications"
  | "activityLog"
  | "users"
  | "admin"
  | "export"
  | "status"
  | "workflows"
  | "cron"
  | "observability";

export type ApiEndpointCategory = {
  id: ApiEndpointCategoryId;
  category: string;
  endpoints: ApiEndpointDoc[];
};

/** Category slug used by Tabs value */
export function categoryTabValue(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

export const API_ENDPOINT_CATEGORIES: ApiEndpointCategory[] = [
  {
    id: "authentication",
    category: "Authentication",
    endpoints: [
      {
        method: "GET",
        path: "/api/auth/[...nextauth]",
        description:
          "Auth.js catch-all (sign-in, sign-out, session, CSRF, providers)",
        auth: false,
        response: {
          note: "Handled by Auth.js; browser flows use /sign-in and session cookies",
        },
      },
      {
        method: "POST",
        path: "/api/auth/[...nextauth]",
        description: "Auth.js POST handlers (credentials callback, sign-out)",
        auth: false,
        requestBody: {
          email: "string (credentials)",
          password: "string (credentials)",
        },
        response: {
          note: "Session cookie set on success",
        },
      },
      {
        method: "GET",
        path: "/api/auth/imagekit",
        description:
          "ImageKit authentication parameters for client uploads (rate-limited; auth optional for sign-up card upload)",
        auth: false,
        response: {
          token: "string",
          expire: "number",
          signature: "string",
        },
      },
    ],
  },
  {
    id: "books",
    category: "Books",
    endpoints: [
      {
        method: "GET",
        path: "/api/books",
        description: "List books (filters: search, genre, sort, pagination)",
        auth: false,
        response: {
          success: true,
          books: "Book[]",
          total: "number",
        },
      },
      {
        method: "GET",
        path: "/api/books/{id}",
        description: "Get a single book by id",
        auth: false,
        response: {
          success: true,
          book: "Book",
        },
      },
      {
        method: "GET",
        path: "/api/books/{id}/related",
        description: "Related books (same genre)",
        auth: false,
        response: {
          success: true,
          books: "Book[]",
        },
      },
      {
        method: "GET",
        path: "/api/books/{id}/borrow-stats",
        description: "Borrow statistics for a book",
        auth: false,
        response: {
          success: true,
          stats: "object",
        },
      },
      {
        method: "GET",
        path: "/api/books/featured",
        description: "Featured / hero books",
        auth: false,
        response: {
          success: true,
          books: "Book[]",
        },
      },
      {
        method: "GET",
        path: "/api/books/genres",
        description: "Distinct book genres for filters",
        auth: false,
        response: {
          success: true,
          genres: "string[]",
        },
      },
      {
        method: "GET",
        path: "/api/books/recommendations",
        description: "Personalized or cached book recommendations",
        auth: true,
        response: {
          success: true,
          books: "Book[]",
        },
      },
    ],
  },
  {
    id: "borrows",
    category: "Borrows",
    endpoints: [
      {
        method: "GET",
        path: "/api/borrow-records",
        description: "Borrow records for the signed-in user (or filtered list)",
        auth: true,
        response: {
          success: true,
          records: "BorrowRecord[]",
        },
      },
      {
        method: "GET",
        path: "/api/admin/borrow-requests",
        description: "Admin queue of borrow requests",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          requests: "BorrowRequest[]",
        },
      },
    ],
  },
  {
    id: "reviews",
    category: "Reviews",
    endpoints: [
      {
        method: "GET",
        path: "/api/reviews/{bookId}",
        description: "Get all reviews for a book",
        auth: false,
        response: {
          success: true,
          reviews: "Review[]",
        },
      },
      {
        method: "POST",
        path: "/api/reviews/{bookId}",
        description: "Create a new review",
        auth: true,
        requestBody: {
          rating: "number (1-5)",
          comment: "string",
        },
        response: {
          success: true,
          review: "Review",
        },
      },
      {
        method: "PUT",
        path: "/api/reviews/edit/{reviewId}",
        description: "Edit an existing review",
        auth: true,
        requestBody: {
          rating: "number (1-5)",
          comment: "string",
        },
        response: {
          success: true,
          review: "Review",
        },
      },
      {
        method: "GET",
        path: "/api/reviews/eligibility/{bookId}",
        description: "Check if the current user can review a book",
        auth: false,
        response: {
          success: true,
          canReview: "boolean",
          hasExistingReview: "boolean",
          reason: "string",
        },
      },
      {
        method: "GET",
        path: "/api/reviews/mine",
        description:
          "The signed-in user's own reviews at any status (My Reviews tab)",
        auth: true,
        response: {
          success: true,
          reviews: "Review[]",
        },
      },
      {
        method: "DELETE",
        path: "/api/reviews/delete/{reviewId}",
        description: "Delete a review — owner (any status) or admin (any review)",
        auth: true,
        response: {
          success: true,
          message: "string",
        },
      },
      {
        method: "GET",
        path: "/api/reviews/admin",
        description:
          "Moderation queue: all reviews across all books (?status=, ?search=)",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          reviews: "Review[]",
        },
      },
      {
        method: "GET",
        path: "/api/reviews/admin/{id}",
        description: "Single review detail for the moderation queue",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          review: "Review",
        },
      },
      {
        method: "GET",
        path: "/api/reviews/pending-count",
        description: "PENDING review count for the admin sidebar badge",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          count: "number",
        },
      },
    ],
  },
  {
    id: "supportTickets",
    category: "Support Tickets",
    endpoints: [
      {
        method: "GET",
        path: "/api/support-tickets",
        description:
          "List tickets — ?scope=mine (default, own tickets) or ?scope=admin (all, admin-only); ?status=, ?priority=, ?search=",
        auth: true,
        response: {
          success: true,
          tickets: "SupportTicket[]",
        },
      },
      {
        method: "POST",
        path: "/api/support-tickets",
        description:
          "Create a ticket (APPROVED users only) — fans out an in-app notification + email to admins",
        auth: true,
        requestBody: {
          subject: "string",
          description: "string",
          priority: "LOW | MEDIUM | HIGH | URGENT (default MEDIUM)",
          relatedBookId: "string (optional)",
        },
        response: {
          success: true,
          ticket: "SupportTicketDetail",
        },
      },
      {
        method: "GET",
        path: "/api/support-tickets/{id}",
        description: "Ticket detail including the full reply thread",
        auth: true,
        response: {
          success: true,
          ticket: "SupportTicketDetail",
        },
      },
      {
        method: "PUT",
        path: "/api/support-tickets/{id}",
        description:
          "Creator edits subject/description while OPEN; admin edits status/priority/assignedToId/notes",
        auth: true,
        requestBody: {
          subject: "string (optional)",
          description: "string (optional)",
          status: "OPEN | IN_PROGRESS | RESOLVED | CLOSED (admin only)",
          priority: "LOW | MEDIUM | HIGH | URGENT (admin only)",
          assignedToId: "string — must reference an ADMIN user (admin only)",
          notes: "string (admin only)",
        },
        response: {
          success: true,
          ticket: "SupportTicketDetail",
        },
      },
      {
        method: "DELETE",
        path: "/api/support-tickets/{id}",
        description: "Admin any time; creator only while the ticket is OPEN",
        auth: true,
        response: {
          success: true,
          id: "string",
        },
      },
      {
        method: "GET",
        path: "/api/support-tickets/{id}/replies",
        description: "Reply thread for a ticket",
        auth: true,
        response: {
          success: true,
          replies: "SupportTicketReply[]",
        },
      },
      {
        method: "POST",
        path: "/api/support-tickets/{id}/replies",
        description:
          "Add a reply — notifies (in-app + email) the other party in the conversation",
        auth: true,
        requestBody: {
          body: "string",
        },
        response: {
          success: true,
          replies: "SupportTicketReply[]",
        },
      },
      {
        method: "GET",
        path: "/api/support-tickets/count",
        description: "OPEN + IN_PROGRESS ticket count for the admin sidebar badge",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          count: "number",
        },
      },
    ],
  },
  {
    id: "notifications",
    category: "Notifications",
    endpoints: [
      {
        method: "GET",
        path: "/api/notifications",
        description:
          "Recent in-app notifications for the signed-in user (?limit=, default 20, max 100)",
        auth: true,
        response: {
          success: true,
          notifications: "Notification[]",
        },
      },
      {
        method: "GET",
        path: "/api/notifications/unread-count",
        description: "Unread notification count for the bell badge",
        auth: true,
        response: {
          success: true,
          count: "number",
        },
      },
      {
        method: "PATCH",
        path: "/api/notifications/{id}",
        description: "Mark a single notification as read (scoped to the caller)",
        auth: true,
        response: {
          success: true,
        },
      },
      {
        method: "DELETE",
        path: "/api/notifications/{id}",
        description: "Remove a notification from the bell list (scoped to the caller)",
        auth: true,
        response: {
          success: true,
        },
      },
      {
        method: "POST",
        path: "/api/notifications/mark-all-read",
        description: "Bulk mark-as-read — powers the bell's \"Mark all read\" action",
        auth: true,
        response: {
          success: true,
        },
      },
    ],
  },
  {
    id: "activityLog",
    category: "Activity Log",
    endpoints: [
      {
        method: "GET",
        path: "/api/activity-logs",
        description:
          "Admin audit feed of create/update/delete actions (?period=today|7days|30days|all, ?search=); FIFO-retained to the latest 50 rows",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          logs: "ActivityLog[]",
        },
      },
    ],
  },
  {
    id: "users",
    category: "Users",
    endpoints: [
      {
        method: "GET",
        path: "/api/users",
        description: "List users (admin) or self-scoped user data",
        auth: true,
        response: {
          success: true,
          users: "User[]",
        },
      },
      {
        method: "GET",
        path: "/api/admin/admin-requests",
        description:
          "Make-admin requests: ?scope=pending (default) or ?scope=decisions (recent APPROVED/REJECTED + reviewer)",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          requests: "AdminRequest[]",
        },
      },
    ],
  },
  {
    id: "admin",
    category: "Admin",
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/stats",
        description: "Admin dashboard aggregate stats",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          stats: "object",
        },
      },
      {
        method: "GET",
        path: "/api/admin/analytics",
        description: "Business insights / analytics payload",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          analytics: "object",
        },
      },
      {
        method: "GET",
        path: "/api/admin/fine-config",
        description: "Get fine configuration",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          fineAmount: "number",
        },
      },
      {
        method: "POST",
        path: "/api/admin/fine-config",
        description: "Update fine configuration",
        auth: true,
        adminOnly: true,
        requestBody: {
          fineAmount: "number",
        },
        response: {
          success: true,
          fineAmount: "number",
        },
      },
      {
        method: "POST",
        path: "/api/admin/update-overdue-fines",
        description: "Recalculate overdue fines",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          results: "array",
        },
      },
      {
        method: "POST",
        path: "/api/admin/send-due-reminders",
        description: "Send due-soon reminder emails",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          count: "number",
        },
      },
      {
        method: "POST",
        path: "/api/admin/send-overdue-reminders",
        description: "Send overdue reminder emails",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          count: "number",
        },
      },
      {
        method: "GET",
        path: "/api/admin/reminder-stats",
        description: "Reminder delivery statistics",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          stats: "object",
        },
      },
      {
        method: "POST",
        path: "/api/admin/update-trending-books",
        description: "Refresh trending books cache",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          message: "string",
        },
      },
      {
        method: "POST",
        path: "/api/admin/generate-recommendations",
        description: "Generate recommendation set",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          message: "string",
        },
      },
      {
        method: "POST",
        path: "/api/admin/refresh-recommendation-cache",
        description: "Refresh recommendation cache",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          message: "string",
        },
      },
      {
        method: "GET",
        path: "/api/admin/export-stats",
        description: "Export job / export volume stats",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          stats: "object",
        },
      },
    ],
  },
  {
    id: "export",
    category: "Export",
    endpoints: [
      {
        method: "POST",
        path: "/api/admin/export/books",
        description: "Export books data",
        auth: true,
        adminOnly: true,
        requestBody: { format: "csv | json" },
        response: "File download (CSV/JSON)",
      },
      {
        method: "POST",
        path: "/api/admin/export/users",
        description: "Export users data",
        auth: true,
        adminOnly: true,
        requestBody: { format: "csv | json" },
        response: "File download (CSV/JSON)",
      },
      {
        method: "POST",
        path: "/api/admin/export/borrows",
        description: "Export borrow records",
        auth: true,
        adminOnly: true,
        requestBody: { format: "csv | json" },
        response: "File download (CSV/JSON)",
      },
      {
        method: "POST",
        path: "/api/admin/export/borrows-range",
        description: "Export borrow records for a date range",
        auth: true,
        adminOnly: true,
        requestBody: {
          format: "csv | json",
          startDate: "YYYY-MM-DD",
          endDate: "YYYY-MM-DD",
        },
        response: "File download (CSV/JSON)",
      },
      {
        method: "POST",
        path: "/api/admin/export/analytics",
        description: "Export analytics data",
        auth: true,
        adminOnly: true,
        requestBody: { format: "csv | json" },
        response: "File download (CSV/JSON)",
      },
    ],
  },
  {
    id: "status",
    category: "Status",
    endpoints: [
      {
        method: "GET",
        path: "/api/status/health",
        description: "Overall health check",
        auth: false,
        response: { status: "ok | degraded", checks: "object" },
      },
      {
        method: "GET",
        path: "/api/status/metrics",
        description: "Runtime / SLO metrics snapshot",
        auth: false,
        response: { metrics: "object" },
      },
      {
        method: "GET",
        path: "/api/status/api-server",
        description: "API server reachability",
        auth: false,
        response: { ok: "boolean" },
      },
      {
        method: "GET",
        path: "/api/status/database",
        description: "PostgreSQL connectivity",
        auth: false,
        response: { ok: "boolean" },
      },
      {
        method: "GET",
        path: "/api/status/authentication",
        description: "Auth service status",
        auth: false,
        response: { ok: "boolean" },
      },
      {
        method: "GET",
        path: "/api/status/email-service",
        description: "Email provider status",
        auth: false,
        response: { ok: "boolean" },
      },
      {
        method: "GET",
        path: "/api/status/file-storage",
        description: "ImageKit / file storage status",
        auth: false,
        response: { ok: "boolean" },
      },
      {
        method: "GET",
        path: "/api/status/external-apis",
        description: "External dependency status bundle",
        auth: false,
        response: { services: "object" },
      },
    ],
  },
  {
    id: "workflows",
    category: "Workflows",
    endpoints: [
      {
        method: "POST",
        path: "/api/workflows/onboarding",
        description: "QStash onboarding workflow webhook",
        auth: true,
        requestBody: {
          step: "string",
          data: "object",
        },
        response: {
          success: true,
          nextStep: "string",
        },
      },
    ],
  },
  {
    id: "cron",
    category: "Cron",
    endpoints: [
      {
        method: "GET",
        path: "/api/cron/reservation-notifications",
        description:
          "Secured cron: dispatch reservation READY outbox (CRON_SECRET). Reservation create/cancel/fulfill are server actions, not REST.",
        auth: true,
        adminOnly: true,
        response: {
          success: true,
          processed: "number",
        },
      },
    ],
  },
  {
    id: "observability",
    category: "Observability",
    endpoints: [
      {
        method: "POST",
        path: "/api/monitoring",
        description:
          "Internal Sentry tunnel (withSentryConfig tunnelRoute). Not a business REST API — browser SDK forwards envelopes same-origin to bypass ad blockers. Do not call from app features.",
        auth: false,
        response: {
          note: "Sentry ingest proxy; opaque to clients",
        },
      },
    ],
  },
];
