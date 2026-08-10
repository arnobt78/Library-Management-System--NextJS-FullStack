# Agile V State

- Project: University Library Management System
- Cycle: C2
- Stage: 4 - Prove (local) cross-domain densify gaps closed; nonlocal Verify still outstanding
- SCOPE-V phase: Prove (EvalGate FAIL blocks Gate 2)
- Status: ACTIVE - People IA + densify freshness + cross-domain densify closing via commit/push; C2 Gate 2 blocked by EvalGate FAIL
- Baseline commit: `c94e7db`
- Prior accepted implementation: C1 commit `d9b9fd9`
- Latest implementation tip: (pending this commit)
- Latest HEAD: `2151b8c` (== `origin/main` pre-push)
- Started: 2026-08-01
- Last updated: 2026-08-10 (audit OK; commit+push)
- Active requirements revision: C2-approved.2 (REQ-0026 through REQ-0033 approved; REQ-0034 through REQ-0037 approved under `GATE-0007`/CR-0003; C1 approvals unchanged)
- Active policy: `.agile-v/POLICY.yaml` v1.0.0
- Current phase directory: living `.agile-v/` artifacts; frozen C1 archive at `.agile-v/cycles/C1/`
- Pending checkpoint: none PENDING; C2 Gate 2 not opened (EvalGate FAIL — `ER-C2-FINAL-CORRECTIVE-5`, unrelated to CR-0003)
- Gate 0: APPROVED (`GATE-0001`)
- Gate 1: APPROVED (`GATE-0002`)
- Gate 1 delta: APPROVED (`GATE-0003`, `REQ-0025`)
- Gate 2: APPROVED (`GATE-0004`) — C1 only
- C2 Gate 0: APPROVED (`GATE-0005`)
- C2 Gate 1: APPROVED (`GATE-0006`)
- C2 Gate 1 delta (CR-0003): APPROVED (`GATE-0007`, REQ-0034–0037)
- C2 Gate 2: NOT STARTED
- Skills applied this session: agile-v-core, agile-v-pipeline (cross-domain densify gap close)

## Reconciliation snapshot (2026-08-10, cross-domain densify gap close)

Verified facts:
- P0: `review.write` RSC includes `/admin`; Overview prefers densified `pendingReviewCount` when stats cache present; invalidation contract test updated.
- P1: AdminBooksList prefers densified universe `[]` over `initialBooks` SSR reseed.
- P1: Ticket detail `auditEvents` on RQ + `densifyTicketDetailAudit` on ticket.write (no frozen SSR-only timeline).
- P2: PrefetchLink `my-profile` `staleTime: 0`; BookCard + hot book title Links → PrefetchLink `book-detail`.
- Local Prove: typecheck + lint 0 + **213** unit tests PASS.

### Next Action

**Human-Decision:** optional soft-nav smoke; optional admin people UI polish (separate). Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER. Wave 5 / BL-0017 remains Gate 2 path.

## Reconciliation snapshot (2026-08-10, people polish densify close)

Verified facts:
- Wave 1: `currentAdmin` wired into AccountRequestsClient + AdminUserDetailActions decisionActor.
- Wave 2: `useAdminUserDetail` + `getAdminUserDetailCache`; User 360 header RQ + AdminPageShell; PrefetchLink `/admin/users/[uuid]`.
- Wave 3: Signup detail AdminPageShell/AdminPageHeader parity; Open User 360 PrefetchLink on signup + admin-request details.
- Gateway densify audit: still no mutation bypasses.
- Local Prove: typecheck + lint 0 + **213** unit tests PASS.

### Next Action

**Human-Decision:** smoke Registration Queue / Admin Requests / Users list→detail→decide→Back; commit when ready. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-10, densify freshness A+B+C)

Verified facts:
- Wave A: `signupRequestDetail` key + DOMAIN_KEYS; `useSignupRequestDetail`; SignupRequestDetailClient on RQ; optimistic + `densifySignupRequestDetail` / densifyUserWrite timeline.
- Wave B: `admin.requestDetailRoot` in DOMAIN_KEYS; PrefetchLink UUID warm for signup + admin-request detail (`staleTime: 0`); View kebab PrefetchLink; PersonAttribution → PrefetchLink.
- Wave C: orphan-key spot-check — no further orphans; invalidation + densify unit contracts extended.
- Local Prove: typecheck + lint 0 + **213** unit tests PASS.

