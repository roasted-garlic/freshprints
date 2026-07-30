# Implementation Review: Customer-Upload Oversized-Pixel Normalization and Processing-Timeout Followup

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Reviewer | Independent FreshForge Review Agent (self-review pass, per workflow) |
| Plan | `docs/workflow/plans/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-review.md` (approved_with_changes) |
| Test Report | `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-test-report.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The implementation delivers the approved processing-order fix (bounded decode → trim →
normalize-if-still-oversized), eliminates the redundant decodes in `trimTransparentEdges`, adds a
downscale-only normalization pass structurally separate from the existing upscale pass, wires an
in-invocation watchdog into both finalize and retry, and corrects the documentation drift. All
three binding Formal Review conditions are satisfied. Implement caught and correctly fixed a real
design flaw of its own making mid-implementation (binding `limitInputPixels` to the app-level
ceiling, which would have defeated the entire fix by rejecting the decode itself for any
oversized-but-trimmable canvas) — this is exactly the kind of self-correction a review should
credit, not just check for absence of. One required change and two minor observations follow.

---

## Independent Verification

- Confirmed `functions/src/lib/customerUploadProcessing.ts`'s dimension/pixel check (previously
  lines 404-410) now runs after trim, evaluating `productionWidth`/`productionHeight`, not
  `sourceWidthPx`/`sourceHeightPx`.
- Confirmed `trimTransparentEdges` no longer performs a `.metadata()` call on entry or a second
  `.metadata()` call on its result — verified by reading the function body directly; it now takes
  `originalWidth`/`originalHeight` as parameters and uses `.toBuffer({ resolveWithObject: true })`.
- Confirmed both original call sites (now at different line numbers post-refactor) pass
  `sourceWidthPx`/`sourceHeightPx`, and the third (format-conversion) call site was also
  consolidated to avoid an extra `.metadata()` decode — this is a small scope addition beyond the
  Plan's literal two call sites, but it applies the exact same proven pattern and is a strict
  improvement with no behavior change (verified via the pre-existing 8 tests continuing to pass
  unmodified).
- Confirmed `normalizeForDimensionCeiling` is a distinct function from `upscaleIfNeeded`, never
  sets `wasUpscaled`, and `upscaleIfNeeded` never sets `wasNormalizedForDimensions` — the two
  fields are independently threaded through both success-return points.
- Confirmed the watchdog helper (`customerUploadFinalizeWatchdog.ts`) is a standalone pure function
  with its own test file, wired into both callables via `try`/`catch` around
  `withCustomerUploadFinalizeWatchdog`, with the timeout branch writing an explicit Firestore
  failure update before rejecting.
- Confirmed `RETRYABLE_FAILURE_CODES` includes `"processing_timed_out"`.
- Ran the full test suite independently (not just trusting the Test Report's claim): 28/28 pass
  across the three focused Goal #11 test files; 12/12 pass for Goal #9 ZIP regression +
  storage-rules-alignment; Functions build, Portal typecheck, Portal build, and repo-wide lint all
  exit 0.
- Confirmed via `git status`/`grep` that `finalizeCustomerUploadZip.ts`, `boundedConcurrencyQueue.ts`,
  `finalizeCustomerUploadZipAggregation.ts`, and no Assisted Creation file were modified by this
  diff.
- Confirmed `storage.rules` was not modified (no Rules-layer change).

---

## Findings

### Required change (non-blocking for correctness, blocking for full spec fidelity)

**Persisted retry-attempt counter/identity was scoped down without flagging it clearly enough in
the Test Report.** The Plan's Observability section asked for "a retry-attempt counter/identity
(e.g., `retryAttempt: number`, incrementing per `retryCustomerUploadProcessing` invocation for the
same `uploadId`)" in the structured log. Implement substituted `previousFailureCode` (the failure
code that prompted the retry) instead of an incrementing counter, reasoning that adding a new
persisted Firestore field for this purpose alone would be scope creep. That reasoning is
defensible, but the Test Report should have stated this substitution as an explicit,
named deviation from the Plan's literal spec — it currently blends it into the field list without
calling out that it intentionally does not match the Plan's suggested shape. **Required:** add one
sentence to the Test Report's Observability section explicitly noting this is a deliberate,
narrower substitution for the literal `retryAttempt` counter, with the same rationale given here,
so a future reader (or Signoff) doesn't need to diff the Plan against the code to discover the
divergence.

### Observations (not blocking)

- The empirical baseline-measurement step (Approach step 2) produced an honest, somewhat
  inconclusive result (redundant-decode removal's wall-clock effect was within noise at the tested
  pixel scale in a synthetic single-process benchmark). Implement reported this candidly rather
  than fabricating a specific percentage improvement, and correctly used it to justify treating the
  480s watchdog value as a fixed safety margin rather than a precisely-measured figure. This is the
  right call given the constraints (no access to real Cloud Functions execution conditions), and is
  documented clearly enough in both the code comment and the Test Report.
- Regression item #11 (sub-200-DPI normalized result blocked by existing rules) and #21/#22 (ZIP
  and Donate Design inherit the fix) are covered structurally/by inference rather than by a new
  dedicated test exercising that exact combination. This matches what the Plan itself anticipated
  ("Confirmed structurally... no separate test needed"), so it is not a gap introduced by
  Implement, but it's worth naming explicitly here as inherited scope, not independently
  re-verified scope.

---

## Verdict Rationale

**approved_with_changes.** The core technical fix is correct, well-tested (28 new/updated
Goal #11 tests, all passing, plus 12 passing regression tests confirming Goal #9 and the
byte-limit invariant are untouched), and all three binding Formal Review conditions are
genuinely satisfied rather than superficially checked off. The one required change is a
documentation-precision fix (name the `retryAttempt` counter substitution explicitly), not a
code or test change — it can be applied immediately without re-running verification.

## Required Change Before Signoff

- [x] Add one sentence to the Test Report's Observability section naming the `previousFailureCode`
  vs. `retryAttempt` counter substitution as a deliberate, scope-conscious deviation from the
  Plan's literal suggestion. **Applied** — see Test Report's Implementation Summary, Stage timing
  bullet.

## Next Step

Apply the one required documentation change above, then proceed to Signoff. No code, test, or
config change is required. Deployment remains a separate owner checkpoint — not authorized by this
review. Do not start Goal #12.
