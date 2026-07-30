# Test Report: Customer-Upload Early Transparency + Format Validation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Author | FreshForge Implementation Agent |
| Plan | `docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md` |
| Review | `docs/workflow/reviews/2026-07-30-customer-upload-early-transparency-format-validation-review.md` (approved_with_changes) |

---

## Required-Changes Disposition (from Review)

1. **Document the `stageTimingsMs` attribution-shift side effect.** Satisfied — added "Expected
   telemetry side effect (intentional)" section to the Plan before implementation.
2. **Pin the alpha-value/threshold construction for the new not-meaningfully-transparent test
   fixture.** Satisfied — `makeAlphaChannelButOpaquePng` uses uniform `alpha = 255`, explicitly above
   `CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX = 250` (confirmed from
   `packages/shared/src/utils/customerUploadTransparency.ts`), with zero per-pixel edge variation so
   the trim probe deterministically finds nothing to shrink.
3. **Corrupt-image test added as a new, independent test case.** Satisfied — `"rejects a
   corrupt/undecodable file before any trimming"` is a standalone `it(...)` block, not folded into an
   existing test.

---

## Implementation Summary

Single-line staging fix in `functions/src/lib/customerUploadProcessing.ts`: removed the
`await stageTimer.enter("trimming")` call that previously ran before the validation-time transparency
trim probe (`trimTransparentEdges`, inside the `!transparency.passed && !skipQualityGates` branch).
That probe is validation, not production trimming — it now stays attributed to the existing
`checking_transparency` stage, so an upload that gets rejected never causes the Portal to display
"Trimming transparent edges…" first. The actual trim computation, its result reuse for production
processing, and the three-tier error priority (`could_not_decode` → `unsupported_format` →
`background_not_transparent`) are all unchanged — confirmed already correct by the Plan's Root Cause
Findings and unmodified by this change.

No other files were touched. `git status --short` for the working tree confirms exactly two modified
files (`customerUploadProcessing.ts`, `customerUploadProcessing.test.ts`) plus the two new workflow
docs (Plan, Review) — no caller files (`finalizeCustomerUpload.ts`, `retryCustomerUploadProcessing.ts`,
`finalizeCustomerUploadZip.ts`), no Portal files, no enum/label/Rules/schema files.

---

## New/Extended Tests

Added to `functions/src/lib/customerUploadProcessing.test.ts`:

1. `"rejects opaque PNG with locked message"` (extended) — now spies on `onStage` and asserts
   `"trimming"` is never observed.
2. `"rejects a PNG with an alpha channel that is present but not meaningfully transparent"` (new) —
   the primary regression test for the defect; uniform alpha = 255 (opaque), no trimmable margin;
   asserts rejection with `background_not_transparent` and that `"trimming"` is never observed while
   `"checking_transparency"` is.
3. `"rejects JPEG"` (extended) — now spies on `onStage` and asserts `"trimming"` is never observed.
4. `"rejects a corrupt/undecodable file before any trimming"` (new) — truncated PNG-signature bytes;
   asserts `could_not_decode` and no `"trimming"` stage.
5. `"evaluates actual decoded bytes, not a filename — a falsely-labeled JPEG is still rejected as
   unsupported_format"` (new) — records that the function takes no filename/MIME parameter at all
   (decode-only detection is structural, not incidental) and exercises it with real JPEG bytes.

Existing tests (oversized-canvas normalization, WebP parity, upscaling, stage-timing sanitization,
etc.) were left unmodified and rerun as regression coverage — all still pass, confirming the
production trim path (a different call site) is unaffected.

---

## Verification Commands (exact exit codes)

