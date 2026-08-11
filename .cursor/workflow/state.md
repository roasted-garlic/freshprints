# Current Goal
Pre-final F3 — donation day-quota refund on hard delete + Portal customer self-delete.

Current Mode: managed-phase
Current Phase: implement (F3 only)
DONE: **no**
Last Completed Step: F3 implementation complete on `fix/prefinal-a-g-quota` (worktree); focused tests PASS
Plan Status: **complete** (`docs/workflow/plans/2026-08-11-prefinal-portal-search-and-global-og-corrective-plan.md`)
Review Status: **approved_with_changes** (F3 constraints binding)
Implementation Status: **complete** (F3 only — A–E–G / OG not in this branch)
Implementation Review: not_started
Test Status: **passed** (focused F3 unit + contract tests)
Signoff Status: not_started
Human Checkpoint Required: **yes**
Human Checkpoint Reason: Functions + Portal App Hosting deploy not authorized in this pass (Do NOT deploy).
Blocked: **no**

Branch: `fix/prefinal-a-g-quota`
Base: `913329caefa5cf5041b269da1e5192424d0b95c6` (`origin/production`)
Worktree: `C:/coding/fresh-prints-quota` (isolated from `fix/prefinal-a-g-portal`)

Allowed Actions: commit/PR when owner requests; await deploy approval
Forbidden Actions: production deploy; App Hosting; implement A–E–G/OG on this branch

Next Required Step: Owner review / PR for PR-Quota (F3); coordinate Functions deploy with other prefinal waves later

## Decision Log
- 2026-08-11: F3 implemented — Cap L untouched; donation `finalizeImageCountDonation` refund on successful hard delete (Studio + Portal); Portal `previewPortalCustomerUploadDeletion` / `deletePortalCustomerUpload`; Account artwork gallery confirmed delete + quota cache invalidate.
