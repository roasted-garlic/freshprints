# Test Report: Print Request 11″ / 15″ / Legacy Enhance

| Field | Value |
|-------|-------|
| Date | 2026-08-30 (updated after owner QA FAIL) |
| Goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Status | **passed_with_notes** (state-machine corrective 43/43; owner QA **re-test pending** after DEV deploy) |

## State-machine corrective (2026-08-31)

| Check | Command | Result |
|-------|---------|--------|
| WS-TOGGLE policy + sizing | `npx tsx --test packages/shared/src/utils/interactiveArtworkEnhance.test.ts packages/shared/src/utils/printRequestItemSizing.test.ts packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts functions/src/lib/setPrintRequestItemArtworkEnhanceModeCore.test.ts` | **PASS** (43/43) |
| Functions build | `npm --prefix functions run build` | **PASS** |
| `git diff --check` | pre-commit | **PASS** |

**Binding rule (owner-approved):** one interactive derivative per lineage; larger sizes reuse existing enhanced pixels — **no second derivative**.

## Owner DEV QA

| Result | **FAIL** |
|--------|----------|
| Finding 1 | Portal catalog add does not persist 11″ |
| Finding 2 | Studio Upscale artwork action not visible (eligibility, not wiring) |
| Finding 3 | WS-CONFIG-DEFAULT + WS-TOGGLE amendments — not implemented |

**Passed (retained):** Studio 11″; 15″ catalog import; customer upload 15″; DPI protections; gang-sheet two-up.

**Owner corrections (2026-08-30):** Quota model rejected; WS-CONFIG-DEFAULT added; Portal 11″ deploy held (Option B).

## Commands run (initial implementation)

| Check | Command | Result |
|-------|---------|--------|
| Shared sizing / enhance | `npx tsx --test packages/shared/src/utils/manualArtworkEnhance.test.ts packages/shared/src/utils/imageQualitySizingPolicy.test.ts packages/shared/src/utils/gangSheetNesting.test.ts` | **PASS** (62/62) |
| Studio PR init | `npx tsx --test apps/studio/src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts` | **PASS** |
| Functions policy | `npx tsx --test functions/src/lib/enhancePrintRequestArtworkCore.test.ts` | **PASS** |
| Import upscale | `npx tsx --test apps/studio/electron/services/import/upscaleImportImage.test.ts` | **PASS** (4/4) |
| PR sizing assess | `npx tsx --test packages/shared/src/utils/printRequestItemSizing.test.ts` | **PASS** |
| Functions build | `cd functions && npm run build` | **PASS** |

## Commands run (owner QA corrective — 2026-08-30)

| Check | Command | Result |
|-------|---------|--------|
| Portal catalog-add callable sizing | `cd functions && npx tsx --test src/addPortalCatalogDesignToPrintRequest.test.ts` | **PASS** (10/10) |
| Portal client sizing parity | `cd apps/portal && npx tsx --test features/print-requests/utils/portalCatalogAddInitialSizing.test.ts` | **PASS** (6/6) |
| Studio enhance eligibility | `cd packages/shared && npx tsx --test src/utils/manualArtworkEnhance.test.ts` | **PASS** (10/10) |

## Notes

- Full monorepo lint/typecheck not run in corrective session.
- Portal 11″ FAIL requires **DEV redeploy** of `addPortalCatalogDesignToPrintRequest` — not yet deployed (checkpoint STOP).
- Studio Upscale hidden at ≥300 DPI reflects **current** one-way button — superseded by toggle redesign (see review amendment).
- Portal enhance **toggle architecture not implemented** — blocked on revised Formal Review; **no customer quota**.

## Manual DEV QA

**FAIL** — see implementation review corrective section. Re-test Portal 11″ after approved Function redeploy.
