# Workflow State

> Single source of truth for current workflow progress. The Managing Agent reads and updates this file every session.

## Current Mode
managed-phase

## Current Phase
plan

## Current Goal
Phase 4 Catalog Cleanup — ready for plan review; implementation not started

## Current Workflow Step
**RETURN CHECKPOINT** — Human manual app work in progress (2026-06-24). Resume here after manual changes.

## Plan Status
complete

## Review Status
pending

## Implementation Status
not_started

## Test Status
passed_with_notes

## Signoff Status
not_started

## Human Checkpoint Required
no

## Human Checkpoint Reason
none

## Last Completed Step
Documentation complete: roadmap realignment, Phase 4 cleanup plan, ADR-FP-008 (Fresh Prints Studio + Fresh Prints Portal)

## Next Required Step
1. After manual work: note any app changes made (or ask agent to inspect diff)
2. Review `docs/workflow/plans/phase-4-catalog-cleanup-plan.md`
3. Approve plan → implement Phase 4 cleanup (library filters, AI Review nav)
4. Complete Phase 4A manual QA if not done; Phase 4 signoff

## Blocked
no

## Blocker
none

## Allowed Actions
Human manual app changes; read docs; review plans; git commit if desired

## Forbidden Actions
Agent implementation of Phase 4 cleanup until plan review approved (unless user explicitly requests implementation after returning)

## Return Checkpoint (2026-06-24)

**Use this section to resume after manual app updates.**

### What is done (code)
- Phases 1–3D implemented and signed off
- **Phase 4A** implemented: Design Library search, category/tag/status/AI-review filters, pagination, URL params, Firestore indexes in `firestore.indexes.json`
- Automated tests passed (lint, tsc, designLibrarySearch unit tests)
- Phase 4A manual QA: may still be pending

### What is done (docs only — no code from these sessions)
- Roadmap realignment (`docs/workflow/reviews/roadmap-realignment-review.md`)
- Architecture plan (`docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md`)
- Phase 4 cleanup plan (`docs/workflow/plans/phase-4-catalog-cleanup-plan.md`)
- ADR-FP-008 official naming: **Fresh Prints Studio** (staff Electron) + **Fresh Prints Portal** (customer mobile-first web)
- ADR: `docs/architecture/ADR-Application-Platform-Strategy.md`

### What is NOT done yet (planned next)
- Phase 4 cleanup **implementation**: remove status/AI filters from Design Library, default `ready`, archived toggle, AI Review sidebar + import redirects
- Phase 4 cleanup plan **review approval**
- Firestore index deploy (human decision; do not delete orphan indexes without audit)
- Phase 5: AI Review queue UI + AI providers

### Locked decisions (do not re-litigate without new ADR)
- Design Library = approved catalog only (not import/AI/production queue)
- AI Review = import work queue (sidebar `/ai-review`)
- Two apps only: Fresh Prints Studio + Fresh Prints Portal; no native mobile
- Print Request / Print Run ≠ orders; production status on items not designs
- OD-5: Library defaults to `ready` — **yes**
- OD-6: AI Review dedicated sidebar — **yes**

### Key doc paths
| Topic | Path |
|-------|------|
| Workflow state | `.cursor/workflow/state.md` |
| Phase 4 cleanup plan | `docs/workflow/plans/phase-4-catalog-cleanup-plan.md` |
| Platform ADR | `docs/architecture/ADR-Application-Platform-Strategy.md` |
| Roadmap | `docs/project/ROADMAP.md` |
| Decisions index | `docs/project/DECISIONS.md` |

### Resume phrase for agent
> "Continue from the 2026-06-24 return checkpoint" or "Continue Workflow"

## Files Created (recent doc sessions)
docs/architecture/ADR-Application-Platform-Strategy.md
docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md
docs/workflow/reviews/roadmap-realignment-review.md
docs/workflow/plans/phase-4-catalog-cleanup-plan.md

## Known Risks
- Phase 4A UI still has status/AI filters (misaligned with catalog-only library until cleanup)
- Product names not in app window titles / package.json yet
- Firestore indexes in repo may not be deployed; orphan index in Firebase — do not delete without audit

## Decision Log
2026-06-24 — **RETURN CHECKPOINT** set before human manual app work
2026-06-24 — ADR-FP-008: Fresh Prints Studio + Fresh Prints Portal official names
2026-06-24 — ADR-FP-007: two applications only; no native mobile
2026-06-24 — ADR-FP-006 roadmap realignment; Phase 4A delivered

## DONE
no
