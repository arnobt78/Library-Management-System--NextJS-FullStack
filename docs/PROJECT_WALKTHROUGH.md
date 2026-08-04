# Project Walkthrough

> Parent: REQ-0018, REQ-0024, CR-0002 | Updated: 2026-08-03 | Status: C2 Stage 4; corrective local Prove passed; Gate 2 blocked

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
2. Query hooks reuse SSR data with a bounded 30-second freshness window.
3. Successful mutations select one typed family that drives TanStack domains and RSC paths.
4. Active observers refetch immediately; inactive queries are invalidated and reconcile on navigation/back, focus or reconnect.
5. Book CRUD also calls `router.refresh()` for the current RSC tree.
6. A data-free, event-ID/generation-deduplicated `BroadcastChannel` signal repeats invalidation in other same-origin tabs.

Domains cover books, users, borrows, reviews, admin state, analytics, recommendations and operational/export statistics. This is browser-local realtime, not cross-device push.

## CRUD and persistence

- Book forms use React Hook Form + Zod and call typed mutations.
- Borrow requests use an optimistic pending record with rollback on failure.
- Reviews and administrative workflows refetch their dependent aggregates.
- Featured-book selection uses `books.is_featured`; migration `0008` enforces at most one featured row.
- Hard delete removes dependent reviews/borrow rows transactionally after current-database admin authorization and explicit secret verification.

## Authentication and authorization

- Auth.js credentials produce JWT sessions; database role/status is authoritative.
- Passwords: versioned scrypt (`lib/auth/password.ts`) with legacy SHA-256 verify + rehash-on-login.
- `lib/auth/authorization.ts` resolves the session ID against current database role/status for actions and privileged API routes.
- User writes enforce ownership; admin/reviewer/audit identities come from the server and cannot be supplied by the browser.
- Borrow approval/return/rejection, fine batches, bulk lifecycle work, admin-request approval, and hard deletion use transactions and row locks to prevent partial or replayed state changes.
- User permission/status writes and fine updates record the authenticated admin; migration `0009_users_audit_fields.sql` adds the user audit columns.
- Sign-in demo dropdown: `TEST_ACCOUNTS` (Test User / Test Admin). Reset DB with `npm run seed:reset` (17 books + both accounts; avatars `/images/profile-img*.png` via `UserAvatar`/`resolveUniversityCard`).
- Borrow History (`/my-profile`): RSC INNER JOIN seeds `initialBorrowHistory`; `useUserBorrows` takes `BorrowRecordFull` + `initialDataUpdatedAt`; UI prefers RQ only when `book.title` is valid (no Unknown Book flash).
- Profile tabs URL-synced: `?tab=active-borrows|pending-requests|borrow-history` (`lib/profile/profileTabs.ts`); borrow success → pending-requests. KPIs above tabs from `computeBorrowStats`; glass tab/badge chrome; section titles+subtitles match All Books hero. Toasts resolve real book titles (`resolveActionBookTitle`); CTA pending uses `Loader2`.
- Login hardening (2026-08-02): shared DB must have `users.updated_at`/`updated_by` (`0009`); password rehash failures must not abort credentials authorize. Do not write scrypt hashes into a DB while production still runs a pre-scrypt build.

## UI shell and controls (2026-08-02)

- Root layout: Header + main + `Footer` inside `.page-shell` / `max-w-9xl` (96rem). Auth layout uses `Footer variant="auth"`. Admin has no site footer.
- Meta nav: API Docs + API Status. `/performance` redirects to `/api-status`; dashboard mounts embedded.
- Filters: `FilterSelect` + `lib/ui/filterOptionStyles.ts`. Select scroll-lock: unlayered `body[data-scroll-locked]` margin/overflow rules in `globals.css`.
- Buttons: click ripple via `lib/ui/ripple` (`ui/button`, `TabsTrigger`, profile glass CTAs). Optional `.cta-shine-wrap` on Borrow / Book Details / Discover. Do not `@apply hover:bg-primary/90` — CSS-var primary needs `:hover { color-mix(...) }`. Spec: `docs/RIPPLE_BUTTON_EFFECT.md`.

## Book overview hero (2026-08-03, REQ-0033)

- Shared by homepage featured hero and `/books/[id]` via `BookOverviewContent` + `BookBorrowStats` + `BookSkeleton`.
- Layout: full-width title/meta header; body details left / hero right at `md+`; below `md` order title → hero → details.
- Soft spotlight: `.book-overview__hero-glow` uses cover-tint CSS var, `filter: blur`, no `border-radius` disk clip; disabled under `prefers-reduced-motion`.
- Library Database dates and Borrow Statistics use the same 2-col `text-sm sm:text-base` / `sm:gap-12 lg:gap-24` row pattern; availability uses emerald/amber/red.
- Mutation/invalidation unchanged — still `useBook` / `useBookBorrowStats` + existing domain registry.

