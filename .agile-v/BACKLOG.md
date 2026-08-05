# C1 Backlog

All items remain `Backlog` until Gate 1. Effort and sprint capacity are intentionally unset.

| BL ID | Story | REQ | Priority | Status |
|---|---|---|---|---|
| BL-0001 | Confirm as-built scope and business rules | REQ-0001 through REQ-0018 | Critical | Backlog |
| BL-0002 | Validate auth, privilege, upload, and privacy constraints | REQ-0001, REQ-0010, REQ-0013, REQ-0017 | Critical | Backlog |
| BL-0003 | Validate borrow/inventory/fine transaction invariants | REQ-0003, REQ-0004, REQ-0007, REQ-0016 | Critical | Backlog |
| BL-0004 | Establish requirement-derived test baseline | REQ-0001 through REQ-0018 | High | Backlog |
| BL-0005 | Define nonfunctional thresholds and observability | REQ-0012, REQ-0014, REQ-0015, REQ-0017 | High | Backlog |
| BL-0006 | Enforce server-side actor authorization and atomic lifecycle writes | REQ-0025 | Critical | Gate 1 delta pending |

## C2 Draft Backlog

No C2 story is synthesis-ready before Gate 1. The sequence intentionally proves security and state coherence before adding dependent workflows.

| BL ID | Story | REQ | Priority | Planned wave | Status |
|---|---|---|---|---|---|
| BL-0007 | Replace fast password hashing with compatible memory-hard credential migration | REQ-0026 | Critical | Foundation | Implemented; local and independent code Verify PASS |
| BL-0008 | Redact/authorize operational endpoints; add safe errors, upload controls, and response security headers | REQ-0026, REQ-0032 | Critical | Foundation | Implemented; local and independent code Verify PASS; production evidence pending |
| BL-0009 | Define and test the complete mutation-to-dependent-domain matrix, including RSC cache ownership | REQ-0027 | Critical | Foundation | Implemented universally including user 360; local contracts PASS; browser timing evidence pending |
| BL-0010 | Establish measured navigation baselines and server-first granular loading architecture | REQ-0028 | High | Foundation | Server-first/Suspense implemented; browser performance evidence pending |
| BL-0011 | Move API Docs, API Status, and Performance into accessible desktop/mobile utility menus | REQ-0033 | Medium | Foundation | Implemented; automated/browser a11y verification pending |
| BL-0012 | Add authorized `/admin/users/[id]` user 360 page with shared KPI/history models and clickable user surfaces | REQ-0029 | High | Experience | Implemented; local and independent code Verify PASS; browser evidence pending |
| BL-0013 | Implement reservations/waitlist and renewal policy as the recommended first circulation slice | REQ-0030 | High | Circulation | Implemented with retry-safe delivery/dead-letter worker; 10/10 PostgreSQL integration PASS across 10 stress runs; deployed provider evidence pending |
| BL-0014 | Evaluate copy-level/barcode inventory after circulation invariants are proven | REQ-0030 | Medium | Circulation | Deferred candidate |
| BL-0015 | Add deterministic user/library insights; external LLM narratives require a future CR | REQ-0031 | Medium | Intelligence | Implemented; formula contracts and independent code Verify PASS; production evidence pending |
| BL-0016 | Reconcile critical domains on focus/reconnect; defer cross-session transport | REQ-0027, REQ-0032 | High | Foundation | Implemented for browser scope; production/browser evidence pending |
| BL-0017 | Define SLOs, observability, backup/restore, migration rollback, load and deployment evidence | REQ-0032 | Critical | Release | Sink/calculator/rollback implemented; deployment/load/alert/restore evidence pending |
| BL-0018 | Add only measured, reduced-motion-safe reusable media/reveal/ripple polish | REQ-0033 | Low | Polish | Deferred candidate |

## C2 Gate 1 Wave Plan

1. **Wave 1 - Security foundation:** REQ-0026 plus the diagnostic/header portion of REQ-0032. — local Prove/code Verify PASS
2. **Wave 2 - Freshness and navigation:** REQ-0027, REQ-0028 and REQ-0033. — local Prove/code Verify PASS; browser evidence pending
3. **Wave 3 - User intelligence:** REQ-0029 and deterministic REQ-0031. — local Prove/code Verify PASS
4. **Wave 4 - Circulation:** REQ-0030 reservations/waitlist and renewals with migrations and transactional tests. — local Prove/code Verify PASS; deployed provider receipt pending
5. **Wave 5 - Production proof:** remaining REQ-0032 observability, recovery, load and deployment evidence plus full C1 regression. — **INCOMPLETE; resume here for Gate 2 path**

