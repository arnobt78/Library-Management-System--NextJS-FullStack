# Requirements Blueprint - C1 Draft

<!-- Revision: C1-draft.2 | Date: 2026-08-01 | Gate 0: PENDING | Gate 1: NOT STARTED -->

These requirements are an as-built inventory inferred from commit `83e3411`. Status `draft [C1]` means neither stakeholder-approved nor independently validated. Downstream synthesis is prohibited until Logic Gatekeeper validation and Human Gate 1 approval.

## Functional Requirements

### REQ-0001 - Account authentication and authorization

- **Status:** draft [C1]
- **Lineage:** OBS-0001, INS-0001; stakeholder bootstrap directive 2026-08-01
- **Requirement:** The system shall support account registration and sign-in, enforce account status, and restrict privileged operations to authorized roles.
- **Constraints:** Credentials and sessions are restricted data; auth/role changes are R2+.
- **Verification criteria:** Positive and negative authentication tests, pending/rejected account tests, unauthorized API tests, and admin-route authorization tests pass.
- **Done criteria:** Role boundaries documented; secrets absent from code/output; session behavior and error responses verified.

### REQ-0002 - Book discovery and details

- **Status:** draft [C1]
- **Lineage:** OBS-0002
- **Requirement:** Users shall browse the active book catalog and view accurate book details, availability, genres, and discovery results.
- **Constraints:** Empty, unavailable, invalid-ID, and large-catalog cases must be handled.
- **Verification criteria:** Consumer-visible catalog and detail flows return correct states for valid, empty, unavailable, and invalid inputs.
- **Done criteria:** UI and API behavior agree; paging/search/filter behavior is explicitly bounded.

### REQ-0003 - Administrative book and inventory management

- **Status:** draft [C1]
- **Lineage:** OBS-0003, OBS-0004
- **Requirement:** Authorized administrators shall create, update, deactivate, and manage book metadata and copy counts without violating inventory invariants.
- **Constraints:** `0 <= availableCopies <= totalCopies`; schema changes require migrations.
- **Verification criteria:** CRUD, validation, authorization, concurrency, and inventory-boundary tests pass.
- **Done criteria:** Audit actor/timestamps retained; invalid counts rejected; affected views refresh consistently.

### REQ-0004 - Borrow lifecycle

- **Status:** draft [C1]
- **Lineage:** OBS-0004, INS-0002
- **Requirement:** Eligible users shall request books, and authorized administrators shall approve/reject requests and record returns through valid state transitions.
- **Constraints:** Transitions are atomic with inventory updates; duplicate active borrowing and unavailable inventory are rejected.
- **Verification criteria:** End-to-end request, approval, rejection, return, duplicate, unavailable, and concurrent-copy tests pass.
- **Done criteria:** Record status, dates, actors, and copy counts remain consistent after success and failure.

### REQ-0005 - User profile and borrowing history

- **Status:** draft [C1]
- **Lineage:** OBS-0004, OBS-0008
- **Requirement:** Authenticated users shall view their profile, current/pending/returned borrow records, due information, fines, and derived statistics.
- **Constraints:** Users may access only authorized personal records; derived counts must reconcile with source records.
- **Verification criteria:** Authorization, empty state, refresh consistency, and statistic reconciliation tests pass.
- **Done criteria:** Consumer-visible data is accurate after borrow mutations and reloads.

### REQ-0006 - Reviews and ratings

- **Status:** draft [C1]
- **Lineage:** OBS-0005
- **Requirement:** Eligible authenticated users shall create, edit, and delete their own book reviews with ratings from 1 through 5.
- **Constraints:** Eligibility and ownership are enforced server-side; duplicate-review policy must be clarified at Gate 0.
- **Verification criteria:** Eligibility, ownership, range, duplicate, edit, delete, and aggregate-rating tests pass.
- **Done criteria:** Unauthorized mutations are rejected and displayed aggregates reconcile with stored reviews.