### Next Action

**Human-Decision:** smoke soft-nav (signup/admin-request detail after decide → Back); commit people IA + densify when ready. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-10, densify freshness plan)

Verified facts:
- HEAD `2151b8c` == `origin/main`; tip `d266fe3`; no PENDING interrupt; EvalGate still FAIL.
- Working tree: Admin people IA (A–F) still uncommitted (queues, detail routes, User 360, RSC/prefetch registry).
- Gold contract (playbook §8.5 / RQ guide §4.6): `commitMutationCache` = snapshot → await invalidate → densify; soft-nav must not flash stale SSR/`initialData`.
- Gap audit (people IA): superseded by densify A+B+C delivery above.

### Next Action

**Human-Decision:** superseded by densify freshness A+B+C snapshot.

## Reconciliation snapshot (2026-08-10, Admin people IA Wave F)

Verified facts:
- Lint close: unused `formatMediumDate`; stable `ssrUpdatedAt` for admin-request detail; AccountRequests `useCallback` deps; User 360 Tailwind.
- People IA (A–E) + Wave F: typecheck + lint 0 warnings + 209 unit tests PASS.

### Next Action

**Human-Decision:** superseded by densify freshness plan snapshot.

## Reconciliation snapshot (2026-08-10, Admin people IA)

Verified facts:
- Nav: Registration Queue · Admin Requests · User Management (badges no longer steal make-admin count onto Users).
- Queues: TanStack pending + recent decisions; details `/admin/account-requests/[userId]`, `/admin/admin-requests/[id]`.
- Users directory kebab-only; User 360 tickets/reviews/privilege/activity + header actions.
- Registry RSC paths + PrefetchLink `admin-admin-requests`; densify via existing `user.write` / `admin-request.write`.
- Local Prove: typecheck + lint + 209 unit tests PASS.

### Next Action

**Human-Decision:** superseded by Wave F lint close.

## Reconciliation snapshot (2026-08-10, Activity History matrix close)

Verified facts:
- Admin export routes: `await logAdminExportActivity` + `revalidateMutationPaths("operations.write")`; Automation client fetch→blob + `densifyActivityLog` (no HTML form POST).
- Entity: ops/export/recs summary statuses (`EXPORT_*`, `RECOMMENDATIONS_*`, `TRENDING_*`, `FINE_*`, `*_REMINDERS`) → `/admin/automation`.
- Bulk Automation UI still deferred (Coming Soon); server bulk already logs.
- Local Prove: typecheck + lint + activityLogDisplay/adminExportDownload unit tests PASS.

### Next Action

**Human-Decision:** superseded by Admin people IA snapshot.

## Reconciliation snapshot (2026-08-10, Densify + Activity History harden)

Verified facts:
- Lifecycle audit: borrow CREATE, reservation create/cancel/fulfill, renewal, registration re-apply — server `await logActivity` + client `densifyActivityLog`.
- Registry: `reservation.lifecycle` / `renewal.write` include `activityLog` + RSC `/admin/activity-history`.
- Entity: REJECTED user/review linkable; reservation → `/admin/books/{bookId}/edit`.
- PrefetchLink users/pending/tickets `staleTime: 0`; recommendation densify marks featured densified-empty (blocks SSR reseed flash).
- Local Prove: typecheck + lint + unit tests PASS.

### Next Action

**Human-Decision:** superseded by Activity History matrix close snapshot.

## Reconciliation snapshot (2026-08-10, Activity History audit + densify)

Verified facts:
- Missing `logActivity` gaps closed: returnBook, delete/bulk, admin-request create/cancel/demote, bulk summaries, fine/ops/recs APIs.
- Entity routes: borrow → `/admin/book-requests`; admin-request → `/admin/users/{userId}`; CANCELLED/REJECTED still linkable for those types.
- `patchActivityCaches` / `densifyActivityLog` wired into admin mutation densify; fine/ops/recs registry includes `activityLog` + RSC `/admin/activity-history`.
- Follow-up harden: cold-seed default `7days` key; `await logActivity` before revalidate; promote logs as `admin-request`+`userId`; overdue densify `FINE_FORCE_UPDATE`.
- Local Prove: typecheck + lint + activity/invalidation unit tests PASS.

### Next Action

**Human-Decision:** superseded by densify softnav harden snapshot.

