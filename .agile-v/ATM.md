# Agile Traceability Matrix - C1

At bootstrap, draft requirements map to repository observations only. Application ART, TC, and VER columns remain intentionally empty until their valid pipeline stages.

| REQ | Status | Baseline evidence | ART | TC | VER |
|---|---|---|---|---|---|
| REQ-0001 | Draft | `app/(auth)/`; `auth.ts`; `database/schema.ts` | - | - | - |
| REQ-0002 | Draft | `app/(root)/all-books/`; `app/(root)/books/`; `app/api/books/` | - | - | - |
| REQ-0003 | Draft | `app/admin/books/`; `app/api/books/`; `database/schema.ts` | - | - | - |
| REQ-0004 | Draft | `app/admin/book-requests/`; `app/api/borrow-records/`; borrow schema | - | - | - |
| REQ-0005 | Draft | `app/(root)/my-profile/`; query/mutation hooks | - | - | - |
| REQ-0006 | Draft | `app/api/reviews/`; review schema | - | - | - |
| REQ-0007 | Draft | admin fine/reminder routes; system config schema | - | - | - |
| REQ-0008 | Draft | workflow/onboarding and reminder routes; `lib/workflow.ts` | - | - | - |
| REQ-0009 | Draft | recommendation/trending routes | - | - | - |
| REQ-0010 | Draft | admin users/account-request UI and API | - | - | - |
| REQ-0011 | Draft | business insights and export routes | - | - | - |
| REQ-0012 | Draft | `app/api-status/`; `app/api-docs/`; status routes | - | - | - |
| REQ-0013 | Draft | ImageKit auth route and upload components | - | - | - |
| REQ-0014 | Draft | responsive-layout history; UI source | - | - | - |
| REQ-0015 | Draft | TanStack Query hooks; Redis/rate-limit modules | - | - | - |
| REQ-0016 | Draft | Drizzle schema and migrations | - | - | - |
| REQ-0017 | Draft | `package.json`; TypeScript/Next.js configuration | - | - | - |
| REQ-0018 | Draft | `.agile-v/` process suite | - | - | - |
| REQ-0019 | Verified | `.env` key-only inventory; executable key scan | ART-0001 | TC-0019 through TC-0021 | VER-C1-019-021 PASS |
| REQ-0020 | Verified | Next 16 migration contract; route/build output | ART-0002, ART-0003, ART-0012 | TC-0022 through TC-0025 | VER-C1-022-025 PASS |
| REQ-0021 | Verified | clean install, dependency tree, outdated/usage/audit scans | ART-0002, ART-0003, ART-0005, ART-0012 | TC-0026 through TC-0029 | VER-C1-026-029 PASS |
| REQ-0022 | Verified | strict TypeScript, ESLint, and production build output | ART-0002, ART-0010 | TC-0030 through TC-0032 | VER-C1-030-032 PASS |
| REQ-0023 | Verified | typed keys, centralized invalidation, query provider, mutation hooks | ART-0004, ART-0006, ART-0012 | TC-0033 through TC-0037 | VER-C1-033-037 PASS |
| REQ-0024 | Verified | dependency/debug/log/git-scope scans | ART-0005, ART-0006, ART-0012 | TC-0038 | VER-C1-038 PASS |
| REQ-0025 | Verified | privileged server-action boundary audit; real PostgreSQL race/rollback evidence | ART-0007 through ART-0011 | TC-0039 through TC-0045 | VER-C1-039-045 PASS |
