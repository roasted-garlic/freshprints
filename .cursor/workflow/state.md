## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| Phase | **STOP before DEV deploy — WS3 configurable pricing amendment** |
| WS1 Owner QA | **PASS** |
| WS2 Owner QA | **PASS** |
| WS3 Owner QA | **PENDING AFTER CONFIGURABLE SETTINGS AMENDMENT** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| Managed goal signoff | **NOT AUTHORIZED** |
| Last updated | 2026-09-01 |

## Workstream summary

| WS | Scope | Owner DEV QA |
|----|-------|--------------|
| WS1 | Remove from Show & Edit | **PASS** |
| WS2 | Custom Request Final Artwork | **PASS** |
| WS3 | Gang-sheet configurable price + weight tiers | **PENDING AFTER AMENDMENT** |

## WS3 amendment (2026-09-01)

Plan: `docs/workflow/plans/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-amendment.md`  
Review: **approved**  
Implementation + tests: **complete locally**  
Implementation review: **approved**  
**STOP:** DEV Firestore Rules deploy + Studio restart before owner QA

Prior hard-coded WS3 (6″ / $1·$2 / flat 0.75 oz) superseded — do not record PASS on old model.

## Standalone corrective (not part of managed goal)

| Item | Owner QA |
|------|----------|
| AI Review Approve/Reject Firestore Rules (`artworkBackgroundSource` on `catalogMetadataOnlyUpdate`) | **PASS** |

Deploy record: `docs/workflow/reviews/2026-09-01-ai-review-artwork-background-source-rules-dev-deploy-record.md`

DEV Rules alignment (2026-09-01): `docs/workflow/reviews/2026-09-01-dev-firestore-rules-alignment-drift-correction-deploy-record.md` — redeployed committed `56717c53` to remove unintended live `showAllocations` drift.

## Next step

Owner approves DEV deploy: `firebase deploy --only firestore:rules --project fresh-prints-dev`, then restart Studio and run WS3 owner QA checklist in implementation review doc.

Reply `WS3 PASS`, `WS3 PASS WITH NOTES: …`, or `WS3 FAIL: …`.

**Do not sign off the managed goal until WS3 passes. Do not deploy production. Do not start Smart Profiling.**

## Allowed actions

- Owner-approved DEV Firestore Rules deploy for WS3 pricing fields
- Owner WS3 manual QA after deploy
- Read docs / workflow state
- Record WS3 result when owner replies

## Forbidden actions

- Managed goal signoff (WS3 still pending)
- Production deploy
- Smart Profiling implementation
- Mixing unrelated working-tree changes into the AI Review Rules commit

## Decision log

| Date | Decision |
|------|----------|
| 2026-09-01 | WS1 owner DEV QA **PASS** |
| 2026-09-01 | WS2 owner DEV QA **PASS** (Final Artwork corrective verified) |
| 2026-09-01 | AI Review Rules corrective owner QA **PASS** (standalone) |
| 2026-09-01 | WS3 amended to configurable Show Queue pricing/weight tiers; implement + test complete; STOP before DEV Rules deploy |
| 2026-09-01 | DEV Firestore Rules alignment redeploy — remove unintended `showAllocations` drift; committed `56717c53` → `fresh-prints-dev` |
