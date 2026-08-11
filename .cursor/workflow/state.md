# Current Goal
Prelaunch catalog search, counts, and first-visit UX (`prelaunch-catalog-search-count-and-first-visit-ux`).

Current Mode: managed-phase
Current Phase: test / implementation-review complete — awaiting commit + owner PR/deploy approval
Managed goal: Fix Studio/Portal catalog search & counts; preserve Portal search on open; first-visit About modal
DONE: **no**
Last Completed Step: Implementation + focused tests + Implementation Review corrections applied
Plan Status: **complete**
Review Status: **approved_with_changes** (plan)
Implementation Status: **complete**
Implementation Review: **approved** after required corrections
Test Status: **passed_with_notes** (Portal `next build` hung/EPERM on local `.next/trace`; Portal+Studio typecheck + Studio vite build + focused unit tests + lint + git diff --check passed)
Signoff Status: not_started
Human Checkpoint Required: **yes**
Human Checkpoint Reason: Merge PR to production + Portal App Hosting + Studio publish require owner approval. STOP before merge/deploy.

Plan: `docs/workflow/plans/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-plan.md`
Plan Review: `docs/workflow/reviews/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-plan-review.md`
Implementation Review: `docs/workflow/reviews/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-implementation-review.md`
Portal count verification: `docs/workflow/reviews/2026-08-10-prelaunch-catalog-search-portal-count-verification.md`
Prod PR checkpoint: `docs/workflow/reviews/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-prod-pr-checkpoint.md`

Hotfix branch: `hotfix/prelaunch-catalog-search-count-first-visit-ux`
Hotfix base: `origin/production` @ `b6e67be1b7fe02a69cd31077a203ee9102611ca5`

## Parked prior workflow
- Chris Corner tag backfill — do not include in this branch/commit.

Allowed Actions: commit on hotfix (narrow); push hotfix + open PR (no merge); prepare owner QA
Forbidden Actions: merge to production; Portal App Hosting; Studio production publish; Functions/Rules/indexes; Algolia setSettings/reconcile; DNS/domain cutover; include Chris Corner artifacts

Next Required Step: Commit hotfix → push → open PR to production → STOP for owner merge/deploy approval

## Decision Log
- 2026-08-10: Plan + Formal Review approved_with_changes.
- 2026-08-10: Implement on hotfix from origin/production tip.
- 2026-08-10: Portal complete count — no UI change (authority path already aggregate/nbHits).
- 2026-08-10: Implementation Review approved after archived-count + comment + commit-scope corrections.
- 2026-08-10: Functions/Rules/indexes/Algolia settings untouched.
