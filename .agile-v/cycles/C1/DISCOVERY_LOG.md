# Discovery Log - C1 Existing-System Baseline

The evidence below was inferred from repository state at commit `83e3411`. It documents what appears to exist; it is not stakeholder approval or verification evidence.

## Observations

| ID | Observation | Source | Confidence | Status |
|---|---|---|---|---|
| OBS-0001 | The system exposes sign-up/sign-in flows and role/status fields for users | `app/(auth)/`, `auth.ts`, `database/schema.ts` | High | Confirmed in source |
| OBS-0002 | The system exposes a public catalog, book detail pages, and recommendation routes | `app/(root)/`, `app/api/books/` | High | Confirmed in source |
| OBS-0003 | Administrators can manage books, users, borrow requests, and account requests | `app/admin/`, `app/api/admin/` | High | Confirmed in source |
| OBS-0004 | Borrow records have pending, borrowed, and returned states with due dates and inventory effects | `database/schema.ts`, `app/api/borrow-records/route.ts` | High | Confirmed in source |
| OBS-0005 | Reviews, ratings, eligibility, edit, and delete endpoints exist | `app/api/reviews/`, `database/schema.ts` | High | Confirmed in source |
| OBS-0006 | Fines, reminders, analytics, exports, and recommendations have administrative endpoints | `app/api/admin/` | High | Confirmed in source |
| OBS-0007 | The application integrates PostgreSQL, Redis/Upstash, QStash, ImageKit, and email providers | `package.json`, `database/`, `lib/`, `README.md` | High | Confirmed in source/config references |
| OBS-0008 | Recent history emphasizes React Query optimization and responsive layouts | Git history through `83e3411` | High | Confirmed in history |
| OBS-0009 | No existing `.agile-v/` baseline or automated test script was present | Repository inventory and `package.json` | High | Confirmed |
| OBS-0010 | `.env.example` exists but is empty while executable source references service and security configuration absent from the private key set | Key-only `.env` and `process.env` audit | High | Confirmed |
| OBS-0011 | Next.js is on 15.5.x; source already uses async route/page parameters, but the middleware filename, lint script, and Next config are incompatible with Next.js 16 | Framework/config source audit and official migration contract | High | Confirmed |
| OBS-0012 | The lockfile currently reports 31 npm advisories: 2 critical, 12 high, 12 moderate, and 5 low | `npm audit --package-lock-only` on 2026-08-01 | High | Confirmed |
| OBS-0013 | All package dependencies are absent from the workspace, preventing current baseline build/lint execution until a clean install is authorized | `npm ls --depth=0` | High | Confirmed |
| OBS-0014 | Query invalidation is centralized in part but duplicates broad prefix invalidations across a 1,676-line mutation hook and uses mixed active/none refetch policies | Query/mutation/invalidation source audit | High | Confirmed |
| OBS-0015 | Current official ImageKit Node and React SDKs can replace legacy SDKs implicated in the advised transitive dependency chain | Official ImageKit documentation and npm peer metadata | High | Confirmed externally |

## Insights

| ID | Derived from | Insight |
|---|---|---|
| INS-0001 | OBS-0001, OBS-0003, OBS-0004 | Authorization and lifecycle transitions are central business controls and should be treated as R2+ changes |
| INS-0002 | OBS-0004, OBS-0006, OBS-0007 | Borrowing has distributed side effects across inventory, records, notifications, fines, and caches |
| INS-0003 | OBS-0008 | Future UI work should preserve established responsive composition and server-state conventions |
| INS-0004 | OBS-0009 | Verification infrastructure and objective quality thresholds require explicit stakeholder decisions |
| INS-0005 | OBS-0011, OBS-0012, OBS-0013 | The framework upgrade is an R2 security and runtime migration, not a version-only package edit |
| INS-0006 | OBS-0014 | Immediate UI coherence needs one typed invalidation contract; indiscriminate refetching would harm performance and still would not create cross-user push delivery |

## Assumptions

| ID | Assumption | Risk if wrong | Validation plan | Status |
|---|---|---|---|---|
| ASM-0001 | Current repository behavior represents the desired starting product scope | Rework or preservation of unwanted behavior | Human Gate 0 scope review | Unvalidated |
| ASM-0002 | README feature claims should remain supported | Requirements may encode stale claims | Stage 2 source/behavior audit | Unvalidated |
| ASM-0003 | The deployed environment is production-relevant and requires R2 evidence | Evidence may be over- or under-scoped | Confirm deployment and compliance context | Unvalidated |
| ASM-0004 | Accessibility targets should follow WCAG 2.2 AA | UI acceptance criteria may differ | Human decision during requirements refinement | Unvalidated |

## Candidate Requirements

Candidate IDs map one-to-one to draft REQ IDs in `REQUIREMENTS.md`; lineage is preserved there. Stakeholder directive: bootstrap and synchronize the current codebase, 2026-08-01.

## Session Resume Sync (2026-08-01)

| ID | Observation | Source | Confidence | Status |
|---|---|---|---|---|
| OBS-0010 | Working tree still on baseline commit `83e3411` with uncommitted process/docs drift | `git status`, `git rev-parse` | High | Confirmed |
| OBS-0011 | Uncommitted additions include `.agile-v/`, `docs/*` engineering guides, `LICENSE`, `.env.example`; `README.md` modified; `REACT_QUERY_SETUP_GUIDE.md` deleted | Working tree | High | Confirmed; not Gate-approved product synthesis |
| OBS-0012 | Account-request admin UI remains in-repo under REQ-0010 baseline path; no staged product synthesis authorized this session | `app/admin/account-requests/` | High | Confirmed in source |

Insight INS-0005 (OBS-0010, OBS-0011): Documentation and process scaffold may land before Gate 1 as governance artifacts, but product behavior changes remain blocked until Gate 1.

## Pre-commit security discovery (2026-08-01)

| ID | Observation | Source | Confidence | Status |
|---|---|---|---|---|
| OBS-0016 | Multiple browser-invokable server mutations rely on page guards or client actor/reviewer IDs rather than authoritative database role/ownership checks | `hooks/useMutations.ts`; `lib/actions/book.ts`; `lib/admin/actions/*.ts` | High | Critical; RISK-0012 |
| OBS-0017 | Borrow/admin-request multi-row state transitions are not uniformly transactional and can partially update or replay inventory/role state | server-action transaction audit | High | Critical; CAPA-0001 |

## Human Gate 0 Summary

- Observations: 12
- Insights: 5
- Unvalidated assumptions: 4
- Candidate requirements: 18
- Recommendation: review desired product scope, compliance context, accessibility target, and quality thresholds before approving discovery.
- Gate 0 status: PENDING (`INT-0001`, token `C1-G0-20260801-9f3c`)
- Session: Infinity Loop reactivated 2026-08-01; no product coding performed
