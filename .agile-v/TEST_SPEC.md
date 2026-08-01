# Test Specification - C1

- Status: APPROVED FOR EXECUTION (`GATE-0002`, `GATE-0003`)
- Source: `.agile-v/REQUIREMENTS.md` C1-approved.3
- Scope: REQ-0019 through REQ-0025
- Test cases: 27

| TC-ID | REQ-ID | Description | Expected | Type | Steps |
|---|---|---|---|---|---|
| TC-0019 | REQ-0019 | Compare application-managed environment keys with `.env.example` | Every executable key is documented exactly once with scope, requirement, format, placeholder, and acquisition source | integration | Extract `process.env` and config keys; compare key sets; inspect comments |
| TC-0020 | REQ-0019 | Scan the example environment file for credential material | No value resembles a real token, password, private endpoint, or personal datum | negative | Run secret-pattern scan; manually inspect placeholders |
| TC-0021 | REQ-0019 | Verify platform-managed variables are non-configurable documentation | `NODE_ENV`, `VERCEL`, and `VERCEL_URL` are described but not assigned user values | edge | Inspect the platform section and assignments |
| TC-0022 | REQ-0020 | Verify framework/runtime versions and Node constraint | Next 16.2.12, React/DOM 19.2.8, and Node >=20.9 are resolved | integration | Inspect manifests and resolved dependency tree |
| TC-0023 | REQ-0020 | Verify the Next.js request interception convention | `proxy.ts` exports the Auth.js proxy and no `middleware.ts` remains | integration | Inspect root files; run route/build compilation |
| TC-0024 | REQ-0020 | Preserve the App Router surface | All 63 page/route/layout entries and all 39 API routes remain present | regression | Count entry files before and after migration |
| TC-0025 | REQ-0020 | Exercise authenticated and unauthenticated proxy decisions | Existing public routes remain reachable and protected routes still require authentication | system | Run proxy/auth integration tests for both session states |
| TC-0026 | REQ-0021 | Perform a clean lockfile install | `npm ci` exits 0 with no peer dependency errors | system | Remove generated install state in a clean environment; execute `npm ci` |
| TC-0027 | REQ-0021 | Audit all resolved production and development dependencies | `npm audit --audit-level=low` reports zero vulnerabilities | security | Execute audit against the generated lockfile |
| TC-0028 | REQ-0021 | Verify external SDK contracts | ImageKit authentication/upload and Upstash workflow imports typecheck and preserve their public results | integration | Compile SDK call sites and exercise mocked success/failure contracts |
| TC-0029 | REQ-0021 | Verify direct dependency usage or exception rationale | Every direct package is referenced by executable/config source or justified in the Build Manifest | negative | Run dependency usage scan; compare exceptions |
| TC-0030 | REQ-0022 | Run strict TypeScript validation | `npm run typecheck` exits 0 without ignored errors | system | Execute the script in a clean install |
| TC-0031 | REQ-0022 | Run zero-warning ESLint validation | `npm run lint` invokes `eslint . --max-warnings 0` and exits 0 | system | Inspect script; execute it |
| TC-0032 | REQ-0022 | Run production compilation | `npm run build` exits 0 without framework error suppression | system | Inspect config; execute production build |
| TC-0033 | REQ-0023 | Verify mutation-key coverage by domain | Books, borrows, reviews, users, requests, fines, recommendations, analytics, config/health, and exports invalidate their related keys before success settles | integration | Execute mutation contract tests with a recording QueryClient |
| TC-0034 | REQ-0023 | Verify initiating-view behavior and rollback | Success updates or immediately refetches the initiating view; failure restores optimistic state | negative | Exercise success and rejected mutations against consumer-visible cache data |
| TC-0035 | REQ-0023 | Verify inactive and back-navigation freshness | Inactive related queries are stale and refetch on next mount/navigation without manual refresh | system | Mutate, unmount, remount/back-navigate, and assert fresh fetch |
| TC-0036 | REQ-0023 | Verify same-origin multi-tab propagation | Another tab receives a data-free invalidation signal within one second and refetches active related queries | performance | Open two same-origin contexts; mutate in one; observe the other |
| TC-0037 | REQ-0023 | Bound invalidation traffic | One mutation event does not create rebroadcast loops or duplicate domain-wide refetch storms | edge | Record channel messages and query fetch counts |
| TC-0038 | REQ-0024 | Verify migration cleanup and scope protection | No unused migration dependency/debug artifact remains and unrelated user files retain their prior state | regression | Run static scans and compare scoped git diff |

## Approved REQ-0025 delta tests

| TC-ID | REQ-ID | Description | Expected | Type | Steps |
|---|---|---|---|---|---|
| TC-0039 | REQ-0025 | Reject unauthenticated privileged server actions | No write occurs; generic unauthorized result | security | Invoke each exposed admin mutation without a session |
| TC-0040 | REQ-0025 | Reject ordinary and stale-role users | Current database role/status controls access | security | Use USER and demoted JWT fixtures against admin writes |
| TC-0041 | REQ-0025 | Reject forged actor/reviewer/user IDs | Server session identity wins; no impersonated audit field | negative | Submit another user's IDs from client inputs |
| TC-0042 | REQ-0025 | Enforce borrow/return ownership | Users affect only their own records; admins follow explicit policy | security | Attempt cross-user borrow and return |
| TC-0043 | REQ-0025 | Prevent replay and concurrent inventory drift | A transition changes inventory exactly once and never below zero/above total | concurrency | Race duplicate approvals/returns against one record/copy |
| TC-0044 | REQ-0025 | Roll back multi-table failures | Borrow record, book copies, role/request state remain consistent | integration | Inject failure between transactional writes |
| TC-0045 | REQ-0025 | Keep destructive secrets out of process arguments | Script requires environment secret and explicit target ID | security | Inspect argv contract and process invocation |
