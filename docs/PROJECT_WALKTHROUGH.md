# Project Walkthrough

> Parent: REQ-0018, REQ-0024 | Updated: 2026-08-01 | Status: C1 security re-entry

## Purpose

BookWise is a Next.js university-library application with a public catalog, authenticated borrowing and reviews, administrative CRUD, fines/reminders, analytics, recommendations, media upload, and service-status routes.

## Runtime architecture

```text
Browser
  -> Next.js App Router / Proxy (Auth.js)
  -> RSC pages -> Drizzle -> PostgreSQL
  -> Client components -> TanStack Query -> route handlers/server actions
  -> ImageKit (media), Redis (rate limits), QStash (optional jobs), email providers
```

- Server components load the first render and pass `initialData` to query hooks.
- Client components own interaction, optimistic state, errors, and background refetch.
- PostgreSQL is authoritative. Redis does not cache business records.
- `proxy.ts` is the Next.js 16 request-proxy entry and exports Auth.js `auth` as `proxy`.

## Main directories

| Path | Responsibility |
|---|---|
| `app/` | Pages, layouts, route handlers, server-rendered composition |
| `components/` | Product components and reusable shadcn/Radix UI |
| `hooks/useQueries.ts` | Typed query consumers with SSR initial data |
| `hooks/useMutations.ts` | Central mutations, rollback, toasts, invalidation |
| `lib/query/keys.ts` | Query-key factory and prefix contract |
| `lib/utils/queryInvalidation.ts` | Domain mapping and same-origin tab propagation |
| `lib/admin/actions/` | Administrative reads/writes |
| `database/` | Drizzle schema, PostgreSQL and Redis clients |
| `migrations/` | Versioned SQL changes |
| `.agile-v/` | Requirements, decisions, risks, tests and gate state |

## Data freshness

1. RSC supplies first-paint data.
2. Query hooks reuse that data with `staleTime: Infinity`.
3. Successful mutations invalidate the exact affected domains.
4. Active observers refetch immediately; inactive queries become stale for navigation/back.
5. Book CRUD also calls `router.refresh()` for the current RSC tree.
6. A data-free `BroadcastChannel` signal repeats invalidation in other same-origin tabs.

Domains cover books, users, borrows, reviews, admin state, analytics, recommendations and operational/export statistics. This is browser-local realtime, not cross-device push.

## CRUD and persistence

- Book forms use React Hook Form + Zod and call typed mutations.
- Borrow requests use an optimistic pending record with rollback on failure.
- Reviews and administrative workflows refetch their dependent aggregates.
- Featured-book selection uses `books.is_featured`; migration `0008` enforces at most one featured row.
- Hard delete removes dependent reviews/borrow rows transactionally after current-database admin authorization and explicit secret verification.

## Authentication and authorization

- Auth.js credentials produce JWT sessions; database role/status is authoritative.
- `lib/auth/authorization.ts` resolves the session ID against current database role/status for actions and privileged API routes.
- User writes enforce ownership; admin/reviewer/audit identities come from the server and cannot be supplied by the browser.
- Borrow approval/return/rejection, fine batches, bulk lifecycle work, admin-request approval, and hard deletion use transactions and row locks to prevent partial or replayed state changes.
- User permission/status writes and fine updates record the authenticated admin; migration `0009_users_audit_fields.sql` adds the user audit columns.

## Environment

Copy `.env.example` to `.env`. It documents required/optional scope, safe formats and provider acquisition links. Never commit `.env`. Important server-only values include `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_DELETE_SECRET`, `IMAGEKIT_PRIVATE_KEY`, Redis/QStash tokens and email-provider keys.

## Quality commands

```bash
npm ci
npm run typecheck
npm run lint
npm test
TEST_DATABASE_URL=<disposable-postgres-url> npm run test:integration
npm audit --audit-level=low
npm run build
```

Latest Prove evidence: strict types pass, zero-warning lint passes, 40 default tests pass, 4/4 disposable-PostgreSQL race/rollback tests pass, npm audit reports zero vulnerabilities, and the Next.js 16.2.12 production build passes.

Independent Verify records all 27 approved test cases PASS. Gate 2 is approved, and the final repository-wide pre-commit audit found no blocking architecture, security, freshness, performance, cleanup, or configuration gap.

## Known boundaries

- No Python application exists; Python validation is not applicable.
- No business-data Redis cache exists.
- No WebSocket/SSE layer exists for cross-device updates.
- Bulk-operation UI placeholders remain intentional product stubs, not active CRUD.
- Independent Agile V verification and Gate 2 status are maintained in `.agile-v/STATE.md`.

## Agent resume

Read `CLAUDE.md`, `.agile-v/STATE.md`, `.agile-v/CHECKPOINTS.md`, `.agile-v/REQUIREMENTS.md`, and `.agile-v/VALIDATION_SUMMARY.md` before the next change.
