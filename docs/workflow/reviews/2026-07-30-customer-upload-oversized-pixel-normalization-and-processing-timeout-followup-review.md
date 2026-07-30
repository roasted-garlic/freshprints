# Review: Customer-Upload Oversized-Pixel Normalization and Processing-Timeout Followup

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Reviewer | Independent FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan's root-cause diagnosis is precise and independently re-verifiable: the dimension/pixel
rejection at `customerUploadProcessing.ts:404-410` fires on raw source metadata before any trim
attempt, which structurally prevents the exact product outcome the owner wants; the
`trimTransparentEdges` function's three full-resolution decodes (two of them provably redundant) are
a genuine, fixable latency source; the 80 MB/100 MB discrepancy is correctly identified as
documentation-only drift, not a code or Rules conflict. The recommended processing order (bounded
decode → trim → normalize-if-still-oversized) is well-justified against three explicitly rejected
alternatives, and the `limitInputPixels` mechanism the Plan proposes is independently confirmed to
already exist as a working precedent elsewhere in this exact codebase
(`functions/src/lib/portalOgImageCompose.ts:39`), not a speculative new capability. Approval is
conditional on three required changes below, all closing real gaps in file-path precision and
scope-boundary clarity rather than expanding scope.

---

## Independent Verification

- `functions/src/lib/customerUploadProcessing.ts:404-410` — confirmed the exact rejection check and
  its exact message string; confirmed it operates on `sourceWidthPx`/`sourceHeightPx` derived from
  `metadata.width`/`metadata.height` at lines 398-399, which come from the `:377` decode of the raw
  uploaded bytes, before any code path reaching `:509`'s transparency/trim block.
- `functions/src/lib/customerUploadProcessing.ts:239-293` (`trimTransparentEdges`) — confirmed the
  three separate `getSharp()` calls: `:247` (metadata), `:252-256` (trim+encode), `:258` (metadata of
  the trimmed result). Confirmed `.toBuffer({ resolveWithObject: true })` is the correct sharp API to
  eliminate the third call — this is standard sharp behavior, not a Plan invention.
- `functions/node_modules/sharp/lib/index.d.ts:921,1507` — confirmed `limitInputPixels?: number |
  boolean | undefined` exists in the actually-installed sharp version (`^0.33.5` per
  `functions/package.json`), resolving the Plan's own `[NEEDS REPO CHECK]` flag on this point
  affirmatively.
- `functions/src/lib/portalOgImageCompose.ts:39` — confirmed `limitInputPixels:
  PORTAL_OG_MAX_INPUT_PIXELS` is already live, working code in this repository — the Plan's proposed
  mechanism has a direct, provable precedent, not merely a documented API existing in principle.
- `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts:3,9,11` — confirmed
  `CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES = 80 * 1024 * 1024`, `CUSTOMER_UPLOAD_MAX_DIMENSION_PX =
  15_000`, `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100_000_000` — all match the Plan's citations exactly.
- `storage.rules:110` — confirmed `request.resource.size < 80 * 1024 * 1024`, matching the shared
  constant — the Plan's claim that Storage Rules and the shared constant already agree is correct.
- `apps/portal/app/(app)/donate/page.tsx` and `apps/portal/features/customer-uploads/services/customerUploadService.ts:178-186` —
  confirmed the Donate Design route reuses the same feature directory and the same
  purpose-agnostic size-limit function; the Plan's "same pipeline, no purpose branching" claim holds.
- `functions/src/retryCustomerUploadProcessing.ts:30-40` — confirmed the exact `RETRYABLE_FAILURE_CODES`
  set and that it excludes any timeout-specific code today, supporting the Plan's proposed addition.
- `packages/shared/src/types/customerUpload/customerUpload.enums.ts` and `customerUpload.types.ts` —
  confirmed both exist with exactly the filenames the Plan used, resolving two of the Plan's own
  `[NEEDS REPO CHECK]` flags affirmatively (no action needed, but the Plan should update its own
  flags to reflect this rather than leaving them open for Implement to re-discover).
- `functions/src/finalizeCustomerUpload.test.ts` and `functions/src/retryCustomerUploadProcessing.test.ts` —
  confirmed **neither file exists** (zero matches via direct filesystem search). The Plan's Test
  Strategy table lists these as commands to run without clearly marking that they must be **created**,
  not merely extended — see Required Change 1 below.

