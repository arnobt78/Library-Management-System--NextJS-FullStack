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
        method: "DELETE",
        path: "/api/reviews/delete/{reviewId}",
        description: "Delete a review",
        auth: true,
        response: {
          success: true,
          message: "string",
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
        description: "Pending make-admin privilege requests",
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
