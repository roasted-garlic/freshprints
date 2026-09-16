## FreshForge State

| Field | Value |
|---|---|
| Status | **IDLE — Signoff complete; reviewed commit/push completed** |
| DONE | **yes** |
| Signoff Status | **approved_with_notes** |
| Current Mode | managed-phase |
| Parent program | Pre-production reliability / safety |
| Current Goal | `print-request-count-parity-across-show-queue-and-summary-surfaces` |
| Related follow-up | `portal-unqueue-capacity-cache-and-studio-cancel-parity` — closed through this Signoff |
| Current Phase | **Signoff complete** |
| Plan Status | **approved_with_changes — implementation complete** |
| Review Status | **approved_with_changes — conditions satisfied; owner authorization received** |
| Implementation Status | **complete within approved scope, including follow-up fixes** |
| Test Status | **passed_with_notes — parity/cross-surface 115/0; follow-up 6/6; typechecks; lint; builds; diff check** |
| Human Checkpoint Required | **no — Owner DEV QA PASS WITH NOTES recorded 2026-09-16** |
| Human Checkpoint Reason | Resolved — remove→re-add historical-allocation behavior accepted in DEV; exact production record smoke remains promotion-gated |
| Blocked | **no** |
| Allowed Actions | Await owner direction for a new managed goal or separately authorized production promotion. |
| Forbidden Actions | Production IAM/deploy; Portal production App Hosting; Studio release; Functions/Rules/Storage production deployment; migrations/data mutation; unrelated scope expansion. |
| Last Completed Step | Signoff — Owner DEV QA PASS WITH NOTES recorded; required durable docs/state/handoff/manifest reconciled; reviewed commit/push completed on `development`. |
| Next Required Step | FreshForge IDLE — owner selects the next managed goal or separately authorizes a production promotion checkpoint. |
| Decision Log | 2026-09-16 — Owner accepted DEV QA PASS WITH NOTES for count parity after validating remove→re-add historical allocation behavior. Parent Signoff approved_with_notes; related cache/cancel follow-up closed; exact production smoke remains separately gated. |
| Artifacts | Parent and follow-up Plans, Formal Reviews, Test Reports, Owner DEV QA checklists, Signoffs, durable docs, cumulative Promotion Manifest, and updated handoff package |
| Files Created | Shared production-shaped fixture/tests; Portal parity/cache contracts; Functions cancel contract; workflow Plans/Reviews/Test Reports/QA checklists/Signoffs |
| Files Modified | Shared identity/summary/allocation metrics; Studio Show Queue/Add-to-Show/Staff Inbox/history; Portal request summaries/queue planning/cache; existing dashboard and unqueue Functions; durable docs, handoff, manifest |
| Tests Run | Focused parity/cross-surface suite 115 passed/0 failed; follow-up contracts 6/6; Portal/Studio/Functions typechecks; changed-file ESLint; Studio build; Functions build; diff check |
| Signoff | **approved_with_notes — Owner DEV QA PASS WITH NOTES; commit/push completed on `development`** |
| Manifest | Studio release REQUIRED; Portal App Hosting REQUIRED; existing `getPortalAdminUpcomingShowQueueDashboard` and `unqueueStudioCustomerPrintRequestFromShow` Functions REQUIRED; Firestore/Storage Rules, indexes, migrations, backfills, and production data repair NONE |
