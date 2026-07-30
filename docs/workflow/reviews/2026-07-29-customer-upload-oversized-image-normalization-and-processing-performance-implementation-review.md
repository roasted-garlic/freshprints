# Implementation Review — `customer-upload-oversized-image-normalization-and-processing-performance` (Workstream A)

**Scope:** independent review of the actual final diff against the approved Plan and Formal Review's
three binding requirements — not a review of the implementation's own narrative claims.

## Verdict: APPROVED

All required checklist items pass, independently re-verified against the real diff.

## Files reviewed

- `functions/src/finalizeCustomerUploadZip.ts` (modified)
- `functions/src/lib/finalizeCustomerUploadZipAggregation.ts` (+ test, new)
- `packages/shared/src/utils/boundedConcurrencyQueue.ts` (+ test, new)
- `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts` (modified)
- `docs/project/DECISIONS.md` (ADR-FP-123 added)

## Findings

1. **Sequential-to-concurrent conversion is behavior-preserving — PASS.** Traced the full diff
   line-by-line against the pre-change source. The `alreadyReady` discovery-phase short-circuit
   (`imagesToProcess = pendingImages.filter((image) => !image.alreadyReady)`) is logically identical
   to the original `if (image.alreadyReady) continue;`. Every per-image Firestore write
   (`technicalStatus`/`technicalProgressStage` transitions, the final `ready`/`failed` document
   update) is preserved verbatim inside the task callback — no write was dropped, reordered, or
   changed in shape.
2. **Binding requirement 1 (post-settlement aggregation) — PASS.** `aggregateZipProcessingResults`
   (`functions/src/lib/finalizeCustomerUploadZipAggregation.ts`) takes the *entire* settled-results
   array as input and returns computed totals — it has no path to run before every task has
   resolved, since it's called only after `await mapWithConcurrency(...)` returns. No `readyCount`/
   `failedCount` mutation happens inside the task callback itself (confirmed by reading the callback
   body: it `return`s a `FinalizeCustomerUploadZipFileResult`, never touches the outer `readyCount`/
   `failedCount` variables). The randomized-completion-order test in
   `finalizeCustomerUploadZipAggregation.test.ts` (5 repeated attempts with different `setTimeout`
   delays per item) proves this is genuinely order-independent, not merely order-independent by
   accident of the current test's timing.
3. **`mapWithConcurrency` cannot leak the aggregation into a race — PASS, verified independently.**
   Traced `BoundedConcurrencyQueue.run()`: the task passed to `queue.run()` internally wraps
   `task(item, index)` in its own try/catch, so `queue.run()` itself always *resolves* (never
   rejects) with a `SettledTaskResult`. This means `Promise.all(items.map(...queue.run...))` cannot
   short-circuit on a single item's failure — every item settles into the array. Confirmed this
   matches `Promise.allSettled` semantics exactly, satisfying the Plan's explicit requirement ("not
   fail-fast").
4. **Binding requirement 2 (reuse evaluation) — PASS.** Independently confirmed
   `functions/tsconfig.json`'s `include: ["src", "../packages/shared/src"]` genuinely excludes
   `apps/studio/electron` — a direct import would not compile. The relocated
   `BoundedConcurrencyQueue` class in `packages/shared/src/utils/boundedConcurrencyQueue.ts` is
   line-for-line equivalent to `DerivativeConcurrencyQueue`'s `acquire`/`release`/`waitQueue`
   mechanism (verified by direct comparison), generalized only to accept `maxConcurrency` as a
   constructor parameter instead of hardcoding `DERIVATIVE_PROCESSING_CONCURRENCY`. This is
   adaptation, not reinvention, and the incompatibility (cross-app import boundary) is concretely
   real, not asserted.
