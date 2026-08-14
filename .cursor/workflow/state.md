## Current Goal
studio-1.0.4-ai-processing-preview-cleanup-corrective

## Current Mode
managed-phase

## Phase
development integrated — production promotion audit / PR next

## Plan Status
complete

## Review Status
approved_with_notes

## Implementation Status
complete — integrated into development lineage (pending origin/development merge via PR)

## Test Status
passed_with_notes — owner DEV QA PASS; automated suite after integration

## Signoff Status
pending — production promote + scoped Firebase deploy + NEW Studio 1.0.4 draft (not draft 369614747)

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Authorize production PR merge and separately authorize production Firebase deploy after development lands on origin.

## Allowed Actions
Push integration branch; open/merge PR into development; produce production diff audit; prepare protected production PR handoff. STOP before production merge/Firebase deploy unless separately authorized.

## Forbidden Actions
Force push; history rewrite; production merge without auth; production Firebase deploy without auth; mutate draft 369614747; prod fixture cleanup; bake diagnostic flags into release

## Next Required Step
Land integration PR on origin/development → production diff audit → protected production PR (STOP before merge/deploy)

## DONE
no

## Decision Log
- 2026-08-13 — Owner DEV QA PASS (P4 pipeline, Option B delete, instant list remove, diagnostic banner OFF)
- 2026-08-13 — Promote development-first (not direct corrective → production)
- 2026-08-13 — Corrective frozen @ `9414aed`; direct merge into local `development` blocked by hook — use integration branch + PR

## Facts (authoritative after development integration)
| Item | Value |
|------|-------|
| Managed goal | `studio-1.0.4-ai-processing-preview-cleanup-corrective` |
| Root cause | Firestore Rules P4 authorization gap on derivative path persistence |
| Corrective | Narrow `designDerivativeCompletionUpdate` Rules fast path |
| Owner DEV QA | **PASS** |
| Permanent owner-only safe delete | Implemented; DEV QA PASS |
| Instant list reconciliation after delete | PASS |
| Diagnostic banner | OFF for normal build (`VITE_FP_DERIVATIVE_LOCUS_DIAG` / bake flags unset) |
| DEV deployed | `firestore:rules` + `functions:deleteEligibleUnapprovedDesign` on `fresh-prints-dev` |
| Corrective HEAD | `9414aed4a5fefbd266648e3601e61af8ef363e10` |
| Draft 369614747 | Failed-smoke evidence only; unpublished; untouched; must not reuse |
| Production | **NOT YET PROMOTED** for this corrective |
| Production fixtures | Untouched |

## Artifacts
- `docs/workflow/reviews/2026-08-13-studio-1.0.4-p4-dev-qa-checkpoint.md`
- `docs/workflow/reviews/2026-08-13-studio-1.0.4-option-b-ui-discoverability-checkpoint.md`
- `docs/workflow/reviews/2026-08-13-studio-1.0.4-p4-derivative-completion-implementation-review.md`
