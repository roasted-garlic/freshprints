# Signoff: Customer-Upload Oversized-Pixel Normalization and Processing-Timeout Followup

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-plan.md |
| Review | docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-review.md |
| Test report | docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-test-report.md |
| Final status | **approved_with_notes** |

---

## Summary

Fixed four related defects in the customer-upload (Portal Upload Designs / Donate Designs)
trusted-server image pipeline: (1) technically-oversized-but-otherwise-valid transparent PNGs were
permanently rejected instead of being safely normalized — root-caused to the dimension/pixel
ceiling check running on raw source metadata before any trim attempt; (2) some uploads could spend
unbounded time at "Trimming transparent edges…" with no timeout/watchdog, silently leaving the
Firestore document stuck at `processing` forever if the platform terminated the invocation; (3) a
stale "100 MB" figure existed only in handoff documentation, not in enforced source; (4) ADR-FP-080's
"never downsample production assets" rule needed a narrow, explicit technical-safety exception.

Processing order changed to bounded-decode → trim → normalize-if-still-oversized. During
implementation, a real design flaw in the first draft of the decode-pixel bound was caught and
fixed via a failing test before it could reach review — binding the decoder limit to the app-level
ceiling would have rejected the decode itself for any oversized-but-trimmable canvas, defeating the
entire fix. `trimTransparentEdges` reduced from three full-resolution decodes to one. A new
downscale-only normalization pass (ADR-FP-125, narrow ADR-FP-080 amendment) was added, structurally
independent of the existing controlled-upscale pass. An in-invocation stage watchdog (mirroring the
`withTimeout.ts` precedent) was wired into both `finalizeCustomerUpload` and
`retryCustomerUploadProcessing`, writing an explicit `processing_timed_out` failure before the
platform's own 540s timeout could silently truncate the invocation. Deployed to `fresh-prints-dev`
and verified by owner QA: **PASS WITH NOTES** — all functional behavior correct; oversized-canvas
uploads take proportionally longer at the trim stage (expected, given their much larger pixel
counts and transparency workload) but complete successfully and never become stuck.

---

## Changes Delivered

### Behavior
- Oversized-dimension transparent PNGs that trim down under the technical ceiling are now accepted
  at full trimmed fidelity instead of being permanently rejected.
- Oversized PNGs that still exceed the ceiling after trim are downscaled proportionally
  (aspect-locked, no crop/stretch/distort, downscale-only) to a normalized production derivative;
  the original uploaded source is never modified.
- An in-invocation watchdog (480s, 60s headroom under the 540s platform ceiling) guarantees an
  explicit `processing_timed_out` failure is written before a stuck invocation can silently leave a
  Firestore document at `processing` forever; the new failure code is retryable.
- Sanitized per-stage timing is now logged once per finalize/retry invocation.
- Byte-limit documentation corrected from a stale "100 MB" to the actually-enforced 80 MB across
  four handoff files; no enforced value changed.

### Files Created
- `packages/shared/src/utils/customerUploadFinalizeWatchdog.ts` + `.test.ts`
- `functions/src/retryCustomerUploadProcessing.test.ts`

### Files Modified
- `functions/src/lib/customerUploadProcessing.ts` (+ `.test.ts`)
- `functions/src/finalizeCustomerUpload.ts`
- `functions/src/retryCustomerUploadProcessing.ts`
- `packages/shared/src/types/customerUpload/customerUpload.enums.ts`
- `packages/shared/src/types/customerUpload/customerUpload.types.ts`

### Documentation Updated
- `docs/project/DECISIONS.md` — ADR-FP-125 (narrow ADR-FP-080 amendment)
- `references/project-chatgpt-handoff/03-roadmap-and-phases.md`, `04-features-inventory.md`,
  `06-data-model-essentials.md`, `07-backend-and-ai-pipeline.md`, `CURRENT-STATE.md`
- `.cursor/workflow/state.md`

---

## Tests

### Automated
28 new/updated tests across `customerUploadProcessing.test.ts` (20), `customerUploadFinalizeWatchdog.test.ts`
(5, new), `retryCustomerUploadProcessing.test.ts` (3, new) — all passing. Goal #9 ZIP regression
(`finalizeCustomerUploadZipAggregation.test.ts`) and `storageRulesAlignment.test.ts` re-run
unmodified: 12/12 pass, confirming Goal #9 and the byte-limit invariant are untouched. Functions
build, Portal typecheck, Portal build, and repo-wide lint all exit 0. Full detail:
`docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-test-report.md`.

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Oversized-canvas Customer Upload processes successfully, no longer rejected | PASS | owner |
| Transparency, aspect ratio, no crop/stretch/distort preserved | PASS | owner |
| DPI / print dimensions truthful | PASS | owner |
| Donate Design parity | PASS | owner |
| Normal-size upload regression (not unnecessarily downscaled) | PASS | owner |
| No upload remains indefinitely stuck at "Trimming transparent edges…" | PASS WITH NOTES — larger pixel-count uploads take proportionally longer but always complete; no stuck/timeout case observed | owner |
| Retry idempotency (no duplicate records/files) | N/A — not exercised this pass (no failure to retry was reproduced) | owner |
| 80 MB (not 100 MB) copy displayed | PASS | owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | N/A | | Not in scope for this goal |
| Database migration | N/A | | No migration proposed or run |
| Design / UX | N/A | | No UX change |
| Business / policy | obtained | 2026-07-30 | Owner-approved product decision (Plan phase) and dev Functions deployment (this pass) |
| Secrets / env | N/A | | No secrets/env changes |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Oversized-canvas uploads take proportionally longer at the trim stage than smaller files | Low | Expected given pixel-count/transparency-workload scaling; the 480s watchdog provides a hard backstop so "longer" can never become "stuck." No action required; owner explicitly confirmed uploads complete. |
| Watchdog's 480s duration was chosen as a fixed safety margin, not derived from a specific measured worst case (a synthetic local benchmark could not reproduce real Cloud Functions cold-start/memory-pressure conditions) | Low | If production evidence later shows legitimate uploads routinely approach 480s, that is a Function-config/product conversation for a future goal, not a defect in this one. |
| Retry-path idempotency was verified via structural/path-determinism tests, not a live owner-reproduced retry of an actual failure (none occurred during QA) | Low | Existing `retryCustomerUploadProcessing.ts` retry logic is unchanged in its core overwrite behavior; only the watchdog wrapper and two new fields were added around it. No new duplication risk introduced. |

---

## Deferred Items (Roadmap)
- Goal #12: `catalog-image-derivative-storage-consolidation` — next queued goal, not started.

---

## Open Blockers
- [x] None

---

## Verdict

**approved_with_notes.** All functional acceptance criteria from the Plan are met and verified by
owner QA. The one note (oversized uploads take longer, proportional to pixel count) is expected,
non-defective behavior explicitly distinguished by the owner from the original bug (indefinite
stuck state) — the fix's actual purpose (bounded, always-completing processing) is confirmed
working. No code, test, or documentation change is required as a result of this QA pass.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes` (Goal #11 entry)
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` — not needed (no new residual risk beyond what's captured above)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] `03-roadmap-and-phases.md`, `04-features-inventory.md`, `07-backend-and-ai-pipeline.md` updated (this goal); `12-decisions-and-constraints.md` not present in this handoff package

**Recommended next action for user:** Proceed to Goal #12
(`catalog-image-derivative-storage-consolidation`) whenever ready, using Managed Phase / Continue
Workflow.