5. **Binding requirement 3 (ADR-FP-123 memory arithmetic) — PASS.** Re-derived the arithmetic
   independently rather than trusting the ADR's own numbers:
   - `100,000,000 px × 4 bytes = 400,000,000 bytes = 381.47 MiB` — confirmed (ADR states "≈381.5
     MiB", consistent with rounding).
   - `2048 MiB − 200 MiB = 1848 MiB` usable — confirmed, arithmetic checks out.
   - Per-image peak `80 + 381.5 = 461.5 MiB` — confirmed.
   - `461.5 × 3 = 1384.5 MiB` (ADR states 1384.4, negligible rounding) against 1848 MiB usable =
     463.5–463.6 MiB margin ≈ 25.1% — confirmed.
   - `461.5 × 4 = 1846 MiB` against 1848 MiB usable = ~2 MiB margin ≈ 0.1% — confirmed, correctly
     rejected.
   - The ADR explicitly separates proven constants (memory allocation, pixel/byte ceilings, upscale
     target constants — all cited with exact source locations) from derived arithmetic from
     estimates requiring runtime validation (the 200 MiB overhead reserve, the "one raster at a
     time" per-image model) — this is exactly the required structure, not just present but correctly
     categorized.
6. **Failure isolation and result association — PASS, tested.** The 100-entry concurrency test
   (`finalizeCustomerUploadZipAggregation.test.ts`) uses the *real* exported
   `CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY` and `CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES`
   constants (not hardcoded literals), so a future change to either constant without a corresponding
   test update would be caught rather than silently drifting. Confirmed `maxActiveSharpPipelines <=
   3` is asserted against the actual imported constant.
7. **No accepted format, limit, or quality policy changed — PASS.** `processCustomerUploadImageBytes`
   (`functions/src/lib/customerUploadProcessing.ts`) has zero diff. Its existing 8-test suite passes
   unmodified — this is strong evidence against any accidental processing-logic drift, since any
   change to that file's behavior would need to also touch the file to introduce, and none was
   touched.
8. **No PII/content logging — PASS.** The new `logger.info("finalizeCustomerUploadZip.processingBatch",
   {...})` call logs exactly five fields: `imageCount`, `concurrency`, `processingDurationMs`,
   `readyCount`, `failedCount` — all aggregate numbers, no filename, path, customer ID, or image
   content. Confirmed by reading the exact call site.
9. **No Function configuration change — PASS.** `onCall({ timeoutSeconds: 540, memory: "2GiB" },
   ...)` is unchanged (confirmed via diff — this line does not appear in the diff at all). No Human
   Checkpoint was required or bypassed.
10. **Scope discipline — PASS.** `git status` confirms exactly five files touched (two new source +
    two new test files + two modified source files + one doc), all within the Plan's Files/Modules
    list or its explicitly-anticipated new-helper-file allowance. No Workstream B or C file was
    touched. No Storage Rules, dependency, or schema file appears in the diff.

## Residual Risk

- The "one raster at a time" per-image memory model in ADR-FP-123 is explicitly flagged by the ADR
  itself as an estimate requiring runtime validation, not a proven constant. This is appropriately
  honest rather than a defect — the ADR does not overclaim certainty it doesn't have, and a real
  dev-environment measurement (which requires separate owner approval, correctly not performed here)
  is the natural follow-up if this function is ever observed approaching memory limits in practice.
- `mapWithConcurrency`'s current implementation always resolves settled results in `items` order
  (via `Promise.all` over per-item task promises, each already resolved to a `SettledTaskResult`) —
  this is correct and matches the Plan's requirement, but is worth noting as a design choice: it does
  *not* stream results as they complete, so `finalizeCustomerUploadZip` cannot report partial
  progress mid-batch beyond the existing per-image Firestore status writes (which already provide
  that visibility). Not a defect — no requirement asked for streaming aggregation.

## Recommendation

Proceed to Test-phase closure and workflow-state update. No further implementation work is required
for this goal's approved scope (Workstream A). Do not deploy — this remains dev-only per the Plan's
scope; no deployment gate has been requested or is required to close this goal.
