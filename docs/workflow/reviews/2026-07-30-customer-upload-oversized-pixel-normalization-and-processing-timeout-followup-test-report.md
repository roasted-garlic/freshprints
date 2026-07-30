# Test Report: Customer-Upload Oversized-Pixel Normalization and Processing-Timeout Followup

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Author | FreshForge Implementation Agent |
| Plan | `docs/workflow/plans/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-plan.md` |
| Review | `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-review.md` (approved_with_changes) |
| ADR | ADR-FP-125, `docs/project/DECISIONS.md` |

---

## Binding Formal Review Conditions — Disposition

1. **Extract the stage watchdog as a pure, directly-testable helper before writing tests.**
   Satisfied. `packages/shared/src/utils/customerUploadFinalizeWatchdog.ts` (`withCustomerUploadFinalizeWatchdog`)
   mirrors `withTimeout.ts`'s exact clearTimeout-on-settle precedent, tested in isolation via
   `customerUploadFinalizeWatchdog.test.ts` (5 tests, no `onCall` harness involved) before being
   wired into `finalizeCustomerUpload.ts`/`retryCustomerUploadProcessing.ts`.
2. **`wasNormalizedForDimensions`/`wasUpscaled` documented as independent, non-mutually-exclusive
   booleans.** Satisfied — documented at the type definition
   (`packages/shared/src/types/customerUpload/customerUpload.types.ts`), at the processing-result
   interface (`customerUploadProcessing.ts`), and directly tested
   (`"wasNormalizedForDimensions and wasUpscaled are independent booleans (not coupled)"`).
3. **Resolve the `06-data-model-essentials.md` update question definitively during Implement's
   first step.** Resolved: the doc's `Customer Uploads` table is a high-level concern summary (it
   already omits granular fields like `wasTrimmed`/`wasUpscaled`), so it needed one new
   concern-level row, not per-field documentation — added ("Oversized-canvas normalization" row).

---

## Implementation Summary

- **Processing order** changed to bounded-decode → trim → normalize-if-still-oversized in
  `functions/src/lib/customerUploadProcessing.ts`. The dimension/pixel-ceiling check now evaluates
  post-trim dimensions, not raw source metadata.
- **Decoder bound**: `CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS = 0x3FFF * 0x3FFF` (sharp's own
  built-in default, ~268.4M px / ~1.0 GiB max RGBA buffer) — **not** bound to the lower app-level
  100M-pixel ceiling. This was a real bug caught during Implement's own test-writing: binding
  `limitInputPixels` to the app ceiling rejects the decode itself for any oversized-but-trimmable
  canvas, defeating the fix (verified empirically — a 104M-px fixture failed `.metadata()` outright
  under that binding). Enforcement of the actual product ceiling remains a post-trim/post-normalize
  check, unchanged in value.
- **Redundant decodes eliminated**: `trimTransparentEdges` now accepts known dimensions as
  parameters and uses `.toBuffer({ resolveWithObject: true })`, reducing 3 full-resolution decodes
  to 1. The `converting_format` non-PNG-alpha branch was similarly consolidated (2 decodes → 1).
