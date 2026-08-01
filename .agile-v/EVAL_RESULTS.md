---
eval_run_id: ER-C1-BOOTSTRAP
eval_timestamp: 2026-08-01
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: No synthesis or independent verification has occurred; Gate 2 is blocked.
thresholds:
  critical_failures: 0
  requirement_coverage_percent: 100
---

# Evaluation Results - C1

| Suite | Scope | Result | FT code | Evidence | Notes |
|---|---|---|---|---|---|
| Bootstrap integrity | REQ-0018 process artifacts | PASS | FT-PLAN | JSON/YAML parse, REQ/ATM coverage, skill count, whitespace, and scope checks | 38 files; 18 REQs; 24 skills |
| Product verification | REQ-0001 through REQ-0017 | NOT RUN | FT-PLAN | - | Requires approved requirements, synthesis evidence, and independent verification |

---
eval_run_id: ER-C1-MIGRATION-PROVE
eval_timestamp: 2026-08-01
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: Synthesis and Prove passed, but the required independent verifier has not recorded VER evidence.
thresholds:
  critical_failures: 0
  requirement_coverage_percent: 100
---

## Migration Prove Evaluation

| Suite | Scope | Result | FT code | Evidence | Notes |
|---|---|---|---|---|---|
| Environment contract | REQ-0019 | PASS | - | Key-only comparison and safe-placeholder review | Independent Verify pending |
| Framework and dependency migration | REQ-0020, REQ-0021 | PASS | - | Clean install, resolved tree, tooling checks, zero npm advisories, build | Independent Verify pending |
| Static quality | REQ-0022 | PASS | - | Typecheck, zero-warning ESLint, production build | Independent Verify pending |
| Mutation coherence | REQ-0023 | PASS | - | Six automated query invalidation tests | Independent Verify pending |
| Cleanup and scope | REQ-0024 | PASS | - | Usage, debug/log, dead-code, and git-scope scans | Independent Verify pending |
| Independent verification | REQ-0019 through REQ-0024 | NOT RUN | FT-PLAN | - | Required before EvalGate PASS and Gate 2 |

---
eval_run_id: ER-C1-SECURITY-AUDIT
eval_timestamp: 2026-08-01
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: A critical privileged server-action trust-boundary and transaction-safety gap blocks commit, release, and Gate 2.
thresholds:
  critical_failures: 0
  requirement_coverage_percent: 100
---

## Pre-commit Security Evaluation

| Suite | Scope | Result | FT code | Evidence | Notes |
|---|---|---|---|---|---|
| Privileged server-action boundary | REQ-0025 draft | FAIL | FT-PLAN | RISK-0012; CAPA-0001; source boundary review | Critical; commit/release blocked pending Gate 1 delta |

---
eval_run_id: ER-C1-REQ0025-VERIFY-1
eval_timestamp: 2026-08-01
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: Initial independent verification found two failures and two evidence gaps; corrective re-entry was required.
thresholds:
  critical_failures: 0
  requirement_coverage_percent: 100
---

## REQ-0025 Initial Independent Verification

| VER | TC | Result | FT code | Evidence |
|---|---|---|---|---|
| VER-0025-01 | TC-0039 | FAIL | FT-PLAN | Empty-input checks preceded authorization in five bulk actions |
| VER-0025-02 | TC-0040 | PASS | FT-PLAN | Current database role/status policy and stale-role tests |
| VER-0025-03 | TC-0041 | FAIL | FT-PLAN | Fine and user permission writes lacked authoritative actor attribution |
| VER-0025-04 | TC-0042 | PASS | FT-PLAN | Session-derived borrower and owner/admin return policy |
| VER-0025-05 | TC-0043 | FLAG | FT-PLAN | Row locks present; no executed real-database race evidence |
| VER-0025-06 | TC-0044 | FLAG | FT-PLAN | Borrow rollback unit present; admin-request and hard-delete injection absent |
| VER-0025-07 | TC-0045 | PASS | FT-PLAN | Explicit UUID target and environment-only destructive secret |

Result: PASS 3 / FAIL 2 / FLAG 2. Stage 3 corrective re-entry opened; no waiver.

---
eval_run_id: ER-C1-FINAL-VERIFY
eval_timestamp: 2026-08-01
policy_version_ref: 1.0.0
eval_gate_status: PASS
eval_gate_rationale: Independent verification records all 27 approved test cases PASS with no failures or flags; implementing-agent PostgreSQL provenance is explicitly retained.
thresholds:
  critical_failures: 0
  requirement_coverage_percent: 100
actuals:
  critical_failures: 0
  requirement_coverage_percent: 100
  passed: 27
  failed: 0
  flagged: 0
---

## Final C1 Independent Verification

| VER | TC scope | Result | FT code | Evidence |
|---|---|---|---|---|
| VER-C1-019-021 | TC-0019 through TC-0021 | PASS | FT-PLAN | Environment key, platform-variable and secret-placeholder checks |
| VER-C1-022-025 | TC-0022 through TC-0025 | PASS | FT-PLAN | Exact framework versions, preserved routes, Proxy convention, real Auth.js anonymous/authenticated callback test |
| VER-C1-026-029 | TC-0026 through TC-0029 | PASS | FT-PLAN | Clean install, zero advisories, ImageKit/QStash success/failure contracts, direct dependency review |
| VER-C1-030-032 | TC-0030 through TC-0032 | PASS | FT-PLAN | Strict typecheck, zero-warning ESLint, Next.js 16 production build with 53 generated pages |
| VER-C1-033-037 | TC-0033 through TC-0037 | PASS | FT-PLAN | QueryClient domain recording, optimistic rejection rollback, remount freshness, sub-second two-context propagation and bounded fetch count |
| VER-C1-038 | TC-0038 | PASS | FT-PLAN | Tracked React Query guide matches baseline; debug/diff/scope checks clean |
| VER-C1-039-045 | TC-0039 through TC-0045 | PASS | FT-PLAN | Current-DB authorization, ownership, actor attribution, real PostgreSQL races/rollback, environment-only CLI secret |

