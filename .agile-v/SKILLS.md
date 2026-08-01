# Agile V Skill Registry

All 24 installed Agile V suite skills are registered. “Active now” means loaded for the current documentation/bootstrap stage. “Routed” means ready and loaded only when its stage/domain applies, as required by context-engineering rules.

| # | Skill | State | Routing |
|---:|---|---|---|
| 1 | agile-v-core | Active now | All Agile V work |
| 2 | agile-v-pipeline | Active now | Pipeline and handoffs |
| 3 | agile-v-lifecycle | Active now | Cycles, CRs, archival |
| 4 | agile-v-compliance | Active now | Risks, gates, CAPA, revalidation |
| 5 | agile-v-quality-gates | Active now | Quality checkpoints |
| 6 | agile-v-product-owner | Active now | Backlog and sprint traceability |
| 7 | discovery-analyst | Routed | Pre-requirements discovery |
| 8 | requirement-architect | Active now | C2 validated requirement refinement |
| 9 | threat-modeler | Active now | C2 security/privacy boundaries |
| 10 | ux-spec-author | Active now | C2 server-first navigation and user-detail UX |
| 11 | logic-gatekeeper | Active now | C2 ambiguity, constraint and traceability validation |
| 12 | build-agent | Routed | Approved synthesis only |
| 13 | build-agent-js | Routed - primary domain | Next.js/TypeScript changes |
| 14 | build-agent-nestjs | Routed - inactive domain | NestJS only |
| 15 | build-agent-python | Routed - inactive domain | Python only |
| 16 | build-agent-dart | Routed - inactive domain | Dart/Flutter only |
| 17 | build-agent-embedded | Routed - inactive domain | Firmware only |
| 18 | schematic-generator | Routed - inactive domain | Hardware/HDL only |
| 19 | test-designer | Routed | Independent Stage 3 test design |
| 20 | red-team-verifier | Completed this correction | Stage 4 independent verification |
| 21 | compliance-auditor | Routed | Cross-stage compliance observation |
| 22 | documentation-agent | Routed | Standards-based repository docs |
| 23 | observability-planner | Routed | Production metrics/SLOs |
| 24 | release-manager | Routed | Post-Gate-2 release management |

The domain-inactive skills are deliberately not executed against this Next.js repository. Registration does not bypass prerequisites or human gates.

C2 also applies the external `vercel-react-best-practices` review guidance for Next.js performance planning; it does not replace any of the 24 Agile V roles or authorize synthesis.