## Reconciliation snapshot (2026-08-09, Activity History UI polish)

Verified facts:
- When date/time stack; Actor PersonAttribution + universityCard join; Entity DELETE/status unlink + Tooltip; Details wrap text-xs.
- Helpers in `lib/ui/activityLogDisplay.ts` + unit tests.

### Next Action

**Human-Decision:** superseded by 2026-08-10 audit densify snapshot.

## Reconciliation snapshot (2026-08-09, AdminPageShell KPI layout)

Verified facts:
- Tip `bce8637`: `AdminPageShell`; KPIs outside panels; no top bar; no page-root overflow clip.
- Local Prove typecheck+lint PASS; Insights Suspense KPI slot deferred.

### Next Action

**Human-Decision:** smoke if desired. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-09, KPI accent remove top bar)

Verified facts:
- Removed `.kpi-card::before` accent; keep shadow-md / hover:shadow-lg; hue icons + badges only.
- CSS-only `app/globals.css`.

### Next Action

**Human-Decision:** owner smoke + commit when ready. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-09, Agile V resume)

Verified facts:
- HEAD `57333b5` == `origin/main`; product tip `d8845bc`; working tree clean.
- No PENDING interrupt; INT-0005/0006 still RESOLVED.
- EvalGate FAIL (`ER-C2-FINAL-CORRECTIVE-5`); Wave 5 / BL-0017 remains Gate 2 path.
- Owner invoked Agile V core/pipeline **without a new product ask** — docs reconcile only; no coding.

### Next Action

**Human-Decision:** pick scoped work before coding. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-09, featured hero densify)

Verified facts:
- Tip `d8845bc`: lendable KPIs + Inactive mid panels + books-nav fix + Top Rated rating↓/A-Z + featuredRoot replace/evict.
- Soft-nav `/` no stale hero flash; public `/all-books` stays invalidate+refetch.
- Local Prove: typecheck + lint + densify unit tests PASS.

### Next Action

**Human-Decision:** owner smoke if desired. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-09, books nav + A-Z)

Verified facts:
- book.write densify no longer invents into filtered admin list caches (`allowInsert` create-only).
- `syncBooksNav` reads `ADMIN_BOOKS_UNFILTERED` total (fixes sidebar 19 vs KPI 17).
- Top Rated / Inactive / AdminBooksList title A-Z.

### Next Action

**Human-Decision:** owner smoke + commit when ready.

## Reconciliation snapshot (2026-08-09, Overview Inactive titles)

Verified facts:
- Mid panels: Health · Categories · Year / Top Rated · Inactive titles · Language.
- `inactiveTitles` on admin.stats SSR + densify (categories/year/language/topRated lists on book.write).
- Local Prove: typecheck + lint + stats unit tests PASS. Tip base `4e4bd5f` + uncommitted KPI lendable + this wave.

### Next Action

**Human-Decision:** owner smoke + commit when ready. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-09, KPI lendable + StatCard 3-col)

Verified facts:
- `StatCardGrid` Stockly 3-col; StatCard badges text-only (semanticBadges unchanged).
- Overview Book Availability adds Total copies; copy KPIs = active titles (`lendableBookCopies` + densify toggle).
- Local Prove: typecheck + lint + lendable/stats unit tests PASS. Product tip still `4e4bd5f` until owner commit.

### Next Action

**Human-Decision:** owner smoke + commit when ready. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-09, agile-v resume post densify push)

Verified facts:
- Product tip `4e4bd5f` on `main` == `origin/main` (borrow/ops densify + insights freshness).
- Docs tip-bind delta pending (this reconcile); no product code in working tree.
- No PENDING interrupt; INT-0005/0006 still RESOLVED.
- EvalGate FAIL (`ER-C2-FINAL-CORRECTIVE-5`); Wave 5 / BL-0017 remains Gate 2 path.
- Owner invoked Agile V without a new product ask — docs tip-bind only.

### Next Action

**Human-Decision:** pick scoped work before coding. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-09, densify expand books+ops)

Verified facts:
- PrefetchLink books/dashboard `staleTime: 0`; book delete strips recommendations + borrowStats.
- `fine.write` / `operations.write` / `recommendation.write` → registry required + densify adapters; `evictAnalyticsCaches`; insights visit always refetches (`initialDataUpdatedAt: 0`).
- Bulk UI densify deferred. Local Prove PASS. Superseded tip bind: shipped in `4e4bd5f`.

