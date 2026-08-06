# Agile V State

- Project: University Library Management System
- Cycle: C2
- Stage: 4 - Prove complete (local) review-detail redesign + densify closeout; nonlocal Verify still outstanding
- SCOPE-V phase: Verify (review-detail + densify Prove PASS locally)
- Status: ACTIVE - review-detail redesign at tip `29aaa59`; C2 Gate 2 still blocked by EvalGate FAIL (nonlocal evidence)
- Baseline commit: `c94e7db`
- Prior accepted implementation: C1 commit `d9b9fd9`
- Latest implementation tip: `29aaa59` (admin review detail ticket shells + moderate confirm)
- Latest HEAD: `934f985` (`main` == `origin/main`; docs bind after tip)
- Started: 2026-08-01
- Last updated: 2026-08-06 (admin review detail ticket shells + moderate confirm)
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
- Skills applied this session: agile-v-core, agile-v-pipeline, build-agent-js (attribution + SSR fix)

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

Owner smoke soft-nav on `/admin/book-reviews/[id]` Approve/Reject (confirm + single spinner). Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER (`ER-C2-FINAL-CORRECTIVE-5`).

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