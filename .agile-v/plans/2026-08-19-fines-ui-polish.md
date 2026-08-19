# Plan: Fines UI polish (2026-08-19) — HALT

**Status:** HALT — Human-Decision (no coding until owner names polish items and approves this plan)

**Classification:** Bounded — existing fines/borrow UI (not a new subsystem; no new REQ)

## Checkpoint

| Field | Value |
|-------|--------|
| Cycle | C2 |
| Stage | 3 candidate (UX polish) blocked at Specify |
| Tip | `ad1cc69` (demo seed + Borrow Queue Fine NaN) |
| HEAD | `e2fbd4b` (docs bind) == `origin/main` |
| EvalGate | FAIL — blocks C2 Gate 2 |
| Pending INT | none for this interrupt |
| Parent REQ | REQ-0033 polish (BL-0018); fines display already under REQ-0029–0031 |

## Reconcile

- Product tip `ad1cc69` on `main`; HEAD `e2fbd4b` is the docs bind. Working tree product-clean except this planning delta.
- Untracked (not product): `.agile-v/plans/`, `agile_v_skills/`.
- Shipped and recorded: Fines Platform closeout + fines polish + enriched `seed:demo`. Owner says it works okay and still needs testing.
- Prior STATE said “UI polish deferred to next session.” This session opens that work, then **halts** because the polish list is missing.

## Request analysis

Owner: functional OK pending test; now “few ui polish based on my instruction.”

The instruction list is **not in this message**. POLICY halt_on: `ambiguous_requirement`, `unclear_done_criteria`. Inventing visual changes would violate HITL and Principle 6.

## Candidate surfaces (not approved work)

Existing fines UI only — pick from these or paste screenshots:

| Surface | Likely files |
|---------|----------------|
| Borrow Queue Fine column | `components/AdminBookRequestsList.tsx` |
| Borrow request detail Fine KPI / actions | `components/admin/AdminBorrowRequestDetailContent.tsx` |
| Waive / Paid / Adjust kebab + dialog | `components/admin/AdminBorrowFineMenu.tsx`, `AdminAdjustFineDialog.tsx` |
| Fine-free return confirm | `components/admin/BorrowLifecycleAlertDialog.tsx` |
| User 360 Outstanding Fine KPI | `components/admin/AdminUser360StatusKpiRow.tsx` |
| Insights outstanding / forecast | `components/AnalyticsCharts.tsx` |
| My Profile borrow fine rows | `components/MyProfileTabs.tsx` |
| Automation FineManagement | `components/FineManagement.tsx` |

## Proposed approach (after owner list)

1. Map each owner item → one surface + existing primitive (ticket DNA, LIGHT_ALERT, StatCard, `fineStatus` badge). No new mutation family.
2. Keep densify/`fine.write` / `mapDisplayFine` / live vs stored amounts unchanged unless a listed item is a real display bug.
3. Waves by page (Queue → detail → profile → User 360 → Insights) only if the owner list spans them.
4. Prove: typecheck + lint + focused fine/borrow tests. No Gate 2 / EvalGate in this pass.

## Non-goals (unless owner names them)

- New fine formulas, migrations, or payment processor
- Insights invent densify
- ImageKit upload-limit UX
- Wave 5 / EvalGate / C2 Gate 2
- Blanket visual restyle of unrelated admin pages

## Approval gate

Reply with **the polish list** (screenshots and/or per-item expected vs current). Then I will lock a wave plan and wait for an explicit **yes** before coding.

Owner functional Verify of fines can run in parallel and does not unblock synthesis.
