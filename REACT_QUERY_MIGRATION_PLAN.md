# React Query Migration Plan - University Library Management System

## 📋 Overview

This document outlines the step-by-step migration plan to implement TanStack React Query across the entire project with production-ready patterns, proper caching, and optimal performance.

**Migration Strategy:** One page/component at a time with confirmation after each completion.

---

## 🎯 Goals

- ✅ **Infinite Cache Strategy**: `staleTime: Infinity` - cache forever until DB changes
- ✅ **Instant UI Updates**: Mutations invalidate related queries automatically
- ✅ **Zero Redundant API Calls**: Smart caching prevents duplicate requests
- ✅ **SSR + CSR Hybrid**: Server Components for initial load, Client Components for updates
- ✅ **Search/Query Params**: URL-based state management where applicable
- ✅ **Skeleton Loaders**: Exact size matching for all components
- ✅ **ShadCN Toasts**: All notifications via centralized toast system
- ✅ **Type Safety**: Strict TypeScript with explicit types
- ✅ **Performance Tracking**: Integrated with React Query lifecycle

---

## 🏗️ Architecture Layers

```bash
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Foundation (Non-Breaking)                     │
│  - QueryProvider config update                          │
│  - Service layer creation                               │
│  - Cache invalidation utilities                         │
│  - Skeleton loader components                           │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 2: Query Hooks (Non-Breaking)                    │
│  - Refactor existing hooks                              │
│  - Create new query hooks                               │
│  - Integrate performance tracking                       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 3: Mutation Hooks (Non-Breaking)                 │
│  - Wrap all server actions                              │
│  - Add cache invalidation                               │
│  - Toast notifications                                  │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 4: Component Migration (Incremental)             │
│  - Convert pages one by one                             │
│  - Add search/query params                              │
│  - Implement skeleton loaders                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```bash
lib/
├── services/                    # Pure API functions (NEW/ENHANCED)
│   ├── books.ts                 # Book-related API calls
│   ├── users.ts                 # User-related API calls
│   ├── borrows.ts               # Borrow record API calls
│   ├── reviews.ts               # Review API calls
│   ├── admin.ts                 # Admin-specific API calls
│   ├── analytics.ts             # Analytics API calls
│   └── apiError.ts              # Error utility (NEW)
│
├── utils/
│   └── queryInvalidation.ts     # Cache invalidation utilities (NEW)
│
hooks/
├── useQueries.ts                # Query hooks (REFACTORED)
├── useMutations.ts              # Mutation hooks (NEW)
└── useSkeletons.ts              # Skeleton loader hooks (NEW)

components/
├── ui/
│   └── skeleton.tsx             # Base skeleton component (NEW)
├── skeletons/                   # Page-specific skeletons (NEW)
│   ├── BookSkeleton.tsx
│   ├── UserSkeleton.tsx
│   ├── BorrowSkeleton.tsx
│   └── ...
└── QueryProvider.tsx            # Updated config

app/
└── [pages]/                     # Migrated pages (HYBRID SSR+CSR)
    ├── page.tsx                 # Server Component (initial data)
    └── [Page]Client.tsx        # Client Component (React Query)
