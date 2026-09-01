## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| Phase | **WS3 owner DEV QA IN PROGRESS** |
| WS1 Owner QA | **PASS** |
| WS2 Owner QA | **PASS** |
| WS3 Owner QA | **IN PROGRESS** — owner retry Internal Gang Sheet settings + Tests A–G |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| Managed goal signoff | **NOT AUTHORIZED** |
| Last updated | 2026-09-01 |

## Workstream summary

| WS | Scope | Owner DEV QA |
|----|-------|--------------|
| WS1 | Remove from Show & Edit | **PASS** |
| WS2 | Custom Request Final Artwork | **PASS** |
| WS3 | Gang-sheet configurable price + weight tiers (+ Internal Gang Sheet settings split) | **IN PROGRESS** |

## WS3 amendment (2026-09-01)

Plan: `docs/workflow/plans/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-amendment.md`  
Review: **approved**  
Implementation + tests: **complete locally**  
Implementation review: **approved**  
Implementation SHA: `40fe7fd0`  
Show Queue pricing Rules deploy: `docs/workflow/reviews/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-dev-rules-deploy-record.md` (@ `40fe7fd0`)  
Internal Gang Sheet settings Rules deploy: `docs/workflow/reviews/2026-09-01-pre-smart-profiling-internal-gang-sheet-settings-dev-rules-deploy-record.md` — live DEV @ working-tree +41 lines; **git aligned** (no redeploy)  
**STOP:** owner WS3 manual QA — do **not** sign off until WS3 PASS

Prior hard-coded WS3 (6″ / $1·$2 / flat 0.75 oz) superseded — do not record PASS on old model.

## Standalone corrective (not part of managed goal)

| Item | Owner QA |
|------|----------|
| AI Review Approve/Reject Firestore Rules (`artworkBackgroundSource` on `catalogMetadataOnlyUpdate`) | **PASS** |

Deploy record: `docs/workflow/reviews/2026-09-01-ai-review-artwork-background-source-rules-dev-deploy-record.md`

DEV Rules alignment (2026-09-01): `docs/workflow/reviews/2026-09-01-dev-firestore-rules-alignment-drift-correction-deploy-record.md` — redeployed committed `56717c53` to remove unintended live `showAllocations` drift.

## Next step

Owner retries Internal Gang Sheet settings save on DEV (Rules deployed). Continue WS3 QA (Tests A–G). Reply `WS3 PASS`, `WS3 PASS WITH NOTES: …`, or `WS3 FAIL: …`.

## Allowed actions

- Owner WS3 manual QA
- Read docs / workflow state
- Record WS3 result when owner replies

## Forbidden actions

- Managed goal signoff (WS3 still in progress)
- Production deploy
- Smart Profiling implementation
- Additional Firebase deploy without owner authorization

## Decision log

| Date | Decision |
|------|----------|
| 2026-09-01 | WS1 owner DEV QA **PASS** |
| 2026-09-01 | WS2 owner DEV QA **PASS** (Final Artwork corrective verified) |
| 2026-09-01 | AI Review Rules corrective owner QA **PASS** (standalone) |
| 2026-09-01 | WS3 Show Queue pricing Rules deploy to `fresh-prints-dev` @ `40fe7fd0` |
| 2026-09-01 | Internal Gang Sheet settings Rules deploy to `fresh-prints-dev` — working-tree +41 lines; git aligned to `development` (no redeploy) |
| 2026-09-01 | DEV Firestore Rules alignment redeploy — remove unintended `showAllocations` drift; committed `56717c53` → `fresh-prints-dev` |
