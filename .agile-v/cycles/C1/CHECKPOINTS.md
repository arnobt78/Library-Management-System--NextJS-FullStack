# Durable Human Checkpoints (Append Only)

| Interrupt ID | Cycle | Gate | Status | Created at | Due at | Resume token | Scope | Resolution |
|---|---|---|---|---|---|---|---|---|
| INT-0001 | C1 | Gate 0 | PENDING | 2026-08-01 | Not set | C1-G0-20260801-9f3c | Review existing-system discovery and draft C1 scope | Awaiting named approver decision |
| INT-0001 | C1 | Gate 0 | RESOLVED | 2026-08-01 | Not set | C1-G0-20260801-9f3c | Review existing-system discovery and draft C1 scope | Approved by Arnob Mahmud, Project Owner; GATE-0001 |
| INT-0002 | C1 | Gate 1 | PENDING | 2026-08-01 | Not set | C1-G1-20260801-32c05c48 | Approve validated REQ-0019 through REQ-0024 for R2 synthesis | Awaiting Arnob Mahmud decision |
| INT-0002 | C1 | Gate 1 | RESOLVED | 2026-08-01 | Not set | C1-G1-20260801-32c05c48 | Approve validated REQ-0019 through REQ-0024 for R2 synthesis | Approved by Arnob Mahmud, Project Owner; GATE-0002 |
| INT-0003 | C1 | Gate 1 delta | PENDING | 2026-08-01 | Not set | C1-G1D-20260801-1010659a | Approve REQ-0025 corrective security scope before synthesis and commit | Awaiting Arnob Mahmud, Project Owner decision |
| INT-0003 | C1 | Gate 1 delta | RESOLVED | 2026-08-01 | Not set | C1-G1D-20260801-1010659a | Approve REQ-0025 corrective security scope before synthesis and commit | Approved by Arnob Mahmud, Project Owner; GATE-0003 |
| INT-0004 | C1 | Gate 2 | PENDING | 2026-08-01 | Not set | C1-G2-20260801-6e7b0d4c | Accept verified REQ-0019 through REQ-0025 and authorize C1 commit/push | Awaiting Arnob Mahmud, Project Owner decision |
| INT-0004 | C1 | Gate 2 | RESOLVED | 2026-08-01 | Not set | C1-G2-20260801-6e7b0d4c | Accept verified REQ-0019 through REQ-0025 and authorize C1 commit/push | Approved by Arnob Mahmud, Project Owner; GATE-0004 |

When a human gate is presented, append a `PENDING` row with a unique `INT-XXXX` and resume token before ending the turn. Never edit or reuse a prior row.
