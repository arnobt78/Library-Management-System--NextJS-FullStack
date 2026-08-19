# Agile V State

- Project: University Library Management System
- Cycle: C2
- Stage: 4 - Prove (local) densify consistency closeout closed; nonlocal Verify / EvalGate still outstanding
- SCOPE-V phase: Orchestrate → Prove (EvalGate FAIL blocks Gate 2)
- Status: ACTIVE - Clocks 0019+0020 prod-smoked; profile Cancelled/renewed strips pending deploy
- Baseline commit: `c94e7db`
- Prior accepted implementation: C1 commit `d9b9fd9`
- Latest implementation tip: `cf425c2`
- Latest HEAD: `cf425c2`
- Started: 2026-08-01
- Last updated: 2026-08-19 (prod clock smoke + profile cancelled/renewed strips)
- Active requirements revision: C2-approved.2 (REQ-0026 through REQ-0033 approved; REQ-0034 through REQ-0037 approved under `GATE-0007`/CR-0003; C1 approvals unchanged)
- Active policy: `.agile-v/POLICY.yaml` v1.0.0
- Current phase directory: living `.agile-v/` artifacts; frozen C1 archive at `.agile-v/cycles/C1/`
- Pending checkpoint: none PENDING for this interrupt; C2 Gate 2 not opened (EvalGate FAIL — `ER-C2-FINAL-CORRECTIVE-5`)
- Gate 0: APPROVED (`GATE-0001`)
- Gate 1: APPROVED (`GATE-0002`)
- Gate 1 delta: APPROVED (`GATE-0003`, `REQ-0025`)
- Gate 2: APPROVED (`GATE-0004`) — C1 only
- C2 Gate 0: APPROVED (`GATE-0005`)
- C2 Gate 1: APPROVED (`GATE-0006`)
- C2 Gate 1 delta (CR-0003): APPROVED (`GATE-0007`, REQ-0034–0037)
- C2 Gate 2: NOT STARTED
- Skills applied this session: agile-v-core, agile-v-pipeline, executing-plans
- Active plan: clocks 0019+0020 prod-smoked; profile Cancelled/renewed strips to deploy

## Reconciliation snapshot (2026-08-19, prod clock smoke + profile strips)

- **Done**: Prod UI smoke on `https://university-library-managment.vercel.app/` as Test Admin + Test User. Queue/detail PASS: Due date-only; Software Fine Waived $0 (Approved Jul 30 1:30 PM ≠ Updated Jul 31 12:30 PM); Distilled Approved Jul 22 1:30 PM ≠ Renewed Jul 30 11:30 AM; Fundamentals Approved Aug 1 1:30 PM ≠ Renewed Aug 9 11:30 AM (count 2); Lean Paid $5 Due Jun 30; Eloquent/Cracking Cancelled clocks. Profile compact rows were missing Cancelled/`renewed` copy — shipped in this tip. Agent rule: compact docs after audit; smoke UI on prod URL.
- **Remaining**: Deploy this tip then re-smoke `/my-profile` Cancelled + renewed clocks. EvalGate / Gate 2 unchanged.
- **Next exact task**: Push/deploy; confirm profile history Cancelled strip + Fundamentals `renewed` under Due on prod.

## Reconciliation snapshot (2026-08-19, cancel/renew stamps + leftover 0019 map)

- **Done**: mig `0020` applied on `.env` DATABASE_URL (`cancelled_at` once on reject/owner cancel; `renewed_at` last renew). Queue/profile/detail Cancelled paint `cancelledAt` not later `updatedAt`. Renewed meta under Due (not Approved). Profile RQ `getStableDate`/`memo` keep `approvedAt`. Prove: typecheck PASS, lint on touched files PASS, **350** unit tests PASS. `drizzle-kit push` skipped (unrelated system_config unique TTY prompt).
- **Remaining**: Deploy profile Cancelled/renewed strips; EvalGate / Gate 2 unchanged.
- **Next exact task**: Deploy then re-smoke `/my-profile` Cancelled + renewed clocks on prod.

## Reconciliation snapshot (2026-08-19, due/return timestamptz + approved_at)

- **Done**: mig `0019` applied on `.env` DATABASE_URL (`due_date`/`return_date` timestamptz UTC noon due; `approved_at` stamp-on-approve). Return writes `now()`. Approved chips use `approvedAt` not `updatedAt`. Queue Fine Waived. Waived Fine KPI copy. Overdue SQL `(due AT TIME ZONE 'UTC')::date`. Prove: typecheck PASS, lint on touched files PASS, **347** unit tests PASS. `drizzle-kit push` skipped (unrelated system_config unique TTY prompt); 0019 SQL is the schema change.
- **Remaining**: Owner `npm run seed:reset && npm run seed:demo` then smoke Distilled approve date, return clock, queue Waived vs Lean Startup $5, Due date-only (no 2 AM). EvalGate / Gate 2 unchanged.
- **Next exact task**: Owner reseed + smoke; then tip-bind after commit/push if requested.


## Reconciliation snapshot (2026-08-19, Automation skip WAIVED/PAID)

- **Done**: `updateOverdueFines` + `forceUpdateOverdueFines` exclude WAIVED/PAID (`notInArray` + `isImmutableFineStatus`); live compute receives `fineStatus`. Cron `stampOpenOverdueFines` already skipped. Unit: `status.test.ts`. Integration: force update after waive stays `$0`/`WAIVED`. Prove: typecheck PASS, lint PASS, 335 unit tests PASS (integration skipped without TEST_DATABASE_URL).
- **Remaining**: Owner smoke (waive → Return; same-day due; optional Force Update on waived row). EvalGate / Gate 2 unchanged.
- **Next exact task**: Owner smoke (waive→Return Waived/$0; same-day due; Force Update must not recharge waived); then tip-bind after push.

## Reconciliation snapshot (2026-08-19, fines display + waive/return)

- **Done**: Calendar overdue on profile cards/timer/Insights (`getOverdueDaysForBorrow` / `due_date < CURRENT_DATE`). `returnWithTransaction` preserves WAIVED/PAID via `resolveReturnFine`; return densify writes `fineAmount`/`displayFineAmount`/`fineStatus`. Profile Waived/Paid chips; Due in 48h titles; open STAMPED still live. Prove: typecheck PASS, lint on touched files PASS, 333 unit tests PASS.
- **Remaining**: Owner smoke — waive overdue then user Return → history Waived/$0; fine-free still $0; same-day due card matches Due in 48h; renew drops that title; Distilled-style STAMPED shows dollars while overdue. EvalGate / Gate 2 unchanged.
- **Next exact task**: Owner Verify waive-then-return + same-day due on `/my-profile` and Insights overdue Fine column.

## Reconciliation snapshot (2026-08-19, Agile V resume + fines UI polish halt)

- **Done**: Loaded `docs/AGILE_V_PROTOCOL.md` + CLAUDE + AGENTS + STATE; tip `ad1cc69` (demo seed + Fine NaN) / HEAD `e2fbd4b` (docs bind) == `origin/main`. WT: this STATE/plan delta + untracked `.agile-v/plans/` + `agile_v_skills/` (not product). No PENDING interrupt. TRACE lagged behind 2026-08-18 fines spans (catch-up appended).
- **Owner request**: Fines/demo work “works okay, need to test”; next is “few ui polish based on my instruction.” No screenshots or item list after `----`.
- **Classification**: Bounded (existing fines/borrow UI under REQ-0033 polish / BL-0018). Halt: `ambiguous_requirement` + `unclear_done_criteria` (POLICY).
- **Remaining**: Owner paste polish list/screenshots; owner functional Verify of fines; EvalGate / Gate 2.
- **Next exact task**: Human-Decision — name polish surfaces + expected vs current (or paste screenshots). No Orchestrate until then.

## Reconciliation snapshot (2026-08-17, User 360 live outstanding)

- **Done**: User 360 `outstanding_fine` + open-overdue Fine cells = live days × rate; settled rows keep stored `fine_amount`. RSC User 360 sibling paths on borrow/reservation/renewal. No invent Fine densify.
- **Remaining**: EvalGate / Gate 2; owner Verify Test User 360 Fine vs Insights.
- **Next exact task**: Verify User 360 Fine KPI matches Insights outstanding.

## Reconciliation snapshot (2026-08-17, live Insights outstanding)

- **Done**: C2-v2 outstanding + forecast base = live `(CURRENT_DATE − due) × dailyRate` (matches overdue table); `computeLiveOutstandingFine`; stored `fine_amount` unchanged.
- **Remaining**: EvalGate / Gate 2; owner Verify `/admin/business-insights` KPI vs table.
- **Next exact task**: Verify Fines Outstanding equals Overdue Analysis total fines.

## Reconciliation snapshot (2026-08-17, Agile V resume)