PostgreSQL provenance: implementing agent executed the disposable local PostgreSQL suite twice, latest 4/4 PASS. Independent verifier inspected its real `pg.Pool`, concurrent calls, injected triggers and assertions; its own environment lacked `TEST_DATABASE_URL`, so it did not claim a second database execution.

EvalGate: PASS. Human Gate 2 remains a separate acceptance decision.

---
eval_run_id: ER-C2-PROVE-1
eval_timestamp: 2026-08-01
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: Local synthesis Prove passes, but corrective independent verification and mandatory production evidence are incomplete.
thresholds:
  critical_failures: 0
  requirement_coverage_percent: 100
---

## C2 Local Prove

| Suite | Scope | Result | Evidence | Boundary |
|---|---|---|---|---|
| Static/default | REQ-0026 through REQ-0033 | PASS | typecheck; zero-warning lint; 64 tests; audit 0; diff check | Independent Verify required |
| PostgreSQL | REQ-0025, REQ-0030, REQ-0032 | PASS | 7/7 disposable integration; migration forward/down | Provider/production window not exercised |
| Production build/smoke | REQ-0026, REQ-0028, REQ-0032, REQ-0033 | PASS | Next 16.2.12, 54 routes; health/header/auth-boundary probes | Local only |
| Independent verification | TC-0046 through TC-0120 | RUNNING | corrective Red Team run | Required before EvalGate PASS |
| Production evidence | REQ-0027, REQ-0028, REQ-0032, REQ-0033 | NOT COMPLETE | - | Browser/load/deploy/alert/SLO/restore required |

---
eval_run_id: ER-C2-VERIFY-1
eval_timestamp: 2026-08-01
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: Independent verification found six code-contract failures and sixty-nine exact-procedure evidence flags.
---

## C2 Initial Independent Verify

Result: PASS 0 / FAIL 6 / FLAG 69. Failures: TC-0054 tenant-prefix media boundary; TC-0056 incomplete RSC registry; TC-0060 mutation-response ordering; TC-0061 inactive stale rendering; TC-0106 unwired SLO calculator; TC-0120 duplicated media fallback primitive. Build/type/lint/audit and the isolated PostgreSQL 69/69 executable suite passed. Corrective re-entry opened; production/browser/provider/load/restore evidence remains FLAG.

---
eval_run_id: ER-C2-CORRECTIVE-VERIFY-2
eval_timestamp: 2026-08-01
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: All known code failures are resolved, but all 75 exact C2 procedures retain required nonlocal evidence flags.
---

## C2 Corrective Focused Verify

Code result: FAIL 0. TC-0054, TC-0056, TC-0060, TC-0061, TC-0106 and TC-0120 are corrected and focused checks pass. Full strict classification: PASS 0 / FAIL 0 / FLAG 75 because provider/persistence-route/browser/navigation/performance/load/deployment/alert/restore procedures are not complete. EvalGate remains FAIL without waiver.

---
eval_run_id: ER-C2-CORRECTIVE-PROVE-3
eval_timestamp: 2026-08-02
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: Universal registry and outbox code pass local verification; independent and production evidence remains incomplete.
---

## C2 Outbox and Registry Local Prove

| Suite | Result | Evidence | Boundary |
|---|---|---|---|
| Registry/RSC/outbox contracts | PASS | 81/81 default tests | Provider mocked |
| PostgreSQL concurrency/regression | PASS | 8/8 fresh disposable tests | Local PostgreSQL only |
| Static/dependency/build | PASS | typecheck; lint 0 warnings; audit 0; diff check; Next 16.2.12 build | Local environment |
| Independent corrective Verify | PASS | No remaining requested-scope findings; focused 24/24 and PostgreSQL 8/8 PASS | Nonlocal classification unchanged |
| Production evidence | FLAG | No deployed receipt/browser/load/alert/SLO/restore record | Blocks EvalGate/Gate 2 |

---
eval_run_id: ER-C2-CORRECTIVE-VERIFY-4
eval_timestamp: 2026-08-02
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: Independent requested-scope code verification passes; nonlocal production evidence remains incomplete.
---

## C2 Outbox and Registry Independent Verify

Result: PASS for requested code scope. No remaining code findings after two corrective reviews. Focused 24/24 tests, isolated PostgreSQL 8/8, strict typecheck and zero-warning lint pass. Deployed provider/browser/load/alert/SLO/restore evidence remains FLAG, so EvalGate and C2 Gate 2 remain blocked without waiver.

---
eval_run_id: ER-C2-FINAL-CORRECTIVE-5
eval_timestamp: 2026-08-02
policy_version_ref: 1.0.0
eval_gate_status: FAIL
eval_gate_rationale: Final local and independent code verification pass with zero known findings; mandatory deployed provider, browser, load, alert, SLO and restore evidence remains incomplete.
---

## C2 Final Corrective Local and Independent Verify

Result: local technical PASS. Strict TypeScript, zero-warning ESLint, 84 default tests, zero vulnerabilities, secret/diff checks and Next.js 16.2.12 production build with 54 routes pass. Ten PostgreSQL integration cases pass in each of ten consecutive disposable-database stress runs. Independent re-review reports no remaining code findings. Production/browser/provider/operations evidence remains FLAG, so EvalGate remains FAIL and C2 Gate 2 is not started.
