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

## C2 Risks

| Risk ID | Cycle | Category | Description | Likelihood | Impact | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| RISK-0013 | C2 | Security | Fast SHA-256 credential hashing increases offline password-cracking exposure | Medium | High | Critical | Versioned memory-hard KDF, rehash-on-login, parameter policy, auth regression and rollback tests | Security Reviewer | Open; blocks SaaS-ready claim |
| RISK-0014 | C2 | Security/Privacy | Public diagnostics disclose operational configuration, topology, identities or raw errors | High | High | Critical | Minimal public health envelope; admin-only detail; safe error mapper; response headers and disclosure tests | Security Reviewer | Open; blocks SaaS-ready claim |
| RISK-0015 | C2 | Technical | Infinite-stale client data can remain old after out-of-band/cross-device writes because browser broadcasts are local | Medium | High | High | Define convergence SLA; authenticated events or bounded reconciliation; reconnect/focus strategy; event tests | Technical Lead | Open |
| RISK-0016 | C2 | Performance | Broad speculative prefetch, duplicate SSR/client hydration, or oversized realtime invalidation can increase latency and cost | Medium | High | High | Measure routes; bounded intent prefetch; single fetch owner; domain-only events; request-count and Web Vital budgets | Technical Lead | Open |
| RISK-0017 | C2 | Privacy/Cost | External AI may leak personal borrowing data, hallucinate decisions, or create uncontrolled cost/latency | Medium | High | High | Aggregate deterministic insights first; opt-in provider; redaction; schema validation; budgets; non-authoritative labels | Product Owner / Security Reviewer | Open |
| RISK-0018 | C2 | Scope | Copied commerce domains and simultaneous feature expansion could create redundant models and an untestable release | High | High | Critical | Exclude unrelated domains; slice library workflows; Gate 1 approves only bounded stories | Project Owner | Mitigating at Gate 0 |
| RISK-0019 | C2 | Operations | Passing local build/tests does not prove production backups, recovery, bot controls, monitoring or capacity | High | High | Critical | SLOs, preview smoke, load test, alert injection, migration rollback and recent restore evidence before Gate 2 | Release Approver | Open; blocks SaaS-ready claim |

## C2 Gate 0 / Logic Review - 2026-08-01

| Risk ID | Evidence | Residual status |
|---|---|---|
| RISK-0013 | REQ-0026 defines versioned memory-hard parameters, atomic rehash and negative authentication tests | Open until synthesis and independent verification |
| RISK-0014 | REQ-0026 separates minimal public liveness from authenticated diagnostics and defines header/error tests | Open until synthesis and independent verification |
| RISK-0015 | REQ-0027 defines browser/tab plus focus/reconnect convergence and explicitly excludes cross-session push | Accepted C2 boundary; monitor future multi-device demand |
| RISK-0016 | REQ-0027/0028 define one mutation call, stale-response ordering, zero duplicate hydration GETs and measured prefetch | Open until measured Prove/Verify |
| RISK-0017 | REQ-0031 excludes external LLM processing from C2 | Mitigated for C2; future LLM CR requires renewed privacy review |
| RISK-0018 | REQ-0030 and Gate 0 decisions exclude commerce, barcode and cross-session scope | Mitigated at C2 scope level |
| RISK-0019 | REQ-0032 defines initial SLO, alert, RPO/RTO and recent restore evidence | Open; blocks Gate 2 until production evidence exists |

## C2 Corrective Risk Review - 2026-08-02

- Reservation notification loss/duplicate/stale risk is reduced locally by atomic outbox creation, production `SKIP LOCKED` claims, a five-minute dispatch lease with a 10-second provider timeout, concurrency cap, bounded backoff, eight-attempt dead-lettering and provider idempotency. Deployment/provider receipt evidence remains open under RISK-0019.
- RISK-0015 remains an accepted boundary: same-origin tabs plus focus/reconnect are implemented; cross-device realtime is not required or claimed in C2.
- Independent final stress exposed and then verified mitigation of app/database clock skew, non-atomic claim payload reads, elapsed READY cancellation, server-action schema bypass, fixed-window upload limits, unbounded profile query inputs and raw review errors. Ten consecutive 10/10 PostgreSQL runs now pass; RISK-0019 remains the only Gate-2 release blocker.
