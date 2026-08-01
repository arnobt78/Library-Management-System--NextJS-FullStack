# Agile V Infinity Loop Playbook

This directory is the durable quality-management state for this repository. `.agile-v/REQUIREMENTS.md` is the requirements source of truth; application source remains the implementation source of truth.

## Loop

1. **Specify** - discovery, threats, UX intent, atomic REQ IDs.
2. **Constrain** - logic, architecture, interfaces, data, security, and operational limits.
3. **Human Gate 1** - approve the validated blueprint.
4. **Orchestrate** - Build Agent and Test Designer work independently from approved requirements.
5. **Prove** - manifests, logs, tests, and requirement-to-evidence mappings are produced.
6. **Verify** - Red Team independently challenges artifacts and maintains eval results.
7. **Human Gate 2** - accept only with `EVAL_RESULTS.md` PASS, or a documented WAIVER.
8. **Accept and Evolve** - archive the cycle, record learning, then re-enter through the lifecycle trigger appropriate to the change.

## Change Routing

| Trigger | Re-entry | Required record |
|---|---|---|
| New feature or changed behavior | Stage 1 | CR-XXXX and new/modified REQs |
| Bug with unchanged requirement | Stage 3 | Defect evidence and regression TC |
| Verification failure needing requirement change | Stage 1 | CR-XXXX, impact analysis, Gate 1 |
| Security, auth, identity, schema, or external integration change | Stage 1 | R2+ risk assessment |
| Documentation-only correction with no requirement effect | Current stage | Decision/trace entry as applicable |

## Per-Prompt Operating Rule

For every requested task: identify parent REQ IDs; classify risk; inspect current state; plan a vertical slice; update records write-through; implement only after the required gate; produce evidence proportional to risk; use independent verification; stop at human gates. Ambiguous scope, conflicting requirements, missing traceability, unsafe secrets handling, or unclear done criteria are halt conditions.

## Repository Conventions to Preserve

- Next.js App Router with TypeScript and React 19.
- Feature routes under `app/`, reusable UI under `components/`, server actions/services under `lib/`, Drizzle schema under `database/`, migrations under `migrations/`.
- Existing responsive layout, Tailwind/shadcn patterns, TanStack Query server-state patterns, NextAuth role boundaries, and PostgreSQL/Redis/ImageKit/QStash integrations.
- Changes should be minimal, feature-oriented, type-safe, validated at boundaries, migration-backed for schema changes, and consistent with nearby code.

## Evidence Summary Template

`Scope: ... | Traceability: REQ-... | Findings: PASS n / FAIL n / FLAG n`

`Decision Points: ... | Log: timestamp | agent | decision | rationale | linked REQ`

## Current C1 Halt

EvalGate is PASS for TC-0019 through TC-0045, `GATE-0004` is approved, and the final pre-commit audit is clean. Commit/push are authorized; closeout must record the evidence commit and freeze the C1 archive.