### REQ-0007 - Fine configuration and overdue processing

- **Status:** draft [C1]
- **Lineage:** OBS-0004, OBS-0006, INS-0002
- **Requirement:** Authorized administrators shall configure fine policy and run idempotent overdue-fine updates using validated numeric values.
- **Constraints:** Monetary calculations require explicit decimal handling, nonnegative bounds, and time-zone/date rules.
- **Verification criteria:** On-time, overdue, repeated-run, invalid-config, boundary-date, and authorization tests pass.
- **Done criteria:** Repeated automation does not double-charge and results are auditable.

### REQ-0008 - Notifications and onboarding workflows

- **Status:** draft [C1]
- **Lineage:** OBS-0006, OBS-0007, INS-0002
- **Requirement:** The system shall send onboarding, due, overdue, and transaction notifications through approved providers with observable delivery outcomes.
- **Constraints:** No credentials in logs; retry/idempotency/provider-failure behavior must be defined.
- **Verification criteria:** External delivery calls, payloads, fallback/failure paths, deduplication, and authorization are verified.
- **Done criteria:** Delivery—not internal queueing alone—is evidenced; failures are visible and bounded.

### REQ-0009 - Recommendations and trending content

- **Status:** draft [C1]
- **Lineage:** OBS-0002, OBS-0006
- **Requirement:** The system shall provide user-facing recommendations and trending books and allow authorized refresh/generation operations.
- **Constraints:** Results must exclude inactive/ineligible items and tolerate cache misses.
- **Verification criteria:** Deterministic fixture tests cover personalization inputs, empty histories, cache refresh, and invalidation.
- **Done criteria:** Results are bounded, explainable at a rule level, and refreshed without stale UI.

### REQ-0010 - User and admin-request management

- **Status:** draft [C1]
- **Lineage:** OBS-0001, OBS-0003, INS-0001
- **Requirement:** Authorized administrators shall manage user status/roles and approve or reject traceable requests for administrative access.
- **Constraints:** Privilege escalation requires explicit authorization and recorded reviewer identity.
- **Verification criteria:** Request, approval, rejection, replay, self-escalation, unauthorized, and audit-field tests pass.
- **Done criteria:** Role/status mutations are atomic, audited, and immediately enforced.

### REQ-0011 - Administration analytics and export

- **Status:** draft [C1]
- **Lineage:** OBS-0006
- **Requirement:** Authorized administrators shall view consistent operational statistics and export scoped book, user, borrow, and analytics data.
- **Constraints:** Exports require authorization, bounded ranges, safe serialization, and privacy review.
- **Verification criteria:** Metric reconciliation, empty data, range boundaries, CSV typing/escaping, and unauthorized access tests pass.
- **Done criteria:** Dashboard and export values reconcile to the same source rules.

### REQ-0012 - Service health and API documentation

- **Status:** draft [C1]
- **Lineage:** OBS-0007, ASM-0002
- **Requirement:** Operators shall access non-sensitive health indicators, service metrics, and accurate API documentation.
- **Constraints:** Public health responses must not disclose secrets, internal topology, or personal data.
- **Verification criteria:** Healthy/degraded dependency states, redaction, authorization where needed, and doc-to-route contract checks pass.
- **Done criteria:** Status reflects real external outcomes and documented endpoints match implemented contracts.

### REQ-0013 - Media upload

- **Status:** draft [C1]
- **Lineage:** OBS-0007, INS-0001
- **Requirement:** Authorized flows shall upload and reference supported media through ImageKit using server-enforced authentication and validation.
- **Constraints:** File type, size, access, and credential exposure boundaries must be specified.
- **Verification criteria:** Valid upload, invalid type/size, unauthorized signature, provider failure, and stored-reference tests pass.
- **Done criteria:** Private credentials remain server-side and invalid files are rejected.

## Nonfunctional Requirements

### REQ-0014 - Responsive and accessible interface

