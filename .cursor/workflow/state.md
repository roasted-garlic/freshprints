# Current Goal
Prelaunch catalog search UX — combined Portal hotfix: scroll preservation + Discover complete-library placeholder count.

Current Mode: managed-phase
Current Phase: production PR checkpoint (combined amendment) — await owner merge approval
DONE: **no**
Last Completed Step: Discover count amendment implemented; combined Implementation Review **approved**; gates PASS
Plan Status: **complete** (scroll + Discover count amendments)
Review Status: **approved** (both Formal Reviews)
Implementation Status: **complete**
Implementation Review: **approved** (combined)
Test Status: **passed**
Signoff Status: not_started
Human Checkpoint Required: **yes**
Human Checkpoint Reason: Owner finalize/merge combined production PR, then second Portal App Hosting rollout. Studio 1.0.3 / final QA / Signoff / development sync remain paused.
Blocked: **no**

Branch: `hotfix/portal-design-modal-scroll-preservation`
Base: `f5584451e8cff197e0dd1acc8ea747bc992a88a9`
Checkpoint: `docs/workflow/reviews/2026-08-10-portal-design-modal-scroll-preservation-prod-pr-checkpoint.md`

Allowed Actions: push branch tip; wait for owner merge; docs/state
Forbidden Actions: merge without owner; App Hosting rollout #2; Studio publish; Signoff; development sync; Functions/Rules/indexes; Algolia mutate; DNS/cutover

Next Required Step: Owner merge combined PR → second Portal App Hosting rollout → Studio 1.0.3 → owner QA (parent + scroll + Discover count)

## Decision Log
- 2026-08-10: Scroll root cause = PortalScrollReset on designId; fix approved and committed `fbc3733`.
- 2026-08-10: Discover ~85 = bounded `listHomeDiscoveryPool`; placeholder wrongly used `designs.length`; fix uses `countReadyDesigns` via `readyLibraryCount`.