No citation in the Plan was found inaccurate. The Plan's own honesty about what it could not verify
(`[NEEDS REPO CHECK]` flags) is largely justified, and this review's re-verification resolves most of
them affirmatively rather than finding them wrong.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Goal #9 and Goal #10 boundaries are explicit and file-list-backed; zero file overlap confirmed |
| Architecture alignment | pass | Component → Hook → Service → Callable preserved; all new logic stays server-side |
| Security impact addressed | pass | Correctly identifies `limitInputPixels` as security-positive (bounds a previously-unbounded decode risk) |
| Data model impact addressed | pass with condition | Additive-only design is sound; field names need to be pinned down more precisely — see Required Change 2 |
| Backend impact addressed | pass | Correctly declines to propose a Function config change without evidence; correctly treats a future config change as a Stop Condition |
| Test strategy adequate | pass with condition | Comprehensive 24-item regression table; needs one correction on new-vs-existing test files — see Required Change 1 |
| Human checkpoints identified | pass | Schema change, Functions deployment both correctly flagged |
| Roadmap alignment | pass | Correctly positioned as Goal #11, does not touch Goal #9/#10/#12 |
| Documentation plan | pass | ADR amendment correctly deferred to Implement; handoff doc corrections correctly scoped as documentation-only |
| No silent scope expansion | pass | Explicitly declines to raise the byte limit, change ZIP concurrency, or build a new scheduled Function without evidence |

---

## Architecture Review

**Findings:**
- The claim that Goal #9's `finalizeCustomerUploadZip.ts`/`boundedConcurrencyQueue.ts`/
  `aggregateZipProcessingResults` are untouched and automatically inherit this Plan's fixes (since
  they only call `processCustomerUploadImageBytes` as an opaque per-image unit) is architecturally
  correct — confirmed by re-reading the Goal #9 signoff's own description of that call boundary.
- The recommendation to keep normalization logic inside the existing `customerUploadProcessing.ts`
  library file, rather than introducing a new module, is consistent with this codebase's existing
  pattern of keeping trusted image logic centralized in one file per feature.

**Required changes:**
- [x] None beyond the items below.

---

## Testing Review

**Findings:**
- The 24-item regression coverage table is thorough and well-mapped to specific product/technical
  requirements from the resume prompt.
- However, the Plan's Test Strategy table lists `finalizeCustomerUpload.test.ts` and
  `retryCustomerUploadProcessing.test.ts` as commands to run, phrased identically to how it lists the
  already-existing `customerUploadProcessing.test.ts` — this reads as though Implement will be
  *extending* existing files, when independent verification confirms **neither file exists yet**.
  This matters because creating a new test file for a callable (as opposed to the already-established
  pure-library-function testing pattern) may require a different test harness approach (mocking
  `onCall` context, Firestore, timers for the watchdog) that the Plan does not fully specify — the
  Formal Review for Goal #10's Amendment 1 already established that this repository has **no
  live-callable integration-test harness** at all. The watchdog specifically (item #13/#24 in the
  regression table) needs to be testable as something other than a full `onCall` integration test,
  or the Plan needs to commit to extracting the watchdog itself as a pure, directly-testable function
  (mirroring the `withTimeout`/`mapWithConcurrency` extraction pattern already twice-proven in Goals
  #9 and #10).

**Required changes:**
- [x] **Required change 1 (binding):** Before Implement writes watchdog tests, the watchdog logic
  itself must be extracted into a small, pure, directly-testable function (e.g., a
  `Promise.race`-based helper parameterized by duration and an "on timeout" callback, following the
  exact precedent of `packages/shared/src/utils/withTimeout.ts` from Goal #10) rather than being
  written inline inside `finalizeCustomerUpload.ts`'s `onCall` body where it cannot be unit-tested
  without a full callable-integration harness this repository does not have. The Plan's Approach
  section 7 and the regression table's items #13/#24 must be updated to reflect this extraction
  explicitly, not left as an implicit assumption for Implement to figure out.

---

## Data Model Review

**Findings:**
- The additive-only design (new optional fields, new enum value, no migration) is sound and matches
  ADR-FP-080's own stated precedent for handling schema evolution without backfill.
- The Plan appropriately flags exact field names as "TBD during Implement" for
  `wasNormalizedForDimensions` and the pre-normalization dimension fields — this is acceptable for a
  Plan phase, but the *shape* of the distinction (original dimensions vs. normalized dimensions, kept
  separately) is the load-bearing design decision, and that shape is clear and correct.

**Required changes:**
- [x] **Required change 2 (binding, minor):** the Plan must explicit state, before Implement begins,
  that `wasNormalizedForDimensions` and `wasUpscaled` are two independent, non-mutually-exclusive
  booleans that could theoretically both be true in a future scenario (e.g., a hypothetical future
  policy change), even though in this Plan's current scope normalization is downscale-only and
  upscale only ever applies to already-in-range images — Implement must not conflate the two fields
  or write logic that assumes they're mutually exclusive, since that assumption is not structurally
  enforced by the type system as currently proposed.

---

## Backend Review

**Findings:**
- The decision to leave the 540s/2GiB Function configuration unchanged, with the redundant-decode
  removal as the primary latency fix and the watchdog as a safety net rather than a timeout increase,
  directly satisfies the resume prompt's explicit instruction not to "propose merely increasing the
  callable timeout without identifying the expensive stage."
- The watchdog's proposed 480s duration (60s of headroom before the platform's 540s hard timeout) is
  a reasonable starting point, and the Plan correctly declines to hardcode it as final, deferring to a
  real baseline measurement first (Approach step 2) — this is the right order of operations for a
  timing-sensitive value.
- The `limitInputPixels` precedent in `portalOgImageCompose.ts` uses a named constant
  (`PORTAL_OG_MAX_INPUT_PIXELS`) rather than passing the raw pixel-ceiling constant directly — Implement
  should follow the same naming convention for consistency, though this is a minor style point, not a
  blocking issue.

**Required changes:**
- [x] None beyond Required Change 1 (the watchdog testability requirement, categorized above under
  Testing but equally a Backend Review concern since it governs the watchdog's actual implementation
  shape).

---

## Documentation Review

**Findings:**
- Correctly defers the ADR-FP-080 amendment's actual recording to Implement, consistent with the
  resume prompt's explicit instruction and this repository's established pattern (Plan drafts text,
  Implement records it once the real diff is known).
- The four stale handoff docs identified for correction are accurate — independently confirmed via
  the same grep the Plan's own research pass used.

**Required changes:**
- [x] **Required change 3 (binding, minor):** the Plan's `06-data-model-essentials.md` documentation
  item is marked conditional ("if this doc is determined during Implement to need updating") — this
  should be resolved definitively during Implement's first step (reading the actual current content
  of that file), not left open-ended into the Test Report; Implement must state explicitly in its
  final report whether that file needed an update and why/why not, rather than silently skipping it.

