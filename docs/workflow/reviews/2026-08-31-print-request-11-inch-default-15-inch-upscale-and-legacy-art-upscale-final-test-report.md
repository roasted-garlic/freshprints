# Final Test Report: Print Request Sizing + Interactive Upscale

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Status | **passed_with_notes** |
| Owner DEV QA | **PASS** |

---

## Consolidated automated run (closeout)

| Check | Command | Result |
|-------|---------|--------|
| WS-CONFIG + WS-TOGGLE + export parity + rules alignment | `npx tsx --test packages/shared/src/utils/interactiveArtworkEnhance.test.ts packages/shared/src/utils/printRequestItemSizing.test.ts packages/shared/src/utils/printRequestItemArtworkEnhanceFields.test.ts packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.test.ts packages/shared/src/utils/resolveShowExportProductionAsset.test.ts packages/shared/src/utils/printAssetResolution.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts packages/shared/src/constants/design/designStoragePaths.test.ts functions/src/lib/setPrintRequestItemArtworkEnhanceModeCore.test.ts functions/src/addPortalCatalogDesignToPrintRequest.test.ts` | **PASS (119/119)** |
| Functions build | `npm --prefix functions run build` | **PASS** |

---

## Prior corrective suites (reconciled)

| Suite / area | Tests | Result | Record |
|--------------|-------|--------|--------|
| Initial sizing / 15″ automated / gang two-up | 62+ | PASS | `2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-test-report.md` |
| WS-CONFIG default + rules alignment | 58 | PASS | `2026-08-30-ws-config-default-test-report.md` |
| WS-TOGGLE state machine + enhance core | 43 | PASS | parent test report (2026-08-31 corrective) |
| Production export parity | 39 | PASS | `2026-08-31-ws-toggle-production-export-parity-implementation-review.md` |
| Storage path + rules + enhance core (post-fix) | 49 | PASS | `2026-08-31-ws-toggle-interactive-original-storage-read-fix-implementation-review.md` |
| Size-edit preserve enhanced mode | covered in `printRequestItemArtworkEnhanceFields.test.ts` | PASS | `2026-08-31-ws-toggle-size-edit-preserve-enhanced-mode-implementation-review.md` |
| Portal catalog-add sizing | 16 | PASS | `addPortalCatalogDesignToPrintRequest.test.ts` + portal client parity tests |

---

## Owner DEV QA

| Result | **PASS** (2026-08-31) |
|--------|------------------------|
| Record | `docs/workflow/reviews/2026-08-30-ws-config-default-owner-qa-pass.md`; owner final closeout prompt 2026-08-31 |

**Confirmed behaviors:** configurable default; 10″ fallback; first interactive upscale; derivative reuse; Reset to Default; re-enable reuses derivative; ON/OFF toggling; size + Standard Size edits preserve enhanced mode; no regeneration on larger sizes; production exports honor enhanced mode; Storage read fix for interactive catalog originals.

**Prior FAIL (resolved):** production export used baseline paths; Storage rules denied staff read of `.interactive.png` — fixed in `c84ec449`, `9c9f7f0e`; DEV deploy `fresh-prints-dev` 2026-08-31.

---

## Notes / pre-existing unrelated failures

- Full monorepo Studio/Portal `tsc` was **not** re-run as a gate for this goal; prior sessions documented **pre-existing unrelated** typecheck failures — **not** claimed fixed by this goal.
- Assisted-creation proof Function (`customerAddAssistedApprovedProofToPrintRequest`) intentionally **not** redeployed for 15″ bundle — out of scope.
- `git diff --check` clean on committed closeout files.

---

## Manual DEV QA

**PASS** — owner verified interactive upscale workflow and production export behavior on `fresh-prints-dev` (2026-08-31).