## Related recommendations + BookCard (2026-08-03)

- Detail page mounts `RelatedBookRecommendations` (genre-first via `lib/books/getRelatedBooks`, SSR + `useRelatedBooks` / `["book-related", bookId, limit]`).
- Invalidation: `relatedRoot` is under books + recommendations domains (no new mutation family).
- `BookCard`: subtle cover glow, cover-width meta, `line-clamp-2` title/author, star + rating beside genre, hover scale/tilt with reduced-motion off. List keys use `book.id`.

## All Books catalog UX (2026-08-03, REQ-0033 polish)

- Layout: full-width filter toolbar (no sidebar); Sort by + dismissible chips + Reset All on the meta row; sticky transparent Header with scroll blur (`RootHeaderShell`).
- Instant filters: 300ms debounced search, immediate selects via `router.replace`; live URL → `useAllBooks`; `keepPreviousData` avoids empty flash; SSR title/author search uses `ilike` (API parity).
- Counts: subtitle uses unfiltered `initialLibraryTotalBooks` / catalog meta query; “Showing X of Y” uses filtered pagination total.
- Chrome: dark FilterSelect `h-9`, `FilterSurface` tones, hover icons stay light; search field matches `border-gray-700` / `.catalog-search-input` clear control.
- Loading: pulse toolbar + `BookCardSkeleton` only — no “Updating…” / “Loading books…” copy.

## My Profile UX (2026-08-03, REQ-0033 polish)

- Hero matches All Books. Shared `GlassSectionHeader` for stats + tab sections. KPI cards: icon | title/hint | value.
- Tabs: transparent track + dark glass pills. Borrow rows: soft glass + left accent; status icons (`Timer` / `RotateCwFadingClock` / `AlarmClockCheck`); glass CTAs (`.profile-action-btn*`).
- `CountdownTimer` lazy-inits from dueDate (fixes red flash). `review.write` includes `/my-profile`.
- Admin→profile CSS leak: no Card/`bg-card` on borrow rows; `.profile-borrow-row` forces dark glass (`!`). Status: requested/approved datetime + return date-only (`lib/profile/formatBorrowDates.ts`).
- Scroll: manual `scrollRestoration` + layout scroll-to-top; header starts blurred until top measured.
- Reviews: shared `ReviewFormDialog` for create+edit; delete spins until settle; kebab Cancel; avatars via `universityCard`+Robohash; optimistic RQ + dynamic toasts.
- My Profile: borrow book title links to `/books/[id]`; Return/Renew/Details/Review + tab triggers use shared ripple.

## Make-admin / signup (2026-08-04)

- `/make-admin`: `requireSignedInActor`; PENDING/REJECTED use `AccountRegistrationNotice` + locked form; APPROVED form + signup/make-admin reviewer strips; create/cancel APPROVED-only.
- Signup who/when: `status_reviewed_by`/`status_reviewed_at` (`0011`); make-admin who/when: `admin_requests.reviewed_*`. Shown on make-admin, my-profile, Sign-up recent decisions, user 360.
- Sign-up recent: applicant avatar + registered; null `decidedAt` filtered; RQ under `user.write`; seed stamps demo reviewers.
- Signup ledger `user_status_decisions` (`0012`): history survives re-apply; Recent decisions from ledger.
- Approve/reject: optimistic pending remove + Recent decisions prepend with session actor (no “an admin” flash) then `await invalidateMutation("user.write")`.
- REJECTED students re-apply → PENDING (`requestRegistrationReview`); welcome email on signup; mutations `await invalidateMutation` so spinners hold until lists/shells update; `PersonAttribution` for applicants.
- Admin PersonAttribution links (explicit `href`) → `/admin/users/[id]`; student make-admin/profile stay non-linked.
- Ops: `npm run admin-requests:purge -- <email>`; `npm run signup-decisions:purge` clears Sign-up Recent ledger.
- Decision emails: unique subject + text actor (no images); pending-approval toast; Sign-up/Borrow admin badges.
- Borrow RQ APPROVED-only (`accountStatus` prop/SSR → session); book detail + my-profile pass status. PENDING my-profile: zero KPIs + notice tabs (no borrow fetch / red 403).
- Dev: `logging.serverFunctions: false`; `proxy.ts` static matcher; `npm run user:delete -- <email>` for re-signup tests.

## API docs (2026-08-03)