---

## Required Changes (approved_with_changes)

1. **(Testing/Backend, binding)** Extract the stage watchdog as a pure, directly-testable function
   (mirroring `withTimeout.ts`'s precedent) before writing its tests — do not attempt to test it via a
   full `onCall` integration harness this repository does not have.
2. **(Data Model, binding, minor)** Explicitly document that `wasNormalizedForDimensions` and
   `wasUpscaled` are independent booleans, not mutually exclusive by type-system enforcement, so
   Implement doesn't write logic assuming otherwise.
3. **(Documentation, binding, minor)** Resolve the `06-data-model-essentials.md` update question
   definitively during Implement's first step, and report the resolution explicitly rather than
   leaving it open.

None of these require a Plan amendment or scope change — all three are implementation-detail
tightenings within the already-approved investigation, design, and file list.

---

## Blockers

None. Implementation may proceed once the three required changes above are treated as binding.

---

## Verdict Rationale

**approved_with_changes.** The investigation is thorough and every citation independently
re-verified as accurate, including confirming that the Plan's proposed core mechanism
(`limitInputPixels`) already has a working precedent in this exact codebase rather than being a
speculative new capability. The processing-order comparison is genuinely reasoned (four options
explicitly weighed, not just one asserted), and the Plan correctly declines several tempting
shortcuts the resume prompt explicitly warned against (raising the byte limit to match stale
documentation, merely increasing the timeout instead of finding the expensive stage, building an
unneeded new scheduled Function). The three required changes close a real testability gap (the
watchdog needs a pure-function seam, following this repository's own twice-proven extraction
pattern) and two minor precision gaps, none of which require revisiting the Plan's scope or approach.

---

## Next Step

Implement the approved scope, treating all three required changes as binding. Begin with Approach
step 1 (confirm exact filenames — now fully resolved by this Review's own verification, see
Independent Verification above) and step 2 (baseline timing measurement) before touching processing
logic. Do not touch `finalizeCustomerUploadZip.ts`, `boundedConcurrencyQueue.ts`,
`aggregateZipProcessingResults`, or any Assisted Creation file. Stop and return to Plan if evidence
during Implement shows the existing 540s/2GiB Function configuration is insufficient even after the
redundant-decode fix — a Function config change is a Human Checkpoint, not an Implement-phase
decision.
