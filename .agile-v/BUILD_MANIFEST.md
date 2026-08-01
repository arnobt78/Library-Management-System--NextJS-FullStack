# Build Manifest - C1

- Status: C1 ACCEPTED AND COMMITTED (`d9b9fd9`)
- Gate 1 prerequisite: MET (`GATE-0002`, `GATE-0003`)
- Scope: REQ-0019 through REQ-0025
- Baseline: `83e341147363015a6ace86f1665d4d6b9e5eb390`
- Commit readiness: READY (`ER-C1-FINAL-VERIFY` PASS; `GATE-0004` approved; final audit PASS)

| ART-ID | REQ | Artifacts | Result / rollback |
|---|---|---|---|
| ART-0001 | REQ-0019 | `.env.example` | Complete configuration/acquisition guide with safe placeholders; rollback file only |
| ART-0002 | REQ-0020, REQ-0021, REQ-0022 | `package.json`, `package-lock.json`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `proxy.ts`, removed `middleware.ts` | Next 16/React 19 migration and enforced checks; rollback manifests/config/proxy together |
| ART-0003 | REQ-0020, REQ-0021 | `auth.ts`, `lib/actions/auth.ts`, ImageKit API/components, validation/form types, `database/seed.ts`, removed `declarations.d.ts` | Compatible SDK/runtime/type migration; rollback as one integration set |
| ART-0004 | REQ-0023 | `lib/query/keys.ts`, `lib/utils/queryInvalidation.ts`, `components/QueryProvider.tsx`, `hooks/useQueries.ts`, `hooks/useMutations.ts`, mutation consumers | Typed domain keys, bounded active refetch, inactive staleness, rollback, and data-free same-origin tab broadcast; rollback together |
| ART-0005 | REQ-0024 | migrated product source and configuration | Removed obsolete dependencies, dead recommendation server actions, debug/PII logs, legacy declarations, and redundant invalidations; preserve pre-existing user documentation/style drift |
| ART-0006 | REQ-0023, REQ-0024 | `lib/utils/queryInvalidation.test.ts` | Six requirement-derived contract tests; test-only rollback |
| ART-0007 | REQ-0025 | `lib/auth/authorization.ts`, `lib/auth/routeAuthorization.ts`, privileged API routes and server actions | Current database role/status and owner/admin policy; rollback as one authorization boundary |
| ART-0008 | REQ-0025 | `lib/admin/borrowLifecycle.ts`, `lib/admin/borrowTransitionPolicy.ts`, borrow/admin-request/bulk actions | Row-locked replay-safe transactions for lifecycle, inventory and role/request state; rollback together |
| ART-0009 | REQ-0025 | `lib/actionInputs.ts`, `lib/admin/deleteBookCli.ts`, `scripts/delete-book.ts`, mutation consumers | Runtime input allowlists, server-derived audit actors, explicit target and environment-only destructive secret |
| ART-0010 | REQ-0022, REQ-0025 | security Vitest files including authorization, transition, rollback, CLI, pagination, invalidation and disposable-PostgreSQL contracts; `vitest.config.mts` | Security and regression contracts; test-only rollback |
| ART-0011 | REQ-0025 | `database/schema.ts`, `migrations/0009_users_audit_fields.sql`, user/admin/fine actions | Server-derived audit attribution for privileged role/status/fine writes; apply migration before deploying code, rollback columns only after reverting code |
| ART-0012 | REQ-0020, REQ-0021, REQ-0023, REQ-0024 | `lib/auth/proxyAuthorization.ts`, Auth.js authorized callback, proxy/SDK/mutation/invalidation tests, restored `REACT_QUERY_SETUP_GUIDE.md` | Executable proxy decisions, provider success/failure, optimistic rollback, remount/cross-tab timing and bounded refetch; 40 default tests total |

## Direct dependency exceptions

| Package | Resolution | Justification |
|---|---|---|
| `next-auth` | `5.0.0-beta.32` | Existing application uses the Auth.js v5 API; npm's `latest` tag is v4 and would be a functional downgrade |
| `tailwindcss` | `3.4.19` | Tailwind 4 requires a separate CSS/config visual-contract migration; retaining v3 prevents unapproved layout/style changes |
| `eslint-plugin-tailwindcss` | `3.18.3` | Matches the retained Tailwind 3 configuration; v4 belongs to the separate Tailwind 4 migration |
| `eslint` | `9.39.5` | Supported by the current Next flat-config/plugin chain; ESLint 10 is deferred until the complete plugin chain declares compatibility |
| `typescript` | `5.9.3` | Current stable framework-compatible compiler line; TypeScript 7 is deferred pending Next/plugin support validation |
| `esbuild` | `0.28.1` | Directly pins the transitive Drizzle tooling chain to the audited release through npm overrides |
| `postcss` | `8.5.25` | Used by `postcss.config.mjs` and pins the audited build chain through npm overrides |
| `prettier` | `3.9.6` | Required peer/runtime for `eslint-config-prettier` and local formatting compatibility |

`depcheck` reported no unused production dependency. Its four development findings were configuration/override dependencies documented above; unused `autoprefixer` was removed.

## C2 synthesis manifest

- Status: implementation Prove PASS; independent corrective Verify and production evidence pending
- Gate 1 prerequisite: MET (`GATE-0006`)
- Baseline: `c94e7db`

| ART-ID | REQ | Artifacts | Result / rollback |
|---|---|---|---|
| ART-0013 | REQ-0026 | password/auth, media/status boundaries, security tests, `next.config.ts` | Versioned scrypt, legacy rehash, safe diagnostics, strict media persistence and headers; rollback as security set |
| ART-0014 | REQ-0027 | typed query registry/keys, invalidation generation/dedupe, provider/hooks/consumers | Browser-domain coherence with bounded focus/reconnect and same-origin tab invalidation |
| ART-0015 | REQ-0028, REQ-0033 | server page/client splits, Suspense slots, utility navigation, mobile focus trap, reduced-motion/media fallback | Server-first/accessibility synthesis; measured browser evidence pending |
| ART-0016 | REQ-0029 | `lib/admin/userProfile.ts`, `/admin/users/[id]`, linked users | Authorized paginated user 360 with consistent KPI formulas |
| ART-0017 | REQ-0030 | reservation schema/actions/components, migration/down, command ledger, PostgreSQL tests | FIFO outbox/renewal lifecycle and replay-safe renewal; apply migration before code |
| ART-0018 | REQ-0031 | deterministic insight DTO/formulas/actions/API/UI/tests | One bounded aggregate snapshot with versioned explainable formulas |
| ART-0019 | REQ-0032 | bounded telemetry sink, SLO calculator/tests, status controls | PostgreSQL events and exact local SLO calculations; operational evidence remains required |
| ART-0020 | REQ-0026 through REQ-0033 | C2 unit/contract/integration specifications and suites | 84 default tests plus 10 disposable-PostgreSQL tests locally PASS |
| ART-0021 | REQ-0027 | universal mutation consumers, server actions/routes, `queryInvalidation.ts`, `revalidateMutation.ts` | One typed registry drives client domains and RSC paths for all ten mutation families |
| ART-0022 | REQ-0030, REQ-0032 | outbox worker/scheduler/cron, schema/migration, idempotent Resend boundary, environment guide | Retry-safe immediate delivery plus secured scheduled recovery; deployed receipt pending |
| ART-0023 | REQ-0026 through REQ-0030 | registry, provider, cron, worker, boundary-validation and PostgreSQL concurrency tests | 84 default tests and 10/10 disposable-PostgreSQL tests across 10 stress runs PASS on 2026-08-02 |