```

---

## 🔄 Phase 1: Foundation (Non-Breaking)

### 1.1 Update QueryProvider

**File:** `components/QueryProvider.tsx`

- Change `staleTime: Infinity`
- Add `refetchOnMount: true`
- Optimize default options
- Add error handling

### 1.2 Create Service Layer

**Files to Create:**

- `lib/services/apiError.ts` - Error utility class
- `lib/services/books.ts` - Book API functions
- `lib/services/users.ts` - User API functions
- `lib/services/borrows.ts` - Borrow API functions
- `lib/services/reviews.ts` - Review API functions
- `lib/services/admin.ts` - Admin API functions
- `lib/services/analytics.ts` - Analytics API functions

**Pattern:** Pure functions, no React Query logic, reusable for SSR/CSR

### 1.3 Create Cache Invalidation Utilities

**File:** `lib/utils/queryInvalidation.ts`

- `invalidateBooksQueries()`
- `invalidateUsersQueries()`
- `invalidateBorrowsQueries()`
- `invalidateReviewsQueries()`
- `invalidateAdminQueries()`
- `invalidateAllRelatedQueries()` - Smart invalidation

### 1.4 Create Skeleton Components

**Files to Create:**

- `components/ui/skeleton.tsx` - Base skeleton component
- `components/skeletons/BookSkeleton.tsx`
- `components/skeletons/BookCardSkeleton.tsx`
- `components/skeletons/UserSkeleton.tsx`
- `components/skeletons/BorrowSkeleton.tsx`
- `components/skeletons/AdminStatsSkeleton.tsx`
- `components/skeletons/TableSkeleton.tsx`
- `hooks/useSkeletons.ts` - Skeleton hook utilities

**Requirement:** Exact height/width matching for each component

---

## 🔄 Phase 2: Query Hooks (Non-Breaking)

### 2.1 Refactor Existing Hooks

**File:** `hooks/useQueries.ts`

- Update `useBooks()` - Add search/query params support
- Update `useBook()` - Add initialData support
- Update `useUserProfile()` - Add initialData support
- Update `useBorrowRecords()` - Add filters/query params
- Update `useAdminStats()` - Add initialData support
- Update `useBorrowRequests()` - Add filters/query params

### 2.2 Create New Query Hooks

**File:** `hooks/useQueries.ts` (extend)

- `useAllBooks()` - All books with search/filter
- `useBookRecommendations()` - Book recommendations
- `useAllUsers()` - All users with search/filter
- `useUserBorrows()` - User-specific borrows
- `useBookReviews()` - Book reviews
- `useReviewEligibility()` - Review eligibility check
- `useAdminAnalytics()` - Admin analytics
- `useBusinessInsights()` - Business insights
- `useSystemMetrics()` - System metrics
- `useServiceHealth()` - Service health checks

**Pattern:** All hooks use `staleTime: Infinity`, `refetchOnMount: true`

### 2.3 Integrate Performance Tracking

**File:** `hooks/useQueries.ts`

- Integrate `useQueryPerformance()` into all hooks
- Track cache hits/misses
- Track query times

---

## 🔄 Phase 3: Mutation Hooks (Non-Breaking)

### 3.1 Create Mutation Hooks

**File:** `hooks/useMutations.ts` (NEW)

**Book Mutations:**

- `useCreateBook()` - Create book
- `useUpdateBook()` - Update book
- `useDeleteBook()` - Delete book

**User Mutations:**

- `useUpdateUserRole()` - Update user role
- `useUpdateUserStatus()` - Update user status
- `useApproveUser()` - Approve user
- `useRejectUser()` - Reject user

**Borrow Mutations:**

- `useBorrowBook()` - Request book borrow
- `useApproveBorrow()` - Approve borrow request
- `useRejectBorrow()` - Reject borrow request
- `useReturnBook()` - Return book

**Review Mutations:**

- `useCreateReview()` - Create review
- `useUpdateReview()` - Update review
- `useDeleteReview()` - Delete review

**Admin Mutations:**

- `useApproveAdminRequest()` - Approve admin request
- `useRejectAdminRequest()` - Reject admin request
- `useRemoveAdminPrivileges()` - Remove admin
- `useUpdateFineConfig()` - Update fine config
- `useSendDueReminders()` - Send due reminders
- `useSendOverdueReminders()` - Send overdue reminders
- `useUpdateOverdueFines()` - Update overdue fines

**Pattern:** All mutations invalidate related queries, show toasts

---

## 🔄 Phase 4: Component Migration (One by One)

### Priority Order (Based on Usage & Complexity)

#### **Group A: Public Pages (User-Facing)**

1. ✅ **Home Page** (`app/(root)/page.tsx`)
   - Books list with recommendations
   - Search/query params: `?search=`, `?genre=`, `?sort=`
   - Skeletons: BookCardSkeleton

2. ✅ **All Books Page** (`app/(root)/all-books/page.tsx`)
   - Full books list with filters
   - Search/query params: `?search=`, `?genre=`, `?author=`, `?sort=`, `?page=`
   - Skeletons: BookCardSkeleton grid

3. ✅ **Book Detail Page** (`app/(root)/books/[id]/page.tsx`)
   - Single book with reviews
   - Search/query params: None (ID-based)
   - Skeletons: BookDetailSkeleton

4. ✅ **My Profile Page** (`app/(root)/my-profile/page.tsx`)
   - User borrows, reviews, history
   - Search/query params: `?tab=active|pending|history`
   - Skeletons: BorrowSkeleton, ReviewSkeleton

#### **Group B: Admin Pages (High Priority)**

5. ✅ **Admin Dashboard** (`app/admin/page.tsx`)
   - Stats, overview, metrics
   - Search/query params: None (dashboard)
   - Skeletons: AdminStatsSkeleton

6. ✅ **Admin Books List** (`app/admin/books/page.tsx`)
   - All books management
   - Search/query params: `?search=`, `?status=`, `?sort=`
   - Skeletons: BookCardSkeleton, TableSkeleton

7. ✅ **Admin Create Book** (`app/admin/books/new/page.tsx`)
   - Book creation form
   - Search/query params: None
   - Skeletons: FormSkeleton

8. ✅ **Admin Edit Book** (`app/admin/books/[id]/edit/page.tsx`)
   - Book edit form
   - Search/query params: None
   - Skeletons: FormSkeleton

9. ✅ **Admin Users** (`app/admin/users/page.tsx`)
   - User management
   - Search/query params: `?search=`, `?status=`, `?role=`, `?sort=`
   - Skeletons: TableSkeleton, UserSkeleton

10. ✅ **Admin Book Requests** (`app/admin/book-requests/page.tsx`)
    - Borrow request management
    - Search/query params: `?status=`, `?sort=`, `?date=`
    - Skeletons: BorrowSkeleton, TableSkeleton

11. ✅ **Admin Account Requests** (`app/admin/account-requests/page.tsx`)
    - Account approval management
    - Search/query params: `?status=`, `?sort=`
    - Skeletons: TableSkeleton

12. ✅ **Admin Business Insights** (`app/admin/business-insights/page.tsx`)
    - Analytics and insights
    - Search/query params: `?period=`, `?metric=`
    - Skeletons: ChartSkeleton, StatsSkeleton

13. ✅ **Admin Automation** (`app/admin/automation/page.tsx`)
    - Automation tasks
    - Search/query params: None
    - Skeletons: CardSkeleton

#### **Group C: Status & Documentation Pages**

14. ✅ **API Docs** (`app/api-docs/page.tsx`)
    - API documentation
    - Search/query params: `?endpoint=`, `?method=`
    - Skeletons: CardSkeleton

15. ✅ **API Status** (`app/api-status/page.tsx`)
    - Service health status
    - Search/query params: None
    - Skeletons: ServiceCardSkeleton

16. ✅ **Performance Page** (`app/(root)/performance/page.tsx`)
    - Performance metrics
    - Search/query params: `?metric=`, `?period=`
    - Skeletons: ChartSkeleton, MetricSkeleton

---

## 📝 Implementation Details Per Page

### Pattern for Each Page Migration

1. **Create Service Functions** (if not exists)
   - Pure API functions in `lib/services/`

2. **Create Query Hooks** (if not exists)
   - Query hooks in `hooks/useQueries.ts`

3. **Create Mutation Hooks** (if needed)
   - Mutation hooks in `hooks/useMutations.ts`

4. **Create Skeleton Component**
   - Exact size matching skeleton in `components/skeletons/`

5. **Create Client Component**
   - `[Page]Client.tsx` with React Query hooks
   - Search/query params integration
   - Skeleton loading states
   - Toast notifications

6. **Update Server Component**
   - Keep SSR for initial data
   - Pass `initialData` to Client Component
   - Preserve SEO benefits

7. **Test & Verify**
   - Cache behavior (infinite cache)
   - Mutation invalidation
   - Search/query params
   - Skeleton loaders
   - Toast notifications

---

## 🎨 Skeleton Loader Requirements

### Exact Size Matching

- **BookCardSkeleton**: Match `BookCover` + text dimensions
- **TableSkeleton**: Match table row height × number of rows
- **FormSkeleton**: Match form field heights
- **ChartSkeleton**: Match chart container dimensions
- **StatsSkeleton**: Match stat card dimensions

### Implementation

```typescript
// Example: BookCardSkeleton
<div className="h-[200px] w-[300px]"> // Exact BookCard size
  <Skeleton className="h-32 w-24" /> // BookCover size
  <Skeleton className="h-4 w-48 mt-2" /> // Title width
  <Skeleton className="h-3 w-32 mt-1" /> // Author width
