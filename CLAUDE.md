# Project Agent Memory

Parent: REQ-0018, REQ-0024. Keep this file compact; details belong in `docs/PROJECT_WALKTHROUGH.md` and `.agile-v/`.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind 3, PostgreSQL/Drizzle.
- Auth.js v5 JWT sessions; Redis is rate limiting only; QStash workflows are optional.
- TanStack Query owns client server-state; ImageKit handles media; Brevo falls back to Resend.

## Structure

- `app/`: routes/RSC/API; `components/`: reusable client/UI; `hooks/`: queries/mutations.
- `lib/query/keys.ts`: query-key authority; `lib/utils/queryInvalidation.ts`: mutation-domain invalidation.
- `lib/auth/authorization.ts`: current-DB actor authority; `lib/admin/borrowLifecycle.ts`: atomic borrow transitions.
- `lib/admin/actions/`: server operations; `database/`: schema/connections; `migrations/`: SQL history.
- `lib/circulation/reservationOutbox.ts`: retry-safe READY delivery; `revalidateMutation.ts`: RSC registry consumer.
- `.env.example`: configuration source; `.agile-v/STATE.md`: workflow resume source.

## Rules

- Preserve SSR `initialData`; invalidate related domains after every successful mutation.
- Active queries refetch; inactive/back-navigation queries are invalidated for mount; event-ID/generation BroadcastChannel syncs same-origin tabs.
- Do not claim cross-device realtime without WebSocket/SSE infrastructure.
- Redis has no business-data cache, so no Redis data invalidation currently applies.
- Never trust browser-supplied actor/role IDs; privileged writes require server-side DB authorization and ownership checks.
- Inventory/lifecycle writes must be transactional; role/status/fine writes persist server-derived actors; never expose secrets in source, logs, CLI arguments, or commits.
- Use `apply_patch`; preserve unrelated work; delete only proven-unreachable source.

## Checks

`npm ci && npm run typecheck && npm run lint && npm test && npm audit --audit-level=low && npm run build`

`TEST_DATABASE_URL=<disposable-postgres-url> npm run test:integration`

## Current state

