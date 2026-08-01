# CAPA Log (Append Only)

CAPA is triggered by a critical finding, recurring nonconformity, unexplained regression failure, or three failed rework attempts. Current entries follow.

## CAPA-0001 - Privileged server-action trust boundary

- Cycle: C1
- Trigger: Critical pre-commit security finding RISK-0012
- Nonconformity: Browser-invokable mutations can reach privileged or cross-user writes without authoritative database actor checks; related writes are not uniformly transactional.
- Root cause: Page-level authorization and client-provided actor fields were treated as sufficient server-action authorization.
- Corrective action: Implement approved REQ-0025 across exposed write actions and destructive scripts.
- Preventive action: Central authorization guard, transaction pattern, and negative/concurrency contract suite.
- Effectiveness verification: TC-0039 through TC-0045 plus regression suite and independent verifier.
- Status: open
- Owner: Technical Lead / Security Reviewer

### CAPA-0001 effectiveness attempts

- Attempt 1: Independent Verify returned PASS 3 / FAIL 2 / FLAG 2 for auth-before-validation, actor attribution, and realistic transaction evidence.
- Rework: Moved authorization ahead of domain validation; added user audit migration, admin-attributed fine transactions, and disposable PostgreSQL race/rollback tests.
- Re-Prove: 24 default tests and 4/4 real PostgreSQL tests pass; typecheck, zero-warning lint, zero-advisory audit, and production build pass.
- Status: effectiveness re-verification pending; CAPA remains open until independent PASS.

- Full-scope attempt: PASS 19 / FAIL 1 / FLAG 7 exposed documentation preservation and evidence completeness gaps outside the original security delta.
- Full-scope rework: Restored the tracked guide and added proxy, provider, mutation rollback, remount, cross-context timing, and bounded-refetch tests.
- Full-scope re-Prove: 40 default tests and 4/4 PostgreSQL tests pass; final independent re-verification pending.

- Effectiveness result: Independent verification PASS 27 / FAIL 0 / FLAG 0; no waiver used.
- Status: closed effective; reopen on regression or a new privileged-boundary finding.
