## Current Goal
studio-1.0.4-ai-processing-preview-cleanup-corrective

## Current Mode
managed-phase

## Phase
production promotion prepared — protected PR pending; no merge/deploy yet

## Plan Status
complete

## Review Status
approved_with_notes

## Implementation Status
complete — clean promote branch from production + cherry-picks of approved corrective commits

## Test Status
passed_with_notes — owner DEV QA PASS; production-branch verification in progress / recorded in promotion checkpoint

## Signoff Status
pending — production PR merge → Firebase deploy → NEW Studio 1.0.4 draft + smoke (not draft 369614747)

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Authorize protected production PR merge, then separately authorize production Firebase deploy. Draft 369614747 and prod fixtures remain untouched.

## Allowed Actions
Push promote branch; prepare production PR handoff. STOP before production merge, Firebase deploy, fixture cleanup, Studio rebuild, draft creation, publish.

## Forbidden Actions
Force push; push to production; merge production; production Firebase deploy; mutate draft 369614747; prod fixture cleanup; bake diagnostic flags; broad development→production merge

## Next Required Step
Owner/ChatGPT: open+merge protected PR promote/studio-1.0.4-p4-corrective → production

## DONE
no

## Facts
| Item | Value |
|------|-------|
| Owner DEV QA | **PASS** |
| Development integration | **COMPLETE** via PR #69 @ `2119d4154c2c2e98cffa17d184012cc136cb3437` |
| Production baseline | `c6e9235614b6816a98a71f998b47bd7fe18c371f` |
| Promote branch | `promote/studio-1.0.4-p4-corrective` |
| Source commits | `5e0b072` + `9414aed` (cherry-picked) |
| Production Firebase deploy | **PENDING** |
| NEW Studio 1.0.4 release | **PENDING** (do not reuse draft 369614747) |
| Draft 369614747 | Failed-smoke evidence; unpublished; untouched |
| Production fixtures | Untouched |