- **Status:** draft [C1]
- **Lineage:** OBS-0008, ASM-0004
- **Requirement:** Primary public and administrative flows shall remain usable across supported mobile, tablet, and desktop viewports and meet the approved accessibility target.
- **Constraints:** Target browsers, viewport matrix, and WCAG level require human confirmation.
- **Verification criteria:** Keyboard, focus, label, contrast, reduced-motion, overflow, and representative viewport tests pass.
- **Done criteria:** No critical flow requires pointer-only use or horizontal page scrolling at approved widths.

### REQ-0015 - Performance, caching, and rate limiting

- **Status:** draft [C1]
- **Lineage:** OBS-0007, OBS-0008
- **Requirement:** The application shall use bounded data fetching, coherent cache invalidation, and abuse-resistant rate limits while meeting approved performance thresholds.
- **Constraints:** Numeric thresholds and deployment tier limits require stakeholder/operational input.
- **Verification criteria:** Cache hit/miss/invalidation, optimistic update rollback, rate-limit, large-result, and agreed performance tests pass.
- **Done criteria:** No unbounded hot-path query; user-visible state converges after mutations and refresh.

### REQ-0016 - Data integrity and auditability

- **Status:** draft [C1]
- **Lineage:** OBS-0003, OBS-0004, INS-0002
- **Requirement:** Persistent state transitions shall preserve relational and business invariants and retain sufficient actor/time data for investigation.
- **Constraints:** PostgreSQL is authoritative; migrations are versioned; destructive data operations require explicit authorization and rollback planning.
- **Verification criteria:** Transaction rollback, FK/invariant, migration, duplicate, and audit-field tests pass.
- **Done criteria:** Failure cannot leave partial lifecycle state and every privileged mutation has attributable evidence.

### REQ-0017 - Maintainable architecture and secure delivery

- **Status:** draft [C1]
- **Lineage:** OBS-0007, OBS-0008
- **Requirement:** Changes shall preserve the repository's Next.js/TypeScript feature architecture, validate external inputs, avoid hardcoded secrets, and include proportional type, lint, build, security, and regression evidence.
- **Constraints:** JavaScript/TypeScript is the primary domain; deviations require a logged decision.
- **Verification criteria:** Static checks, secret scan, dependency review, build, and requirement-mapped tests meet the task risk level.
- **Done criteria:** Every changed artifact maps to REQ IDs and has a rollback path for R2+ work.

### REQ-0018 - Agile V governance and traceability

- **Status:** draft [C1]
- **Lineage:** OBS-0009; stakeholder bootstrap directive 2026-08-01
- **Requirement:** Project changes shall follow durable Agile V state, REQ-to-artifact-to-test traceability, risk-based evidence, independent verification, and explicit human gates.
- **Constraints:** Append-only records are never rewritten; no synthesis before Gate 1; no release approval without EvalGate PASS or approved WAIVER.
- **Verification criteria:** Artifact audit finds no orphan ART/TC/VER IDs, unresolved pending checkpoint, unapproved stage transition, or Gate 2 without valid eval evidence.
- **Done criteria:** State is resumable from files and each accepted cycle is archived read-only.

### REQ-0019 - Environment configuration documentation

- **Status:** approved [C1]
- **Logic validation:** PASS [C1] - Gate 1 approved (`GATE-0002`)
- **Lineage:** Stakeholder directive 2026-08-01; repository environment-key audit
- **Requirement:** The committed `.env.example` shall document every runtime environment variable used by the application, whether it is required or optional, whether it is public or server-only, the expected format, a safe placeholder, and the official dashboard or command used to obtain it.
- **Constraints:** It shall contain no real credentials, personal data, production host secrets, or copied values from `.env`; obsolete variables shall be identified from executable source rather than README claims.
- **Verification criteria:** A key-only comparison against `.env`, `lib/config.ts`, and executable `process.env` references shows 100% of application-managed keys documented and no secret values; comments identify ImageKit, Upstash Redis/QStash, Brevo, Resend, PostgreSQL, Auth.js, workflow, optional provider-health keys, and application URL setup. Platform-managed `NODE_ENV`, `VERCEL`, and `VERCEL_URL` are documented as non-user-configurable.
- **Done criteria:** A new developer can configure local and production environments without consulting private files, and secret scanning reports no credential material.