## Reconciliation snapshot (2026-08-09, densify P0/P1 gaps)

Verified facts:
- Root cause: `patchBorrowCachesOnCreate` never upserted admin `borrow-requests` → soft-nav stale list/KPIs; PrefetchLink 30s amplified.
- Fixed: create upsert + universe recount; PrefetchLink `staleTime: 0`; All Users approve/reject decision densify; renew→admin lists; claim inventory; direct Make Admin / revoke ledger densify.
- Superseded expand snapshot above (fine/ops/recs/analytics eviction).

## Reconciliation snapshot (2026-08-09, agile-v resume)

Verified facts:
- Working tree was clean; `main` == `origin/main` at `cef46ec`.
- Product tip `69a31ad` (overview KPI densify) pushed; docs trail `48af95a` → `cef46ec`.
- No PENDING interrupt; INT-0005/0006 still RESOLVED.
- EvalGate FAIL (`ER-C2-FINAL-CORRECTIVE-5`); Wave 5 / BL-0017 remains Gate 2 path.
- Superseded by densify P0/P1 gap snapshot above after owner approved gap plan.

## Reconciliation snapshot (2026-08-08, overview KPI densify)

Verified facts:
- Shared `buildAdminDashboardStats` + glass `StatCard` badges; Overview KPI homes (users/books/borrows/admins/tickets/reviews).
- `patchAdminStatsCaches*` on borrow (explicit `fromStatus` + universe recount), user/book/ticket/review/admin-request/reservation; claim → borrow create densify.
- Profile Cancelled KPI + `glassCancelled`. Debug ingest removed.
- Local Prove: typecheck + lint + densify unit tests PASS. Analytics/automation densify still noop; full build/integration not re-run this check.
- EvalGate still FAIL (`ER-C2-FINAL-CORRECTIVE-5`); C2 Gate 2 not opened. Redis = rate-limit only. Push later confirmed (see 2026-08-09 snapshot).

## Resume Protocol

1. Read this file, `CHECKPOINTS.md`, `REQUIREMENTS.md`, `CHANGE_LOG.md`, `BACKLOG.md`, and `RISK_REGISTER.md`.
2. Treat `.agile-v/cycles/C1/` and commits `d9b9fd9`/`c94e7db` as frozen C1 evidence.
3. Confirm `INT-0005` is resolved by `GATE-0005` with the matching token.
4. Confirm `INT-0006` is resolved by `GATE-0006` with the matching token.
5. Resume the first incomplete C2 wave from `BACKLOG.md` and `BUILD_MANIFEST.md` **only after owner selects a scoped option**.

## Checkpoint token confirmation (2026-08-04)

| Interrupt | Gate | Status | Token | Binding |
|---|---|---|---|---|
| INT-0005 | C2 Gate 0 | RESOLVED | `C2-G0-20260801-74b2e9a1` | GATE-0005 |
| INT-0006 | C2 Gate 1 | RESOLVED | `C2-G1-20260801-5d31a8c2` | GATE-0006 |
| — | C2 Gate 2 | NOT OPENED | — | EvalGate FAIL (`ER-C2-FINAL-CORRECTIVE-5`) |

## Reconciliation snapshot (2026-08-07, agile-v resume)

Verified facts:
- Working tree clean (except untracked `.cursor/`); `main` == `origin/main` at `3849abe`.
- Product tip `f0f5d35` (glass catalog chips + profile tab filters) pushed; docs trail `f85af0f`→`3849abe`.
- Docs bind plan `docs_and_commit_filters` already delivered — do **not** re-implement.
- No PENDING interrupt; INT-0005/0006 still RESOLVED.
- EvalGate FAIL (`ER-C2-FINAL-CORRECTIVE-5`); Wave 5 / BL-0017 remains Gate 2 path.
- Protocol: `docs/AGILE_V_PROTOCOL.md`.

### Next Action

**Human-Decision:** pick one before coding (see scoped plan).

## Reconciliation snapshot (2026-08-07, glass + profile filters)

