# Stage 3 Plan - Synthesis

After Gate 1, decompose approved REQs into dependency-aware vertical slices. Build Agent JS and Test Designer operate independently and in parallel from the requirements file. Every application artifact receives an ART ID; every test receives a TC ID. Risk-proportional evidence and rollback planning are mandatory.

## REQ-0025 Corrective Slice

1. Add one server-only actor resolver that checks Auth.js identity against current database role and status.
2. Apply fail-closed admin/owner guards to every browser-invokable action and stale-role-sensitive API boundary.
3. Move borrow approval, return, rejection, hard-delete, and admin-request lifecycle writes into replay-safe transactions.
4. Remove client actor/reviewer audit inputs and require explicit environment-only destructive-script authorization.
5. Execute TC-0039 through TC-0045, all prior regression gates, and independent verification before commit readiness.
