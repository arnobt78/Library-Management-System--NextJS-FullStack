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
      ["signup-status-decisions", limit ?? 50] as const,
    /** Single signup applicant detail + decision timeline (detail route densify). */
    signupRequestDetailRoot: ["signup-request-detail"] as const,
    signupRequestDetail: (userId: string) =>
      ["signup-request-detail", userId] as const,
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
    /** Admin moderation queue (all statuses, all books) */
    adminRoot: ["admin-reviews"] as const,
    adminList: <TFilters>(filters: TFilters) =>
      ["admin-reviews", filters] as const,
    /** Signed-in user's own reviews (any status) — My Reviews tab */
    userReviewsRoot: ["user-reviews"] as const,
    userReviews: (userId: string) => ["user-reviews", userId] as const,
    adminDetailRoot: ["admin-review"] as const,
    adminDetail: (reviewId: string) => ["admin-review", reviewId] as const,
    /** Admin sidebar badge — PENDING moderation count */
    pendingCountRoot: ["book-review-pending-count"] as const,
    pendingCount: ["book-review-pending-count"] as const,
  },
  tickets: {
    root: ["support-tickets"] as const,
    adminRoot: ["admin-support-tickets"] as const,
    adminList: <TFilters>(filters: TFilters) =>
      ["admin-support-tickets", filters] as const,
    userRoot: ["user-support-tickets"] as const,
    userList: <TFilters>(userId: string, filters: TFilters) =>
      ["user-support-tickets", userId, filters] as const,
    detailRoot: ["support-ticket"] as const,
    // Replies are embedded in the ticket detail payload (`detail(ticketId)`)
    // — there is no separate replies query/cache to avoid a duplicate fetch
    // of the same data on every ticket.write invalidation.
    detail: (ticketId: string) => ["support-ticket", ticketId] as const,
    /** Admin sidebar badge — OPEN + IN_PROGRESS count */
    openCountRoot: ["support-ticket-open-count"] as const,
    openCount: ["support-ticket-open-count"] as const,
  },
  notifications: {
    root: ["notifications"] as const,
    list: (limit?: number) => ["notifications", limit ?? 20] as const,
    unreadCountRoot: ["notifications-unread-count"] as const,
    unreadCount: ["notifications-unread-count"] as const,
  },
  activityLog: {
    root: ["activity-logs"] as const,
    list: <TFilters>(filters: TFilters) => ["activity-logs", filters] as const,
  },
  admin: {
    root: ["admin"] as const,
    stats: ["admin-stats"] as const,
    requestsRoot: ["admin-requests"] as const,
    pendingRequests: ["pending-admin-requests"] as const,
    /** Recent APPROVED/REJECTED make-admin decisions (reviewer attribution). */
    recentRequestDecisions: ["admin-request-decisions"] as const,
    /** Prefix for invalidateMutation — covers all requestDetail(id) keys. */
    requestDetailRoot: ["admin-request-detail"] as const,
    /** Single make-admin request detail (detail route prefetch). */
    requestDetail: (id: string) => ["admin-request-detail", id] as const,
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
    /** Sidebar muted counters (books/users/queues) — densify via patchAdminNavCounts */
    navCounts: ["admin-nav-counts"] as const,
  },
} as const;
