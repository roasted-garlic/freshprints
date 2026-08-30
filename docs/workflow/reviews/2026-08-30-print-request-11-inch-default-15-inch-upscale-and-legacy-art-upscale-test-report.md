# Test Report: Print Request 11″ / 15″ / Legacy Enhance

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Status | **passed_with_notes** |

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Shared sizing / enhance | `npx tsx --test packages/shared/src/utils/manualArtworkEnhance.test.ts packages/shared/src/utils/imageQualitySizingPolicy.test.ts packages/shared/src/utils/gangSheetNesting.test.ts` | **PASS** (62/62) |
| Studio PR init | `npx tsx --test apps/studio/src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts` | **PASS** |
| Functions policy | `npx tsx --test functions/src/lib/enhancePrintRequestArtworkCore.test.ts` | **PASS** |
| Import upscale | `npx tsx --test apps/studio/electron/services/import/upscaleImportImage.test.ts` | **PASS** (4/4) |
| PR sizing assess | `npx tsx --test packages/shared/src/utils/printRequestItemSizing.test.ts` | **PASS** |
| Functions build | `cd functions && npm run build` | **PASS** |

## Notes

- Full monorepo lint/typecheck not run in this session.
- `enhancePrintRequestArtwork` callable not exercised end-to-end against Firebase emulators (requires DEV deploy + manual QA).
- Portal has no enhance trigger (by design V1).

## Manual DEV QA

Pending owner — see implementation review checklist.
