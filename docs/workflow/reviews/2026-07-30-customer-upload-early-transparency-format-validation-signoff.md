# Signoff: Customer-Upload Early Transparency + Format Validation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md |
| Review | docs/workflow/reviews/2026-07-30-customer-upload-early-transparency-format-validation-review.md (approved_with_changes) |
| Test report | docs/workflow/reviews/2026-07-30-customer-upload-early-transparency-format-validation-test-report.md |
| Final status | **approved** |

---

## Summary

Fixed the exact mechanism behind the owner-observed "Trimming transparent edges…" appearing before an
eventual rejection: `processCustomerUploadImageBytes` was entering the `trimming` progress stage
before running its validation-time transparency trim *probe*, so an upload that would ultimately be
rejected (unsupported format, corrupt file, or no meaningful transparency) could still show the
production-trimming label to the customer for a few seconds first. The fix keeps that probe inside the
existing `checking_transparency` stage — it's validation work, not production trimming — so rejected
uploads never display the trimming label. Format detection was already decode-driven (not
filename/MIME-driven) and already correctly ordered ahead of transparency checks; both were preserved
and given explicit regression coverage rather than being reworked.

---

## Changes Delivered

### Behavior
- Rejected customer uploads (corrupt, unsupported format, or not meaningfully transparent) no longer
  transiently display "Trimming transparent edges…" in the Portal before failing. Applies uniformly to
  Customer Uploads, Donate Design, retry, and ZIP-contained images, since all four callers share the
  one function that was changed.
- No change to which uploads pass or fail, to accepted formats (PNG + static WebP unchanged), to
  transparency thresholds, or to error messages/codes.
- `stageTimingsMs` structured-log telemetry now attributes the validation-time trim-probe's duration
  to `checking_transparency` instead of `trimming` — intentional, more accurate, documented in the
  Plan.

### Files Created
- `docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md`
- `docs/workflow/reviews/2026-07-30-customer-upload-early-transparency-format-validation-review.md`
- `docs/workflow/reviews/2026-07-30-customer-upload-early-transparency-format-validation-test-report.md`
- `docs/workflow/reviews/2026-07-30-customer-upload-early-transparency-format-validation-signoff.md` (this file)

### Files Modified
- `functions/src/lib/customerUploadProcessing.ts` — removed one premature `stageTimer.enter("trimming")`
  call ahead of the validation-time transparency trim probe.
- `functions/src/lib/customerUploadProcessing.test.ts` — extended 2 existing tests with `onStage` spy
  assertions; added 3 new regression tests (has-alpha-but-not-meaningfully-transparent, corrupt file,
  decode-driven-not-filename-driven format detection).

### Documentation Updated
- None outside the workflow artifacts above — this Plan explicitly determined no
  architecture/backend/data-model doc required an update (behavior-timing fix only, no new decision,
  no new field, no new enum value).

---

## Tests

### Automated
- `npx tsx --test src/lib/customerUploadProcessing.test.ts` (from `functions/`) — **23/23 pass**, exit
  code 0.
- `cd functions && npm run build` — exit code 0, clean `tsc`.
- `npm run lint` (repo root) — exit code 0, 0 warnings/errors.
- `git diff --check` — exit code 0 (no new whitespace errors).
- Portal typecheck/build — omitted; no Portal or shared UI files were changed by this Plan (verified
  via `git status --short` against the four in-scope files only).

Full detail in the test report linked above.

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Opaque supported image (Customer Upload) | PASS | owner |
| Unsupported image format | PASS | owner |
| Falsely renamed image | PASS | owner |
| Valid transparent PNG | PASS | owner |
| Valid transparent static WebP | PASS | owner |

Owner deployed this change to `fresh-prints-dev` and ran all 5 manual QA scenarios from the goal
brief; owner reported overall result: **PASS**.

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | N/A | | Out of scope for this Plan entirely. |
| Dev Functions deploy (for manual QA) | obtained | 2026-07-30 | Owner deployed this change to `fresh-prints-dev` and ran manual QA directly; reported overall PASS. |
| Database migration | N/A | | No schema/data change. |
| Design / UX | N/A | | No UI change; Portal label text/enum unchanged. |
| Business / policy | N/A | | Accepted-format policy (PNG + static WebP) unchanged, confirmed against `docs/project/DECISIONS.md`. |
| Secrets / env | N/A | | None touched. |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| None open | — | Manual QA (goal brief Tests 1–5) completed against `fresh-prints-dev` with owner-reported PASS across all 5 scenarios; automated coverage (23/23) independently exercises the same code path via `onStage` spies. |

---

## Deferred Items (Roadmap)
- None.

---

## Open Blockers
- [ ] None

---

## Verdict

**approved.** All in-scope automated verification passes (23/23 tests, clean build, clean lint, no
whitespace errors), the fix is minimally scoped to exactly the defect identified in the Plan and
confirmed by the Review, every acceptance criterion is satisfied, and the owner has deployed to
`fresh-prints-dev` and confirmed manual QA PASS across all 5 goal-brief scenarios (opaque image,
unsupported format, falsely renamed file, transparent PNG, transparent WebP). No open items remain.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated (new entry recorded; `production-release` Goal #13's paused
      state left untouched, as agreed with the owner before starting this goal)
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` — not updated; no new risk was identified (the deferred manual-QA item is
      tracked above, not a residual risk requiring register entry)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** None — this goal is fully closed. `production-release` Goal #13
remains the active paused goal, still awaiting the production Firebase project creation checkpoint
from before this side task began; nothing here changes its status.