| Command | Exit code | Notes |
|---|---|---|
| `npx tsx --test src/lib/customerUploadProcessing.test.ts` (run from `functions/`) | 0 | 23/23 pass (18 pre-existing + 5 extended/new; net +4 new test cases, +2 extended assertions on existing tests) |
| `cd functions && npm run build` | 0 | Clean `tsc` build, no diagnostics |
| `npm run lint` (repo root) | 0 | `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0` — 0 warnings/errors |
| `git diff --check` | 0 | No whitespace errors (only pre-existing repo-wide LF/CRLF line-ending advisory warnings unrelated to this change) |
| `npm run typecheck --workspace @fresh-prints/portal` | omitted | No Portal or shared UI code changed by this Plan (confirmed: only `functions/src/lib/customerUploadProcessing.ts` and its test file were modified) |
| `npm run build:portal` | omitted | Same reason as above |

---

## Acceptance Criteria — Verification

- [x] Initial decode/metadata inspection determines format and transparency together — unchanged,
      already true; confirmed no second full-resolution decode was added.
- [x] Unsupported/corrupt files rejected before trimming — test 3 (JPEG) and test 4 (corrupt) both
      assert no `"trimming"` stage.
- [x] Supported images without meaningful transparency rejected before trimming — test 1 (no-alpha
      opaque) and test 2 (has-alpha-but-not-meaningfully-transparent, the actual defect case) both
      assert no `"trimming"` stage.
- [x] No invalid artwork displays "Trimming transparent edges" before rejection — directly proven by
      the `onStage` spy assertions across tests 1–4.
- [x] Valid transparent PNG proceeds into trimming normally — existing test
      `"accepts a meaningfully transparent PNG"` unaffected, still passes.
- [x] Valid transparent static WebP proceeds normally — existing test
      `"normal-size WebP uploads are unchanged by the normalization pass"` unaffected, still passes.
- [x] Falsely renamed file evaluated from actual bytes — test 5; also structurally true since the
      function has no filename parameter.
- [x] Customer Upload and Donate Design use identical validation ordering — structural parity
      confirmed in Plan (both drive `finalizeCustomerUpload` via the same `CustomerUploadPanel`); no
      caller-side code exists to diverge.
- [x] Retry uses the same ordering — structural parity confirmed (`retryCustomerUploadProcessing.ts`
      calls the identical function).
- [x] ZIP-contained images inherit the same ordering — structural parity confirmed
      (`finalizeCustomerUploadZip.ts` per-image loop calls the identical function).
- [x] Existing user-safe error messages remain accurate — unchanged; no message text was modified.
- [x] Transparency remains the primary artwork eligibility requirement — unchanged; error priority
      order untouched.
- [x] No additional unnecessary full-resolution decode added — confirmed; this is a pure staging
      change, zero new decode calls.
- [x] Existing trimming optimization remains intact — production trim call sites (`:748`, `:784` in
      pre-change line numbering) untouched.
- [x] Existing oversized-canvas normalization remains intact — all normalization regression tests
      (12–19 in the full suite) still pass unmodified.
- [x] Existing processing watchdog behavior remains intact — watchdog wraps the whole
      `processCustomerUploadImageBytes` promise, stage-agnostic; not touched by this change.
- [x] Existing DPI/printable-size behavior unchanged — no code in that path touched.
- [x] Existing previews, Storage behavior, source preservation unchanged — no code in those paths
      touched.
- [x] No migration or backfill introduced — no schema, enum, or persisted-field change.
- [x] No production deployment occurred — Functions build was verified locally only; no `firebase
      deploy` was run.

---

## Manual QA Checkpoint

**Not yet performed.** Per the goal brief, manual QA in `fresh-prints-dev` requires an explicitly
approved Functions deployment, which is a separate human checkpoint. This Test Report covers
automated verification only. Manual QA (Tests 1–5 in the goal brief, across Customer Upload, Donate
Design, Retry, and ZIP upload where applicable) remains outstanding pending that deployment approval.

---

## Summary

All automated verification commands pass with exit code 0. All acceptance criteria that can be
verified without a live deployment are satisfied and covered by tests. The only remaining goal-brief
step is the owner-gated manual QA checkpoint after an explicitly approved `fresh-prints-dev` Functions
deployment — that deployment has not been requested or performed as part of this Plan.
