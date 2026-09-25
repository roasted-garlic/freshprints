# Test Report: Orientation-Aware Gang-Sheet Shelf Packing Efficiency

| Field | Value |
|---|---|
| Date | 2026-09-24 |
| Managed goal | `gang-sheet-orientation-aware-shelf-packing-efficiency` |
| Agent | Independent Test Agent |
| Result | Automated verification passed; Owner DEV QA accepted the implemented result |
| Signoff | Completed as **approved_with_notes** after Owner DEV QA PASS |

## Commands and results

1. `npx tsx --test packages/shared/src/utils/gangSheetNesting.test.ts packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts packages/shared/src/utils/gangSheetGroupedLayout.test.ts packages/shared/src/utils/gangSheetContinuousCustomerGroupedLayout.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts apps/studio/electron/ipc/export/exportRequestValidation.test.ts`
   - Exit code: `0`
   - Result: `73` tests passed, `0` failed, `0` skipped, `0` cancelled, `0` todo; `15` top-level subtests across `13` suites.

2. From `apps/studio`: `npx tsc --noEmit`
   - Exit code: `0`
   - Result: passed with no diagnostics.

3. `npx eslint packages/shared/src/utils/gangSheetNesting.ts packages/shared/src/utils/gangSheetNesting.test.ts packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts`
   - Exit code: `0`
   - Result: passed with no lint findings.

4. From `apps/studio`: `npx vite build`
   - Exit code: `0`
   - Result: renderer, Electron main, and preload bundles built successfully.
   - Warnings: one dynamic-import/static-import chunking warning for `customerUploadReadService.ts`; one for generated `packagedBuildConfig.ts`; and a warning that some chunks exceed 500 kB. These are pre-existing build warnings and did not fail the build.

5. `git diff --check`
   - Exit code: `0`
   - Result: no whitespace errors.
   - The worktree contains unrelated pre-existing changes; they were not modified.

## Exact A/B fixture

Inputs: 300 DPI, 23-inch sheet (`6900 px`), side margins `75 px`, top/bottom margins `150 px`, gutter `150 px`; A `3900 × 2805 px` quantity `10`; B `3600 × 2427 px` quantity `5`.

| Measurement | Baseline | Implemented result |
|---|---:|---:|
| Nested feed height | `42,585 px` (`141.95 in`) | `30,477 px` (`101.59 in`) |
| Physical sheets | 1 | 1 |
| Placements | 15 | 15 |
| Shelf rows | 15 | 8 |
| Skipped placements | 0 | 0 |
| Reduction | — | `12,108 px` (`40.36 in`), `28.43%` |

The repeated in-memory run was deterministic. The observed orientation plan is five paired A rows with A rotated, two paired B rows with B rotated, and one final unpaired B row unrotated. All placement bounds and row non-overlap assertions passed.

## Acceptance discrepancy

The earlier formal review specified `33,675 px` (`112.25 in`) and `10` rows, with A retained
original and B rotated in useful pairs. The implementation and focused tests produce `30,477 px`
and `8` rows using the complete-layout score. Owner DEV QA accepted the implemented result as the
authoritative regression contract and classified the earlier expectation as conservative/incorrect,
not an implementation defect.

## Signoff status

Owner DEV QA PASS is recorded: two real DEV gang sheets were generated, including the original
13.00 × 9.35 / 12.00 × 8.09 fixture and an additional regression case. Rotation, two-up
placement, straight cuttable rows, no overlap/clipping, exact quantities, output shortening, and
ordinary-sheet behavior were accepted. Signoff is `approved_with_notes`.
