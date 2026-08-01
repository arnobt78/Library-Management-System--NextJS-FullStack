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
- `.env.example`: configuration source; `.agile-v/STATE.md`: workflow resume source.

## Rules

- Preserve SSR `initialData`; invalidate related domains after every successful mutation.
- Active queries refetch; inactive/back-navigation queries remain stale until mount; BroadcastChannel syncs same-origin tabs.
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
- Apply migration `0009_users_audit_fields.sql` before deploying the matching code.
- Full Verify is 27/27 PASS; Gate 2 is approved (`GATE-0004`); accepted implementation is `d9b9fd9`; C1 is archived.
