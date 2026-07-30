# Signoff: Customer-Upload Oversized-Image Normalization and Processing Performance (Workstream A)

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-review.md` — `approved_with_changes` |
| Test report | `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-test-report.md` — `passed` |
| Implementation Review | `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-implementation-review.md` — `APPROVED` |
| Owner QA | Not required — no UI/UX change, no Function configuration change, all required behavior proven by deterministic automated tests |
| Final status | **approved** |

---

## Summary

Goal #9 (`customer-upload-oversized-image-normalization-and-processing-performance`) is closed for
**Workstream A only**, per the owner's explicit decision to keep the three image-related goals
separate and coordinated rather than merged. `finalizeCustomerUploadZip.ts`'s fully sequential
per-image processing loop — the confirmed root cause of slow/oversized-batch ZIP processing (up to
100 images, each up to 100 megapixels, processed one at a time inside a single 540-second
invocation) — now runs with bounded concurrency of 3, with batch counters aggregated deterministically
after every task settles rather than mutated from concurrently-running callbacks.

All three Formal Review binding requirements were satisfied and independently re-verified during
Implementation Review:

1. **Post-settlement aggregation.** A new pure function, `aggregateZipProcessingResults`
   (`functions/src/lib/finalizeCustomerUploadZipAggregation.ts`), computes `readyCount`/
   `failedCount`/`fileResults` from the fully-settled task-result array — never from a counter
   mutated inside a running task.
2. **Existing-helper evaluation before writing a new one.** The existing
   `DerivativeConcurrencyQueue` semaphore pattern
   (`apps/studio/electron/services/import/derivativeConcurrencyQueue.ts`) was evaluated first and
   confirmed structurally reusable, but not directly importable into Functions
   (`functions/tsconfig.json`'s `include` excludes `apps/studio/electron`). Its
   acquire/release/wait-queue mechanism was relocated — not forked — into a new shared module,
   `packages/shared/src/utils/boundedConcurrencyQueue.ts`, so both Studio and Functions import the
   same code.
3. **ADR-FP-123 with explicit memory arithmetic.** `docs/project/DECISIONS.md` now records the full
   worst-case calculation: 2 GiB function memory, 200 MiB reserved runtime/SDK overhead, a
   100-million-pixel decode buffer (≈381.5 MiB), an 80 MiB compressed-source allowance, a 461.5 MiB
   per-image peak, and a concurrency-budget table showing concurrency 3 leaves a documented 25.1%
   safety margin at the absolute worst case, while concurrency 4 leaves effectively none (~0.1%,
   correctly rejected). Proven constants, derived arithmetic, and assumptions that would benefit from
   future runtime validation are explicitly separated.

`processCustomerUploadImageBytes` — the actual image decode/transparency/trim/upscale/derivative
logic — was not modified at all; its existing 8-test suite passes unmodified, which is direct
evidence against any processing-logic drift from this change.

---

## Changes Delivered

### Behavior

- `finalizeCustomerUploadZip`'s in-batch image processing now runs up to 3 images concurrently
  instead of strictly one at a time, reducing worst-case serial processing time for large ZIP
  batches by up to ~3×.
- Batch aggregate counts (`readyCount`, `failedCount`) and per-image `fileResults` are computed
  deterministically in one pass after all processing tasks have settled.
- One image's processing failure (expected typed failure or an unexpected thrown error) no longer
  has any different effect on sibling images than it did before — failure isolation is preserved and
  additionally covered by new tests.
- A new dev-safe log entry (`finalizeCustomerUploadZip.processingBatch`) records `imageCount`,
  `concurrency`, `processingDurationMs`, `readyCount`, `failedCount` — aggregate numbers only, no
  filenames, Storage paths, customer identifiers, or image content.

### Files Created

- `packages/shared/src/utils/boundedConcurrencyQueue.ts` — general-purpose bounded-concurrency
  semaphore and `mapWithConcurrency` helper.
- `packages/shared/src/utils/boundedConcurrencyQueue.test.ts` — 10 tests.
- `functions/src/lib/finalizeCustomerUploadZipAggregation.ts` — pure post-settlement aggregation
  function.
- `functions/src/lib/finalizeCustomerUploadZipAggregation.test.ts` — 7 tests, including a proof that
  a 100-image batch at the real `CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY` constant never
  runs more than 3 simultaneous "sharp pipelines."
- `docs/workflow/plans/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-plan.md`
- `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-review.md`
- `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-test-report.md`
- `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-implementation-review.md`
- `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-signoff.md` (this file)

### Files Modified

- `functions/src/finalizeCustomerUploadZip.ts` — processing-phase loop converted to bounded
  concurrency with post-settlement aggregation; added dev-safe observability logging.
- `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts` — added the
  named, documented `CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY = 3` constant.
- `docs/project/DECISIONS.md` — added ADR-FP-123.

### Documentation Updated

- `docs/project/ROADMAP.md` — goal #9 marked Done (Workstream A); queue order for #10–#12 confirmed
  unchanged.
- `.cursor/workflow/state.md` — Signoff recorded; Goal Order updated.
- `references/project-chatgpt-handoff/CURRENT-STATE.md`,
  `references/project-chatgpt-handoff/03-roadmap-and-phases.md`,
  `references/project-chatgpt-handoff/13-recent-completed-work.md` — updated to reflect this
  signoff.

---

## Tests

### Automated

| Command | Exit | Result |
|---------|------|--------|
| `npm run build --prefix functions` | 0 | pass |
| `npm run lint` | 0 | pass — 0 errors, 0 warnings |
| Changed-file lint (`npx eslint <changed files> --report-unused-disable-directives --max-warnings 0`) | 0 | pass |
| `git diff --check` | 0 | pass |
| Focused tests (`npx tsx --test <files>`, combined run) | 0 | **31/31 pass**, 0 fail |

Focused suites: `boundedConcurrencyQueue.test.ts` (10, new), `finalizeCustomerUploadZipAggregation.test.ts`
(7, new), `customerUploadProcessing.test.ts` (8, unmodified — proves no processing-logic drift),
`customerUploadZip.test.ts` (6, unmodified, adjacent).

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner QA checkpoint | N/A — not required | Determined during Test phase: no UI/UX change, no Function configuration change, every required behavior (concurrency ceiling, deterministic aggregation, failure isolation, no deadlock/leak) proven by deterministic automated tests |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | N/A | | No deployment in scope or performed |
| Database migration | N/A | | None |
| Design / UX | N/A | | No UI/UX change |
| Business / policy | N/A | | None |
| Secrets / env | N/A | | None |
| Function configuration change | N/A — not required | | Memory (2 GiB) and timeout (540s) are unchanged; ADR-FP-123 proves the existing budget is sufficient for the selected concurrency |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| ADR-FP-123's per-image memory model ("one raster at a time") is a documented estimate, not an empirically measured value in this environment | Low | ADR explicitly flags this as an assumption requiring runtime validation; a real dev-environment measurement (requiring its own separate owner approval) is the natural follow-up if the function is ever observed approaching memory limits in practice — not a blocker for this signoff |

---

## Deferred Items (Roadmap)

None created by this goal beyond the already-recorded Workstream B and C scoping in the Plan
(Goal Order #10 and #11), which remain queued and unstarted.

---

## Open Blockers

- [x] None

---

## Verdict

**approved.** All required verification commands exit `0`. 31/31 focused tests pass. Independent
Implementation Review against the real final diff returned APPROVED with no residual defects. All
three Formal Review binding requirements are satisfied with documented evidence. No accepted format,
size/pixel limit, transparency rule, upscale policy, or the 200-effective-DPI Print Request save
floor changed.

**Explicitly confirmed:**
- No deployment occurred — `finalizeCustomerUploadZip` and all other Cloud Functions remain at
  whatever version was already deployed prior to this goal; nothing in this goal's diff has been
  pushed to any Firebase project.
- No migration occurred — no Firestore schema, document shape, or backfill was touched.
- No Storage cleanup occurred — no Storage object was read, written, moved, or deleted as part of
  this goal (the diff is source-code and documentation only).
- Production was untouched — no production Firebase project, environment variable, secret, or
  configuration was accessed or modified.
- Goals #10 (Increase the MB limit for custom-request reference images), #11
  (`catalog-image-derivative-storage-consolidation`), and #12 (`production-release`) were not
  started.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` (for this goal, Workstream A)
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — not needed; no new persistent product risk
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/03-roadmap-and-phases.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Start Goal #10, "Increase the MB limit for custom-request
reference images," when ready — its own Plan will require an owner decision on the target MB value
(no target value exists anywhere in the repository yet; see the Workstream B section of this goal's
Plan for framing options). Goal #11 (`catalog-image-derivative-storage-consolidation`) and Goal #12
(`production-release`, blocked until #9–#11 all sign off) remain queued after that.