- **Done**: Repo vs STATE: tip `9606f01` on `main`; HEAD `7494248` (was recorded `0be41a1`). Working tree clean except untracked `.agile-v/plans/` + `agile_v_skills/` (not product). No PENDING interrupt for this session. C2 Gate 2 still EvalGate-blocked.
- **Remaining**: Owner UI Verify (cover-only create + Insights); EvalGate / Gate 2.
- **Next exact task**: Halt until owner names a Build request (empty payload after `----`).

## Reconciliation snapshot (2026-08-17, optional book trailer)

- **Done**: mig `0016` nullable `video_url` (local applied); Zod empty OK; create/update NULL + conditional assert; BookForm no Trailer `*`; BookVideo null-safe; Insights header All History + LabelList + Actions kebab.
- **Remaining**: EvalGate / Gate 2; owner UI Verify.
- **Next exact task**: Verify cover-only create + Insights charts.

## Reconciliation snapshot (2026-08-17, Insights header + chart labels)

- **Done**: `BusinessInsightsClient` header FilterSelect (default `all`) + chips; removed densify invent subtitle; Recharts LabelList + margins; University ID `text-dark-200`; Due/Borrowed emerald/amber via `independentUpdated`; overdue Actions kebab View Details.
- **Remaining**: EvalGate / Gate 2; owner Verify Insights.
- **Next exact task**: owner Verify `/admin/business-insights` charts + overdue table.

## Reconciliation snapshot (2026-08-17, Insights UX + seed:demo)

- **Done**: Title Case KPIs/chips; delta-only KPI badges; overdue DNA (`AdminBookIdentityCell` + `PersonAttribution` + dates + university ID) + `DismissibleFilterChips`; `TicketDateMeta` Updated — when no real edit; `seed:reset` created_by only; `npm run seed:demo` mixed ops. Genre Pressure left as-is.
- **Remaining**: EvalGate / Gate 2; owner Verify Insights + User 360 after `seed:demo`.
- **Next exact task**: `npm run seed:demo` then Verify `/admin/business-insights`.

## Reconciliation snapshot (2026-08-17, Business Insights polish)

- **Done**: Waves A–E — overdue DataTable + PrefetchLinks; 8 StatCards; shared `opsPeriod`; 8 charts; cross-domain chips; `daysOverdue` severity buckets/floors (not dueDate windows); dead `matchesInsightsOpsPeriod` removed. Evict + remount refetch only. typecheck/lint after tip-bind.
- **Remaining**: EvalGate / Gate 2; owner Verify Insights page.
- **Next exact task**: owner Verify `/admin/business-insights`.

## Reconciliation snapshot (2026-08-16, book trailer max-h)

- **Done**: `BookVideo` play frame `max-h-[min(50vh,28rem)]` + `object-contain`; unified ImageKit path; placeholder `min-h-48/64` only. typecheck + eslint PASS. Owner keeps letterbox (no stretch/cover).
- **Remaining**: EvalGate / Gate 2; Insights polish when owner asks.
- **Next exact task**: owner Verify on 14″ laptop book detail (optional).

## Reconciliation snapshot (2026-08-16, owner Verify book CRUD densify)

- **Human verify**: Book CRUD OK — no detail→list flash on delete; KPI/badge counters immediate; Activity History rows not late catch-up.
- **Remaining**: EvalGate / Gate 2; ImageKit upload-limit deferred; Resolve old Sentry auth issues after deploy if still open.
- **Next exact task**: owner name next Build or continue Verify elsewhere.

## Reconciliation snapshot (2026-08-16, root 404 dark shell)

- **Done**: Reverted `#not-found` to white/light-100; wrap `root-container`+`bg-pattern`; Lucide Home/BookOpen; browse `SKY_LINK_DARK`.
- **Remaining**: EvalGate / Gate 2; owner Verify after deploy.
- **Next exact task**: owner prod smoke.

## Reconciliation snapshot (2026-08-16, 404 contrast + Sentry closeout)

- **Done**: Root `#not-found` h4/p → dark tokens; Browse link `SKY_LINK_LIGHT`. Sentry auth filter + admin redirect shipped `073afae` / tip-bind `cf61020`.
- **Remaining**: EvalGate / Gate 2; Resolve old Sentry issues after deploy; book CRUD Verify after `seed:reset`.
- **Next exact task**: owner Verify / prod smoke.

## Reconciliation snapshot (2026-08-16, Sentry auth denial noise)

- **Done**: `beforeSend` drops `AuthorizationError` (server/edge/client); admin RSC pages use `requireAdminActorOrRedirect` (sign-in / home) so denials are not digests. typecheck + eslint + filter/auth unit tests PASS.
- **Remaining**: EvalGate / Gate 2; owner Resolve old Sentry issues after deploy; book CRUD Verify after `seed:reset`.
- **Next exact task**: owner commit/deploy when ready.

## Reconciliation snapshot (2026-08-16, Agile V resume)

