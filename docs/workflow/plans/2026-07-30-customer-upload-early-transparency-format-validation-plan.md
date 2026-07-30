# Plan: Customer-Upload Early Transparency + Format Validation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Author | FreshForge Planning Agent |
| Status | complete |
| Workflow | managed-phase |
| Goal | `customer-upload-early-transparency-format-validation` (separate, narrow follow-up — does not modify or supersede the in-progress `production-release` Goal #13, which remains paused at its own human checkpoint) |

---

## Goal

Reject customer artwork that lacks meaningful transparency, uses an unsupported format, or cannot be
decoded, **before** the Portal ever shows a trimming-stage label — i.e. before any trim work begins.
Transparency remains the primary customer-artwork eligibility requirement; format/decode validation is
folded into the same initial bounded inspection because both come from the same first decode.

## Background

Owner-observed symptom: invalid customer artwork can reach the "Trimming transparent edges…" Portal
label before ultimately being rejected. This Plan traces the exact current source order, confirms the
mechanism, and proposes the smallest correction that enforces "reject before trim" for all three
rejection reasons (corrupt/undecodable, unsupported format, no meaningful transparency).

---

## Root Cause Findings (from current source, cited exactly)

All cited line numbers are from `functions/src/lib/customerUploadProcessing.ts` as currently
committed.

### Confirmed current order inside `processCustomerUploadImageBytes`

1. Byte-size check (`:502-507`).
2. `checking_format` stage; `metadata = sharp(sourceBytes).metadata()` (`:513-523`) — this **is**
   the one bounded initial decode/metadata inspection the goal brief asks for. It already fails
   cleanly (`could_not_decode`) on an undecodable file.
3. Format check via `detectFormat`/`detectFormatAllowingJpeg` (`:525-535`) — **format is already
   determined from the same initial decode**, not from filename/MIME. `unsupported_format` is
   already returned here, before any trim.
4. Animated check (`:537-539`).
5. Dimension sanity check (`:541-545`).
6. `checking_transparency` stage (`:658`). An **initial** transparency verdict is computed from
   `metadata.hasAlpha` alone (`:662-667`, `hasAlphaChannel: hasAlphaMeta`) — an opaque image
   (`hasAlphaMeta === false`) already fails this initial `assessMeaningfulTransparency` call.
7. **The defect**: if `hasAlphaMeta` is `true` (image has *some* alpha channel, e.g. an
   all-fully-opaque-alpha PNG, or a genuinely near-empty transparent margin) **and**
   `!skipQualityGates`, the code runs a cheap downscaled sample (`countTransparentPixelsSampled`,
   `:670-686`) to refine the verdict. If that sample **still does not pass**
   (`!transparency.passed`, `:689`), the code unconditionally proceeds to the `trimming` stage
   (`:690`) and runs the **expensive full-resolution** `trimTransparentEdges` (`:692`) — writing
   `technicalProgressStage: "trimming"` to Firestore via `onStage` — *before* the final
   pass/fail verdict is computed from the trim's shrink ratio (`:706-713`) and *before* the
   actual rejection at `:716-718`.

**This is the exact mechanism of the owner-observed symptom.** Any image that (a) has an alpha
channel per metadata, (b) fails the cheap downscaled-sample transparency check, and (c) is still not
"meaningfully transparent" after the full trim — i.e. an image with alpha present but not
meaningfully used (near-fully-opaque alpha, alpha noise, etc.) — causes the Portal to display
"Trimming transparent edges…" and then, seconds later, reject the upload anyway. The one call site
that most directly demonstrates the gap is the trim invocation at `:690-695`, which runs
unconditionally whenever the cheap sample fails, with no re-check of whether trimming could possibly
help (e.g. it also fires for a fully opaque-with-alpha-channel image, where trimming can never
produce a meaningfully-transparent result).

Note this is **distinct** from a plain 3-channel opaque PNG (no alpha channel at all,
`hasAlphaMeta === false`): that case already fails at step 6 above, before `trimming` is ever
entered, and is already correct today. The defect is specifically for images that have an alpha
channel (4th channel present) but whose transparency is not meaningful — the trim probe is the only
way the current code can rule that out, and it runs before the reject decision, not as part of it.

### Why this cannot simply be "check earlier with the existing sample"

The cheap downscaled sample (`countTransparentPixelsSampled`) and the full trim
(`trimTransparentEdges`) are measuring two independent conditions that either one can satisfy
(`assessMeaningfulTransparency`'s `ratioPass || trimPass`, `customerUploadTransparency.ts:91-96`):
enough transparent pixels by ratio, **or** a trim would meaningfully shrink the canvas. The trim
probe is not optional busywork; it is how the sample-failed case gets a fair second look (a
transparent-edge-only image can have a low overall transparent-pixel *ratio* while still being
legitimately trimmable, e.g. a large opaque design with a thin transparent border). The defect is
not that the trim probe exists — it's that the code treats the "attempt a trim to find out" step as
if it were part of the *processing* pipeline (worth showing progress for) rather than part of the
*validation* pipeline (should happen invisibly, and reject silently on failure, before any
user-visible "trimming" stage is entered for the *production* trim).

### Confirmed accepted-format policy (verify before enforcing)

`detectFormat` (`:167-175`) accepts exactly `"png"` and `"webp"`. No PNG-only policy change exists in
`docs/project/DECISIONS.md` (searched; no matches for a WebP-removal decision). **Confirmed: PNG and
static WebP remain the current accepted-format policy** — this Plan preserves both, and validates the
actual decoded `metadata.format` (already true today), never filename extension or client MIME type.

### Confirmed shared-pipeline parity (no separate order to fix per caller)

- `functions/src/finalizeCustomerUpload.ts:191-200` calls `processCustomerUploadImageBytes` directly.
- `functions/src/retryCustomerUploadProcessing.ts:156-165` calls the identical function, same
  `onStage` wiring.
- `functions/src/finalizeCustomerUploadZip.ts:308-316` (per-extracted-image loop, bounded
  concurrency) also calls the identical function, same `onStage` wiring.
- `apps/portal/app/(app)/donate/page.tsx` renders `<CustomerUploadPanel purpose="catalog_donation">`
  — the same component tree as Customer Upload — which drives the same `finalizeCustomerUpload`
  callable.

**Conclusion: there is exactly one order to fix — inside `processCustomerUploadImageBytes` — and all
four callers (Customer Upload finalize, Donate Design finalize, retry, ZIP per-image) inherit the fix
automatically.** No caller-specific changes are required or in scope.

---

## Design

### Principle

Split the current single `checking_transparency` stage into two conceptual phases inside the same
function, without adding a second full-resolution decode:

1. **Bounded initial validation** (no progress-stage-visible expensive work): decode/metadata
   (already exists), format detection (already exists), and a transparency **pass/reject decision**
   that may include the cheap downscaled sample and, only if needed to make a fair decision, the full
   trim probe — but the `onStage("trimming")` callback for that probe must not fire, because from the
   customer's perspective this is validation, not production trimming. If the verdict is a reject,
   return the failure immediately; no `trimming` progress stage is ever observed for a rejected
   upload.
2. **Production processing** (existing `trimming`/`upscaling`/etc. stages, unchanged): only entered
   after validation passes. The **production** trim path (`trimTransparentEdges` calls at `:748`,
   `:784`) already correctly sits inside a real `trimming` stage — that is legitimate, user-visible
   work on an image known to be valid, and must not change.

### Concrete change

In `processCustomerUploadImageBytes`, the validation-time trim probe at `:689-714` currently calls
`trimTransparentEdges` — the exact same expensive full-resolution function also used for production
trimming — after entering the `trimming` stage. The fix: perform this same full-resolution trim
*attempt* during validation **without** calling `stageTimer.enter("trimming")` first (i.e. remain in
`checking_transparency` for Firestore/Portal purposes), and only reject/proceed based on its result.

This is the minimal-diff option: it changes *when the stage transition happens*, not *what is
computed*. No new decode pass is introduced — the same `trimTransparentEdges(sourceBytes, ...)` call
that already runs today for the sample-failed case is reused; only the `stageTimer.enter("trimming")`
call immediately before it is removed from the validation path.

To avoid discarding useful work: when this validation-time trim **succeeds and meaningfully shrinks**
the canvas (i.e. the same computation the production path would otherwise redo), the result
(`trimmedProbe`) is already captured in a local variable (`:661`) and already reused for production
(`:734-738`, `if (trimmedProbe?.wasTrimmed)`) — this reuse is existing, correct behavior and is
preserved unchanged. The only change is *staging*, not *reuse logic*.

### Error priority (unchanged, already correct)

The existing order already matches the goal's required error priority exactly:
1. `could_not_decode` (metadata decode failure, `:521-523`) — first.
2. `unsupported_format` (`:528-535`) — second.
3. `background_not_transparent` (`:716-718`) — third, only reached if format is valid.

No reordering of these three is needed — only the *staging label* shown while step 3 is being
decided.

### Expected telemetry side effect (intentional)

`stageTimingsMs` (populated by `StageTimer`, which attributes elapsed time to whichever stage is
current when `.enter()` is next called) will, after this fix, attribute the validation-time
trim-probe's duration to `checking_transparency` instead of `trimming` in the structured
`finalizeCustomerUpload.stageTimings` / `retryCustomerUploadProcessing.stageTimings` log entries. This
is expected and desired — that work genuinely is transparency validation, not production trimming —
not a regression to guard against.

### What does NOT change

- The bounded initial decode (`getSharp().metadata()`) — unchanged, already single-pass.
- Format detection logic and accepted formats (PNG + static WebP) — unchanged.
- `assessMeaningfulTransparency` thresholds — unchanged (out of scope; no defect identified in the
  threshold itself).
- The cheap downscaled sample (`countTransparentPixelsSampled`) — unchanged.
- Production trimming, normalization, upscaling, DPI/print-size assessment, preview generation,
  saving — unchanged, and still only reached after transparency validation passes, exactly as today.
- `skipCustomerQualityGates` / `assistedProofFastIngest` paths — unchanged; these already
  intentionally bypass transparency rejection and never call the validation-time trim probe.
- Retry, ZIP orchestration, Donate Design — no caller-side changes; parity is structural (same shared
  function) and requires no additional code.

### Progress-stage-label accuracy (acceptance criterion: "reflect the real processing stage")

Because the validation-time trim attempt no longer enters the `trimming` stage, an upload that
ultimately gets rejected for `background_not_transparent` will show `"Checking transparency…"`
(existing label, `customerUploadProgressLabel.ts:24-25`) for its entire validation window, then
`"Failed"`. No label or enum change is required — `checking_transparency` already exists and is
already entered before this code path; the fix is to *stay* in that stage instead of prematurely
advancing to `trimming`.

---

## Files to change

- `functions/src/lib/customerUploadProcessing.ts` — remove the premature
  `await stageTimer.enter("trimming")` call (`:690`) from the validation-time trim-probe branch
  (`:689-714`). The `trimTransparentEdges` call itself and its result-handling remain unchanged.
- `functions/src/lib/customerUploadProcessing.test.ts` — add focused regression tests (see below).

No other files require changes. Confirmed via source inspection:
- `finalizeCustomerUpload.ts`, `retryCustomerUploadProcessing.ts`, `finalizeCustomerUploadZip.ts` —
  no changes; they only forward `onStage` and already receive whatever stages the shared function
  reports.
- `apps/portal/features/customer-uploads/**` — no changes; Portal only renders whatever
  `technicalProgressStage` it's given via `getCustomerUploadProgressLabel`, which is unchanged.
- `packages/shared/src/types/customerUpload/customerUpload.enums.ts` — no changes; no new stage
  value is introduced, none is removed.
- `packages/shared/src/utils/customerUploadProgressLabel.ts` — no changes.
- `packages/shared/src/utils/customerUploadTransparency.ts` — no changes; thresholds and priority
  logic are out of scope and already correct.

---

## Test plan

Add to `functions/src/lib/customerUploadProcessing.test.ts`, following existing fixture patterns
(`makeTransparentPng`, `makeOpaquePng`, plus a new fixture for "has alpha channel but not
meaningfully transparent, and not trimmable" — e.g. a canvas with `alpha: 254` uniformly, or alpha
present but no significant edge margin to trim).

1. **Valid format without transparency (opaque, no alpha channel)** — existing test already covers
   this (`"rejects opaque PNG with locked message"`); confirm/extend to assert `onStage` never
   receives `"trimming"`.
2. **Has-alpha-but-not-meaningfully-transparent (new)** — construct a PNG with a full alpha channel
   where all alpha values are high (e.g. 250+, above `CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX`) and no
   trimmable margin. Assert: result is `ok: false`, `code: "background_not_transparent"`, and the
   `onStage` callback (via a spy) never receives `"trimming"`.
3. **Unsupported but decodable format** — existing test covers JPEG rejection
   (`"rejects JPEG"`); extend to assert `onStage` never receives `"trimming"`.
4. **Corrupt/undecodable image** — new test: feed truncated/invalid bytes; assert `code:
   "could_not_decode"` and `onStage` is never called with `"trimming"` (or not called at all).
5. **Falsely renamed file** — new test: encode real bytes as JPEG, assert rejection is driven by
   actual decoded format (`unsupported_format`), not by any filename (this module has no filename
   input at all, which itself proves the point — but add an explicit assertion/comment recording
   that fact for the regression record).
6. **Valid transparent PNG** — existing test (`"accepts a meaningfully transparent PNG"`) already
   covers this; extend to assert `onStage` sequence includes `"checking_transparency"` before
   `"trimming"` only for the *production* trim path when one is genuinely needed (not required to
   assert `"trimming"` never appears for this fixture, since production trimming for the existing
   200x200 opaque-center fixture is legitimate).
7. **Valid transparent static WebP** — existing test (`"normal-size WebP uploads are unchanged..."`)
   already covers a passing WebP; no new test required, covered by parity of shared code path.
8. **Customer Upload / Donate Design parity** — both already call the identical shared function with
   no purpose-conditional branching (confirmed by source read, no `purpose` parameter exists in
   `processCustomerUploadImageBytes`'s signature at all). No test is meaningful beyond what already
   exists at the unit level; a text-only "prove they call the same function" assertion would violate
   the "do not create tests that only inspect source text" instruction. Parity is structural, not
   testable behavior — recorded here as the Plan's investigation finding, not as a new test.
9. **Retry parity** — same reasoning as (8): `retryCustomerUploadProcessing.ts` calls the identical
   function with the identical `onStage` wiring; no caller-specific branching exists to test.
10. **ZIP parity** — same reasoning as (8)/(9).
11. **Oversized transparent PNG regression** — existing tests
    (`"oversized-canvas transparent PNG is normalized..."` etc.) already cover trim before
    normalization; rerun to confirm this Plan's change to the *validation*-only trim-probe path does
    not affect the *production* trim path (different call site, `:748`/`:784`, untouched).

New tests will spy on `onStage` (already an existing test pattern, see
`"sanitized stage timings identify the actual stages that ran, with only names and numbers"`) to
assert the `trimming` stage is never observed for any rejected upload.

---

## Acceptance criteria mapping

All acceptance criteria in the goal brief are satisfied by the single staging fix plus tests above;
no criterion requires a new dependency, new progress-stage enum value, schema change, or Storage/Rules
change. No migration or backfill. No production deployment in this Plan — Firebase deployment remains
a separate human checkpoint per the goal brief.

## Stop conditions check

None of the stop conditions in the goal brief are triggered:
- WebP support is not being removed.
- Meaningful-transparency threshold is not changing.
- No new persisted progress-stage value is introduced (no migration).
- No Storage Rules change.
- Customer Upload and Donate Design continue sharing the same processing pipeline (confirmed, not
  changed).
- No conflict with oversized-image normalization (different, untouched code path).
- No new dependency or processing rewrite is required — this is a ~1-line staging fix plus tests.
