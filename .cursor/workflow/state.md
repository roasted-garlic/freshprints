## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| Phase | **WS3 owner DEV QA — gang-sheet price + weight** |
| WS1 Owner QA | **PASS** |
| WS2 Owner QA | **PASS** |
| WS3 Owner QA | **PENDING / NEXT** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| Managed goal signoff | **NOT AUTHORIZED** |
| Last updated | 2026-09-01 |

## Workstream summary

| WS | Scope | Owner DEV QA |
|----|-------|--------------|
| WS1 | Remove from Show & Edit | **PASS** |
| WS2 | Custom Request Final Artwork | **PASS** |
| WS3 | Gang-sheet price + weight line | **PENDING** |

## Standalone corrective (not part of managed goal)

| Item | Owner QA |
|------|----------|
| AI Review Approve/Reject Firestore Rules (`artworkBackgroundSource` on `catalogMetadataOnlyUpdate`) | **PASS** |

Deploy record: `docs/workflow/reviews/2026-09-01-ai-review-artwork-background-source-rules-dev-deploy-record.md`

DEV Rules alignment (2026-09-01): `docs/workflow/reviews/2026-09-01-dev-firestore-rules-alignment-drift-correction-deploy-record.md` — redeployed committed `56717c53` to remove unintended live `showAllocations` drift.

## Next step

Owner runs WS3 gang-sheet QA (Tests A–H). Reply `WS3 PASS`, `WS3 PASS WITH NOTES: …`, or `WS3 FAIL: …`.

**Ensure Studio is on current `development` source** — restart `npm run dev:studio` if needed. No Studio release.

**Do not sign off the managed goal until WS3 passes. Do not deploy production. Do not start Smart Profiling.**

## Allowed actions

- Owner WS3 manual QA
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
| 2026-09-01 | Advance to WS3 owner QA; signoff remains blocked |
| 2026-09-01 | DEV Firestore Rules alignment redeploy — remove unintended `showAllocations` drift; committed `56717c53` → `fresh-prints-dev` |
