# Review: Customer-Upload Oversized-Image Normalization and Processing Performance

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Reviewer | Independent FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly identifies a concrete, evidence-backed root cause —
`finalizeCustomerUploadZip.ts`'s fully sequential per-image processing loop, which can run up to 100
full-resolution `sharp` operations one at a time inside a single 540-second invocation — and scopes a
narrow, reversible fix (bounded concurrency) without touching any accepted format, limit, or quality
policy. Independent re-verification confirms every load-bearing citation. The Plan also correctly
declines to merge Workstreams B and C into this goal, recommending three separate coordinated managed
goals; that recommendation is architecturally sound and independently confirmed by this review.
Approval is conditional on three changes below: none require a scope expansion, but one closes a real
concurrency-safety gap the Plan flagged but did not resolve, and two tighten the migration-adjacent
guidance for the future B/C Plans so they don't have to re-derive it.

---

## Independent Verification

Re-verified directly against source (not the Plan's paraphrase):

- `functions/src/finalizeCustomerUploadZip.ts:61-62` — confirmed `onCall({ timeoutSeconds: 540,
  memory: "2GiB" }, ...)`.
- `functions/src/finalizeCustomerUploadZip.ts:282-330` — confirmed the processing loop is a plain
  `for (const image of pendingImages) { ... await processCustomerUploadImageBytes(...) ... }` with no
  `Promise.all`/concurrency control. Sequential, confirmed.
- `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts` — confirmed
  `CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES = 100` (line 68), `CUSTOMER_UPLOAD_MAX_DIMENSION_PX = 15_000`
  (line 9), `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100_000_000` (line 11).
- `functions/src/lib/customerUploadProcessing.ts` — confirmed no module-level mutable state (no
  top-level `let`/mutable object/array bindings); `sharp` is obtained via the shared `getSharp()`
  lazy-loader (verified safe/idempotent in the immediately prior signed-off goal,
  `preproduction-static-analysis-cleanup`), not a bare `require`. This independently confirms the
  Plan's `[NEEDS REPO CHECK]` item — the file is safe to call concurrently from a caller's
  perspective, **provided the caller-side aggregation logic is itself race-free**, which is the
  subject of Required Change 1 below.
- `packages/shared/src/utils/customerUploadTransparency.ts` — confirmed
  `CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX = 250`, `CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO =
  0.005`, `CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO = 0.01` — matches the Plan's Preserve section
  exactly.
- ADR-FP-075 (`docs/project/DECISIONS.md:1932-1955`) — confirmed `MIN_PRINT_REQUEST_EFFECTIVE_DPI =
  200` is a **Print Request save-time** gate (Portal/Studio request sizing), explicitly distinct from
  the **import floor** (`MIN_ACCEPTABLE_EFFECTIVE_DPI = 72`, ADR-FP-075 point 3). The Plan's framing
  — that Workstream A (import/upload processing) does not touch this floor at all — is correct and
  well-cited.
- `apps/studio/electron/services/import/derivativeConcurrencyQueue.ts` — confirmed this existing
  bounded-concurrency semaphore has **no Electron-specific dependency** (imports only a shared
  constant); it is a plain TypeScript class. The Plan flagged this as a `[NEEDS REPO CHECK]` reuse
  question; independent inspection resolves it — see Required Change 2.
- `functions/src/finalizeCustomerUploadZip.test.ts` — confirmed this file does **not currently
  exist**. The Plan's Test Strategy correctly frames it as "new or extended."
- `storage.rules:107-184`, `assistedCreation.constants.ts:11-27` — confirmed the current 15 MB / 8
  reference-image limits and confirmed no ADR anywhere sets a target replacement value. The Plan's
  refusal to invent a number is correct and matches the binding instruction not to choose a limit
  without evidence.
- `functions/src/purgeArchivedDesignAssets.ts:41-56` — confirmed the existing two-tier keep-thumbnail
  /delete-preview-and-original purge policy the Plan flags as a Workstream C reconciliation point.

No citation in the Plan was found to be inaccurate, invented, or stale.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Workstream A's file list is exhaustive and narrow; B/C are explicitly deferred |
| Architecture alignment | pass | Change is internal to one Cloud Function's loop; no layering violation |
| Security impact addressed | pass with condition | Concurrent Firestore writes need an explicit race-freedom proof, not just an assertion — see Required Change 1 |
| Data model impact addressed | pass | No schema change; aggregation correctness is a testing concern, addressed below |
| Backend impact addressed | pass with condition | Memory/timeout re-evaluation is correctly gated as conditional, but the worst-case calculation method needs to be pinned down before Implement, not left fully open — see Required Change 3 |
| Test strategy adequate | pass with condition | Partial-failure and concurrency-ceiling tests are specified; needs the reused-vs-new helper decision resolved first (Required Change 2) so tests target the right module |
| Human checkpoints identified | pass | Conditional memory/timeout checkpoint and dev-Function-invocation checkpoint both correctly identified |
| Roadmap alignment | pass | Goal Order update matches the owner's exact instructed sequence (#9→#10→#11→#12), verified in `ROADMAP.md` and `state.md` |
| Documentation plan | pass | New ADR-FP-123 is the correct next available number (highest existing is ADR-FP-122) |
| No silent scope expansion | pass | B and C are scoped but explicitly not implemented, with the reasoning independently sound (see Architecture Review) |

---

## Architecture Review

**Findings:**
- The recommendation to keep A, B, and C as separate coordinated managed goals rather than one
  merged goal is correct. Independent check of the three workstreams' file sets confirms **zero file
  overlap** between them: A touches only `finalizeCustomerUploadZip.ts` and a new concurrency helper;
  B touches only `assisted-creation/`-scoped files and `storage.rules`'s Assisted Creation block; C
  touches catalog `Design`/derivative files across Studio/Portal/Functions. A shared Storage Rules
  file is the only thing A and B are even adjacent to, and A does not modify Rules at all.
- The Plan correctly keeps `customerUploadProcessing.ts` (the pure processing logic) unmodified and
  scopes the fix to the *caller's* iteration strategy only. This preserves the existing
  Component → Hook → Service → Firebase-equivalent boundary within Functions (processing logic stays
  callable-agnostic).

**Required changes:**
- [x] None beyond the testing/concurrency-safety items below.

---

## Security Review

**Findings:**
- No auth, Rules, or validation change in Workstream A — every per-image check in
  `processCustomerUploadImageBytes` still runs unconditionally per image regardless of concurrency.
- The Plan flags but does not resolve the concurrent-Firestore-write race question. Independent
  reasoning: each image's progress-stage write targets a distinct, deterministic document
  (`deterministicZipUploadId(payload.batchId, image.entryName)`,
  `finalizeCustomerUploadZip.ts:192`), so cross-image writes cannot collide on the same document. The
  real risk is not per-document races but the **aggregate counters** (`readyCount`, `failedCount`,
  `fileResults`) currently accumulated via plain loop-scoped variable mutation
  (`finalizeCustomerUploadZip.ts:177-178` initializes `let readyCount = 0; let failedCount = 0;`,
  mutated inside the loop body). If the bounded-concurrency implementation invokes multiple task
  callbacks concurrently and each mutates these shared closures directly, that is a genuine data race
  in JavaScript's single-threaded-but-interleaved-via-await model (two concurrent callbacks can both
  read-then-increment before either write completes, if the increment isn't synchronous end-to-end —
  in practice `count += 1` on a plain number is atomic within one microtask turn, but the *safer* and
  more obviously-correct pattern is to collect results via `Promise.allSettled` and compute the
  aggregate once after all tasks resolve, which the Plan's Approach step 3 already directs).

**Required changes:**
- [x] **Required change 1 (binding):** Implement must not increment `readyCount`/`failedCount` from
  inside concurrently-running task callbacks. Collect each task's per-image outcome into an array via
  the bounded-concurrency helper's return value, then compute `readyCount`/`failedCount`/`fileResults`
  in a single synchronous pass after all tasks settle — matching the Plan's stated intent ("outputs
  must be order-independent... not fail-fast") but making the *aggregation mechanism* explicit so
  Implement doesn't accidentally reintroduce the loop-mutation pattern inside a parallel map. Add a
  test that specifically exercises N≥2 concurrent tasks completing in a randomized/reversed order and
  asserts the final counts are exactly correct — not just "tests pass," but a test that would fail if
  a naive shared-counter race were reintroduced.

---

## Data Model Review

**Findings:**
- No schema/field change. Aggregation-correctness is fully a testing concern, addressed above.

**Required changes:**
- [x] None beyond Required Change 1.

---

## Backend Review

**Findings:**
- `finalizeCustomerUploadZip`'s existing 2 GiB / 540s config is confirmed accurate. The Plan's
  Approach step 1 correctly requires a documented worst-case memory calculation before choosing a
  concurrency number, but leaves the calculation method itself open ("per `sharp`'s documented memory
  model"). Cloud Functions execution environments do not expose a way to introspect actual per-call
  memory in a unit test, so this calculation will necessarily be an estimate based on published `sharp`
  memory-usage guidance (roughly: decoded raster buffer size ≈ width × height × channels, plus
  transient buffers for trim/resize operations) rather than an empirically measured number from this
  environment. That's acceptable, but the ADR this Plan requires (ADR-FP-123) must show the actual
  arithmetic (e.g., "15,000 × 6,667 × 4 bytes ≈ 400 MB raw buffer per image at the pixel ceiling, ×
  concurrency N, must stay under 2 GiB with headroom for Node/V8 overhead and the two additional
  in-flight buffers from trim + upscale") rather than asserting a number without showing the math.
- The Plan's conditional Human Checkpoint for a memory/timeout config change is correctly scoped —
  Cloud Function `memory`/`timeoutSeconds` changes do have cost and cold-start implications and
  reasonably warrant owner sign-off before Implement applies them, even though this goal has no
  production-deployment authorization at all yet (dev-only).

**Required changes:**
- [x] **Required change 2 (binding):** Before writing a new bounded-concurrency helper, Implement
  must evaluate reusing (by moving to `packages/shared/src/` or reimplementing identically, not
  duplicating with drift risk) the existing `DerivativeConcurrencyQueue` pattern in
  `apps/studio/electron/services/import/derivativeConcurrencyQueue.ts`, which is independently
  confirmed to have zero Electron-specific dependencies. If Implement instead writes a bespoke
  helper, the test report must state why the existing pattern was rejected (e.g., a specific
  functional gap), not merely proceed without comparison — this satisfies both the Plan's own
  `[NEEDS REPO CHECK]` and this repository's general reuse-over-reinvention convention.
- [x] **Required change 3 (binding):** ADR-FP-123 must show the worst-case memory arithmetic
  explicitly (inputs and formula), not just the resulting concurrency ceiling and memory/timeout
  decision.

---

## Testing Review

**Findings:**
- Test Strategy is proportionate: build, lint, focused unit tests for the new helper, focused tests
  for `finalizeCustomerUploadZip` (confirmed as a new file, not extended), and an explicit
  "unmodified `customerUploadProcessing.test.ts` must still pass" check to prove no processing-logic
  drift. This is a good design for proving equivalence.
- The Plan correctly declines to authorize a live dev-Function invocation for concurrency-ceiling
  validation without a separate owner checkpoint, consistent with this repository's established
  pattern of treating any real Cloud Function invocation against `fresh-prints-dev` as a
  live-environment action requiring explicit approval.

**Required changes:**
- [x] Covered by Required Change 1's specific race-condition test requirement above.

---

## Documentation Review

**Findings:**
- ADR-FP-123 is the correct next available ADR number (confirmed: highest existing is ADR-FP-122).
- The Plan's Appendix correctly avoids duplicating the full research citation set into both the Plan
  and Review separately by pointing at this Review's Independent Verification section as the shared
  source — acceptable for this workflow's documentation conventions, since both documents remain in
  the permanent `docs/workflow/` record together.
- Workstream B and C's "Recommended next step" sections give their future Plans enough of a running
  start (current-state tables, explicit open questions, confirmed `[NEEDS REPO CHECK]` gaps) that
  those goals won't need to re-run this research pass from scratch — this is valuable and should be
  preserved as-is when B and C's own Plans are eventually written.

**Required changes:**
- [x] None.

---

## Required Changes (approved_with_changes)

1. **(Security/Testing, binding)** Aggregate `readyCount`/`failedCount`/`fileResults` from
   post-settlement results of the bounded-concurrency helper, not from mutation inside concurrent
   callbacks; add a test that would fail under a naive shared-counter race.
2. **(Backend/Architecture, binding)** Evaluate reusing/relocating the existing
   `DerivativeConcurrencyQueue` pattern before writing a new bounded-concurrency helper; document the
   decision either way in the test report.
3. **(Backend/Documentation, binding)** ADR-FP-123 must show the explicit worst-case memory
   arithmetic (formula and inputs), not just a resulting number.

None of these require a Plan amendment — they are implementation-detail tightenings within the
already-approved scope and file list.

---

## Blockers

None. Implementation of Workstream A may proceed once the three required changes above are treated
as binding during Implement. Workstreams B and C remain correctly out of Implement scope for this
goal — their own Plans are required before either starts.

---

## Verdict Rationale

**approved_with_changes.** The Plan's root-cause diagnosis is independently confirmed accurate down
to exact file/line citations, its scope is narrow and reversible, and its recommendation to keep the
three owner-directed goals separate is architecturally sound (zero file overlap, genuinely different
risk profiles, one requires an owner MB-limit decision that doesn't yet exist anywhere in the repo).
The three required changes close a real (if subtle) concurrency-safety gap, avoid an unnecessary
new-code duplication of an already-solved pattern, and require the memory-budget ADR to show its
work rather than assert a conclusion — all within the Plan's existing scope and file list, none
expanding it.

---

## Next Step

Implement Workstream A only, treating the three required changes as binding. Workstreams B and C stay
scoped-not-started; their own Plan/Review cycles must run before their Implement phases begin. Stop
and return to Plan if the worst-case memory calculation concludes the current 2 GiB/540s config is
insufficient even after applying a conservative concurrency ceiling — that finding itself doesn't
require a Plan amendment (a memory/timeout value is explicitly anticipated as possibly needed), but
it does require the conditional Human Checkpoint before Implement applies the change.
