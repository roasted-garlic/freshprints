## Current Goal
portal-shows-theme-toggle-sidebar

## Current Mode
managed-phase

## Phase
signoff

## Plan Status
complete

## Review Status
approved

## Implementation Status
complete

## Test Status
passed

## Signoff Status
approved

## DONE
yes

## Human Checkpoint Required
no

## Human Checkpoint Reason
n/a — owner visual PASS recorded. Production merge + App Hosting requested by owner; agent will attempt; FreshForge shell guard may require owner CLI.

## Allowed Actions
commit; push development; create PR to production; attempt merge and App Hosting if owner-authorized

## Forbidden Actions
force-push; Firebase Functions/Rules; Studio dispatch; secrets; DNS

## Plan
docs/workflow/plans/2026-08-24-portal-shows-theme-toggle-sidebar-plan.md

## Review
docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-review.md

## Test Report
docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-test-report.md

## Manual Checkpoint
docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-manual-checkpoint.md

## Signoff
docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-signoff.md

## Parked Parent Goal
production-promote-portal-and-studio-2026-08-23 — Gate E LIVE (`build-2026-08-24-001` @ 94a1ed0); Gate F parked until this hotfix is live on App Hosting

## Live Portal Build
fresh-prints-portal-build-2026-08-24-001

## Rollback Portal Build
fresh-prints-portal-build-2026-08-21-001 @ 7716d4a97f83c2dbe5602fb3e149875d6d7f38c9

## Files Created
- apps/portal/features/navigation/utils/isPortalAppShellRoute.ts
- apps/portal/features/navigation/utils/isPortalAppShellRoute.test.ts

## Files Modified
- apps/portal/app/providers.tsx
- apps/portal/features/navigation/components/PortalSidebar.tsx

## Tests Run
- npx tsx --test apps/portal/features/navigation/utils/isPortalAppShellRoute.test.ts (exit 0, 3/3)
- npm run typecheck --workspace @fresh-prints/portal (exit 0)
- npx eslint [touched files] (exit 0)
- curl localhost:3100/shows — no .portal-chrome; /login still has .portal-chrome
- Owner visual QA PASS

## Last Completed Step
Signoff approved. Owner requested commit/push/PR/merge/rollout.

## Next Required Step
Owner: merge PR **#89** (`gh pr merge 89 --merge`), then App Hosting rollout of the production merge SHA. Agent merge and prod rollout are FreshForge hook-blocked.

## Production PR
https://github.com/roasted-garlic/freshprints/pull/89

## Development SHA
8146eefdcebf1cb875810dc66dafd11f1a51de4b

## Phase 9
PARKED

## Decision Log
- 2026-08-24: Gate C MERGED @ 94a1ed0 (parent promote).
- 2026-08-24: Gate D VERIFIED COMPLETE on fresh-prints-prod (parent promote).
- 2026-08-24: Owner APPROVE PRODUCTION APP HOSTING ROLLOUT. Live build-2026-08-24-001 @ 94a1ed0 100%. Smoke PASS WITH NOTES (hyphen search).
- 2026-08-24: Owner reported /shows theme selector in top-right header and missing from sidebar. Parked parent Gate F. Started goal `portal-shows-theme-toggle-sidebar`.
- 2026-08-24: Plan approved; implemented helper + sidebar restore. Automated checks passed. Awaiting visual QA.
- 2026-08-24: Owner visual QA PASS. Signoff approved. Owner requested commit, push, PR, merge, and App Hosting rollout.
