# Test Report: Customer-Upload Oversized-Image Normalization and Processing Performance (Workstream A)

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Phase | test |
| Plan | `docs/workflow/plans/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-review.md` (approved_with_changes) |
| Result | **passed** |

---

## Summary

Implemented Workstream A only, per the approved Plan/Review. Replaced
`finalizeCustomerUploadZip.ts`'s fully sequential per-image processing loop with bounded concurrency
(3), aggregating batch counters deterministically after every task settles. All three Formal Review
binding requirements are satisfied:

1. **Post-settlement aggregation.** `readyCount`/`failedCount`/`fileResults` are computed in a single
   deterministic pass (`aggregateZipProcessingResults`,
   `functions/src/lib/finalizeCustomerUploadZipAggregation.ts`) after `mapWithConcurrency` returns —
   never mutated from inside a concurrently-running task callback.
2. **`DerivativeConcurrencyQueue` evaluated first.** Confirmed the existing
   `apps/studio/electron/services/import/derivativeConcurrencyQueue.ts` pattern has zero
   Electron-specific dependencies, but confirmed it is **not directly importable** into
   `functions/src` (`functions/tsconfig.json`'s `include` is `["src", "../packages/shared/src"]`
   only — `apps/studio/electron` is out of that boundary). Relocated the identical
   acquire/release/wait-queue mechanism to `packages/shared/src/utils/boundedConcurrencyQueue.ts` so
   both Studio and Functions import the same code, rather than forking it. The Studio file itself was
   not modified (out of this goal's approved file list).
3. **ADR-FP-123 shows explicit memory arithmetic.** `docs/project/DECISIONS.md` — full worst-case
   calculation (proven constants vs. derived arithmetic vs. estimates requiring runtime validation,
   clearly separated), concurrency budget table for 1/2/3/4, selected value 3 with a documented 25.1%
   safety margin at the absolute worst case.

No accepted format, size/pixel limit, transparency rule, upscale policy, or DPI floor changed. No
Storage Rules, dependency, schema, or Function memory/timeout configuration changed — no Human
Checkpoint was triggered.

---

## Toolchain

| Item | Value |
|------|-------|
| `npx tsc -v` | Version 5.9.3 |

---

## Automated Checks — Required Commands

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Functions build | `npm run build --prefix functions` | `0` | pass |
| Repository lint | `npm run lint` | `0` | pass — 0 errors, 0 warnings |
| Changed-file lint | `npx eslint functions/src/finalizeCustomerUploadZip.ts functions/src/lib/finalizeCustomerUploadZipAggregation.ts functions/src/lib/finalizeCustomerUploadZipAggregation.test.ts packages/shared/src/utils/boundedConcurrencyQueue.ts packages/shared/src/utils/boundedConcurrencyQueue.test.ts packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts --report-unused-disable-directives --max-warnings 0` | `0` | pass |
| Diff whitespace/integrity | `git diff --check` | `0` | pass |

---

## Automated Checks — Focused Tests

All run via `npx tsx --test <files>`.

| Suite | File | Tests | Pass | Fail |
|---|---|---|---|---|
| Bounded-concurrency queue (new) | `packages/shared/src/utils/boundedConcurrencyQueue.test.ts` | 10 | 10 | 0 |
| ZIP-batch aggregation (new) | `functions/src/lib/finalizeCustomerUploadZipAggregation.test.ts` | 7 | 7 | 0 |
| Customer-upload image processing (unmodified — proves no processing-logic drift) | `functions/src/lib/customerUploadProcessing.test.ts` | 8 | 8 | 0 |
| ZIP extraction/validation (unmodified, adjacent) | `functions/src/lib/customerUploadZip.test.ts` | 6 | 6 | 0 |
| **Combined run (final)** | all of the above, single invocation | **31** | **31** | **0** |

### Specific requirement coverage

| Test requirement | Test | Result |
|---|---|---|
| Concurrency never exceeds the selected bound | `BoundedConcurrencyQueue`: "never exceeds the configured concurrency ceiling"; `mapWithConcurrency`: "never runs more than maxConcurrency tasks simultaneously across a 100-item batch"; aggregation suite: "never runs more than the real `CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY` (3) simultaneous 'sharp pipelines' across a maximum-entry (100-image) batch" | pass |
| All tasks eventually settle | `mapWithConcurrency`: "resolves with an empty array"/"resolves for a single-item list without hanging"; the 100-entry concurrency test asserts `activeSharpPipelines === 0` after settlement | pass |
| Task rejection releases capacity | `BoundedConcurrencyQueue`: "releases the permit and lets a waiter proceed when a task rejects" | pass |
| One failure does not cancel unrelated entries | `mapWithConcurrency`: "keeps a rejected item's failure isolated"; aggregation: "one image's failure does not affect sibling images' outcomes" | pass |
| Result association remains correct | aggregation: "folds a rejected task in as a failed image with correct entry/uploadId association"; the randomized-order determinism test asserts each `uploadId` maps to exactly its own `entryName` | pass |
| Aggregation occurs after settlement | Design-level: `aggregateZipProcessingResults` takes the full settled array as input, has no access to in-flight state; verified by the randomized/reversed-completion-order test still producing correct final counts | pass |
| Counters are deterministic | aggregation: "is deterministic when driven through the real bounded-concurrency queue with randomized completion order" — 5 repeated attempts, exact counts asserted each time | pass |
| Existing success/failure semantics unchanged | `customerUploadProcessing.test.ts` (8/8) passes **unmodified** — no processing-logic file was edited | pass |
| Idempotent/already-processed entries remain correct | `finalizeCustomerUploadZip.ts`'s `alreadyReady` short-circuit (`imagesToProcess = pendingImages.filter((image) => !image.alreadyReady)`) is unchanged from the pre-existing sequential version — already-ready images are excluded from the concurrency pool entirely and their pre-existing `fileResults`/`readyCount` entry (pushed during the discovery phase, unchanged code) is preserved | pass (by inspection — no discovery-phase code was touched) |
| Empty and single-entry ZIP behavior | `mapWithConcurrency`: "resolves with an empty array for an empty item list"; "resolves for a single-item list without hanging"; aggregation: "handles an empty batch"; "handles a single-entry batch" | pass |
| Maximum-entry scheduling does not create 100 simultaneous pipelines | aggregation: 100-entry test using the real `CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES` and `CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY` constants, asserts `maxActiveSharpPipelines <= 3` | pass |
| Queue implementation cannot deadlock | `BoundedConcurrencyQueue`: "does not deadlock when every task rejects" (6 rejecting tasks against concurrency 2, all settle) | pass |
| Memory-budget arithmetic constants and selected concurrency remain aligned | ADR-FP-123 cites `CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY = 3` from the same constants file the arithmetic is based on; the aggregation test suite imports and asserts against the real constant (not a hardcoded literal), so a future constant change without a re-run test update would be caught by CI | pass |

Fixtures: all test data is generated programmatically (in-memory delays, synthetic task functions) —
no binary image fixtures were added or needed, since the concurrency/aggregation logic under test is
independent of actual image bytes (that boundary is exercised by the unmodified
`customerUploadProcessing.test.ts`, which already uses `sharp`-generated in-memory PNGs).

---

## Manual

- [x] Not required. No UI change; no Function configuration change; no Human Checkpoint triggered.
- No dev-environment Cloud Function invocation was performed (would require separate owner approval
  per the Plan — not needed since all required behavior is provable at the unit level).

---

## Preserved Behavior (verified)

- Server-authoritative validation: `processCustomerUploadImageBytes` is byte-for-byte unmodified;
  its own 8/8 test suite passes without any change.
- Transparency requirements, ADR-FP-080 image-quality behavior, upscale policy: unchanged (no file
  implementing these was touched).
- 200-effective-DPI Print Request save floor (ADR-FP-075): untouched — this goal does not modify
  Print Request save-time validation.
- `CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE` per-customer lease: unchanged, orthogonal mechanism.
- Storage paths and metadata contracts: unchanged — `getCustomerUploadProductionStoragePath` etc.
  calls and their arguments are identical to the pre-existing code.
- Idempotency: the `alreadyReady` short-circuit and the batch-level `zipExtractionStatus === "complete"`
  early-return are both unchanged.
- Failure isolation: proven by the new aggregation tests (one failure never prevents sibling images
  from being correctly reported).
- No customer filenames, image content, Storage tokens, or paths are logged — the new
  `finalizeCustomerUploadZip.processingBatch` log entry contains only `imageCount`, `concurrency`,
  `processingDurationMs`, `readyCount`, `failedCount`.

---

## Files Changed

### New

- `packages/shared/src/utils/boundedConcurrencyQueue.ts` — general-purpose bounded-concurrency
  semaphore + `mapWithConcurrency` helper, adapted from `DerivativeConcurrencyQueue`.
- `packages/shared/src/utils/boundedConcurrencyQueue.test.ts` — 10 focused tests.
- `functions/src/lib/finalizeCustomerUploadZipAggregation.ts` — pure post-settlement aggregation
  function.
- `functions/src/lib/finalizeCustomerUploadZipAggregation.test.ts` — 7 focused tests.

### Modified

- `functions/src/finalizeCustomerUploadZip.ts` — processing-phase loop converted to bounded
  concurrency; added dev-safe observability logging.
- `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts` — added
  `CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY = 3` (named, documented constant).
- `docs/project/DECISIONS.md` — added ADR-FP-123.

No other file was modified. No Storage Rules, dependency, schema, or deployment configuration
changed.

---

## Result

**passed.** All required verification commands exit `0`. 31/31 focused tests pass, covering every
item in the Plan's required test list. All three Formal Review binding requirements are satisfied
with evidence. No Human Checkpoint was triggered (no Function configuration change). Nothing was
deployed; production is untouched. Goals #10–#12 were not started.