- `/api-docs`: left title/subtitle (All Books/profile colors); glass section headers; shared `lib/apiDocs/endpoints.ts` covers current REST routes (Auth.js, books, borrows, status, cron, etc.).
- `/api-status`: glass Overall/Service/Metrics + Client Performance; Lucide (no emoji titles); Refresh toasts status counts; Reset Metrics clears Zustand only.
- Primary `Button` hover: `.btn-primary` + `color-mix` (not `hover:bg-primary/90`).
- `SafeImage`: next/image with native `<img>` fallback on error; used in UserAvatar + Sign-up Requests cards; ImageKit paths stay on `@imagekit/next`.
- Vercel guardrails: dashboard Bot Challenge + AI Deny; code `app/robots.ts`, security/static headers in `next.config.ts` + `vercel.json`, CSP Robohash, `data-scroll-behavior` on root html (`docs/VERCEL_PRODUCTION_GUARDRAILS.md`).
- Sentry: `@sentry/nextjs` + `/api/monitoring` tunnel (ad-blocker bypass); `global-error` reports; DSN/org/project/token via env (see `.env.example`).
- Auth UX: demo subtitles; `.auth-box` frost; demo role/status frozen + Approve blocked; Lucide UI icons.
- Make-admin / All Users: badges+chips+reject attribution/timestamps; Recent decisions (`scope=decisions`); Decline dialog + Approve confirm; admin-request + signup-status emails `after()` Brevo→Resend; `admin-request.write` / `user.write`.

## Environment

Copy `.env.example` to `.env`. It documents required/optional scope, safe formats and provider acquisition links. Never commit `.env`. Important server-only values include `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_DELETE_SECRET`, `IMAGEKIT_PRIVATE_KEY`, Redis/QStash tokens, `RESEND_TOKEN`, `RESEND_SENDER_EMAIL`, and `CRON_SECRET`.

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

Latest C2 Prove evidence: strict types and zero-warning lint pass; 84 default tests and 10/10 disposable-PostgreSQL authorization/concurrency/replay/outbox/expiry tests pass in ten consecutive stress runs; npm audit reports zero vulnerabilities; migration `0010` forward/down preserves base tables; the Next.js 16.2.12 production build generates 54 routes; local health/security-header smoke passes.

Independent Verify records all 27 C1-approved cases PASS. C2 implements versioned scrypt with legacy upgrade, protected diagnostics/security headers, server-side media verification, mutation/RSC coherence, server-first Suspense routes, user 360, reservations/renewals, deterministic insights and bounded PostgreSQL telemetry/SLO logic. Corrective C2 Red Team reports zero known code failures, but all 75 exact C2 procedures retain nonlocal evidence flags. The Project Owner authorized a local checkpoint commit; Gate 2, push and deployment remain blocked.

The 2026-08-02 correction added retry-safe READY delivery: workers claim rows with `SKIP LOCKED`; PostgreSQL time and in-transaction payload reads remove host-clock and claim/delete windows; a five-minute dispatch lease and 10-second provider timeout prevent stale transition races without holding database locks across network calls; delivery concurrency is capped at five; the stable Resend key, receipts/retries, eight-attempt dead-lettering, exact/scheduled expiry, `after()` dispatch and authenticated cron provide recovery. Server auth Zod, rolling upload authorization, bounded profile inputs, selective prefetch/server shells and sanitized review errors passed final review. All browser mutations and server writes share the typed mutation/RSC registries, including user-360 dependencies. Cross-device push remains excluded; deployed provider/browser/load/alert/SLO/restore evidence is absent. Redis remains rate limiting only.

Accepted implementation commit: `d9b9fd9`. Agile V cycle C1 is complete and frozen under `.agile-v/cycles/C1/`.

## Known boundaries

- No Python application exists; Python validation is not applicable.
- No business-data Redis cache exists.
- No WebSocket/SSE layer exists for cross-device updates.
- Bulk-operation UI placeholders remain intentional product stubs, not active CRUD.
- Independent Agile V verification and Gate 2 status are maintained in `.agile-v/STATE.md`.

## Agent resume

Read `CLAUDE.md`, `.agile-v/STATE.md`, `.agile-v/CHECKPOINTS.md`, `.agile-v/REQUIREMENTS.md`, and `.agile-v/VALIDATION_SUMMARY.md` before the next change. Learner-facing docs: educational `README.md` + `SECURITY.md` (seed via `npm run seed:reset`; Borrow History profile SSR/`BorrowRecordFull`).

## C2 implementation boundary

Gate 1 (`GATE-0006`) authorized and local Prove completed ART-0013 through ART-0023. PostgreSQL remains authoritative; Redis is rate limiting only; browser/tab invalidation plus focus/reconnect is the approved realtime scope. Cross-session push, external LLM narratives, gRPC and copied commerce domains remain excluded. Apply `0010_reservations.sql` and configure `RESEND_TOKEN`, `RESEND_SENDER_EMAIL`, and `CRON_SECRET`; collect independent and production evidence before Gate 2.
