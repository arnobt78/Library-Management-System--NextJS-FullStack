# Change Requests (Append Only)

Current C1 change requests follow.

Format: `CR-XXXX | Cycle | Affected REQ | Change | Rationale | Impact on ART/TC | Requested by | Approval status`.

| CR-0001 | C1 | REQ-0025; constrains REQ-0001, REQ-0003, REQ-0004, REQ-0010, REQ-0016 | Add authoritative server-action authorization, ownership and transaction boundaries | Pre-commit review found browser-supplied actor trust and non-atomic lifecycle writes | New security ART; TC-0039 through TC-0045; reverify REQ-0020 through REQ-0024 | Codex audit from Project Owner commit request | Gate 1 delta pending |
| CR-0001 | C1 | REQ-0025; constrains REQ-0001, REQ-0003, REQ-0004, REQ-0010, REQ-0016 | Corrective implementation and full regression completed | GATE-0003 authorized synthesis; GATE-0004 accepted verified result | ART-0007 through ART-0012; TC-0039 through TC-0045 plus full C1 regression | Arnob Mahmud, Project Owner | Complete; accepted commit `d9b9fd9` |