- **Done**: Loaded `docs/AGILE_V_PROTOCOL.md` + CLAUDE + AGENTS + STATE; tip \`9a5ff07\` / HEAD \`52e05b1\` == `origin/main`; WT clean except untracked `.agile-v/plans/` + `agile_v_skills/`.
- **Mismatch fixed in STATE**: tip was stale-equal to HEAD; tip = densify impl, HEAD = tip-bind docs.
- **Request**: prompt after `----` empty — Halt (unclear Done / no new REQ scope).
- **Deferred carry**: ImageKit upload 429 UX; Insights invent densify; shipping-payments N/A; EvalGate FAIL blocks Gate 2.
- **Remaining**: owner name next Build OR run Verify (`npm run seed:reset` → 2 accounts + 17 books smoke).
- **Next exact task**: Human-Decision — paste product request or choose Verify-only / ImageKit upload-limit / other.

## Reconciliation snapshot (2026-08-16, densify consistency closeout)

- **Done (Wave 1)**: Book list `total` coercion (`count(*)::int` + `Number` at API/service); `finiteTotal` in upsert; create absolute-reconcile universe `total=books.length`; unfiltered thin-key total sync from universe; strip debug-ingest/sessionLog/agent logs; keep early delete densify in `useDeleteBook` `mutationFn`.
- **Done (Wave 2)**: Early densify for review/ticket hard-delete remount; `seedPagedListFromSsrIfEmpty` on books+users; coerce users/borrows list counts.
- **Done (Wave 3)**: Bulk activate/deactivate/user/admin/borrow densify (no activity invent); bulk admin also drops pending privilege queue; reminder `notification.write` bell unread/total bump from send count.
- **Deferred**: ImageKit upload rate-limit UX (owner later). Insights invent densify / shipping-payments out of scope.
- **Security**: uncommitted densify diff — no medium/high/critical; privileged writes remain server-gated.
- **Prove**: typecheck + eslint + **310** unit tests PASS (11 skipped).
- **Remaining**: EvalGate / Gate 2; owner Verify after Vercel deploy.
- **Next exact task**: owner prod smoke.

## Reconciliation snapshot (2026-08-15, tip-bind never-paint 404)

- **Done**: Bound tip/HEAD to `4b255dc` on origin/main.
- **Remaining**: EvalGate / Gate 2; owner prod smoke.
- **Next exact task**: owner Verify after Vercel deploy.

## Reconciliation snapshot (2026-08-15, public ticket delete never-paint 404)

- **Done**: `/support-tickets/[id]` missing/unauthorized → `redirect(/support-tickets)`; `SupportTicketDetailContent` settle `mutateAsync` + `replace` (admin parity). RSC omit already present. typecheck + eslint PASS.
- **Human verify**: User deletes open ticket from public detail → list + toast, zero 404.
- **Remaining**: EvalGate / Gate 2; owner commit when ready.
- **Next exact task**: commit when owner asks.

## Reconciliation snapshot (2026-08-15, universal hard-delete unlink)

- **Done**: Ticket/review detail missing → redirect list; settle soft-nav after densify; omit detail RSC on ticket/review DELETE; `annotateMissingActivityEntities` (book/review/ticket/user/borrow + reservation bookId); densify `markActivityEntitiesDeleted` on review+ticket delete; typecheck + eslint + 27 unit tests PASS. Soft reject/cancel stay linkable.
- **Human verify**: Delete book/ticket/review from detail → list + toast, zero 404; Activity CREATE/UPDATE for that id non-clickable; soft-rejected borrow still clickable.
- **Remaining**: EvalGate / Gate 2; owner commit when ready.
- **Next exact task**: commit when owner asks.

## Reconciliation snapshot (2026-08-15, delete-detail 404 + not-found)

- **Done**: Admin book detail missing → `redirect(/admin/books)` (parity with edit; stops SA remount black 404). `app/not-found.tsx` + `app/admin/not-found.tsx`. Public book miss → `notFound()`. Activity densify `markActivityEntityDeleted` + SSR `annotateMissingBookEntities`; linkability respects `details.entityDeleted`. ImageKit 429 → `uploadRateLimited` toast (limit still 5/10m). typecheck + eslint touched + 25 unit tests PASS.
- **Human verify**: Delete from admin book detail — dialog settles → catalog, no black 404; Activity CREATE/UPDATE for deleted book not clickable; nonsense admin id → admin-shell 404; upload auth 429 copy.
- **Remaining**: EvalGate / Gate 2; owner commit/push when ready.
- **Next exact task**: commit when owner asks.

## Reconciliation snapshot (2026-08-15, Agile V resume)

- **Done**: Loaded protocol + CLAUDE + STATE; reconciled tip `0a27e07` / HEAD `102e119` == origin/main; WT clean except untracked `agile_v_skills/`. Phase A + Bulk + DEC-0109 shipped.
- **Remaining**: EvalGate / Gate 2; owner prod smoke. No new product request in resume prompt.
- **Next exact task**: Human-Decision — tip-sync already applied in STATE; await owner Verify or name next Build scope. No coding until approved scope.

## Reconciliation snapshot (2026-08-15, Agent Review real fixes)

- **Done**: Bulk success `count`; invalidate-only (no activity invent); bulk delete uses `densifyBookDelete`; reminder stamp failure → `failed` not `sent`. DEC-0109. Shipped as `0a27e07` + tip-bind `102e119`.
- **Remaining**: EvalGate / Gate 2; owner prod smoke.
- **Next exact task**: closed — see Agile V resume snapshot above.

## Reconciliation snapshot (2026-08-15, Bulk Automation wire-up)

- **Done**: Dropped Coming Soon redirects; `BulkOperationDialog` + `useBulkMutations` call live `bulk-operations` (activate/deactivate/delete books, approve/reject users, make/remove admin, approve/reject borrows); pending ID loaders; combined due+overdue reminders; densify via `commitMutationCache` per domain + activity invent; restored bulkDelete success return + ImageKit purge; eslint + parseBulkIds/auth tests PASS.
- **Human verify**: Automation bulk dialogs with UUIDs; Load all pending; no `?coming-soon=` redirects.
- **Remaining**: EvalGate / Gate 2; owner Verify when ready.
- **Next exact task**: owner smoke Automation bulk; commit when asked.

## Reconciliation snapshot (2026-08-15, Phase A closed tip sync)

- **Done**: Docs tip/HEAD sync — implementation tip `156ec79`, HEAD tip-bind `9bc26a2`; Active plan Phase A closed. No further W1/W2/W3 feature code.
- **Remaining**: EvalGate / Gate 2; owner prod smoke when ready (not blocking Build).
- **Next exact task**: owner one-by-one Verify; push only if owner asks.

## Reconciliation snapshot (2026-08-15, Phase A densify closeout)

- **Done**: Dual `commitMutationCache(..., "notification.write")` after due/overdue reminder send (BroadcastChannel for open bells); `revalidateMutationPaths("notification.write")` in reminders actions + due-reminders cron + reservation-notifications when `delivered > 0`; Automation Hold READY Delivery card (honest cron note, no fake last-run DB). eslint touched PASS; formulas+outbox 9/9 PASS. Audit verdict: scoped closeout OK; no mandatory pre-prod code fix.
- **Human verify (prod smoke)**: (1) Automation → Send Due Soon / Overdue → same-origin borrower tab bell list/unread updates without full refresh; (2) Automation shows Hold READY Delivery cron card; (3) after hold becomes READY, cron `/api/cron/reservation-notifications` delivers HOLD_READY email+bell (CRON_SECRET).
- **Remaining**: EvalGate / Gate 2; owner prod smoke on deploy.
- **Next exact task**: owner prod smoke checklist above (tip `156ec79`).

## Reconciliation snapshot (2026-08-15, Phase A + UI fixes)

- **Done**: W1 book-reviews isPending-only loading; UserAvatar loaded-source Set; Overview AdminDetailEmptyState; delete navigate-first + inactive detail remove + omit RSC detail revalidate. W2 insights `C2-v2` overdueTrend/fineForecast/genreDemandPressure + charts/ops chips + User 360 next actions. W3 `/api/cron/due-reminders` + vercel 07:00; REMINDER_DUE/HOLD_READY; lastReminderSent day guard; Automation no-AI copy. DEC-0106.
- **Human verify**: empty reviews no skeleton; users avatars stable; Overview empties italic-centered; delete book no 404 flash; Insights forecast/trend; cron with CRON_SECRET; bell types on reminder/hold.
- **Remaining**: EvalGate / Gate 2; commit when owner asks.
- **Next exact task**: owner human-verify; checkpoint commit if approved.

## Reconciliation snapshot (2026-08-15, UX polish trio)

- **Done**: BookForm `isConfirmSettling` keeps confirm spinner through soft-nav; bell unread `h-5 min-w-5` circle; drop `/admin/users` `?sort=created` mount rewrite (filters still default created); PrefetchLink warms `ADMIN_USERS_UNFILTERED`; DEC-0105; tsc/eslint PASS.
- **Human verify**: create/update book spinner until detail; bell `1` circular; `/admin/users` URL stays clean, no avatar double-blink.
- **Remaining**: EvalGate / Gate 2 still blocked.
- **Next exact task**: human-verify confirm spinner / bell circle / users URL; EvalGate evidence separately.

## Reconciliation snapshot (2026-08-15, 1-day Auth.js session)

- **Done**: `SESSION_MAX_AGE_SECONDS` = 86400 in `auth.ts` with `session.maxAge` + `updateAge`; `SessionProvider` `refetchOnWindowFocus`; DEC-0104; tsc/eslint PASS on touched files.
- **Human verify**: sign out once (or clear cookies) then sign in; after >1 day idle expect `/sign-in`; hard-reload alone stays logged in; Clear site data (cookies) + reload logs out.
- **Remaining**: EvalGate / Gate 2 still blocked.
- **Next exact task**: human-verify 1-day idle after re-sign-in; EvalGate evidence separately.

## Reconciliation snapshot (2026-08-15, book CRUD UX + Insights polish)

- **Done**: Overview year/language top-5 keep cap + distinct counts + `+N more` + TicketSectionHeader subtitles; densify year sort = newest-first (SSR parity); BookForm push detail before closing confirm; pagination-/sort-aware create densify for `/all-books` limit-12; Insights Popular Genres (by borrows) rename + chart empty states + panel headers; profile/queue title DNA via `syncBorrowRequestBookFields`; densify unit tests + tsc/eslint PASS.
- **Human verify**: year 2000 shows under `+N more` not top-5; save confirm stays until detail; all-books no 13-row flash; Insights empty charts professional copy.
- **Remaining**: notification bell UI (deferred); commit when owner asks; EvalGate / Gate 2 still blocked.
- **Next exact task**: owner human-verify; checkpoint commit if approved.

## Reconciliation snapshot (2026-08-15, notification bell UI parity)

- **Done**: `getNotificationShellForUser` SSR seeds list+unread+total into Header → NotificationBell; `notifications.totalCount` key + `/api/notifications/total-count`; densify mark/delete/mark-all updates list + unread + total; dropdown rose glass with count chips, New badge, Check/CheckCheck, always-visible Trash, Close footer, Loader2 (no skeletons); unit densify tests PASS; tsc/eslint on touched files PASS.
- **Human verify**: open bell paints from SSR; `N total · M unread`; mark-all / per-row Check / Trash densify; dark+light Header.
- **Non-goals kept**: no book CRUD in-app emitters; no stock commerce icon map / Redis notification cache; no full inbox page.
- **Remaining**: commit when owner asks; EvalGate / Gate 2 still blocked.
- **Next exact task**: owner human-verify bell UI; then checkpoint commit if approved.

## Reconciliation snapshot (2026-08-15, delete densify gap closeout)

Verified facts:
- `useBookGenres` + genresRoot invalidation; AdminBooksList/BookCollection wired.
- densifyBookGenres rebuilds unique genres from warm catalog (shared stay; orphan drops).
- densifyBookDelete fallbackSnapshots from DeleteBookDialog DNA for Overview KPIs.
- Shared buckets count-safe (category/year/language). Prove: patchBookCaches+invalidation 30 PASS; tsc/eslint PASS.

### Next Action

**Human-Verify on deploy:** create Added-only + Activity actor; delete → 12 of N + genres/KPIs; then Wave B.

## Reconciliation snapshot (2026-08-15, all-books delete densify)

Verified facts:
- `densifyBookDelete` unfiltered totals decrement by deleted count (limit:1 universe too).
- Paginated page holes backfill from next warm page; else invalidate incomplete keys.
- Filtered lists only decrement when deleted id/snapshot matches filter.
- Prove: patchBookCaches 19 PASS; tsc + eslint PASS.

### Next Action

**Human-Verify:** delete a book → soft-nav `/all-books` shows 12 of N (not 11); subtitle matches. Commit when ready.

## Reconciliation snapshot (2026-08-15, book-create closeout)

Verified facts:
- Media assert: 10s timeout + one AbortError retry; clear timed-out message.
- Create stamps `createdBy` only; `updatedBy` null; UI Updated gate = Boolean(updatedBy).
- Create/update Activity densify uses action catalog actor (not session-only → no All admin).
- CopyableText break-all for long Cover/Trailer URLs.
- Prove: vitest serverValidation+patchBookCaches 20 PASS; tsc + eslint touched PASS.

### Next Action

**Human-Verify:** add book once — success toast; Added Test Admin; Updated —; Activity PersonAttribution; URLs wrap. Then Wave B or commit.

## Reconciliation snapshot (2026-08-15, Vercel log quiet + Node 24)

Verified facts:
- `package.json` engines pinned to `24.x` (clears Vercel EOL auto-upgrade vs open `>=20`).
- `withSentryConfig`: `silent` unless `SENTRY_VERBOSE=1`; `telemetry: false` (sourcemaps still upload).
- Kept immutable `/_next/static` Cache-Control; comment notes expected Next warning.
- Prove: tsc + eslint `next.config.ts` + `npm run build` PASS (exit 0).

### Next Action

**Done local:** commit/push this ops tip. Confirm Vercel dashboard Node 24; Wave B insights or Human-Verify signup CTA next.

## Reconciliation snapshot (2026-08-15, CTA gate silent Zod)

Verified facts:
- Removed mount form.trigger; schemaOk via watch+safeParse; mode onTouched.
- Signup/book CTAs stay disabled until valid without error wall on visit.
- eslint scoped incompatible-library for AuthForm/BookForm watch.
- Prove: eslint/tsc PASS.

### Next Action

**Human-Verify:** /sign-up clean labels; then Wave B insights.

## Reconciliation snapshot (2026-08-15, form CTA gate)

Verified facts:
- BookAdminFormGate syncs shell toolbar; BookForm/AuthForm mode onChange + mount trigger.
- Signup rose *; Sign Up / Add/Update disabled until Zod-valid; sign-in unchanged.
- Prove: eslint + tsc touched files PASS.

### Next Action

Superseded by CTA silent Zod flash-fix.

## Reconciliation snapshot (2026-08-15, uploadLimits 1MB/20MB)

Verified facts:
- Shared `lib/media/uploadLimits.ts`; FileUpload + serverValidation + toast labels aligned.
- Empty UI Max 1MB / Max 20MB (dropzone + Auth button).
- Prove: serverValidation tests + eslint/tsc PASS.

### Next Action

Superseded by form CTA gate.

## Reconciliation snapshot (2026-08-15, Wave A media + ImageKit + toast)

Verified facts:
- Media trio: FileUpload `layout=dropzone`, ColorPicker `fill`, label Clear; Auth button unchanged.
- ImageKit purge: allowlist covers/videos/ids; after() on book update/delete; CLI awaits card purge.
- Upload toasts: `showToast.file` folder titles; no double ✅.
- Prove: tsc + eslint touched + imagekitPurge unit tests PASS.

### Next Action

**Human-Verify:** replace/delete media in ImageKit library; then Wave B insights.

## Reconciliation snapshot (2026-08-15, book form CTA + flags polish)

Verified facts:
- Footer Cancel/primary → LIGHT_GLASS_CTA (drop book-form_btn min-h-14).
- Active/Featured 2-col; no label icons; Featured helper on Info tooltip.
- Prove: tsc + eslint BookForm PASS.

### Next Action

Superseded by media + ImageKit + toast.

## Reconciliation snapshot (2026-08-15, book form UI polish Wave A)

Verified facts:
- Shell: detail-style Back, AdminPageHeader, Cancel + form= primary + Delete.
- Labels: Lucide + rose *; media trio Cover|Color|Trailer; desc|summary 2-col.
- Confirm LIGHT_ALERT + ReviewBookIdentity; mutateAsync densify settle; no router.refresh.
- Prove: tsc + eslint touched files PASS.

### Next Action

Superseded by CTA + flags polish.

## Reconciliation snapshot (2026-08-15, Agile V resume + final polish wave)

Verified facts:
- Repo HEAD was `48822cc`; plan `final-ui-polish-wave` A–E proposed.

### Next Action

Superseded by Wave A implementation.

## Reconciliation snapshot (2026-08-15, FilterSelect flash shipped)

Verified facts:
- Tip `028dc23` + docs tip-binds; HEAD later `48822cc`.
- Explicit SelectValue; FilterSelect covered; MultiSelect OK; AuthForm leave.

### Next Action

Superseded by Agile V resume + polish-wave plan.

## Reconciliation snapshot (2026-08-15, FilterSelect flash fix)

Verified facts:
- Bare SelectValue Portal clone caused icon+label flash on hard refresh.
- Fix: explicit SelectValue children from selected option (SupportTicketDialog DNA).
- One shared component; all FilterSelect toolbars covered.

### Next Action

Superseded by pre-commit audit.

## Reconciliation snapshot (2026-08-15, Featured exclusivity Updated DNA)

Verified facts:
- Bug: clearOtherFeatured stamped updatedAt on all siblings when saving Featured.
- Fix: clear isFeatured only (featured rows); Updated By UI — until real edit.
- Prove: tsc/lint/274 tests PASS; debug instrumentation removed.

### Next Action

Superseded by FilterSelect flash fix.

## Reconciliation snapshot (2026-08-15, Activity+Delete pre-commit audit)

Verified facts:
- Activity FIFO-25 SSR+densify+timeline; wipe closeout shared fetch; Delete LIGHT_ALERT settle.
- Gateway book.write; JWT card-less; Redis rate-limit only; tsc/lint/274 tests PASS.

### Next Action

Superseded by Featured exclusivity snapshot.

## Reconciliation snapshot (2026-08-15, Delete settle + densify closeout)

Verified facts:
- DeleteBookDialog LIGHT_ALERT; block dismiss + Loader2 until densify; push list (no refresh).
- Wipe closeout present: fetchBookDetailPreservingDensify, PrefetchLink, useBook stamp, Activity FIFO-25.

### Next Action

Superseded by pre-commit audit.

## Reconciliation snapshot (2026-08-15, Book densify wipe closeout)

Verified facts:
- Shared `fetchBookDetailPreservingDensify` + `BOOK_DETAIL_DENSIFIED_KEYS` for useBook + PrefetchLink (public book-detail + admin catalog).
- Catalog detail SSR `initialDataUpdatedAt`; borrow detail drops duplicate `useBook` (panel owns observer).
- Activity FIFO-25 + densify prepend intact; gateway order unchanged.

### Next Action

Superseded by Delete settle snapshot.

## Reconciliation snapshot (2026-08-15, Book detail Activity FIFO-25)

Verified facts:
- `getBookAuditEvents` SSR + `TicketActivityTimeline` fifoLimit 25; merge preserves auditEvents.
- create/update prepend after densifyBookWrite; delete skips (detail removed).
- Edit page polish deferred.

### Next Action

Superseded by densify wipe closeout.

## Reconciliation snapshot (2026-08-15, Book detail + createdBy audit)

Verified facts:
- Plan phases done: mig `0015`, loader SSR/API, create/update densify, seed stamps, Added/Updated DNA, Context rating tone.
- Gateway `book.write` + merge preserve actors; JWT card-less intentional; Redis rate-limit only.
- Prove: tsc/lint/270 tests PASS; no dead files; no code gaps requiring fix.
- Apply `0015` on other envs before seed/code match.

### Next Action

Superseded by Activity FIFO-25 snapshot.

## Reconciliation snapshot (2026-08-14, Books createdBy DNA)

Verified facts:
- Migration `0015_books_created_by.sql` applied locally; schema `createdBy` FK.
- Seed users-first then 17 books with created_by/updated_by = test@admin.com.
- createBook stamps both actors; densify preserves createdByActor on update; IDs Added By PersonAttribution.
- JWT remains without universityCard (DB densify/SSR join).

### Next Action

Superseded by 2026-08-15 audit snapshot.

## Reconciliation snapshot (2026-08-14, Book detail densify fix)

Verified facts:
- Root cause: invalidate refetch via thin GET `/api/books/[id]` wiped densified `updatedByActor`.
- Fix: `loadBookWithUpdater` shared by getBookById + API; create/update return DB actor; densify prefers action actor.
- Catalog Context Total `text-dark-200` / Available availability tone; TicketSectionHeader SVG `translate-y-px` optical mid.

### Next Action

**Human-Decision:** edit book → soft-nav detail (Updated By without refresh); commit when ready.

## Reconciliation snapshot (2026-08-14, Admin book detail polish)

Verified facts:
- Borrow-style Back; Edit Book; glass CatalogActive/Featured badges; Book Cover Color + copyable hex.
- Rating `reviewRatingTone`; Catalog Flags + Media flags colored; BookImage/BookA.
- Stamps: Added date + Updated by PersonAttribution via `getBookById` users join; densify preserves `updatedByActor`.
- `TicketSectionHeader` default `align=center`. Prove: typecheck + lint + patchBookCaches tests PASS.

### Next Action

**Human-Decision:** soft-nav `/admin/books/[id]`; commit when ready; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Admin Book Catalog polish commit)

Verified facts:
- Catalog cards: sky title/genre/star; two-col meta; full-width Publisher `break-words`; meta values `text-dark-200`.
- Detail `/admin/books/[id]` + form shell; PrefetchLink + `book.write` densify/RSC OK (audit clean).
- Docs: portable auth guide + unused HERO/PARALLAX/DROPDOWN deletes; no VPS runbooks in this repo.
- Tip bind: `bd01803`.

### Next Action

**Human-Decision:** soft-nav catalog; richer book-detail polish later; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Merge VPS docs into Hetzner guide)

Verified facts:
- Merge into local Hetzner mega-guide (Parts A–D) completed; then **owner deleted** all VPS/Coolify `.md` runbooks from this project for safety (not needed here).
- No VPS runbook remains under `docs/`; CLAUDE pointer removed; `.gitignore` rule for `HETZNER_VPS_MIGRATION_GUIDE.md` may stay harmless.
- Docs-only change — densify / RQ / auth / Redis paths untouched.

### Next Action

**Human-Decision:** commit CLAUDE/STATE cleanup if desired; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Portable auth UI guide)

Verified facts:
- `docs/PORTABLE_AUTH_UI_GUIDE.md` merges Select+Robohash, profile `modal={false}`, API Docs/Status/Logout contracts + short Auth.js/Clerk appendices.
- Deleted `AUTH_UI_IMPLEMENTATION_GUIDE.md`, `CLERK_AUTH_COMPLETE_IMPLEMENTATION_GUIDE.md`, `DROPDOWN_TEST_CREDENTIALS_DOCS.md`; no stale path refs.

### Next Action

**Human-Decision:** soft-nav / commit docs when ready; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Admin books card DNA)

Verified facts:
- Catalog cards: sky title + author + OverviewGenreChip + star number; BookCover kept; Rating 5/5 row removed.
- Two-col meta: Total/Available/Status/Featured + Year/Pages/Edition/Publisher when set.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav /admin/books cards; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Admin Book Catalog + Detail polish)

Verified facts:
- `/admin/books/[id]` detail DNA; list KPIs + header Create; compact cards + kebab; edit/new two-col form.
- PrefetchLink admin catalog detail + `book.write` RSC `/admin/books/[id]`; activity Entity → catalog detail.
- Prove: typecheck + lint + activityLogDisplay/queryInvalidation tests PASS.

### Next Action

**Human-Decision:** soft-nav catalog list/detail/edit; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Borrow detail UI tweaks)

Verified facts:
- Status KPI: drop `self-start` so DetailKpiShell mid-aligns badge.
- IDs & Notes FIELD_LABEL_ROW icons; reject notes persist/display as admin; legacy librarian mapped.
- Activity: `activityEventIcon` + `fifoLimit`; borrow audit SSR/densify FIFO-25.
- Prove: typecheck + lint + activityEventIcon 3 tests PASS.

### Next Action

**Human-Decision:** soft-nav borrow detail Status/IDs/Activity; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Borrow detail UI polish)

Verified facts:
- `AdminDetailToolbar` `hasActions`: no CTAs → Back|ID end; with CTAs → Back|ID center|actions.
- Status KPI badge-only; Fine overdue-days hint; Renewal `1 = +7 days`; Borrow Book Context + Library DB after Catalog Status.
- Parties: University ID→Requested; simplified Status; Issuer rows only when present; thin IDs & Notes (no Record dump).
- Prove: typecheck + lint + borrowDaysOverdue 2 tests PASS.

### Next Action

**Human-Decision:** soft-nav borrow detail PENDING/BORROWED/RETURNED/CANCELLED; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Review detail KPI cleanup + Activity FIFO-25)

Verified facts:
- KPI: Status badge · Rating · Reviewer person · Approver person; Context holds University ID→Submitted + Approver stack.
- `getReviewAuditEvents` SSR + `prependReviewAuditEvent` densify (FIFO-25); merge preserves `auditEvents`.
- Prove: typecheck + lint + reviewAuditLabel 3 tests PASS.

### Next Action

**Human-Decision:** soft-nav review detail moderate + Activity; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Detail toolbar + review parties polish)

Verified facts:
- `AdminDetailToolbar` mobile Back→actions→ID centered; sm+ Back|ID|actions on ticket/borrow/review/user detail.
- Review Context card; Submitted + University ID under Reviewer; Status PENDING badge-only.
- Support Tickets Replies column right-aligned.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav detail pages on phone + review approve flow; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Admin detail UI polish)

Verified facts:
- Support tickets list/Parties: Created under Requester, Updated under Assigned (`TicketDateMeta` `hideCreated`).
- Shared `AdminDetailIdChip` on ticket / borrow / review detail Back rows.
- Review detail KPI Genre → Reviewer + `userUniversityId` SSR/serialize/densify.
- Prove: typecheck + lint + `patchReviewCaches` 11 tests PASS.

### Next Action

**Human-Decision:** soft-nav tickets/reviews/borrow detail after commit; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Activity avatar densify + detail DNA commit)

Verified facts:
- Borrow/Review detail DNA + Activity avatar densify (`resolveActivityActor`, SSR currentAdmin, sibling-card enrich).
- Prove: typecheck + lint + unit tests PASS; owner commit+push authorized.

### Next Action

**Human-Decision:** soft-nav ticket Activity + borrow detail after tip bind; C2 Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-14, Activity avatar densify fix)

Verified facts:
- `resolveActivityActor` prefers SSR decisionActor universityCard; ticket detail passes currentAdmin into update/reply/delete densify.
- `densifyTicketDetailAudit` / `prependBorrowAuditEvent` enrich null card from sibling reply/issuer.
- Prove: typecheck + lint + unit tests PASS.

## Reconciliation snapshot (2026-08-14, Borrow + Review detail DNA polish)

Verified facts:
- Borrow detail: ReviewBookIdentity header + BorrowLifecycleDateMeta; Inventory KPI + 4 stats KPIs; About Book + Borrower And Issuer (actors folded).
- Review detail: same Book DNA header + ReviewDateMeta.
- Prove: typecheck + lint PASS.

## Reconciliation snapshot (2026-08-13, Queue Book inventory line + commit)

Verified facts:
- AdminBookIdentityCell: Available/Total inline with genre/star (availability tones); densified copies.
- Dialog DNA: genre+star + Available/Total all kinds (Reject info-only); Book Details DNA + parallel SSR stats in same tip.
- Prove: typecheck + lint PASS; owner commit+push authorized.

## Reconciliation snapshot (2026-08-13, Dialog DNA + kebab polish)

Verified facts:
- BorrowLifecycleAlertDialog: genre chip + catalog star under author; Available/Total on Approve/Reject/Return (Reject info-only).
- Borrow Queue kebab: View Details → `/admin/book-requests/[id]`; Book title stays `/books/[id]`.
- Prove: typecheck + lint PASS.

## Reconciliation snapshot (2026-08-13, Parallel SSR borrow stats closeout)

Verified facts:
- Borrow detail page: await borrow row first, then `Promise.all` admin + audit + `loadBookBorrowStats` (no sequential stats tail).
- Densify already owns live `books.borrowStats` after approve/return — unchanged.
- Prove: typecheck + lint PASS.

## Reconciliation snapshot (2026-08-13, Book panel SSR seed + dense right column)

Verified facts:
- `loadBookBorrowStats` shared DB helper; SSR seed on `/admin/book-requests/[id]` → `AdminBookDetailsPanel` `initialStats`.
- Borrow-stats API route uses shared loader (no duplicate SQL).
- Right column denser (`space-y-3` / `space-y-2` / `mb-1.5`).
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav borrow detail Book Statistics SSR paint; commit when asked.

## Reconciliation snapshot (2026-08-13, Book panel DNA closeout + Return inventory adapter)

Verified facts:
- `AdminBookDetailsPanel` Applicant side-by-side fields|cover (`lg:grid-cols-[1fr_minmax(10rem,12rem)]`).
- `applyReturnInventoryDensify` settle adapter; Return never optimistic Available +1; onError reverses stats only.
- Prove: typecheck + lint + adapter unit tests PASS.

### Next Action

**Human-Decision:** soft-nav borrow detail Book panel + Return; commit when asked.

## Reconciliation snapshot (2026-08-13, Book Details DNA + Return no-flash)

Verified facts:
- Return onMutate skips available +1 when `getCachedBookWaitingHolds` > 0; settle still uses absolute + offer READY.
- Shared `bookDetailsViewModel` + `AdminBookDetailsPanel` (Applicant DNA) on borrow-request detail; public overview consumes same field contract.
- Detail loader fat catalog fields; `densifyBookWrite` syncs total+available onto borrow rows via `syncBorrowRequestBookFields`.
- Prove: typecheck + lint + unit tests PASS.

### Next Action

**Human-Decision:** soft-nav borrow detail Book Details + Return with waiting hold; commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow inventory densify closeout)

Verified facts:
- `syncBorrowRequestBookFields` + `setBookAvailableCopiesAbsolute` keep queue/detail `bookAvailableCopies`/`bookWaitingHolds` aligned with `books.detail` / reservation densify.
- Return payload includes absolute `availableCopies` + `offeredReservationId`; `useReturnBook` densify uses absolute (not optimistic +1) and READY densify when offered.
- Reservation create/status bumps/decrements queue `bookWaitingHolds` with Waiting KPI.
- Prove: typecheck + lint + densify unit tests PASS.

### Next Action

**Human-Decision:** soft-nav Return with waiting hold (Available/Waiting stay correct); commit when asked.

## Reconciliation snapshot (2026-08-13, Dialog inventory + profile lifecycle dates + Status & Issuer)

Verified facts:
- Approve/Mark Returned LIGHT_ALERT show Available/Total (+ Waiting holds when > 0) via list/detail SSR fields + live `useBook`; Reject skips inventory.
- Badge stays Cancelled for soft-cancel; button/title remain Reject.
- `BorrowLifecycleDates` `variant` light|dark; My Profile cancel/return/renew + `ReturnBookButton` show dark badge + dates.
- Borrow Queue column header **Status & Issuer** (cell file name unchanged).
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav Approve/Return dialogs + profile confirms; commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow detail gaps + record/history DNA + minimal seed)

Verified facts:
- `BorrowRowPatch.cancelledByActor` typed; self-cancel densifies canceler; detail LIGHT_ALERT confirms until settle.
- Detail Status KPI = `BorrowQueueStatusActorCell`; canceler + Record panel; Activity via `getBorrowAuditEvents` + densify `prependBorrowAuditEvent` (cold-seed + create path; PrefetchLink preserves audits).
- Shared `mergeDensifiedDetail` — PrefetchLink + borrow/ticket/review detail refetch preserve densified actors/auditEvents/replies/reviewedBy* (no thin wipe).
- `seed:reset` = 17 books + 2 TEST_ACCOUNTS only (queues empty). Prove: type/lint + 15 densify tests PASS.

### Next Action

**Human-Decision:** soft-nav Borrow Queue/detail densify after commit; create borrow rows while testing.

## Reconciliation snapshot (2026-08-13, Borrow Queue actor flash fix + lifecycle AlertDialogs)

Verified facts:
- Shared `loadAllBorrowRequestsRows` (actor joins) powers SSR + `GET /api/admin/borrow-requests` — densify survives invalidate refetch.
- Borrow Queue Approve/Reject/Return use LIGHT_ALERT until settle (spinner; Cancel disabled while busy); pending toast + kebab spinner kept.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav Approve → actor stays after settle; dialog spinner until toast; commit when asked.

## Reconciliation snapshot (2026-08-13, Full demo seed + Status & Actor attribution)

Verified facts:
- Approve writes `borrowedBy=actor.email`; Self-cancelled / Self-returned label tones.
- `seed:reset` FIFO demo: borrows (all statuses), holds, reviews, tickets, admin request, notifications, activity — attribution emails set. Prove type/lint + seed PASS.

### Next Action

**Human-Decision:** hard-refresh Borrow Queue Status & Actor; commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow Queue Status & Actor DNA)

Verified facts:
- Columns: Book · Borrower (Requested meta) · Status & Actor · Actions — Status column removed.
- Status & Actor: PENDING Requested; CANCELLED/BORROWED/RETURNED DecisionActorStack + Due; Self-returned detection.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav Status & Actor DNA vs Reviews; commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow Queue KPI labels + Reservation Waiting)

Verified facts:
- KPI titles: Total Queue · Awaiting Approval · Currently Borrowed · Books Returned · Soft-Cancelled · Reservation Waiting.
- SSR WAITING count + `reservationsWaitingCount` densify via `patchAdminStatsOnReservationWaitingChange` (no partial admin.stats seed).
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav Join Waitlist → Reservation Waiting KPI; commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow Decision gaps closeout)

Verified facts:
- List+detail join `updatedBy` → canceler; `cancelledByActor` only when CANCELLED.
- DecisionDateMeta/DecisionActorStack/byTone support BORROWED/RETURNED/CANCELLED; list passes real status.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav Reject hard-refresh canceler + Borrowed/Returned/Cancelled labels; commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow Queue pending toasts + Decision & Actor)

Verified facts:
- Approve/Reject/Return use sticky `showToast.pending` then success/error; kebab spinner kept; reject densifies `decisionActor`/`cancelledByActor`.
- `getAllBorrowRequests` joins approver/returner; Decision & Actor column via `DecisionActorStack` (Status column unchanged).
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav Approve/Reject/Return pending toast + Decision & Actor densify; commit when asked.

## Reconciliation snapshot (2026-08-13, Return/Renew confirms + Recent Cancelled date)

Verified facts:
- Profile Return/Renew + book-detail Return use lifted GLASS_ALERT (preview, spinner until settle).
- Overview Recent 5 Cancelled shows Cancelled date via `updatedAt` + ReviewBorrowMeta chip.
- Waitlist remains out of Recent 5. Prove: typecheck + lint + patchAdminStatsCaches PASS.

### Next Action

**Human-Decision:** soft-nav Return/Renew dialogs + Overview Cancelled date; commit when asked.

## Reconciliation snapshot (2026-08-13, Holds densify queue + post-waitlist nav)

Verified facts:
- `createReservation` returns `queuePosition` + `createdAt`; densify full Holds meta (no dash flash).
- Join Waitlist navigates to `?tab=holds` (BorrowBook pending-requests parity).
- Prove: typecheck + lint PASS; docs synced; commit authorized.

### Next Action

**Human-Decision:** soft-nav Join Waitlist → Holds; Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-13, home Waitlisted SSR seed)

Verified facts:
- Shared `loadUserReservationsSsr` used by home, book detail, my-profile.
- HomeFeaturedHero seeds `initialReservations` → ReserveBookButton Waitlisted first paint.
- Prove: typecheck + lint PASS; commit pending owner.

### Next Action

**Human-Decision:** soft-nav `/` unavailable hero with existing hold → Waitlisted; then commit when asked.

## Reconciliation snapshot (2026-08-13, Waitlisted CTA + cancel dialog UX)

Verified facts:
- ReserveBookButton Waitlisted from `useUserReservations` + book detail SSR reservation seed.
- Pending Cancel Request dialog lifted (snapshot + rich preview); closes only on mutate settle.
- Holds Cancel Hold uses same GLASS_ALERT confirm + spinner until settle.
- Prove: typecheck + lint PASS; commit pending owner.

### Next Action

**Human-Decision:** soft-nav Waitlisted remount, Cancel Request stays through toast, Cancel Hold confirm; then commit when asked.

## Reconciliation snapshot (2026-08-13, pending self-cancel + Holds ISBN)

Verified facts:
- Owner `cancelOwnBorrowRecord` + `cancelPendingBorrowRequest`; `useCancelPendingBorrow` densify CANCELLED.
- Pending card glass Cancel + AlertDialog; Holds ISBN last-4 from SSR/API.
- Prove: typecheck + lint + focused tests PASS; commit pending owner.

### Next Action

**Human-Decision:** soft-nav pending cancel + Holds ISBN; then Borrow Queue polish or commit when asked.

## Reconciliation snapshot (2026-08-13, Holds tab Pending-Requests DNA polish)

Verified facts:
- Tab/section titles Active Holds / Active holds; SSR reservation meta matches /api/reservations/me.
- ReservationsPanel cards use profile-borrow-row + glass badge/CTAs + status strip.
- Prove: typecheck + lint PASS; commit pending owner.

### Next Action

**Human-Decision:** soft-nav `?tab=holds` vs Pending DNA; then Borrow Queue list/detail polish or commit when asked.

## Reconciliation snapshot (2026-08-13, Agile V resume → UI polish)

Verified facts:
- No PENDING checkpoint; resume from densify consistency closeout Human-Decision.
- HEAD `4f7953e` == origin/main; large uncommitted WIP (Borrow Queue DataTable+detail, Holds, densify closeout).
- Owner intent: UI polish on Borrow Queue list, borrow detail, profile Holds — plan only; no coding until approve.
- Densify closeout Prove previously PASS; Gate 2 still EvalGate-blocked.

### Next Action

**Human-Decision:** approve scoped 3-page UI polish plan (or amend with screenshots), then synthesize.

## Reconciliation snapshot (2026-08-13, densify consistency closeout)

Verified facts:
- Borrow Queue single universe RQ + SSR stamp; claim densify passes requestMeta.
- Ticket/review/nav SSR stamps; ticket.write RSC includes User 360 paths.
- PrefetchLink review/ticket detail + Activity Entity; recs Refresh keeps prior featured.
- Prove: typecheck + lint + 25 focused densify/invalidation tests PASS; commit pending owner.

### Next Action

**Human-Decision:** soft-nav claim→queue, ticket→User 360, review/ticket PrefetchLink, Automation Refresh featured; commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow Queue deferred densify closeout)

Verified facts:
- List+detail SSR `currentAdmin`; approve/return pass `decisionActor` (no actor-card flash).
- Detail object SSR + `initialDataUpdatedAt`; `loadBorrowRequestById` single-auth page/API path.
- Locked Active Holds KPI=0; shared `countActiveHolds` + parent `holdsClock` for KPI+panel.
- Prove: typecheck + lint + activeHolds/patchBorrowCaches/borrowStats tests PASS; commit pending owner.

### Next Action

**Human-Decision:** soft-nav approve/return actors + Holds KPI lockstep; commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow Queue densify gap fix)

Verified facts:
- requestDetail snapshot/restore on approve/reject/return onError.
- Approve/return densify borrowedBy/returnedBy + actors; renewalCount on detail.
- PrefetchLink View Details; densify unit tests PASS.
- Prove: typecheck + lint + patchBorrowCaches tests PASS; commit pending owner.

### Next Action

**Human-Decision:** soft-nav Borrow Queue detail lifecycle + commit when asked.

## Reconciliation snapshot (2026-08-13, Borrow Queue polish)

Verified facts:
- Borrow Queue = one DataTable; KPIs In queue / Awaiting approval / On loan / Returned / Soft-cancelled.
- Detail `/admin/book-requests/[id]` + densify `borrows.requestDetail`; PrefetchLink warm.
- Profile Holds tab + Active Holds KPI; reservations moved out of above-tabs panel.
- Prove: typecheck + lint + focused tests PASS; commit pending owner.

### Next Action

**Human-Decision:** soft-nav Borrow Queue + detail + profile Holds; commit when asked. Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-12, Densify actor resolver consistency)

Verified facts:
- Book Reviews list/detail use `resolveDecisionActor` (same helper as Users/Admin Requests/Sign-up/User 360).
- All Users + Admin Requests SSR `currentAdmin`; no JWT universityCard.
- Prove: typecheck + lint + resolver tests PASS; committing to main.

### Next Action

**Human-Decision:** soft-nav Approve/Make Admin + moderate review Approver card; Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-12, All Users / list densify actor card)

Verified facts:
- `resolveDecisionActor` prefers SSR `currentAdmin` card; session fallback null card.
- All Users + Admin Requests SSR `currentAdmin`; list mutates pass `decisionActor`.
- Prove: typecheck + lint + resolver tests PASS.

### Next Action

**Human-Decision:** soft-nav All Users Approve/Make Admin (no Robohash); commit when asked.

## Reconciliation snapshot (2026-08-12, Agile V resume)

Verified facts:
- WT clean except untracked `agile_v_skills/` (excluded from product).
- Implementation tip `33e4853` on `main`; HEAD `88689dd` (docs tip-bind/sync after `33e4853`).
- No PENDING checkpoint; C2 Gate 2 blocked (`eval_gate_status: FAIL`).
- Prior deferred: All Users list session `universityCard: null` (Robohash possible from list signup).
- Halt: owner message had no product request after resume block (Principle 6 / Halt Conditions).

### Next Action

**Human-Decision:** supply the next product/bug/scope request (or choose soft-nav smoke / All Users card gap / EvalGate evidence path).

## Reconciliation snapshot (2026-08-11, Fix densify actor Robohash flash)

Verified facts:
- `AuthorizedActor.universityCard` from DB; promote/demote densify returns real card (not null).
- Make Admin merges SSR `decisionActor` card; typecheck + lint + auth tests PASS.
- User 360 table polish (Reviews links/widths, DecisionActor, Borrowing/Reservations) included in same WT commit.

### Next Action

**Human-Decision:** soft-nav Make Admin on User 360 (no Robohash); Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-11, User 360 Reviews links + Borrowing-width parity)

Verified facts:
- Reviews title → `/books/[id]`; sky “View review detail” → `/admin/book-reviews/[id]`.
- Col budgets Book 44% / Rating 12% / Status 44%; Status `overflow-hidden`. Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav User 360 Reviews links+widths; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 Reviews Decision & Actor Status)

Verified facts:
- `getAdminUserProfile` reviewHistory joins moderator (`reviewedBy`/`reviewedAt` + reviewer person).
- User 360 Reviews Status: PENDING badge+Submitted datetime; decided `DecisionActorStack` + `ReviewStatusBadge`.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav User 360 Reviews Status; commit when asked.

## Reconciliation snapshot (2026-08-11, Review Decision & Actor + Renewals clip)

Verified facts:
- Book reviews list: Decision & Actor via `DecisionActorStack` + `ReviewStatusBadge`; `DecisionDateMeta` nowrap.
- Review detail Status KPI/About: PENDING badge+Submitted; decided DecisionActorStack.
- User 360 Borrowing Renewals `w-[12%]` (Book 44% / Fine 10%). Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav book-reviews Decision & Actor + User 360 Renewals; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 table-fixed truncate + middle align)

Verified facts:
- `USER_360_TABLE` = `table-fixed`; Borrowing 46/34/12/8; Book `overflow-hidden` truncate; `align-middle`.
- Reservations: badge → medium-date Requested; Book 58% / Status 42%; no card bleed.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav smoke truncate + middle align on 14"; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 one-line status dates)

Verified facts:
- DateLine / Reviews Created / Reservations Requested: `whitespace-nowrap` + Status `w-0` content width.
- Book truncates first; `USER_360_TABLE_SCROLL` phone-only unchanged. Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav smoke one-line dates on 14"; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 no laptop table x-scroll)

Verified facts:
- `USER_360_TABLE_SCROLL` = `max-sm:overflow-x-auto` on User 360 tables; laptop no x-scroll.
- Borrowing fluid 55/30/10/5 (no table-fixed); DateLine wrap; Reservations Requested above badge + content Status.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav smoke 14" Borrowing/Reservations; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 column layout + section counters)

Verified facts:
- Borrowing col budget: Book 38% / Status 34% / Fine w-20 / Renewals w-16; Reviews Rating w-16.
- Reservations: Book|Status only; `ReservationStatusBadge` + Requested under badge; no Dates column.
- Section titles `Name (n)` — Borrowing `pagination.total`; Reservations/Activity RQ length; Reviews/Tickets SSR length. Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav smoke column spacing + counters; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 table layout + reservations data)

Verified facts:
- Borrowing: nowrap lifecycle dates; book col budget; Renewals `text-right`; `AdminBookIdentityCell` truncate/`min-w-0`.
- Reservations: `getAdminUserReservations` + `/api/reservations/me` return cover/author/genre/rating/`createdAt`; densify `mergeReservationRow` skips undefined.
- Reviews: Status + Created stack (no Created column). Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav smoke Borrowing/Reservations/Reviews after mount refetch; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 tables polish)

Verified facts:
- Shared `AdminBookIdentityCell` + `BorrowLifecycleDates`; Borrowing drops Due; Reviews star rating tone; Reservations 3-col table.
- Activity FIFO-25 on User 360 (`USER_ACTIVITY_CACHE_RETENTION` + SSR/API limits); global Activity History remains FIFO-50.
- Prove: typecheck + lint + patchActivityCaches tests PASS.

### Next Action

**Human-Decision:** soft-nav smoke User 360 borrow/review/reservation/activity; commit when asked.

## Reconciliation snapshot (2026-08-11, privilege DecisionActor + request prefill)

Verified facts:
- User 360 privilege history: 2-col Decision & Actor | Reason via `DecisionActorStack` + pending `TicketDateMeta` Requested.
- `DEFAULT_ADMIN_REQUEST_REASON` seeds `/make-admin` textarea; schema unit test PASS.
- Prove: typecheck + lint + adminRequestEmails tests PASS.

### Next Action

**Human-Decision:** soft-nav smoke privilege 2-col + make-admin prefill; commit when asked.

## Reconciliation snapshot (2026-08-11, field-label icon align)

Verified facts:
- `lib/ui/fieldLabelStyles`: FIELD_LABEL_TEXT + FIELD_LABEL_ROW (`leading-none` / `inline-flex items-center`); no `pt-`.
- Applicant Details + review/ticket micro-labels wired; icon `shrink-0`.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** visual smoke Applicant icon+text midline; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 status KPI densify)

Verified facts:
- `AdminUser360StatusKpiRow`: Reg + Privilege badges via `useSignupRequestDetail` / `useAdminUserDetail` (same keys as header/panels); Fine/Overdue SSR props.
- No new densify registry; TanStack key dedupe; borrow-health row stays SSR.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav smoke Approve/Reject + Make Admin on KPI badges; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 layout redesign)

Verified facts:
- Two `DetailKpiShell` 4-up rows (Reg/Privilege/Fine/Overdue + Current/Pending/Returned/On-time); avg loan in Borrowing subtitle.
- Signup/privilege Approved·Rejected counts in card subtitles; Applicant fields ‖ university card; body rows A–E `lg:grid-cols-2`, tickets full width.
- Split `AdminUserApplicantPanel` / `AdminUserSignupTimelinePanel`; no densify/Insights invent changes.
- Prove: typecheck + lint PASS.

### Next Action

**Human-Decision:** soft-nav smoke KPI rows + Timeline‖Privilege; commit when asked.

## Reconciliation snapshot (2026-08-11, User 360 detail UI polish)

Verified facts:
- Header: `UserRoleBadge` + ticket-style Back labels; University ID removed from header.
- Cards: `TicketSectionHeader` Title Case + Lucide; Applicant parties micro-labels + `CopyableText`/`UserRoleBadge`.
- Tables: `USER_360_TH`; privilege `AdminPrivilegeBadge`; centered `AdminDetailEmptyState`.
- Prove: typecheck + lint PASS. No densify/Insights invent changes.

### Next Action

**Human-Decision:** visual smoke User 360; owner may request further UI tweaks. Commit when asked.

## Reconciliation snapshot (2026-08-11, resume)

Verified facts:
- HEAD `a90ccb3` == `origin/main`; tip `a905b6f` User 360 densify; WT clean except untracked `agile_v_skills/`.
- Prior Next Action: soft-nav smoke + User 360 detail UI polish.
- This message named no new product ask beyond Agile V resume — halt for Human-Decision.
- EvalGate FAIL still blocks C2 Gate 2; do not open Gate 2.

### Next Action

**Human-Decision:** confirm next scope before any plan approval / coding:
1. User 360 detail UI polish only (densify already shipped; Insights SSR-only), or
2. Soft-nav densify smoke first then polish plan, or
3. Other (owner names exact ask).

## Reconciliation snapshot (2026-08-11, User 360 densify ship)

Verified facts:
- Unified User 360 shell (directory/registration/privilege); privilege history + reservations + activity densify; Insights SSR-only.
- `prefetchAdminUser360Caches` + `activityHistoryForUserWhere` + `seedFromSsrIfEmpty` gap fix.
- Prove: typecheck/lint prior PASS; targeted densify unit tests PASS (20).

### Next Action

**Human-Decision:** soft-nav smoke + detail UI polish tomorrow. Gate 2 still EvalGate-blocked.

## Reconciliation snapshot (2026-08-11, User 360 densify gap fix)

Verified facts:
- `prefetchAdminUser360Caches` shared warm (detail/privilege/reservations/activity); signup + directory + privilege PrefetchLink parity.
- `activityHistoryForUserWhere` (actor | entity user | details.userId) shared by SSR profile + slim loader.
- `seedFromSsrIfEmpty` on privilege history + user activity hooks.
- Prove: typecheck + lint + 17 targeted unit tests PASS.

### Next Action

**Human-Decision:** soft-nav smoke registration entry warm + activity densify survive refetch. Commit when owner asks.

## Reconciliation snapshot (2026-08-11, User 360 Activity + Reservations densify)

Verified facts:
- Reservations panel → `circulation.userReservations` RQ (`AdminUserReservationsPanel` + `getAdminUserReservations`).
- Activity panel → `activityLog.user` / `user-activity-history` + `densifyActivityLog` subject prepend (`details.userId` | entity user).
- Explainable insights stay SSR (no invent densify of formula aggregates).
- PrefetchLink warms reservations + user activity on User 360 / privilege entry.
- Prove: typecheck + lint + activity densify/invalidation unit tests PASS.

### Next Action

**Human-Decision:** soft-nav smoke User 360 reservations/activity densify after mutation. Commit when owner asks.

## Reconciliation snapshot (2026-08-11, privilege history densify)

Verified facts:
- `users.adminPrivilegeHistory` + `AdminUserPrivilegePanel` RQ (SSR seed); densify/optimistic on admin-request.write.
- PrefetchLink privilege entry warms history; DOMAIN_KEYS users includes root.
- Prove: typecheck + lint + densify/optimistic/invalidation unit tests PASS.

### Next Action

**Human-Decision:** soft-nav smoke Approve/Decline on User 360 — table + banner densify with KPI. Commit when owner asks.

## Reconciliation snapshot (2026-08-11, User 360 signup vs privilege clarity)

Verified facts:
- Signup KPIs renamed (Registration status / Signup approvals|rejections / Signup decision timeline); Registered moved into Applicant details.
- Admin privilege KPI + `AdminPrivilegeBadge`; `latestAdminRequestStatus` SSR + densify/optimistic with `pendingAdminRequestId`.
- Privilege card: **Admin privilege requests**; short header-actions hint; domains not merged.
- PrefetchLink privilege entry warms `users.detail`; Prove type/lint + optimistic/privilege unit tests PASS.

### Next Action

**Human-Decision:** soft-nav smoke labels + Admin privilege KPI densify. Commit when owner asks. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-11, queue counts + privilege → User 360)

Verified facts:
- Registration / Admin Requests toolbars: no misleading `(pending+recent)` counts.
- `pendingAdminRequestId` on users list SSR/API + `users.detail`; densify via `patchUsersPendingAdminRequestId`.
- Users kebab + User 360 header: **Approve Admin / Decline** when PENDING make-admin; else **Make Admin** (direct grant); signup stays Approve Student / Reject.
- `/admin/admin-requests/[id]` → `AdminUser360Shell` `entry="privilege"`; deleted `AdminRequestDetailClient`.
- Prove: typecheck + lint 0 PASS.

### Next Action

**Human-Decision:** superseded by User 360 label clarity snapshot.

## Reconciliation snapshot (2026-08-10, Agile V resume)

Verified facts:
- Protocol: `docs/AGILE_V_PROTOCOL.md`; HEAD `a15cf85` == `origin/main`; tip feature `4f258de`.
- No PENDING interrupt in `CHECKPOINTS.md` for this work; EvalGate still FAIL (Gate 2 blocked).
- Working tree: unified User 360 (`AdminUser360Shell` + `AdminUserRegistrationPanel`; both detail routes; ledger in `getAdminUserProfile`; inline header actions; deleted `SignupRequestDetailClient`). Docs partially updated (STATE/TRACE/CLAUDE/WALKTHROUGH).
- Owner: UI polish deferred (“guide later”); prior audit PASS (type/lint/216 densify paths OK).
- Exclude from commit: `agile_v_skills/` (untracked).

### Next Action

**Human-Decision:** superseded by 2026-08-11 privilege→360 snapshot.

## Reconciliation snapshot (2026-08-10, unify User 360 shell)

Verified facts:
- Shared `AdminUser360Shell` on `/admin/users/[id]` + `/admin/account-requests/[userId]` (`entry` Back).
- `getAdminUserProfile` + `loadSignupDecisionEntries`; `AdminUserRegistrationPanel` densifies via `signupRequestDetail`.
- Inline header actions (no kebab); dropped single-stamp Registration card + cross-detail hops.
- Prove: typecheck + lint 0 + **216** unit tests PASS.

### Next Action

**Human-Decision:** superseded by Agile V resume snapshot.

## Reconciliation snapshot (2026-08-10, Decision & Actor + DecisionActorStack)

Verified facts:
- Dropped duplicate Decision/Status on Recent tables; header **Decision & Actor**.
- Shared `DecisionActorStack` + `decisionActorByTone`; signup/admin badge PrefetchLink to detail; Applicant Requested meta on admin Recent.
- FIFO-50 + client period filter; Users Status densify via `statusReviewed*` join (password excluded from `getAllUsers` projection).
- Security review PASS; type/lint + **216** unit tests PASS.

### Next Action

**Human-Decision:** soft-nav smoke Recent queues + Users Status after pull. Do **not** open C2 Gate 2 until EvalGate PASS or WAIVER.

## Reconciliation snapshot (2026-08-10, admin people table UI polish)

Verified facts:
- Shared: `UserRoleBadge`, `CopyableText`, `TicketDateMeta` createdLabel/hideUpdated.
- Users list: PersonAttribution + Joined meta; glass role; Status actor via SSR/API join + densify; column sizes; no outer overflow-hidden.
- Registration/Admin Requests: identity merge, glass decisions, sizes, Requested/Registered under stack.
- Local Prove: typecheck + lint 0 + **213** unit tests PASS.

### Next Action

**Human-Decision:** superseded by Decision & Actor snapshot.

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
- **Perf/UX**: `NotificationBell` SSR-seeds list+unread+total via `getNotificationShellForUser()` from shared `Header.tsx` (root + admin) — badge + dropdown paint on first open with no skeleton flash; densify keeps `totalCount`/`unreadCount` coherent.
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