Verified facts:
- `/all-books`: glass chips, inline Reset All, glass empty Clear, optimistic `displayFilters` + prefetch + `skipEmptyPlaceholder`.
- My Profile tabs: client period/status (`tabListFilters` / `periodFilterOptions`); **All Time** / **All Status**; dark `DismissibleFilterChips`.
- Local Prove: typecheck + lint + filter unit tests PASS. Densify/RQ mutation paths unchanged.
- EvalGate still FAIL (`ER-C2-FINAL-CORRECTIVE-5`); C2 Gate 2 not opened.
- Protocol: `docs/AGILE_V_PROTOCOL.md`.

### Next Action

**Human-Decision:** Wave 5 / BL-0017 (EvalGate evidence), further REQ-0033 polish, new CR, or named bug. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-07, admin filter UX)

Verified facts:
- Admin filter polish: universe KPIs (`adminListUniverse`), instant `localSearch`, `AdminFilterEmptyState`, Select scroll-lock sticky header, activity `7days` SSR seed only.
- Local Prove: typecheck + lint + **151** tests + Next 16.2.12 build PASS. Debug instrumentation removed.
- EvalGate still FAIL (`ER-C2-FINAL-CORRECTIVE-5`); C2 Gate 2 not opened.
- Tip was `3dd4594`; superseded by glass/profile filter snapshot above after commit/push.

## Reconciliation snapshot (2026-08-07, resume)

Pre-filter-batch note: HEAD was `115fcc8` / tip `06ca476`. Superseded by admin filter UX then glass/profile filter snapshots.

## Reconciliation snapshot (2026-08-06, resume)

Verified facts:
- Working tree clean; branch `main` equals `origin/main` at `df0d0e8`.
- Implementation tip `d61a058` present and pushed; docs bind commits `e08d351` → `a143f8f` → `3596745` → `df0d0e8` record tip after push.
- Migrations on disk: `0010`–`0014` (+ downs). Not re-probed against live DB this resume.
- Protocol path: `docs/AGILE_V_PROTOCOL.md` (not repo root). `AGENTS.md` + protocol are tracked.
- No PENDING rows in `CHECKPOINTS.md`; INT-0005/INT-0006 tokens match `APPROVALS.md` / STATE checkpoint table.
- EvalGate still FAIL (`ER-C2-FINAL-CORRECTIVE-5`); Wave 5 (BL-0017 / REQ-0032 remainder + nonlocal evidence) remains the Gate 2 path default.
- CR-0003 + densify/review polish batch is committed at tip `d61a058`; last recorded Prove for that tip is **120 tests** (type/lint/build PASS per TRACE/CHANGE_LOG). Not a Gate 2 unblocker.

Drift / workspace notes corrected this session:
- STATE “Next Action” previously said densify/create harden was uncommitted — stale vs tip `d61a058` + HEAD `df0d0e8` (corrected below).
- CLAUDE.md tip/HEAD still lists tip only (`d61a058`); treat git HEAD `df0d0e8` as docs-bind authority.
- This session’s owner message invoked Agile V resume/plan only; **no product feature, bug, or Wave 5 evidence package was named**.

## CR-0003 implementation summary (2026-08-05)

Delivered exactly the approved plan (`admin_suite_parity_expansion_4ad9aa3f.plan.md`), Waves 1–6, all 10 plan todos completed:

- **Schema**: migration `0014_admin_suite_expansion.sql` + `.down.sql` — `support_tickets`, `support_ticket_replies`, `notifications`, `activity_logs` tables; additive `book_reviews.status`/`reviewedBy`/`reviewedAt` (default `APPROVED`, existing rows unaffected).
- **Shared UI foundation**: `components/ui/{StatCard,data-table,SortableHeader,SearchInput,MultiSelectFilter}.tsx`, `lib/ui/semanticBadges.tsx`; added `@tanstack/react-table` (only new dependency, as approved).
- **Notification bell**: `lib/notifications/`, `app/api/notifications/*`, `NotificationBell`/`NotificationDropdown` wired into both root and admin `Header`.
- **Activity History**: `lib/admin/activityLog.ts` (FIFO-50) called from every book/borrow/user/review/admin-request/ticket mutation site; `/admin/activity-history` page with period filter.
- **Support Tickets**: full dual-surface (`/support-tickets` personal, `/admin/support-tickets` admin) with detail/reply pages, email notify (assignee or fan-out to admins, self-notify correctly suppressed), `ticket.write` mutation-domain family.
- **Book Review moderation**: PENDING→APPROVED/REJECTED gate; author sees own review instantly; "My Reviews" profile tab; `/admin/book-reviews` queue + detail.
- **KPI rollout**: `StatCard` grids on every admin page (dashboard, users, books, borrow requests, account requests, analytics, automation, + all 3 new pages); sidebar "Home" renamed "Library Overview".
- **Retrofit**: `AdminUsersList` migrated to `data-table.tsx`; `AdminBooksList`/`AdminBookRequestsList`/`AccountRequestsClient` gained shared `SearchInput` + clickable-title audit (kept card layout where it out-performs a table for dense multi-entity rows — documented, not a shortcut).
- **Invalidation registry**: `tickets`/`notifications`/`activityLog` domains added to `MUTATION_DOMAIN_REGISTRY`/`MUTATION_RSC_PATH_REGISTRY`/`lib/query/keys.ts`; contract test updated and PASS.