After Gate 1, Build Agent JS and Test Designer operate independently from `REQUIREMENTS.md`; each wave must pass Prove before the next dependency wave, and Red Team verification remains independent. Quality-gate minimum allocation is 290 minutes for the combined complex scope (concurrency, external services, state, security and test infrastructure); execution is split by vertical slice rather than rushed into one unchecked change.

## Session resume note (2026-08-03)

No PENDING durable interrupt. New owner instructions map as follows: feature/extension → Stage 1 CR; bug with unchanged REQ → Stage 3; Wave 5 evidence collection → Stage 4 Prove/Verify without new product synthesis unless a gap requires Stage 3 code.

## Session resume note (2026-08-04)

Repo reconciled: HEAD `3552e44`, implementation tip `85ae1b3`, `main` == `origin/main`, no PENDING interrupt. Owner invoked Agile V core/pipeline resume without naming a product ask. **Human-Decision:** pick Wave 5 evidence (BL-0017), a concrete REQ-0033 polish list (BL-0018 / CR-0002), a new Stage 1 CR, or another named scope before any coding.

## CR-0003 Backlog — Admin Suite Parity Expansion

| BL ID | Story | REQ | Priority | Planned wave | Status |
|---|---|---|---|---|---|
| BL-0019 | Dual-surface Support Tickets with reply thread, admin triage, and email/notification fan-out | REQ-0034 | High | CR-0003 Wave 2 | Implemented; local Prove PASS; manual two-tab smoke PASS |
| BL-0020 | Book review moderation gate (PENDING/APPROVED/REJECTED) with instant author self-view and "My Reviews" profile tab | REQ-0035 | High | CR-0003 Wave 3 | Implemented; local Prove PASS |
| BL-0021 | Activity History audit log (FIFO-50) and in-app notification bell across root + admin headers | REQ-0036 | Medium | CR-0003 Wave 1 | Implemented; local Prove PASS |
| BL-0022 | KPI `StatCard` rollout on every admin page, shared `data-table`/`SearchInput`/`MultiSelectFilter` primitives, Library Overview rename, existing-list retrofit | REQ-0037 | Medium | CR-0003 Waves 4–5 | Implemented; local Prove PASS |

**CR-0003 status (2026-08-05):** all 4 backlog items implemented and committed at tip `8d1630a` (docs bind `1b1cc2f`). Local Prove PASS (typecheck/lint/110 tests/build/audit + manual multi-tab smoke). Nonlocal/production evidence intentionally not attempted — same evidence class blocking EvalGate (`ER-C2-FINAL-CORRECTIVE-5`).

## Session resume note (2026-08-05)

Repo reconciled: HEAD `1b1cc2f`, implementation tip `8d1630a`, `main` == `origin/main`, clean tree, no PENDING interrupt. Owner invoked Agile V core/pipeline resume without naming a product ask. **Human-Decision:** pick one before coding:

1. **Wave 5 / BL-0017** — collect nonlocal REQ-0032 evidence toward EvalGate / C2 Gate 2  
2. **REQ-0033 polish (BL-0018)** — concrete UX list under existing polish backlog  
3. **New Stage 1 CR** — name the feature/extension for REQ drafting  
4. **Bugfix** — name symptom + expected behavior (Stage 3 if REQs unchanged)  
5. **Other named scope** — explicit path/files/outcome

## CR-0003 review densify polish (2026-08-05)

Owner approved plan `reviews_densify_polish_5cfafce4`. Delivered: max-w-4xl dialogs, `patchReviewCaches` densify, ReviewBookCard + ReviewDateMeta, My Reviews emerald tab, admin PersonAttribution. Prove PASS; included in densify commit batch.

## Densify invalidation audit Waves A–C (2026-08-06)

Owner approved plan `densify_invalidation_audit_map_b23e23e5` (Waves A+B+C). Delivered: `patchBorrowCaches`; `optimisticAdminRequestDecision`; await `book.write`. Prove PASS.

## Approve review densify upsert (2026-08-06)

Owner approved plan `approve_review_densify_upsert_b5f2bc1d`. `patchReviewCachesOnModerate` upserts public `book-reviews` on APPROVED (admin soft-nav). Review card UI polish + dialog identity. Prove 120 tests.