</div>
```

---

## 🔔 Toast Integration

### All Mutations Use ShadCN Toasts

- ✅ Success toasts on mutation success
- ❌ Error toasts on mutation failure
- ⚠️ Warning toasts for edge cases
- ℹ️ Info toasts for status updates

### Pattern

```typescript
onSuccess: () => {
  invalidateRelatedQueries();
  showToast.book.createSuccess(bookTitle);
};
```

---

## 🔍 Search/Query Params Strategy

### Pages That Need Search/Query Params

1. **All Books** (`/all-books`)
   - `?search=` - Search term
   - `?genre=` - Filter by genre
   - `?author=` - Filter by author
   - `?sort=title|author|rating|date` - Sort order
   - `?page=` - Pagination

2. **Admin Books** (`/admin/books`)
   - `?search=` - Search term
   - `?status=active|inactive` - Filter by status
   - `?sort=title|author|rating|created` - Sort order

3. **Admin Users** (`/admin/users`)
   - `?search=` - Search term
   - `?status=pending|approved|rejected` - Filter by status
   - `?role=user|admin` - Filter by role
   - `?sort=name|email|created` - Sort order

4. **My Profile** (`/my-profile`)
   - `?tab=active|pending|history` - Active tab

5. **Business Insights** (`/admin/business-insights`)
   - `?period=week|month|year` - Time period
   - `?metric=books|users|borrows` - Metric type

### Implementation Example

```typescript
const searchParams = useSearchParams();
const search = searchParams.get("search") || "";
const { data } = useBooks(search); // Query key includes search
```

---

## 🚀 Performance Optimizations

### 1. Infinite Cache Strategy

- `staleTime: Infinity` - Cache forever until invalidation
- `refetchOnMount: true` - Refetch only when stale (after invalidation)

### 2. Smart Invalidation

- Invalidate only related queries
- Use prefix matching for efficiency
- Batch invalidations when possible

### 3. SSR + CSR Hybrid

- Server Components fetch initial data (fast first load)
- Client Components use React Query (instant updates)
- `initialData` hydration prevents duplicate requests

### 4. Skeleton Loaders

- Exact size matching prevents layout shift
- Show immediately on mount
- Replace with data when loaded

### 5. Performance Tracking

- Integrated with React Query lifecycle
- Track cache hits/misses
- Monitor query times

---

## ✅ Migration Checklist Per Page

For each page migration, verify:

- [ ] Service functions created/updated
- [ ] Query hooks created/updated
- [ ] Mutation hooks created (if needed)
- [ ] Skeleton component created (exact size)
- [ ] Client Component created with React Query
- [ ] Server Component updated (SSR + initialData)
- [ ] Search/query params integrated (if applicable)
- [ ] Cache invalidation working
- [ ] Toast notifications working
- [ ] Performance tracking integrated
- [ ] TypeScript types explicit
- [ ] Code comments added
- [ ] No breaking changes
- [ ] No hydration issues
- [ ] Tested in dev environment

---

## 📊 Progress Tracking

### Phase 1: Foundation

- [ ] QueryProvider updated
- [ ] Service layer created
- [ ] Cache invalidation utilities created
- [ ] Skeleton components created

### Phase 2: Query Hooks

- [ ] Existing hooks refactored
- [ ] New query hooks created
- [ ] Performance tracking integrated

### Phase 3: Mutation Hooks

- [ ] All mutation hooks created
- [ ] Cache invalidation added
- [ ] Toast notifications added

### Phase 4: Component Migration

- [ ] Home Page
- [ ] All Books Page
- [ ] Book Detail Page
- [ ] My Profile Page
- [ ] Admin Dashboard
- [ ] Admin Books List
- [ ] Admin Create Book
- [ ] Admin Edit Book
- [ ] Admin Users
- [ ] Admin Book Requests
- [ ] Admin Account Requests
- [ ] Admin Business Insights
- [ ] Admin Automation
- [ ] API Docs
- [ ] API Status
- [ ] Performance Page

---

## 🔧 Technical Specifications

### Query Configuration

```typescript
{
  staleTime: Infinity,        // Cache forever
  gcTime: 5 * 60 * 1000,     // Keep 5 min after unmount
  retry: 1,                   // Retry once on failure
  refetchOnMount: true,       // Refetch if stale
  refetchOnWindowFocus: false, // Don't refetch on focus
  refetchOnReconnect: false,  // Don't refetch on reconnect
}
```

### Mutation Configuration

```typescript
{
  retry: 0,                   // Don't retry mutations
  onSuccess: () => {
    invalidateRelatedQueries();
    showToast.success(...);
  },
  onError: (error) => {
    showToast.error(...);
  }
}
```

### Service Function Pattern

```typescript
export async function getBooksList(
  searchTerm: string = "",
  filters: BookFilters = {}
): Promise<Book[]> {
  // Pure API function, no React Query logic
  const response = await fetch(...);
  if (!response.ok) throw new ApiError(...);
  return response.json();
}
```

### Query Hook Pattern

```typescript
export function useBooks(searchTerm: string = "", filters: BookFilters = {}) {
  return useQuery({
    queryKey: ["books", searchTerm, filters],
    queryFn: () => getBooksList(searchTerm, filters),
    staleTime: Infinity,
    refetchOnMount: true,
  });
}
```

### Mutation Hook Pattern

```typescript
export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      invalidateBooksQueries(queryClient);
      showToast.book.createSuccess(...);
    },
    onError: (error) => {
      showToast.error(...);
    }
  });
}
```

---

## 🎯 Success Criteria

### Performance

- ✅ Zero redundant API calls (cache working)
- ✅ Instant UI updates after mutations
- ✅ Fast page loads (SSR + cache)
- ✅ No layout shift (skeleton loaders)

### User Experience

- ✅ No page refreshes needed
- ✅ Smooth loading states
- ✅ Clear error messages
- ✅ Success notifications

### Code Quality

- ✅ Type-safe (strict TypeScript)
- ✅ Well-commented
- ✅ Reusable components/hooks
- ✅ Consistent patterns
- ✅ No breaking changes

---

## 📅 Estimated Timeline

- **Phase 1**: 2-3 hours
- **Phase 2**: 3-4 hours
- **Phase 3**: 4-5 hours
- **Phase 4**: 2-3 hours per page (16 pages = 32-48 hours)

**Total**: ~41-60 hours (one page at a time with confirmations)

---

## 🚦 Next Steps

1. **Start with Phase 1** (Foundation)
2. **Complete Phase 1** → Get confirmation
3. **Start Phase 2** (Query Hooks)
4. **Complete Phase 2** → Get confirmation
5. **Start Phase 3** (Mutation Hooks)
6. **Complete Phase 3** → Get confirmation
7. **Start Phase 4** (Component Migration)
8. **Migrate one page** → Get confirmation → Next page
9. **Repeat until all pages migrated**

---

**Last Updated:** 2025-01-19  
**Status:** Ready to Begin  
**Next Action:** Start Phase 1 - Foundation
