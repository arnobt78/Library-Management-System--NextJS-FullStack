// Parent: REQ-0023
// Query-key factories keep cache reads, optimistic updates, and invalidation aligned.
export const queryKeys = {
  books: {
    root: ["books"] as const,
    list: <TFilters>(filters: TFilters) => ["books", filters] as const,
    adminRoot: ["all-books"] as const,
    adminList: <TFilters>(filters: TFilters) => ["all-books", filters] as const,
    detailRoot: ["book"] as const,
    detail: (bookId: string) => ["book", bookId] as const,
    borrowStatsRoot: ["book-borrow-stats"] as const,
    borrowStats: (bookId: string) => ["book-borrow-stats", bookId] as const,
    recommendationsRoot: ["book-recommendations"] as const,
    recommendations: (userId: string | undefined, limit: number) =>
      ["book-recommendations", userId, limit] as const,
    /** Genre-related strips on book detail (invalidated with books/recommendations) */
    relatedRoot: ["book-related"] as const,
    related: (bookId: string, limit: number) =>
      ["book-related", bookId, limit] as const,
    featuredRoot: ["featured-books"] as const,
    featured: (limit: number) => ["featured-books", limit] as const,
  },
  users: {
    root: ["users"] as const,
    adminRoot: ["all-users"] as const,
    adminList: <TFilters>(filters: TFilters) => ["all-users", filters] as const,
    detailRoot: ["user"] as const,
    detail: (userId: string) => ["user", userId] as const,
    pendingRoot: ["pending-users"] as const,
    pending: (search?: string) => ["pending-users", search] as const,
    /** Recent signup APPROVED/REJECTED with statusReviewed* (Sign-up Requests). */
    signupDecisionsRoot: ["signup-status-decisions"] as const,
    signupDecisions: (limit?: number) =>
      ["signup-status-decisions", limit ?? 25] as const,
    currentRoot: ["current-user"] as const,
  },
  borrows: {
    root: ["borrow-records"] as const,
    list: <TFilters>(filters: TFilters) => ["borrow-records", filters] as const,
    requestsRoot: ["borrow-requests"] as const,
    requests: <TFilters>(filters: TFilters) =>
      ["borrow-requests", filters] as const,
    detailRoot: ["borrow"] as const,
    userRoot: ["user-borrows"] as const,
    user: (userId: string, status?: string) =>
      ["user-borrows", userId, status] as const,
  },
  circulation: {
    root: ["circulation"] as const,
    reservationsRoot: ["reservations"] as const,
    userReservations: (userId: string) => ["reservations", "user", userId] as const,
    bookQueue: (bookId: string) => ["reservations", "book", bookId] as const,
  },
  reviews: {
    root: ["reviews"] as const,
    legacyRoot: ["review"] as const,
    bookRoot: ["book-reviews"] as const,
    book: (bookId: string) => ["book-reviews", bookId] as const,
    eligibilityRoot: ["review-eligibility"] as const,
    eligibility: (bookId: string) => ["review-eligibility", bookId] as const,
  },
  admin: {
    root: ["admin"] as const,
    stats: ["admin-stats"] as const,
    requestsRoot: ["admin-requests"] as const,
    pendingRequests: ["pending-admin-requests"] as const,
    /** Recent APPROVED/REJECTED make-admin decisions (reviewer attribution). */
    recentRequestDecisions: ["admin-request-decisions"] as const,
    analytics: ["admin-analytics"] as const,
    businessInsightsRoot: ["business-insights"] as const,
    businessInsights: <TOptions>(options: TOptions) =>
      ["business-insights", options] as const,
    reminderStats: ["reminder-stats"] as const,
    exportStats: ["export-stats"] as const,
    fineConfig: ["fine-config"] as const,
    systemMetrics: ["system-metrics"] as const,
    serviceHealth: ["service-health"] as const,
    analyticsRoot: ["analytics"] as const,
  },
} as const;