### REQ-0020 - Next.js 16 stable migration

- **Status:** approved [C1]
- **Logic validation:** PASS [C1] - Gate 1 approved (`GATE-0002`)
- **Lineage:** Stakeholder directive 2026-08-01; official Next.js 16 migration requirements
- **Requirement:** The application shall run on the current stable Next.js 16 line with compatible React, React DOM, Auth.js, TypeScript, and ESLint versions while preserving existing routes, layouts, styles, authentication, and server/client behavior.
- **Constraints:** Target Next.js `16.2.12` and React/React DOM `19.2.8`, verified current on 2026-08-01; Node.js shall be `>=20.9.0`; `middleware.ts` shall migrate to the Node-runtime `proxy.ts` convention; async request APIs remain awaited; removed `next lint` and `next.config` ESLint options shall be replaced; migration shall not opt into Cache Components without a separate cache-semantics validation.
- **Verification criteria:** Resolved framework versions match the approved targets; all 63 current App Router page/route/layout entry files, including 39 API route files, remain represented; proxy authentication behavior, route type generation, typecheck, zero-warning lint, and production build pass without ignored errors.
- **Done criteria:** No deprecated middleware convention, removed config key, synchronous request API, hydration regression, route loss, or changed visual contract remains.

### REQ-0021 - Compatible dependency modernization

- **Status:** approved [C1]
- **Logic validation:** PASS [C1] - Gate 1 approved (`GATE-0002`)
- **Lineage:** Stakeholder directive 2026-08-01; npm registry compatibility and lockfile audit
- **Requirement:** Direct dependencies shall be upgraded to current stable compatible releases, unused direct dependencies shall be removed, and security-sensitive transitive chains shall be replaced or upgraded without changing supported product behavior.
- **Constraints:** Major upgrades require source and peer-contract validation; `next-auth` must remain on its v5-compatible fixed line rather than downgrade to v4; ImageKit migration must preserve client uploads and server-generated authentication parameters; package-lock remains npm-generated.
- **Verification criteria:** `npm ci` succeeds with no peer-resolution errors; every direct dependency is either at its current stable release or has a documented compatibility exception in the Build Manifest; `next-auth` resolves to `5.0.0-beta.32` or a later fixed v5-compatible release; `npm audit --audit-level=low` reports 0 total vulnerabilities; external integrations pass type/build checks.
- **Done criteria:** Lockfile is reproducible, direct packages are used or justified, and no high/critical/moderate/low npm advisory remains.

### REQ-0022 - Enforced static and production quality gates

- **Status:** approved [C1]
- **Logic validation:** PASS [C1] - Gate 1 approved (`GATE-0002`)
- **Lineage:** Stakeholder directive 2026-08-01; audit of `next.config.ts`, ESLint config, and package scripts
- **Requirement:** TypeScript, ESLint, and Next.js production compilation failures shall block delivery rather than be suppressed.
- **Constraints:** Use ESLint CLI and Next.js 16 flat configuration; retain project-specific Tailwind and image rules only where justified; build and lint are separate explicit gates.
- **Verification criteria:** `npm run typecheck`, `npm run lint`, and `npm run build` each exit 0; lint runs `eslint . --max-warnings 0`; `next.config.ts` has neither `ignoreBuildErrors` nor removed ESLint configuration.
- **Done criteria:** No warning/error waiver is hidden in framework configuration and the scripts expose repeatable `typecheck`, `lint`, and `build` commands.

### REQ-0023 - Immediate coherent mutation visibility