- REQ-0019–0025 re-Prove passes: typecheck, lint, 40 default tests, 4 real PostgreSQL integration tests, audit 0, Next 16.2.12 build.
- REQ-0025 uses DB-backed actors, owner/admin policy, row locks, atomic lifecycle writes, and environment-only CLI secrets.
- Migration `0010_reservations.sql` was applied and schema-verified on the configured database on 2026-08-02; apply it separately to any other environment before matching code. `0010_reservations.down.sql` is the C2 rollback.
- Migration `0011_user_status_review.sql` on shared DB (2026-08-04): `status_reviewed_by`/`status_reviewed_at`. Down: `0011_user_status_review.down.sql`.
- Migration `0012_user_status_decisions.sql` on shared DB (2026-08-04): append-only signup decision ledger. Down: `0012_user_status_decisions.down.sql`.
- Full Verify is 27/27 PASS; Gate 2 is approved (`GATE-0004`); accepted implementation is `d9b9fd9`; C1 is archived.
- C2 REQ-0026–0033 Gate 1 is approved (`GATE-0006`); final local Prove passes: types, lint, 84 tests, 10 PostgreSQL tests repeated across 10 stress runs, audit 0, Next 16.2.12 build.
- C2 adds scrypt rehash-on-login, safe status/media boundaries, typed mutation registry, server-first/Suspense routes, user 360, FIFO reservations/renewals with command ledger/outbox, deterministic insights, and PostgreSQL telemetry/SLO calculation.
- Final corrective Red Team reports zero known code failures after clock-skew claims, exact expiry, server validation, rolling upload limits, profile bounds/prefetch/shells and review-error fixes. Nonlocal browser/provider/load/deployment/alert/backup-restore and dated SLO evidence remains FLAG. A local checkpoint commit is owner-authorized; do not claim SaaS readiness, Gate 2, push or deployment.
- READY delivery uses an idempotent Resend worker with a bounded dispatch lease, 10-second provider timeout, concurrency cap, finite dead-lettering, `after()` dispatch and secured cron recovery; all mutation families share client/RSC registries. Deployed receipt/production evidence remains open.
- C2 targets only library domains; supplier/warehouse/shipping commerce and gRPC are excluded absent a measured requirement.
- Demo seed: `npm run seed:reset` (`scripts/reset-and-seed.ts`) wipes FK-safe transactional tables, reseeds 17 `dummybooks.json` books (`availableCopies=totalCopies`, Algorithms featured) + `TEST_ACCOUNTS`. Old `database/seed.ts` / ad-hoc scripts retired.
- Nav `/my-profile` label: Borrow History. Profile SSR uses `BorrowRecordFull` + `initialDataUpdatedAt` so RQ does not flash Unknown Book.
- Docs: educational `README.md` + `SECURITY.md` (contact@arnobmahmud.com); title/screenshots preserved; seed commands match `seed:reset`.
- Auth ops: apply `0009` before `users.updated_at`/`updated_by`; rehash-on-login non-fatal. Legacy + scrypt verify; keep prod deploy in sync with hash format. GitGuardian `$scrypt$ln` on `UNKNOWN_ACCOUNT_PASSWORD` is FP (dummy equal-cost hash).
- UI shell: `.page-shell` + `max-w-9xl` (96rem); root Header/main/`Footer`; auth `Footer variant="auth"`; admin no footer.
- Nav: API Docs + API Status only; `/performance` → `/api-status` (embedded `PerformanceDashboard`).
- Select: FilterSelect icons (`lib/ui/filterOptionStyles.ts`); scroll-lock gutter fix (`body[data-scroll-locked]`).
- Buttons: ripple via shared `lib/ui/ripple` → `ui/button`, `TabsTrigger`, profile glass CTAs (`.btn-ripple`); CTA shine on Borrow/Details/Discover; default `.btn-primary` hover via `color-mix` (CSS-var `primary/90` is a no-op).
- Book overview (home + `/books/[id]`): full-width title header; md+ details|hero; soft `.book-overview__hero-glow` (blur, no disk clip, reduced-motion off); Library DB + Borrow Stats share 2-col row classes; Available/Low/Unavailable colors; RQ paths unchanged (REQ-0033 polish).
- Related recs on `/books/[id]`: `getRelatedBooks` + `/api/books/[id]/related` + `useRelatedBooks` (`book-related` keys). BookCard: centered cover, full-width meta, reserved 2-line title/author, stronger `.book-card__glow`, star+rating, hover tilt; `book-list`/`grid-cards` larger `gap-y`; `BookList` key=`id`.
- Sticky root Header: `.root-header` + `RootHeaderShell` (transparent top, blur when scrolled); `overflow-x-clip` so sticky works.
- `/all-books` toolbar: Search|Genre|Availability|Rating flex-1; Sort+chips meta row; instant search 300ms debounce; dropdowns `replace`; SSR search `ilike`; subtitle = unfiltered `libraryTotalBooks`; Showing = filtered; no Updating…; first-load pulse skeletons only.
- FilterSelect `h-9` + `labelLayout` + dark hover keeps icons visible; `FilterSurface` dark/light option tones; `.catalog-search-input` clear (x) = light-200.
- My Profile: `?tab=…`; KPIs/`GlassSectionHeader`/glass tabs+rows; `CountdownTimer` sync-init + `ClockAlert` (no false red); glass CTAs; `review.write`→`/my-profile`. PENDING/REJECTED: DB status + `AccountRegistrationNotice` shell.
- Admin→profile: borrow rows are `div.profile-borrow-row` with `!bg-dark-300/60` (no Card `bg-card`); status uses `formatBorrowDate(Time)` (`requested`/`approved`/`returned`); do not add `html.dark` (breaks light admin). Soft-nav risk: admin.css dual Tailwind base.
- Scroll polish: `ScrollToTop` sets `history.scrollRestoration=manual` + `scrollTo(auto)`; `RootHeaderShell` defaults `scrolled=true`, measures in `useLayoutEffect`.
- Reviews: shared `ReviewFormDialog` create+edit (no 1.5s delay); delete confirm spins until settle; kebab Cancel+separator; Created/Edited icons; `universityCard`+Robohash avatars; optimistic `setQueryData` + dynamic toasts.
- My Profile borrow title → `Link` `/books/[id]` (`hover:text-light-100/70`).
- `/make-admin`: `requireSignedInActor` (any status); PENDING/REJECTED via `AccountRegistrationNotice` + locked form; APPROVED form + signup strip via `statusReviewedBy` join. Create/cancel APPROVED-only.
- Auth JWT/session carries `status`; PENDING→APPROVED refreshes on jwt; auth toasts welcome/signup + companion pending-approval.
- Borrow RQ (`useUserBorrows`/`useBorrowRecords`): `enabled` only when effective status is `APPROVED` (prop/SSR preferred over session). Book detail passes SSR `userStatus`. My-profile loads DB status; PENDING/REJECTED get KPI zeros + notice tabs (no 403/red error).
- Signup decision attribution: `users.status_reviewed_by`/`status_reviewed_at` (migration `0011`); make-admin keeps `admin_requests.reviewed_by`/`reviewed_at`. Shared `AdminRequestReviewerAttribution` on make-admin, my-profile notice, Sign-up recent decisions, user 360.
- Sign-up recent: applicant avatar+registered; filter null `decidedAt`; RQ `useSignupStatusDecisions`; seed stamps demo `status_reviewed_*`.
- Signup decision ledger `user_status_decisions` (migration `0012`): approve/reject append; re-apply keeps history; Recent decisions read ledger.
- Approve/reject: optimistic pending remove + signup-decisions prepend with **session decisionActor** (no “an admin” flash) then `await invalidateMutation("user.write")`.
- REJECTED→PENDING via `requestRegistrationReview` + notice CTA; welcome email on signup (`lib/email/welcomeSignup.ts`); Approve/Reject/Return spinners await `invalidateMutation` (no stale flash).
- Shared `PersonAttribution` (avatar · Name · email); admin Recent cards link via explicit `href` to `/admin/users/[id]` (`text-blue-700 hover:underline`).
- Ops: `npm run admin-requests:purge -- <email>`; `npm run signup-decisions:purge` [email?] clears Sign-up Recent ledger.
- Decision emails: unique subject (`ISO` + nonce) + text actor; no `<img>`. Bulk approve/reject stamps review fields + emails.
- Admin nav badges: All Users (make-admin pending), Sign-up Requests, Borrow Requests (SSR counts + RQ).
- `/api-docs`: All Books-style hero; `GlassSectionHeader` sections; catalog `lib/apiDocs/endpoints.ts` (full `app/api` routes).
- `/api-status`: glass health + embedded PerformanceDashboard; Refresh/Reset → `showToast.status.*` (dynamic healthy count/ms).
- Media: `SafeImage` (`components/ui/safe-image.tsx`) for local/remote/`next/image` URLs; ImageKit relative paths stay on `@imagekit/next`.
- Prod guardrails: dashboard Bot Challenge + AI Deny (not in repo); `app/robots.ts`; headers + `/_next/static` immutable in `next.config.ts`/`vercel.json`; CSP `robohash.org`; `html[data-scroll-behavior=smooth]`. See `docs/VERCEL_PRODUCTION_GUARDRAILS.md`.
- Sentry (`@sentry/nextjs`): `instrumentation-client` + server/edge configs; `tunnelRoute: /api/monitoring`; `global-error` captures; env in `.env.example` (real keys only in `.env`/Vercel). No PostHog; Redis stays rate-limit only.
- Auth: tight title/`text-light-200` sub; `.auth-box` glass; `isProtectedDemoAccount` locks role/status + Approve. Lucide UI icons; brand logos kept.
- Dev logging: `logging.serverFunctions: false` (no Server Action password dumps). `proxy.ts` matcher skips static assets.
- Ops: `npm run user:delete -- <email>` FK-safe single-user wipe for re-signup tests (blocks demo accounts).
- Borrow soft-cancel: migration `0013` adds `CANCELLED`; reject pending → keep row (history), not DELETE.
- Admin privilege ledger: All Users/bulk Make Admin → `adminPrivilegeLedger` (approve PENDING or insert `ADMIN_REQUEST_DIRECT_GRANT_REASON`); demote/`updateUserRole(USER)` → `removeAdminPrivileges` revoke. Invalidate `admin-request.write`.
- Signup Recent: SSR `currentAdmin` (card) preferred for optimistic actor; session fallback name/email only.
- Never set `TEST_DATABASE_URL` to shared/prod demo DB — integration suite TRUNCATEs tables.
- Agile V: C2 active; Gate 1 `GATE-0006`; Wave 5 production evidence incomplete; EvalGate FAIL blocks Gate 2.