### Regression evidence (2026-08-05, local)

- `npm run typecheck` — PASS
- `npm run lint` — PASS, zero warnings (one documented scoped exception: `react-hooks/incompatible-library` off for `components/ui/data-table.tsx` only, because `@tanstack/react-table`'s `useReactTable()` intentionally returns fresh instance methods every render per its own API contract)
- `npm test` — **110 passed / 11 skipped** (36 files; includes updated `queryInvalidation.test.ts` contract for the 3 new domains)
- `npm run build` — PASS, Next.js production build compiles
- `npm audit --audit-level=low` — one pre-existing high-severity `brace-expansion` finding inside `eslint`'s own devDependency tree; unrelated to this change, no production code path affected, out of scope for CR-0003
- **Manual two-tab browser smoke** (signed in as `test@admin.com` in both tabs): created a ticket on `/support-tickets` in tab B while tab A sat idle on `/admin/support-tickets` — sidebar badge, KPI `StatCard`s, and the `data-table` row all updated live in tab A with **no refresh, no navigation**, confirming the `BroadcastChannel`/TanStack invalidation path holds for the new `ticket.write` domain. Confirmed the sole admin does not self-notify their own ticket ("You're all caught up" in the bell). Cleaned up the test ticket via the UI delete flow afterward; counts returned to 0. Dev-server log showed no real runtime errors — only cosmetic `data-cursor-ref`-attribute hydration noise injected by the browser-automation tool itself (verified identical pattern across three unrelated components, confirming it is a tooling artifact, not an app defect).

### Post-implementation audit fixes (2026-08-05, same session)

Owner requested a deep audit of the CR-0003 diff before commit. A dedicated subagent audit (hooks/query-invalidation consistency) plus manual review surfaced and closed the following, all still on top of uncommitted CR-0003:

- **Bug fixes**: My Reviews tab now SSR-hydrates via `getUserBookReviews` → `initialReviews` prop (no more loading-skeleton flash on first open); My Reviews KPI/tab badge now derive live from `useUserBookReviews` instead of a stale SSR `totalReviews` prop (removed that prop from `MyProfileTabs`/`my-profile/page.tsx`); ticket-detail reply thread no longer double-fetches (`SupportTicketReplyThread` takes `replies` as a prop sourced from `ticket.replies`; removed `useSupportTicketReplies`/`getSupportTicketReplies`/`queryKeys.tickets.replies*`; `useCreateSupportTicketReply` patches the `ticket.detail` cache directly); user support-ticket KPI cards now compute from the unfiltered `allTickets` list (client-side filter is display-only), matching the admin pattern.
- **Security/validation hardening**: Zod (`lib/validations/review.ts`) now validates `reviews/[bookId]` POST and `reviews/edit/[reviewId]` PUT bodies (author content-edit vs. admin moderation payloads); `support-tickets` GET validates `status`/`priority` query params against their enums before use; `support-tickets/[id]` PUT verifies `assignedToId` references an actual `ADMIN` row (previously any valid user id was accepted); `getPendingReviewCount` now throws `ApiError` on a non-OK response instead of silently returning `0`.
- **Perf/UX**: `NotificationBell` SSR-seeds `initialUnreadCount` from root `Header.tsx` and `admin/layout.tsx` via new `getUnreadNotificationCount()` in `lib/notifications/inApp.ts` — the bell badge paints on first byte with no client-fetch flash.
- **Dead-code / duplication cleanup**: removed unused `getAllAdminUserIds`, `getActivityLogCount`, `getTodayActivityCount`, an unreachable branch in the ticket-replies POST handler, and the unused `reviewId` param on `notifyReviewSubmitted`. Consolidated the four duplicated ticket `STATUS_OPTIONS`/`PRIORITY_OPTIONS` arrays into `lib/ui/ticketOptions.ts` (also now the source for `semanticBadges.tsx` labels) and the four duplicated `StarRow` star-rating helpers into `components/ui/StarRow.tsx`.
- **API docs**: `lib/apiDocs/endpoints.ts` gained Support Tickets / Notifications / Activity Log categories and the previously missing `reviews/mine`, `reviews/admin`, `reviews/admin/[id]`, `reviews/pending-count` entries (also deduped a pre-existing `reviews/delete` duplicate); `/api-docs` page icon map extended to match.

**Regression after fixes**: `npm run typecheck` PASS · `npm run lint` PASS (0 warnings) · `npm test` 110 passed / 11 skipped · `npm run build` PASS (Next 16.2.12) · `npm audit --audit-level=low` — same pre-existing `eslint`/`brace-expansion` devDependency finding, no production path, unchanged from before.

### Ticket detail / list UX polish (2026-08-05, post-audit)

- Shared: `TicketDetailKpiGrid`, `TicketSectionHeader`, `TicketDateMeta`, `TicketActivityTimeline` (show/hide details), `CARD_PAD_CLASS` + `.surface-card` / `.admin-panel` = `p-2 sm:p-4`, `LIGHT_GLASS_CTA` (admin Edit/Delete = `bg-primary-admin` / `bg-red-800`), `SKY_LINK_*`, Tailwind `content` += `./lib/**`.
- Admin detail: back+actions row, badge KPIs, Ticket parties + plain Description, notes/activity/conversation section chrome; edit dialog (no inline selects).
- User detail: full-width glass title+dates, KPI Assigned, glass Send Reply under full-width textarea.
- Densify: `patchTicketCaches*` after `ticket.write`; `useBackWithRefresh` navigates without second invalidate wipe.
- Instrumentation removed after owner confirm. Prove: typecheck/lint/110 tests/`npm run build` PASS.

### Review densify + UI polish (2026-08-05)

- Dialog + AlertDialog primitives: `max-w-4xl` + mobile gutters; stripped `sm:max-w-md` / `max-w-2xl` overrides.
- `lib/utils/patchReviewCaches.ts` — snapshot → await `review.write` invalidate → re-patch book/user/admin/pendingCount (ticket densify order).
- DTO enrich (no migration): bookAuthor/genre/rating, moderator email+card, preferred borrow dates; public GET moderator attribution.
- UI: `ReviewDateMeta`, `ReviewBookCard` (circular cover), book-detail status badges + PersonAttribution, My Reviews 4-col emerald tab, admin list/detail circle covers + attribution.
- Prove: typecheck/lint/110 tests/build PASS.

### Review create densify harden (2026-08-06)

- POST `/api/reviews/[bookId]` returns `getAdminReviewDetail` full `AdminBookReviewItem` (book meta + borrow dates).
- `useCreateReview` densifies from server row + eligibility `setQueryData` (ReviewButton no flash).
- Preserved: delete single pending bump; update re-queue clears moderator + bumps pending.
- Unit tests: `lib/utils/patchReviewCaches.test.ts` (4 cases).
- Prove: typecheck/lint/**114** tests/build PASS.

### Next Action

Superseded by 2026-08-07 resume Human-Decision above. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER (`ER-C2-FINAL-CORRECTIVE-5`).

### Admin review detail redesign (2026-08-06)

- Ticket shells: `DetailKpiShell` shared; `ReviewDetailKpiGrid`; About book | Description; `ReviewBorrowMeta` light/dark.
- `ModerateReviewAlertDialog` on detail + list kebab; per-status spinner; Approve white CTA.
- Densify unchanged: `useModerateReview` → `commitMutationCache("review.write")` + `decisionActor`/`sourceItem`.
- Prove: typecheck/lint/14 densify unit tests PASS.

### Attribution + book SSR fix (2026-08-06)

- `lib/ui/attributionStyles.ts` + `PersonAttribution`: sky links only when `href`; static dark/light name tones; prefix matches ReviewDateMeta; email muted + `text-xs sm:text-sm`.
- `AdminRequestReviewerAttribution` forwards `variant`; dark-glass make-admin / notice / form callers pass `variant="dark"`.
- `/books/[id]` SSR joins moderator like public API; `BookDetailContent`/`useBookReviews` use full `Review[]` + `initialDataUpdatedAt`.
- Densify moderate upsert test asserts `reviewedAt` / `reviewedByName` / `reviewedByEmail`.
- `SupportTicketReplyThread`: static attribution name/email size tokens (no hardcoded sky).
- Admin book-reviews: SupportTickets-parity table (Approver, sky title/comment, View Details, no row-click); `StatCardGrid` auto-fit; `useAdminBookReviews` cache-prefer seed.
- Prove: typecheck/lint/**120** tests PASS.

## Demo / UX notes (through 2026-08-04)

- `npm run seed:reset`: FK-safe wipe + 17 books + `test@user.com` / `test@admin.com` (APPROVED, local avatars).
- Auth glass + demo locks; make-admin Approve blocked for showcase; Decline/Create/Cancel OK.
- `/make-admin`: `requireSignedInActor`; PENDING/REJECTED `AccountRegistrationNotice` + locked form; signup/make-admin reviewer strips; APPROVED form create/cancel.
- Signup attribution: migration `0011` `status_reviewed_*`; emails unique subject + text actor; Sign-up recent decisions + user 360.
- Signup polish: applicant recent cards + RQ; welcome Brevo email; REJECTED→PENDING re-apply CTA; Approve/Reject/Return spinners; seed stamps `status_reviewed_*`.
- Signup ledger `0012` + await-invalidate spinners; `PersonAttribution`; `admin-requests:purge` for demo history clutter.
- Optimistic signup Recent uses session actor (no “an admin” flash); admin cards link to `/admin/users/[id]`; `signup-decisions:purge`.
- Borrow RQ APPROVED-only (SSR/prop status); PENDING my-profile friendly shell (no 403 console / red error).
- `user.write` RSC includes `/make-admin` + `/admin/account-requests`; `admin-request.write` → `/make-admin` + `/admin/users` + `/admin/users/[id]`; `npm run user:delete`; `logging.serverFunctions: false`.
- Borrow soft-cancel `CANCELLED` (`0013`); All Users/bulk Make Admin → `adminPrivilegeLedger` + demote revoke; invalidate `admin-request.write`.
- Fresh-test ops (2026-08-04): purged signup + settled admin decision ledgers; deleted `arnob_t78@yahoo.com` for re-signup.
- CR-0003 (2026-08-05): migration `0014_admin_suite_expansion.sql` applied to the same single configured database referenced throughout this file (`DATABASE_URL` host `77.42.71.87:25432/university_library_db` — the one CLAUDE.md/STATE.md calls "the configured database" for `0009`–`0013`); schema-verified live by the manual smoke test (created and deleted a real `support_tickets` row through the running app). `0014_admin_suite_expansion.down.sql` is the rollback. Apply `0014` separately to any other environment before deploying this code there.
- Sidebar "Home" is now "Library Overview" (`/admin` route unchanged); new sidebar entries: Support Tickets (open/unassigned badge), Book Reviews (pending badge), Activity History; profile dropdown gained "My Support Tickets".

## Agent notes (2026-08-06)

- CSP `connect-src 'self'` blocks browser POSTs to `127.0.0.1:7290` debug ingest (empty `.cursor/debug-*.log`); curl or temporary same-origin relay only.
- Approver densify: never cache `"an admin"`; use mutation moderator + post-invalidate join + SSR `currentAdmin`.
- Table polish: `tableCellStyles` + PrefetchLink book-detail; Book Reviews title→`/books/[id]`, comment→review detail.
- Local Prove this batch: typecheck/lint; **146** default tests PASS (Gate 2 still blocked by EvalGate nonlocal).
- Tip/HEAD: tip `c8faf16` / HEAD `bbebc50` (docs bind).

## Agent notes (2026-08-07)

- Admin Stockly shell: shared Header `tone="light"`; full-bleed frosted chrome; `py-2` navbar; `CARD_PAD` admin-container; dead `.borrowed-book*` removed.
- Nav densify: `patchAdminNavCounts` absolute; `/api/admin/nav-counts` admin-auth; dual Tailwind base kept.
- Local Prove: type/lint/**151** tests + build PASS. Tip `06ca476`. Gate 2 still EvalGate FAIL.