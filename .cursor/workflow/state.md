# Current Goal
**PRODUCTION PROMOTE IN PROGRESS — `APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED` received.**

Current Mode: managed-phase
Current Phase: implement (production promotion)
Managed goal: Promote prelaunch companion/censored/featured/text-censor + DEV correctives to production

Plan: `docs/workflow/plans/2026-08-10-prelaunch-companion-censored-production-promotion-plan.md`
Checkpoint: `docs/workflow/reviews/2026-08-10-prelaunch-companion-censored-production-promotion-checkpoint.md`

Owner phrase: **`APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED`** (2026-08-10)

Plan Status: complete (executing)
Review Status: approved (owner phrase)
Implement Status: in_progress
Test Status: pending (post-promote smoke)
Signoff Status: pending
DONE: no

Human Checkpoint Required: no (phrase received; execute promote; stop for smoke QA)
Allowed Actions: commit+merge development→production; deploy firestore rules/indexes; scoped function getPortalGlobalOpenGraph; App Hosting prod; Studio package workflow; record SHA; smoke checklist
Forbidden Actions: myprintrequest.com; DNS; Auth domains; Coming Soon removal; Algolia reconcile/mutate; unfiltered functions deploy

Next Required Step: Commit promote tree → merge to production → deploy Rules/indexes/Function/App Hosting → Studio package → owner smoke

## Deploy confirmation (start of promote)
- fresh-prints-prod: **authorized — in progress**
- App Hosting prod: **authorized — pending**
- Studio prod: **authorized — pending**
- Algolia: **untouched** (no mutate)
- myprintrequest.com: **untouched**

## Decision Log
- 2026-08-10: Owner `APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED` — begin production promotion sequence.
