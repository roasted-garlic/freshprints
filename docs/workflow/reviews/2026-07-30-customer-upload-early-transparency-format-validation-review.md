# Review: Customer-Upload Early Transparency + Format Validation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly identifies the exact mechanism behind the owner-observed symptom: the
validation-time transparency trim probe in `processCustomerUploadImageBytes`
(`customerUploadProcessing.ts:689-714`) enters the `trimming` progress stage
(`stageTimer.enter("trimming")` at `:690`) before the pass/fail verdict is known, so a Portal viewer
can see "Trimming transparent edges…" for an upload that is about to be rejected. The proposed fix —
removing that premature stage transition so the trim-probe work stays attributed to
`checking_transparency` — is minimal, correctly scoped, reuses existing computation with no new
decode pass, and requires no schema/enum/label changes. One test-plan gap and one
clarity/verification gap must be addressed before implementation begins.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Single call-site staging fix; all four callers inherit via shared function, confirmed by source citation. |
| Architecture alignment | pass | No new pipeline, no new caller-side branching; trusted-server validation stays server-authoritative. |
| Security impact addressed | pass | No new trust boundary; format/decode validation already ignores filename/MIME (module has no filename input). |
| Data model impact addressed | pass | No new persisted field, no enum change, no migration. |
| Backend impact addressed | pass | Function signature and `onStage` contract unchanged; only *when* one existing callback value fires. |
| Test strategy adequate | fail | See Required Changes — a "has-alpha-but-not-meaningfully-transparent" fixture and an `onStage` spy assertion are described but not written; corrupt-image test also only described. |
| Human checkpoints identified | pass | Firebase deploy correctly deferred as separate checkpoint; Plan does not attempt it. |
| Roadmap alignment | pass | Directly matches the goal brief's "reject before trim" requirement. |
| Documentation plan | pass | Plan explicitly enumerates the files that do *not* need changes, with reasoning — appropriately narrow. |
| No silent scope expansion | pass | Plan explicitly declines to touch thresholds, formats, Rules, or unrelated callers. |

---

## Architecture Review

**Findings:**
- Confirmed via source read that `finalizeCustomerUpload.ts`, `retryCustomerUploadProcessing.ts`, and
  `finalizeCustomerUploadZip.ts` all call `processCustomerUploadImageBytes` directly with an identical
  `onStage` wiring pattern (`technicalStatus: "processing", technicalProgressStage: stage`). The
  Plan's claim of structural parity is accurate, not assumed.
- Confirmed Donate Design (`apps/portal/app/(app)/donate/page.tsx`) renders the same
  `CustomerUploadPanel` component used by Customer Upload — no separate Donate Design pipeline exists
  to diverge from.
- The proposed change touches exactly one call site (`:690`) and deletes it; no new function, no new
  parameter, no new abstraction. This matches the "narrow, reversible changes" architecture
  constraint.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Format detection already operates on `sharp(...).metadata()` output (`detectFormat`,
  `:167-175`), not filename or client-supplied MIME type — the "falsely renamed file" acceptance
  criterion is already satisfied by existing code, and the Plan correctly does not claim to change
  this, only to add a regression test proving it.
- No new attacker-controlled input is introduced. The trim-probe function
  (`trimTransparentEdges`) is unchanged; only the stage-label timing of an existing call is affected.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] None (Functions deploy is out of scope for this Plan; a separate checkpoint per the goal brief)

---

## Data Model Review

**Findings:**
- No new Firestore field, no new `CustomerUploadTechnicalProgressStage` enum value, no removed value.
  `checking_transparency` already exists and is already entered before the affected code path — the
  fix causes execution to *remain* in that stage rather than advance early.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- `stageTimingsMs` telemetry (`StageTimer`, `:137-165`) attributes elapsed wall-clock time to
  whichever stage is current when `.enter()` is next called. Removing the premature
  `enter("trimming")` call means the trim-probe's time will now be attributed to
  `checking_transparency` instead of `trimming` in the `stageTimingsMs` structured-log field
  (`finalizeCustomerUpload.stageTimings` / `retryCustomerUploadProcessing.stageTimings` logger calls).
  This is a **more accurate** attribution (the work genuinely is part of transparency validation) and
  is not called out as a required assertion in any acceptance criterion, but the Plan should note it
  explicitly as an intentional, expected side effect rather than leaving a reviewer or future
  maintainer to discover it independently by diffing logs. Not a blocker, but should be recorded.