- **Normalization**: new `normalizeForDimensionCeiling` — downscale-only, `fit: "inside"`,
  strictest-of-three-ceilings-wins (width/height/total-pixel scale factors independently computed,
  smallest applied). Structurally separate function from `upscaleIfNeeded` (ADR-FP-080's pass).
- **Watchdog**: wired into both `finalizeCustomerUpload.ts` and `retryCustomerUploadProcessing.ts`
  at 480s (60s headroom under the 540s `onCall` ceiling). Writes explicit
  `technicalFailureCode: "processing_timed_out"` before the platform can silently terminate the
  invocation.
- **New failure code**: `processing_timed_out`, added to `CustomerUploadTechnicalFailureCode` and
  to `RETRYABLE_FAILURE_CODES`.
- **New fields**: `wasNormalizedForDimensions`, `preNormalizationWidthPx`,
  `preNormalizationHeightPx` — additive, written in both finalize and retry success transactions.
- **Stage timing**: `StageTimer` class inside `customerUploadProcessing.ts` (pure, no logging
  itself); `stageTimingsMs` returned on success; `finalizeCustomerUpload.ts`/
  `retryCustomerUploadProcessing.ts` each emit one `logger.info("<scope>.stageTimings", {...})`
  matching the `finalizeCustomerUploadZip.processingBatch` convention. **Deliberate deviation from
  the Plan's literal suggestion**: the Plan's Observability section proposed a persisted,
  incrementing `retryAttempt: number` counter. Implement substituted `previousFailureCode` (the
  failure code that prompted the retry) instead, to avoid adding a new persisted Firestore field
  solely for log identity — `previousFailureCode` still gives useful retry-attempt context without
  the added schema/migration surface. This is a narrower, scope-conscious substitution, not an
  oversight.
- **80 MB/100 MB**: no enforced value changed. 4 stale handoff docs corrected
  (`03-roadmap-and-phases.md`, `CURRENT-STATE.md`, `04-features-inventory.md`,
  `07-backend-and-ai-pipeline.md`), plus one clarifying sentence distinguishing the byte ceiling
  from the unrelated pixel-count ceiling.
- **ADR-FP-125** recorded in `docs/project/DECISIONS.md` (top of file, newest-first).

---

## Watchdog Duration Justification

Empirical baseline measurement (synthetic, in-process, `functions/` local sharp install) on an
~81M-px and ~99.9M-px noisy transparent-canvas fixture showed the redundant-decode elimination's
wall-clock effect at this pixel scale is within measurement noise for a single-process
micro-benchmark (`.metadata()` on PNG only reads header bytes, not the full raster — so the
"redundant" decodes were architecturally wasteful but not the dominant cost at this scale in a
local benchmark). This is reported honestly rather than overstated. The 480s watchdog value is
therefore justified as a **fixed safety-margin choice** (60s headroom under the 540s platform
ceiling) rather than a value tuned against a specific measured worst-case duration — a synthetic
local benchmark cannot reproduce Cloud Functions cold-start, network, or memory-pressure
conditions that plausibly explain the owner's reported multi-minute "stuck" symptom. This
reasoning is recorded in `FINALIZE_CUSTOMER_UPLOAD_STAGE_WATCHDOG_MS`'s doc comment.

---

## Tests Added / Updated

| File | Tests | Result |
|------|-------|--------|
| `functions/src/lib/customerUploadProcessing.test.ts` | 20 (8 pre-existing unchanged + 12 new) | 20/20 pass |
| `packages/shared/src/utils/customerUploadFinalizeWatchdog.test.ts` (new) | 5 | 5/5 pass |
| `functions/src/retryCustomerUploadProcessing.test.ts` (new) | 3 | 3/3 pass |

New `customerUploadProcessing.test.ts` cases: oversized-canvas normalized not rejected; preserves
transparency; preserves aspect ratio; does not crop; does not distort; never upscales; DPI
recomputed honestly; max printable dimensions recomputed; independence of
`wasNormalizedForDimensions`/`wasUpscaled`; decoder-bound rejection path; normal-size WebP
unchanged; sanitized stage-timing structure.

---

## Verification Commands and Exit Codes

| Command | Exit Code |
|---------|-----------|
| `npx tsc -v` | recorded: 5.9.3 |
| `npm run build --prefix functions` | 0 |
| `npx eslint <9 changed TS/test files> --report-unused-disable-directives --max-warnings 0` | 0 |
| `git diff --check -- <changed files>` | 0 (line-ending warnings only, no errors) |
| `npx tsx --test functions/src/lib/customerUploadProcessing.test.ts packages/shared/src/utils/customerUploadFinalizeWatchdog.test.ts functions/src/retryCustomerUploadProcessing.test.ts` | 0 (28/28 pass) |
| `npx tsx --test functions/src/lib/finalizeCustomerUploadZipAggregation.test.ts packages/shared/src/constants/storageRulesAlignment.test.ts` | 0 (12/12 pass — Goal #9 regression + byte-limit consistency) |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 |
| `npm run lint` (repo-wide) | 0 |
| `npm run build:portal` | 0 |

---

## Regression Coverage Mapping (against the Plan's 24-item table)

| # | Item | Status |
|---|------|--------|
| 1 | Valid transparent PNG below all limits unchanged | Covered — pre-existing tests pass unmodified |
| 2 | Oversized-dimension PNG normalized, succeeds | Covered — new test |
| 3 | Original source object preserved unchanged | Structurally guaranteed — source write precedes processing, unchanged by this Plan; not independently re-tested (no code path touches source bytes) |
| 4-8 | Transparency/aspect-ratio/no-crop/no-distort/no-upscale | Covered — new tests |
| 9-10 | DPI / max printable dims recomputed | Covered — new tests |
| 11 | Sub-200-DPI normalized result still blocked by existing rules | Covered structurally — unchanged `assessPrintSizeCapability`/DPI-floor logic runs on normalized pixels; no new rule needed since normalization runs before that gate |
| 12 | Decode-bound rejection | Covered — new test |
| 13 | Timeout → retryable failure | Covered — watchdog helper tests + retry allowlist inclusion |
| 14-16 | Retry idempotency / no duplicate objects / no duplicate records | Covered — new `retryCustomerUploadProcessing.test.ts` (path-determinism); no-duplicate-Firestore-doc is structural (operates on `uploadId` by reference) |
| 17 | Concurrent uploads stay within bounds | Covered — Goal #9 ZIP concurrency tests re-run unmodified |
| 18 | Byte limit identical across layers | Covered — `storageRulesAlignment.test.ts` passes |
| 19-20 | Existing PNG/WebP uploads unchanged | Covered — pre-existing + new WebP test |
| 21 | ZIP uses same authoritative rules | Confirmed structurally — `finalizeCustomerUploadZip.ts` call site to `processCustomerUploadImageBytes` unchanged |
| 22 | Donate Design same behavior | Confirmed structurally — no purpose branching in processing function |
| 23 | Sanitized stage timings identify expensive stage | Covered — new test |
| 24 | Upload cannot remain indefinitely at "trimming" | Covered — watchdog helper trip test |

---

## Files Changed

- `functions/src/lib/customerUploadProcessing.ts`
- `functions/src/lib/customerUploadProcessing.test.ts`
- `functions/src/finalizeCustomerUpload.ts`
- `functions/src/retryCustomerUploadProcessing.ts`
- `functions/src/retryCustomerUploadProcessing.test.ts` (new)
- `packages/shared/src/utils/customerUploadFinalizeWatchdog.ts` (new)
- `packages/shared/src/utils/customerUploadFinalizeWatchdog.test.ts` (new)
- `packages/shared/src/types/customerUpload/customerUpload.enums.ts`
- `packages/shared/src/types/customerUpload/customerUpload.types.ts`
- `references/project-chatgpt-handoff/03-roadmap-and-phases.md`
- `references/project-chatgpt-handoff/04-features-inventory.md`
- `references/project-chatgpt-handoff/06-data-model-essentials.md`
- `references/project-chatgpt-handoff/07-backend-and-ai-pipeline.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `docs/project/DECISIONS.md` (ADR-FP-125)

## Not Touched

`finalizeCustomerUploadZip.ts`, `boundedConcurrencyQueue.ts`,
`finalizeCustomerUploadZipAggregation.ts` (Goal #9), any Assisted Creation file (Goal #10),
`storage.rules` (no Rules change — 80 MB already correct at every layer).

## Deployment / Production Status

**Nothing deployed. Nothing migrated. No Storage objects touched. Production untouched.**
Functions requiring a future dev deployment to take effect: `finalizeCustomerUpload`,
`retryCustomerUploadProcessing`. Per explicit instruction, deployment is a separate owner
checkpoint pending Implementation Review approval — not performed in this workflow pass.
