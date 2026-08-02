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
- Buttons: ripple baked into `ui/button` (`.btn-ripple`); CTA shine on Borrow/Details/Discover; CSS-var primary hover via `color-mix` (not `@apply …/90`).
