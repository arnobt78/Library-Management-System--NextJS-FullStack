# Risk Register (Append Only)

| Risk ID | Cycle | Category | Description | Likelihood | Impact | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| RISK-0001 | C1 | Process | Existing behavior predates formal requirements and may not reflect current stakeholder intent | High | High | Critical | Keep baseline draft; complete Gate 0 and Gate 1 before new synthesis | Project Owner | Open |
| RISK-0002 | C1 | Security | Authentication, roles, file upload, and admin APIs process restricted data and privileged actions | Medium | High | High | Threat model and logic validation; classify related changes R2+ | Security Reviewer | Open |
| RISK-0003 | C1 | Technical | Automated test command and traceable test baseline are not evident in package scripts | High | Medium | High | Define requirement-derived test specification before synthesis; add tooling only after approval | Technical Lead | Open |
| RISK-0004 | C1 | Technical | External services can fail, rate-limit, or drift independently | Medium | High | High | Define timeouts, fallback behavior, monitoring, and provider-specific verification | Technical Lead | Open |
| RISK-0005 | C1 | Process | README claims and implementation may drift | Medium | Medium | Medium | Validate claims during Stage 2 and maintain requirement-to-artifact mapping | Documentation Owner | Open |
| RISK-0006 | C1 | Process | Uncommitted docs/LICENSE/README/.env.example changes sit outside approved C1 synthesis | Medium | Medium | Medium | Catalog as drift; decide at Gate 0 whether in-scope documentation, deferred CR, or discard before Gate 1 | Project Owner | Open |
| RISK-0007 | C1 | Security | Current lockfile reports 31 advisories, including 2 critical and 12 high findings in Auth.js, Next.js, ImageKit/transitive, workflow, and build-tool chains | High | High | Critical | Upgrade or replace affected chains; require clean-install npm audit with zero findings | Technical Lead | Open |
| RISK-0008 | C1 | Technical | `next.config.ts` suppresses TypeScript and ESLint build failures, and the lint script uses removed `next lint` behavior | High | High | Critical | Remove suppression, migrate to ESLint CLI/flat config, and enforce zero-warning type/lint/build gates | Technical Lead | Open |
| RISK-0009 | C1 | Technical | Dependencies are not installed in the current workspace, so baseline execution cannot yet be compared with the upgraded build | High | Medium | High | Perform a clean reproducible install after gate approval and use lockfile/source evidence as pre-install baseline | Technical Lead | Open |
| RISK-0010 | C1 | Technical | Broad duplicated query invalidation can create stale inactive views or refetch storms; cross-tab and cross-user delivery are distinct guarantees | Medium | High | High | Centralize typed query keys and mutation-specific invalidation; define browser-tab propagation separately from server cache coherence | Technical Lead | Open |
| RISK-0011 | C1 | Security | Legacy ImageKit SDK transitively pins an advised UUID line and permits vulnerable Axios resolutions | High | High | Critical | Migrate server and React integrations to current official ImageKit SDKs and verify upload/auth flows | Security Reviewer | Open |
| RISK-0012 | C1 | Security | Client-invoked privileged server actions trust browser actor/reviewer IDs or omit current database role/ownership checks; lifecycle writes can partially update related rows | High | High | Critical | REQ-0025, CAPA-0001, deny commit/release until transactional authorization tests pass | Technical Lead / Security Reviewer | Open - release blocked |

## C1 Mitigation Review - 2026-08-01

| Risk ID | Evidence | Residual status |
|---|---|---|
| RISK-0003 | Vitest command and traceable invalidation contract suite added | Mitigated; independent verification pending |
| RISK-0007 | Clean install and `npm audit --audit-level=low` report zero advisories | Mitigated; independent verification pending |
| RISK-0008 | Build suppressions removed; typecheck, zero-warning ESLint, and production build pass | Mitigated; independent verification pending |
| RISK-0009 | Reproducible lockfile install and resolved-tree checks pass | Mitigated; independent verification pending |
| RISK-0010 | Typed query keys, mutation-specific invalidation, and cross-tab active-query refetch implemented | Mitigated within documented browser scope; independent verification pending |
| RISK-0011 | Current ImageKit SDK migration and zero-advisory audit pass | Mitigated; independent verification pending |
| RISK-0012 | Source boundary audit | Open; release blocked |
| RISK-0012 | Central current-DB authorization, owner policy, server-derived audit fields, row-locked atomic actions, and real PostgreSQL race/rollback tests pass implementing-agent Prove | Mitigation implemented; independent re-verification pending |
| RISK-0012 | VER-C1-039-045 and full regression Verify PASS; CAPA-0001 effectiveness confirmed | Mitigated; monitor through regression and periodic revalidation |