- Watchdog behavior (`FINALIZE_CUSTOMER_UPLOAD_STAGE_WATCHDOG_MS` / `RETRY_CUSTOMER_UPLOAD_STAGE_WATCHDOG_MS`)
  is stage-agnostic (wraps the whole `processCustomerUploadImageBytes(...)` promise, not per-stage) —
  confirmed unaffected by this change.

**Required changes:**
1. Add one sentence to the Plan's "Backend impact" area (or a new short subsection) explicitly stating
   that trim-probe time will now be logged under `checking_transparency` in `stageTimingsMs` instead of
   `trimming`, and that this is expected/desired, not a regression. (Documentation-only change to the
   Plan file itself — no code impact.)

---

## Testing Review

**Findings:**
- Test items 1, 3, 6, 7, 9, 10, 11 in the Plan correctly point to *existing* tests that already cover
  the described behavior and only need `onStage`-spy extension or rerun-for-regression — appropriately
  scoped, no redundant new tests proposed.
- Test item 2 ("has-alpha-but-not-meaningfully-transparent") is the single most important new test —
  it is the fixture that actually exercises the defect being fixed — but the Plan only describes it in
  prose ("e.g. a canvas with `alpha: 254` uniformly...") without pinning down the exact alpha value
  relative to `CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX`. This constant's value should be read from
  `customerUploadTransparency.ts` before implementation so the fixture deterministically fails the
  cheap sample (alpha values at or above the threshold) with no trimmable margin (uniform alpha, no
  edge variation) — otherwise the test risks being flaky or accidentally passing for the wrong reason
  (e.g. if a uniform-alpha image trims to a zero-shrink no-op, that's correct, but the fixture must
  guarantee zero shrink deterministically, not by accident of a specific canvas size).
- Test item 4 (corrupt/undecodable image) — existing test suite has no equivalent today; must be
  added as new, not merely extended. Plan already flags this as "new" correctly.
- Test item 5 (falsely renamed file) — the Plan's own text acknowledges this module takes no filename
  input, making the "renamed file" framing not directly testable at this layer; the Plan's proposed
  resolution (assert rejection is driven by decoded format via a JPEG-encoded buffer, with a comment
  recording the module has no filename input) is an acceptable, honest resolution — not a fabricated
  test that only inspects source text.

**Required changes:**
1. Before writing test item 2's fixture, read `CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX` and
   `CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO` from `customerUploadTransparency.ts` and construct the
   fixture with alpha values explicitly at/above the max-transparent threshold and zero edge
   variation, so the test's pass/fail is guaranteed by construction, not by incidental canvas
   geometry.
2. Implement test item 4 (corrupt/undecodable image + `onStage` spy asserting `trimming` is never
   observed) as a genuinely new test, not an extension of an existing one.

---

## Documentation Review

**Findings:**
- Plan explicitly lists which files do *not* require changes and why (enum, label, Rules, caller
  files) — this is good practice for a narrow follow-up and reduces risk of undocumented scope creep
  during implementation.
- No `docs/architecture/*` or `docs/project/DECISIONS.md` update is proposed. Given this is a
  behavior-timing fix (not a new architectural decision or policy), that omission is correct — this
  does not rise to the level of needing a new ADR entry. No documentation change required beyond the
  Plan itself.

---

## Required Changes (if approved_with_changes)
1. Add the `stageTimingsMs` attribution-shift note to the Plan (Backend Review finding above) —
   documentation-only, no code impact.
2. Pin the alpha-value/threshold construction for the new "has-alpha-but-not-meaningfully-transparent"
   test fixture to the actual constants in `customerUploadTransparency.ts`, so the fixture's pass/fail
   is deterministic by construction (Testing Review finding above).
3. Confirm during implementation that the new corrupt-image test is added as a new test case, not
   folded into an existing one, so its assertion (`onStage` never receives `"trimming"`) is
   independently visible in test output.

---

## Blockers (if blocked)
None.

---

## Verdict Rationale

The root-cause analysis is independently verifiable against the cited line numbers and is correct;
the proposed fix is the smallest change that satisfies every acceptance criterion in the goal brief
without touching thresholds, formats, Rules, schemas, or unrelated callers. The three required changes
are small, non-architectural clarifications (one documentation sentence, one test-fixture precision
requirement, one test-structure requirement) that do not change the design — they close gaps that
could otherwise produce a flaky or misleading test suite. `approved_with_changes` rather than
`blocked` because none of these require re-planning or owner input.

---

## Next Step

Implement approved scope: apply the single-line staging fix in
`functions/src/lib/customerUploadProcessing.ts`, add the three required-change test fixtures/assertions
in `functions/src/lib/customerUploadProcessing.test.ts`, then proceed to Test phase per the goal
brief's verification commands.
