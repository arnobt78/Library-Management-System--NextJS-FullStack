# Project Agent Memory

Parent: REQ-0018, REQ-0024. Keep this file compact; details belong in `docs/PROJECT_WALKTHROUGH.md` and `.agile-v/`.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind 3, PostgreSQL/Drizzle.
- Auth.js v5 JWT sessions (`SESSION_MAX_AGE_SECONDS` = 1d idle); Redis is rate limiting only; QStash workflows are optional.
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
- Migration `0010_reservations.sql` applied/schema-verified 2026-08-02; down `0010_reservations.down.sql`.
- Migration `0014_admin_suite_expansion.sql` on shared DB (tickets/reviews/activity). Down: `0014_admin_suite_expansion.down.sql`.
- Migration `0015_books_created_by.sql` applied locally (2026-08-14): `books.created_by` FK. Down: `0015_books_created_by.down.sql`. Apply on other envs before matching seed/code.
- Migration `0011_user_status_review.sql` on shared DB (2026-08-04): `status_reviewed_by`/`status_reviewed_at`. Down: `0011_user_status_review.down.sql`.
- Migration `0012_user_status_decisions.sql` on shared DB (2026-08-04): append-only signup decision ledger. Down: `0012_user_status_decisions.down.sql`.
- Full Verify is 27/27 PASS; Gate 2 is approved (`GATE-0004`); accepted implementation is `d9b9fd9`; C1 is archived.
- C2 REQ-0026–0033 Gate 1 is approved (`GATE-0006`); final local Prove passes: types, lint, 84 tests, 10 PostgreSQL tests repeated across 10 stress runs, audit 0, Next 16.2.12 build.
- C2 adds scrypt rehash-on-login, safe status/media boundaries, typed mutation registry, server-first/Suspense routes, user 360, FIFO reservations/renewals with command ledger/outbox, deterministic insights, and PostgreSQL telemetry/SLO calculation.
- Final corrective Red Team reports zero known code failures after clock-skew claims, exact expiry, server validation, rolling upload limits, profile bounds/prefetch/shells and review-error fixes. Nonlocal browser/provider/load/deployment/alert/backup-restore and dated SLO evidence remains FLAG. A local checkpoint commit is owner-authorized; do not claim SaaS readiness, Gate 2, push or deployment.
- READY delivery uses an idempotent Resend worker with a bounded dispatch lease, 10-second provider timeout, concurrency cap, finite dead-lettering, `after()` dispatch and secured cron recovery; all mutation families share client/RSC registries. Deployed receipt/production evidence remains open.
- C2 targets only library domains; supplier/warehouse/shipping commerce and gRPC are excluded absent a measured requirement.
- Demo seed: `npm run seed:reset` (`scripts/reset-and-seed.ts`) wipes FK-safe transactional tables, reseeds `TEST_ACCOUNTS` then 17 `dummybooks.json` books (`availableCopies` = total; `created_by`/`updated_by` = test@admin.com) + `status_reviewed_*` stamps; queues/reviews/tickets/holds/activity intentionally empty for one-by-one testing.
- Nav `/my-profile` label: Borrow History. Profile SSR uses `BorrowRecordFull` + `initialDataUpdatedAt` so RQ does not flash Unknown Book.
- Docs: educational `README.md` + `SECURITY.md` (<contact@arnobmahmud.com>); portable auth UI → `docs/PORTABLE_AUTH_UI_GUIDE.md` (Select + Robohash + profile `modal={false}`); seed commands match `seed:reset`. (No VPS/Coolify runbooks in this repo — keep those local elsewhere.)
- Auth ops: apply `0009` before `users.updated_at`/`updated_by`; rehash-on-login non-fatal. Legacy + scrypt verify; keep prod deploy in sync with hash format. GitGuardian `$scrypt$ln` on `UNKNOWN_ACCOUNT_PASSWORD` is FP (dummy equal-cost hash). JWT idle TTL: `SESSION_MAX_AGE_SECONDS` = 1 day in `auth.ts` (+ matching `updateAge`); Auth.js derives cookie Max-Age; hard-reload keeps session (cookies only); post-deploy sign-out once to drop old 30d JWTs.
- UI shell: `.page-shell` + `max-w-9xl` (96rem) public only; root Header/main/`Footer`; auth `Footer variant="auth"`; admin full-bleed (no max-w) frosted Header+Sidebar over `bg-slate-50`.
- Admin chrome: shared `components/Header` `tone="light"` (orphan `admin/Header` deleted); `.root-header` `py-2` + `items-center`; `--admin-header-offset` 3/3.5rem; admin logo `/icons/admin/logo.svg`; dual `@tailwind base` in `admin.css` kept (soft-nav residual).
- Nav counts densify: `getAdminNavCounts` SSR + `/api/admin/nav-counts` (`authorizeAdminRoute`) + `patchAdminNavCounts` absolute merge after domain patches; signup INSERT/CLI skip client densify.
- Nav: API Docs + API Status only; `/performance` → `/api-status` (embedded `PerformanceDashboard`).
- Select: FilterSelect icons (`lib/ui/filterOptionStyles.ts`); explicit SelectValue children (no Portal clone flash on refresh); scroll-lock: neutralize RemoveScroll padding/overflow so sticky `.root-header` stays (`html body[data-scroll-locked]`); MultiSelect `modal={false}`.
- Admin list filters: universe KPIs via `lib/ui/adminListUniverse` + dual RQ; table = instant `localSearch` client-filter (`debounceMs={0}`; URL 300ms); unified `AdminFilterEmptyState` + Clear Filters; activity SSR seed only `7days`.
- Buttons: ripple via shared `lib/ui/ripple` → `ui/button`, `TabsTrigger`, profile glass CTAs (`.btn-ripple`); CTA shine on Borrow/Details/Discover; default `.btn-primary` hover via `color-mix` (CSS-var `primary/90` is a no-op).
- Book overview (home + `/books/[id]`): full-width title header; md+ details|hero; soft `.book-overview__hero-glow` (blur, no disk clip, reduced-motion off); Library DB + Borrow Stats share 2-col row classes; Available/Low/Unavailable colors; RQ paths unchanged (REQ-0033 polish).
- Related recs on `/books/[id]`: `getRelatedBooks` + `/api/books/[id]/related` + `useRelatedBooks` (`book-related` keys). BookCard: centered cover, full-width meta, reserved 2-line title/author, stronger `.book-card__glow`, star+rating, hover tilt; `book-list`/`grid-cards` larger `gap-y`; `BookList` key=`id`.
- Sticky root Header: `.root-header` + `RootHeaderShell` (transparent top, blur when scrolled; light skips transparent); `overflow-x-clip` so sticky works.
- `/all-books` toolbar: Search|Genre|Availability|Rating flex-1; Sort + glass chips + inline Reset All (`text-light-200`); glass empty Clear; optimistic `displayFilters` then URL; unfiltered prefetch; `useAllBooks` `skipEmptyPlaceholder`; 300ms search; SSR `ilike`; subtitle unfiltered total; Showing = filtered (content-width, may nudge 1↔2 digits).
- FilterSelect `h-9` + `labelLayout` + dark hover keeps icons visible; `FilterSurface` dark/light option tones; `.catalog-search-input` clear (x) = light-200; shared period opts `lib/ui/periodFilterOptions`; chip tokens `lib/ui/filter-chip-styles`.
- My Profile: `?tab=…`; KPIs/`GlassSectionHeader`/glass tabs+rows; client period/status filters (`lib/profile/tabListFilters`; default All Time / All Status); dark `DismissibleFilterChips` under headers; glass empty Clear; `CountdownTimer` sync-init + `ClockAlert`; glass CTAs; `review.write`→`/my-profile`. PENDING/REJECTED: DB status + `AccountRegistrationNotice` shell.
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
- Shared `PersonAttribution` (avatar · Name · email); sky links only when `href`; static dark names `text-light-100 hover:text-sky-100/80`; admin Recent cards pass `/admin/users/[id]`.
- Ops: `npm run admin-requests:purge -- <email>`; `npm run signup-decisions:purge` [email?] clears Sign-up Recent ledger.
- Decision emails: unique subject (`ISO` + nonce) + text actor; no `<img>`. Bulk approve/reject stamps review fields + emails.
- Admin nav badges: All Users (make-admin pending), Sign-up Requests, Borrow Requests (SSR counts + RQ).
- `/api-docs`: All Books-style hero; `GlassSectionHeader` sections; catalog `lib/apiDocs/endpoints.ts` (full `app/api` routes).
- `/api-status`: glass health + embedded PerformanceDashboard; Refresh/Reset → `showToast.status.*` (dynamic healthy count/ms).
- Media: `SafeImage` (`components/ui/safe-image.tsx`) for local/remote/`next/image` URLs; ImageKit relative paths stay on `@imagekit/next`.
- Prod guardrails: dashboard Bot Challenge + AI Deny (not in repo); `app/robots.ts`; headers + `/_next/static` immutable in `next.config.ts`/`vercel.json`; CSP `robohash.org`; `html[data-scroll-behavior=smooth]`. See `docs/VERCEL_PRODUCTION_GUARDRAILS.md`.
- Engines: `node` `24.x` (Vercel). Sentry (`@sentry/nextjs`): `instrumentation-client` + server/edge; `tunnelRoute: /api/monitoring`; `withSentryConfig` `silent` unless `SENTRY_VERBOSE=1`, `telemetry: false`; env in `.env.example` (keys only in `.env`/Vercel). No PostHog; Redis rate-limit only.
- Auth: tight title/`text-light-200` sub; `.auth-box` glass; `isProtectedDemoAccount` locks role/status + Approve. Lucide UI icons; brand logos kept.
- Dev logging: `logging.serverFunctions: false` (no Server Action password dumps). `proxy.ts` matcher skips static assets.
- Ops: `npm run user:delete -- <email>` FK-safe single-user wipe for re-signup tests (blocks demo accounts).
- Borrow soft-cancel: migration `0013` adds `CANCELLED`; reject pending → keep row (history), not DELETE.
- Admin privilege ledger: All Users/bulk Make Admin → `adminPrivilegeLedger` (approve PENDING or insert `ADMIN_REQUEST_DIRECT_GRANT_REASON`); demote/`updateUserRole(USER)` → `removeAdminPrivileges` revoke. Invalidate `admin-request.write`.
- Signup Recent: SSR `currentAdmin` (card) preferred for optimistic actor; session fallback name/email only.
- Densify actor card: `AuthorizedActor.universityCard` from DB; `resolveDecisionActor` + SSR `currentAdmin` on All Users / Admin Requests / Sign-up / User 360 / Book Reviews (no JWT card; session fallback null-card intentional).
- Never set `TEST_DATABASE_URL` to shared/prod demo DB — integration suite TRUNCATEs tables.
- Agile V: C2 active; Gate 1 `GATE-0006` + CR-0003 `GATE-0007`; tip/HEAD `073afae`; densify closeout shipped; ImageKit upload-limit deferred; EvalGate FAIL blocks Gate 2.
- Auth JWT idle: `SESSION_MAX_AGE_SECONDS` = 1d (`auth.ts`); hard-reload keeps cookies; clear cookies to logout.
- Densify closeout (2026-08-16): book `finiteTotal`/thin-key sync; early delete densify book+review+ticket; bulk densify (+admin pending clear); reminder bell bump; debug ingest gone.
- Sentry (2026-08-16): drop expected `AuthorizationError` via shared `beforeSend`; admin pages `requireAdminActorOrRedirect` (no digest noise).
- Root 404 (2026-08-16): `#not-found` `text-dark-100`/`text-dark-200` + `SKY_LINK_LIGHT` browse link.
- UX polish (2026-08-15): BookForm confirm settle through soft-nav; bell unread circle; `/admin/users` no `?sort=created` URL rewrite (in-memory default + PrefetchLink `ADMIN_USERS_UNFILTERED`).
- Phase A (2026-08-15, no LLM): Insights `C2-v2` (overdue trend, fine forecast, genre pressure); User 360 next actions; `/api/cron/due-reminders` + REMINDER_DUE/HOLD_READY; delete book no 404 flash; reviews empty no skeleton; Overview shared empty.
- Bulk Automation (DEC-0108/0109): UUID dialog + pending loaders; success `count`; invalidate-only (no invent activity); bulk delete → `densifyBookDelete`; reminder stamp fail ≠ sent.
- CR-0003 (REQ-0034–0037): tickets + review mod + activity FIFO-50 + bell + KPIs/tables; mig `0014`; `ticket.write` + `patchTicketCaches*`; Zod ticket/review; bell SSR shell (list+unread+total) + `totalCount` densify + rose New/Check/Close dropdown; My Reviews SSR; reply thread single-source; Prove 110 tests.
- Ticket UI polish: person stack; KPI/section/date/activity; `CARD_PAD` p-2/sm:p-4 (also `.admin-container` + api-docs/status/performance); `LIGHT_GLASS_CTA` primary-admin/red-800; Tailwind `./lib/**`; sky links; edit dialog; densify + back-nav. Instrumentation removed.
- Densify Waves A–C + review CRUD: `patchBorrowCaches*`; `optimisticAdminRequestDecision`; await `book.write`; `patchReviewCaches*` (create/update/delete/moderate). Approve **upserts** public `book-reviews` (admin soft-nav). Gold: snapshot → await invalidate → re-patch. Prove 120 tests.
- Review card UI: `StarRow` cn-merge; `ReviewBookIdentity`/`CircleBookCover`; My Reviews kebab+inner body; book-detail stars above comment; dialog identity (star+number).
- Attribution + book SSR: `attributionStyles`; `/books/[id]` SSR moderator join; make-admin/notice `variant="dark"`.
- Review Approver densify: `resolveReviewModeratorForDensify` + moderate API moderator fields + SSR `currentAdmin` (never cache `"an admin"`).
- Moderate toast: `showToast.pending` until success/error; edit soft-nav seeds admin queue via `publicReviewToAdminItem`.
- Table UI: `tableCellStyles`; Book Reviews Decision & Actor via `DecisionActorStack` + `DecisionDateMeta` nowrap (no separate Approver col); title→`/books/[id]` PrefetchLink.
- Admin review detail: Status KPI/About = PENDING badge+Submitted or `DecisionActorStack`; ticket shells; `ModerateReviewAlertDialog`.
- Seed wipe: `seed:reset` also clears tickets/replies/notifications/activity_logs.
- Debug: agent ingest relay removed; CSP still blocks browser→`127.0.0.1` ingest.
- Mutation gateway: `commitMutationCache` + densify registry; PrefetchLink `"use client"`; Redis still rate-limit only.
- Admin filter UX Prove (2026-08-07): type/lint/**151** tests + Next 16.2.12 build PASS; tip `3dd4594` / HEAD `0f64bc5`.
- REQ-0033 overview KPIs: shared `buildAdminDashboardStats` + types (SSR=`/admin`, API=`/api/admin/stats`); glass `StatCard` badges + icons; breakdowns via `adminRequestCounts` / ticket+review overview counts.
- `patchAdminStatsCaches*`: borrow (explicit `fromStatus` + universe recount), user status/role, book CRUD, tickets, reviews, admin-requests, reservation waiting; claim → `patchBorrowCachesOnCreate`. Overview prefers densified `admin.stats` for ticket/review KPI values.
- Profile: `glassCancelled` + Cancelled KPI (`borrowStats.cancelled`). Debug ingest removed. Gate 2 still EvalGate-blocked.
- Densify tip `4e4bd5f` (2026-08-09): borrow create upserts admin queues; PrefetchLink lists/`staleTime: 0`; fine/ops/recs registry **required**; `evictAnalyticsCaches`; insights visit always refetches (`initialDataUpdatedAt: 0`). Bulk UI deferred.
- KPI lendable + overview inactive + featured densify tip `d8845bc` (2026-08-09).
- Book CRUD UX closeout tip `7d0ae32` (2026-08-15): Overview year/lang top-5 + distinct `+N more` + densify year DESC=SSR; BookForm confirm stays until detail push; `/all-books` create densify pagination-/sort-aware; Insights Popular Genres (by borrows) + chart empty states + TicketSectionHeader chrome; bell SSR shell+totalCount densify.
- Admin chrome tip `bce8637`: `AdminPageShell` KPI stack; no StatCard top bar; shadow/hover only; no nest/overflow clip.
- Activity History: `await logActivity` before revalidate (borrow create/approve/return, reservation/renewal, registration re-apply, admin CRUD); Entity borrow→`/admin/book-requests/[id]` (queue if no id), admin-request→user 360, reservation→book edit via `bookId`; REJECTED user/review linkable; `densifyActivityLog` cold-seeds `7days`; PrefetchLink users/tickets `staleTime:0`; recs densify marks featured empty (no SSR reseed). Automation exports: `logAdminExportActivity` + client blob download densify (`operations.write`); null-id ops/export/recs Entity → `/admin/automation`. Bulk Automation: UUID dialog + pending loaders; densifyBookDelete on bulk delete; no client activity invent (DEC-0108/0109).
- Admin people IA: Registration Queue + Admin Requests + User Directory; **unified User 360** (`AdminUser360Shell`) on users / account-requests / admin-requests (`entry` directory|registration|privilege); Approve Admin/Decline vs Make Admin via `pendingAdminRequestId`; deleted detail-only clients.
- User 360 densify: privilege history + reservations (`userReservations`) + activity (`activityLog.user` / `activityHistoryForUserWhere`); `prefetchAdminUser360Caches`; Insights SSR-only (no invent formula densify); `seedFromSsrIfEmpty` on privilege/activity/reservations.
- User 360 UI polish: `UserRoleBadge` header; ticket-style Back; `TicketSectionHeader`+Lucide Title Case cards; Applicant parties micro-labels; `USER_360_TH` + centered `AdminDetailEmptyState`.
- User 360 layout: dual `DetailKpiShell` 4-up (status + borrow health); ledger counts in Timeline/Privilege subtitles; Applicant fields‖card; body rows A–E `lg:grid-cols-2`, tickets full width.
- User 360 status KPIs: `AdminUser360StatusKpiRow` densifies Reg/Privilege via `signupRequestDetail`/`users.detail` (header/panel keys); Fine/Overdue SSR.
- Field labels: `lib/ui/fieldLabelStyles` (`FIELD_LABEL_ROW`/`TEXT`, `leading-none`) — Applicant icon+text optical middle; ticket/review micro-labels.
- User 360 privilege table: 2-col Decision & Actor | Reason (`DecisionActorStack` / pending `TicketDateMeta`); `DEFAULT_ADMIN_REQUEST_REASON` prefills `/make-admin`.
- User 360 tables: `USER_360_TABLE` table-fixed + Book truncate; Borrowing 44/34/10/12; Reviews 44/12/44 title→book + sky “View review detail”; Status = PENDING Submitted or `DecisionActorStack` (SSR moderator join); Reservations badge→medium Requested; phone-only scroll; section titles `Name (n)`; Activity FIFO-25 (User 360 only; global stays 50).
- Cross-domain densify: `review.write` RSC `/admin`; AdminBooksList densify-empty over SSR; ticket detail `auditEvents` densify; PrefetchLink my-profile/`book-detail` staleTime 0.
- Admin people tables: ticket sizing; `PersonAttribution`+`TicketDateMeta`; `UserRoleBadge`+`CopyableText`; shared `DecisionActorStack` (Users Status + Recent Decision & Actor; badge PrefetchLink to detail); FIFO-50 + client period filter; Status densify via `statusReviewed*` join.
- Borrow Queue polish (2026-08-13): one DataTable (`AdminBookIdentityCell` / `PersonAttribution` / `BorrowLifecycleDates` / kebab); KPIs In queue · Awaiting approval · On loan · Returned · Soft-cancelled; detail `/admin/book-requests/[id]` + `borrows.requestDetail` densify + PrefetchLink; My Profile Holds tab + Active Holds KPI (`ReservationsPanel` embedded). No reservations in Borrow Queue. Deferred densify closeout: SSR `currentAdmin`+`decisionActor` on list/detail; detail `initialDataUpdatedAt`; `loadBorrowRequestById` single-auth; locked Active Holds=0 + shared `countActiveHolds`/`holdsClock`.
- Borrow Queue actor polish (2026-08-13): Approve/Reject/Return `showToast.pending` + kebab spinner; list SSR approver/returner joins; Decision & Actor via `DecisionActorStack`; reject densifies `cancelledByActor`.
- Borrow Decision gaps (2026-08-13): CANCELLED canceler SSR via `updatedBy` join (list+detail); DecisionDateMeta Borrowed/Returned/Cancelled; stack decided states + rose byTone for CANCELLED.
- Borrow Queue KPI polish (2026-08-13): Total Queue · Awaiting Approval · Currently Borrowed · Books Returned · Soft-Cancelled · Reservation Waiting; SSR WAITING + `reservationsWaitingCount` densify (no partial `admin.stats` seed).
- Borrow Queue Status & Issuer (2026-08-13): Borrower + `TicketDateMeta` Requested; drop Status col; `BorrowQueueStatusActorCell` (Pending/Cancelled/Borrowed+Approved+Due/Returned+Self-returned).
- Borrow Queue Book DNA (2026-08-13): dialogs genre+star + Available/Total (Reject info-only); queue Book column inline Available/Total tones; kebab View Details → request detail; title → `/books/[id]`.
- Borrow inventory + Book Details DNA (2026-08-13): `syncBorrowRequestBookFields` / absolute Return copies + `applyReturnInventoryDensify`; `bookDetailsViewModel` + `AdminBookDetailsPanel`; SSR `loadBookBorrowStats` overlapped with admin/audit.
- Borrow + Review detail DNA (2026-08-14): header `ReviewBookIdentity` + `BorrowLifecycleDateMeta` / `ReviewDateMeta`; Inventory KPI + 4 borrow-stats KPIs; About Book + Borrower And Issuer card (actors folded).
- Activity avatar densify (2026-08-14): `resolveActivityActor` + SSR `currentAdmin` on ticket detail; `densifyTicketDetailAudit` / `prependBorrowAuditEvent` enrich sibling card (no Robohash bounce).
- Admin detail UI polish (2026-08-14): tickets Created→Requester / Updated→Assigned (list+Parties); `AdminDetailIdChip` on ticket/borrow/review Back rows; review Genre KPI→Reviewer + `userUniversityId`.
- Detail toolbar polish (2026-08-14): `AdminDetailToolbar` mobile Back→actions→ID; Review Context + Submitted under Reviewer; User ID chip; tickets Replies right-align.
- Review detail KPI cleanup (2026-08-14): Status badge-only KPI; Reviewer person-only; Context University ID→Submitted + Approver stack; FIFO-25 Activity via `getReviewAuditEvents` + `prependReviewAuditEvent`.
- Full demo seed + actor fix (2026-08-13): approve `borrowedBy=actor.email`; Self-cancelled rose / Self-returned emerald; later trimmed to books+2 accounts only (see Demo seed).
- Borrow Queue actor flash + lifecycle confirms (2026-08-13): shared `loadAllBorrowRequestsRows` (SSR+API actor joins); LIGHT_ALERT Approve/Reject/Return until settle; densify survives invalidate refetch.
- Borrow detail gaps + DNA (2026-08-13): detail confirms; Status KPI = `BorrowQueueStatusActorCell`; canceler + Record panel; Activity via `getBorrowAuditEvents` + `prependBorrowAuditEvent`; `cancelledByActor` on `BorrowRowPatch` + self-cancel densify.
- Borrow detail UI polish (2026-08-14): `AdminDetailToolbar` `hasActions`; Status KPI badge-only; Fine overdue + Renewal `1=+7d` hints; Borrow Book Context (Library DB after Catalog Status); parties University ID→Requested + simplified Status + Issuer-when-present; thin IDs & Notes (no Record dump).
- Borrow detail UI tweaks (2026-08-14): Status KPI mid-align (no `self-start`); IDs & Notes Lucide labels; reject notes `Rejected by admin` (+ legacy librarian display map); Activity `activityEventIcon` + FIFO-25.
- Admin Book Catalog polish (2026-08-14): `/admin/books/[id]` detail DNA; header Create CTA; Featured/Low/Out/Genres KPIs; compact cards + kebab; edit/new two-col `BookForm`/`AdminBookFormShell`; PrefetchLink `admin-book-catalog-detail` + `book.write` RSC.
- Book form Wave A (2026-08-15): media/toasts/purge/uploadLimits; CTA gate via silent Zod watch (no mount FormMessage flash); signup rose `*`.
- Admin books card DNA (2026-08-14): sky title + `OverviewGenreChip` + star; two-col meta (copies/status/featured + year/pages/edition); full-width Publisher `break-words` + meta values `text-dark-200`.
- Admin book detail (2026-08-14/15): Back+Edit; glass Active/Featured; Cover Color copy; KPI+Context `reviewRatingTone`; Media BookImage/BookA; `TicketSectionHeader` center+SVG mid.
- Book densify+createdBy (2026-08-14/15): `loadBookWithUpdater` SSR/API; mig `0015`; seed may stamp both; **create** stamps `createdBy` only (`updatedBy` null → Updated —); Activity densify uses action actor (not session-only / All admin); media assert 10s + one abort retry; `CopyableText` `break-all`.
- Delete densify `/all-books`: `densifyBookDelete` decrements unfiltered totals (incl. limit:1 universe); backfills page-12 holes from next warm page; else invalidates incomplete page keys. Genres RQ (`useBookGenres`) densify rebuilds unique list (shared genres stay); delete dialog passes KPI snapshot fallback.
- Book detail Activity FIFO-25 (2026-08-15): `getBookAuditEvents` SSR; `prependBookAuditEvent` on create/update; merge keeps `auditEvents`; `TicketActivityTimeline`. Shared `fetchBookDetailPreservingDensify` (useBook+PrefetchLink public/admin); SSR `initialDataUpdatedAt`.
- DeleteBookDialog settle (2026-08-15): LIGHT_ALERT; block dismiss + Loader2 until `book.write` densify; then push list. Detail missing book/ticket/review → `redirect` to list (not `notFound`) so remount after hard-delete never paints 404. Public `/support-tickets/[id]` same redirect + settle soft-nav. Root + `app/admin/not-found.tsx` fallback only. Activity: `markActivityEntityDeleted` + SSR `annotateMissingActivityEntities` (book/review/ticket/user/borrow + reservation bookId); soft reject/cancel stay linkable. ImageKit upload auth 429 → specific toast (still 5/10m).
- Featured exclusivity (2026-08-15): `clearOtherFeatured` only clears `isFeatured` (no sibling `updatedAt`); catalog Updated By shows — until real edit.
- Densify preserve merge (2026-08-13): shared `mergeDensifiedDetail` — PrefetchLink + detail refetch keep actors/auditEvents/replies/reviewedBy* (no thin list/API wipe).
- Densify consistency closeout (2026-08-13): Borrow Queue single universe RQ + stamps; claim `requestMeta`; ticket.write RSC User 360; ticket/review/nav stamps; PrefetchLink review/ticket detail + Activity Entity; Automation Refresh keeps prior featured (no blank hero).
- Holds tab DNA (2026-08-13): tab/section **Active Holds**; SSR reservation meta parity with `/api/reservations/me`; `ReservationsPanel` cards = `profile-borrow-row` + glass badge/CTAs (Pending Requests layout).
- Pending self-cancel + Holds ISBN (2026-08-13): owner `cancelPendingBorrowRequest` (PENDING→CANCELLED densify); profile Cancel AlertDialog; reservation `isbn` last-4 on Holds meta.
- Waitlisted CTA + cancel dialog UX (2026-08-13): `ReserveBookButton` Waitlisted from `useUserReservations` + book SSR seed; Pending Cancel + Cancel Hold GLASS_ALERT lifted (rich preview, close on settle only).
- Home Waitlisted SSR seed (2026-08-13): shared `loadUserReservationsSsr`; home hero + book detail + my-profile; no Join Waitlist flash on `/`.
- Holds densify queue + post-waitlist nav (2026-08-13): `createReservation` returns `queuePosition`+`createdAt`; densify full meta; Join Waitlist → `?tab=holds`.
- Return/Renew confirms + Recent Cancelled date (2026-08-13): GLASS_ALERT Return/Renew until settle; Overview Recent 5 Cancelled chip via `updatedAt`.