- **Status:** approved [C1]
- **Logic validation:** PASS [C1] - Gate 1 approved (`GATE-0002`)
- **Lineage:** Stakeholder directive 2026-08-01; audit of TanStack Query hooks and centralized invalidation utilities
- **Requirement:** Every successful CRUD or lifecycle mutation shall immediately update the initiating view and invalidate every related TanStack Query key so active views refetch and inactive views fetch fresh data on next render or navigation without a manual refresh.
- **Constraints:** Prefer typed centralized query-key factories and mutation-specific invalidation; optimistic updates require rollback; avoid refetch storms, duplicate invalidations, hydration-sensitive localStorage state, and treating server/Redis cache invalidation as browser push delivery.
- **Verification criteria:** Mutation tests prove the initiating view updates by the next React render through an optimistic/local result or begins an immediate active refetch; related active and inactive query keys are invalidated synchronously before the success handler settles; subsequent navigation uses fresh data; same-origin open tabs receive an invalidation signal within 1 second without persisting business or personal data in localStorage.
- **Done criteria:** Books, borrows, reviews, users, admin requests, fines, recommendations, analytics, health/config, and exports use one consistent invalidation contract with bounded refetch behavior.

### REQ-0024 - Safe cleanup and implementation clarity

- **Status:** approved [C1]
- **Logic validation:** PASS [C1] - Gate 1 approved (`GATE-0002`)
- **Lineage:** Stakeholder directive 2026-08-01; static source audit
- **Requirement:** Migration work shall remove provably unused dependencies, dead/debug-only source, generated debug logs, and obsolete comments while preserving product behavior, data, assets, routes, and user-authored documentation.
- **Constraints:** Existing user changes and unrelated untracked files are protected; no deletion is allowed solely to silence a failing check; retained comments explain non-obvious implementation intent rather than narrating obvious code.
- **Verification criteria:** Dependency-usage scan reports no unused direct dependency without a documented runtime/config justification; debug-marker scan reports no migration-created debug statement or generated log; git-scope review, typecheck, zero-warning lint, and build pass; no unrelated user file is overwritten or removed.
- **Done criteria:** Changed code is strict, reusable where repetition is proven, and no migration-created dead path or debug artifact remains.

### REQ-0025 - Server-action authorization and atomic lifecycle writes

- **Status:** approved [C1 delta]
- **Logic validation:** PASS [C1] - explicit actors, fail-closed authorization, ownership, replay, transaction, and secret-handling criteria are testable; no hardware constraint applies; Gate 1 delta approved (`GATE-0003`)
- **Lineage:** Pre-commit security review 2026-08-01; RISK-0012; CAPA-0001; CR-0001
- **Requirement:** Every browser-invokable server mutation shall derive the actor from the authenticated session, confirm current database role/status or record ownership, reject browser-supplied actor impersonation, and persist multi-record lifecycle/inventory changes atomically.
- **Constraints:** Admin writes require an approved database `ADMIN`; user writes require matching ownership; authorization fails closed; secrets never pass through CLI arguments; duplicate/replayed borrow transitions cannot change inventory twice.
- **Verification criteria:** Unauthenticated, ordinary-user, forged-user-ID, stale-role, cross-user return, replay, concurrent inventory, and transaction-rollback tests pass for book, user, admin-request, borrow and hard-delete actions.
- **Done criteria:** No privileged mutation trusts client identity/role fields; actor audit fields come from the server; partial failures leave no state or inventory drift.

## Open Human Decisions

1. Confirm which current features are intended product requirements versus incidental implementation.
2. Confirm production/compliance classification and named gate authorities.
3. Confirm accessibility/browser/viewport targets.
4. Confirm performance, rate-limit, retention, fine, renewal, and notification thresholds.
5. Confirm review duplication/eligibility policy and borrowing eligibility/limits.
6. Confirm the named Gate 2 approver after independent verification evidence is available.
