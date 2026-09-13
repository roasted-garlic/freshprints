# Test Report: Studio customer-upload artwork background auto-detect

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Plan | `docs/workflow/plans/2026-09-05-studio-customer-upload-import-parity-artwork-background-auto-detect-plan.md` |
| Result | **passed_with_notes** |

## Commands run

| Check | Command | Exit |
|-------|---------|------|
| Shared unit | `npx tsx --test packages/shared/src/utils/customerUploadArtworkBackgroundDetection.test.ts` | 0 (4 pass) |
| Functions | `npx tsx --test functions/src/promoteCustomerUploadToAiReview.workstream-c.test.ts functions/src/lib/customerUploadProcessing.test.ts` | 0 (34 pass) |
| Studio contract | `npx tsx --test apps/studio/.../customerUploadIntakePreviewControls.workstream-c.test.ts` | 0 (8 pass) |

## Notes

- Live Studio verification needs **Functions deploy** (detector write on finalize) **and** Studio build/reload (Auto wiring).
- Historical ready uploads without `suggestDarkArtworkBackground` stay light until **Retry** processing or a new finalize.
- Manual Studio smoke still recommended after DEV deploy.

## Manual checkpoint (after DEV Functions + Studio)

**Feature:** Studio CU Auto dark mat from import detector  
**Environment:** DEV Studio customer uploads  
**Prerequisites:** Functions with this change deployed; reprocess or new light line-art upload

### Steps
1. Open a light sparse line-art ready upload → **Expected:** Auto shows Dark mat without staff click.
2. Switch to Light → **Expected:** Light sticks (`staff_manual`).
3. Switch back to Auto → **Expected:** Dark restored (`code_auto`), hint preserved.
4. Portal customer upload UI → **Expected:** unchanged (no new background control).

### Please reply with
- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
