# Signoff: Increase the MB Limit for Custom-Request (Assisted Creation) Reference Images

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Signoff by | Signoff Agent |
| Plan (amended) | `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md` — `approved_with_changes` |
| Test report | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-test-report.md` — `passed` |
| Implementation Review | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-implementation-review.md` — `APPROVED` |
| Dev Storage Rules deployment | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md` — deployed 2026-07-29T22:22:31Z |
| Owner QA (initial) | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-qa-checkpoint.md` — **FAIL** (stale 15 MB deployed-callable behavior) |
| Amendment 1 Formal Review | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-review.md` — `approved` |
| Amendment 1 Implementation Review | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-implementation-review.md` — `APPROVED` |
| Amendment 1 Functions deployment | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-functions-deployment-checkpoint.md` — deployed 2026-07-30T00:23:55Z |
| Owner QA (reduced re-QA) | Recorded in the QA checkpoint doc — **PASS** |
| Final status | **approved** |

---

## Summary

Goal #10 raised the Assisted Creation (custom-request) reference-image per-file limit from 15 MB to
**40 MB** (owner-selected), kept the **8-file** maximum unchanged, and added a new **320 MB combined
pre-upload ceiling** (8 × 40 MB exactly), enforced client-side before any upload begins with the
trusted server-side parsers as defense-in-depth.

The first owner QA pass returned **FAIL**: a reference image between 15 MB and 40 MB was accepted by
the Portal picker but rejected at Submit with the stale message "Each reference image must be 15 MB
or smaller." Root-cause investigation confirmed this was a **Cloud Functions deployment gap, not a
source-code defect** — `submitAssistedCreationRequest` and `customerUpdateAssistedCreationRequest`
had never been redeployed after the source change (only Storage Rules had been deployed for this
goal), so the live callables were still running pre-Goal-#10 compiled code. Amendment 1 added
targeted regression tests proving the correct boundary/message behavior at the exact size class the
owner's reproduction hit, then a scoped, owner-approved Functions redeployment
(`submitAssistedCreationRequest`, `customerUpdateAssistedCreationRequest` only) brought the live
environment in sync with the already-correct source. The reduced owner re-QA then returned **PASS**.

---

## Changes Delivered

### Behavior

- Assisted Creation reference-image per-file limit: **40 MB**, live in `fresh-prints-dev` at every
  enforcement layer (Portal client, submit-path parser, update-path parser, Storage Rules).
- File-count maximum: **8**, unchanged.
- New **320 MB combined pre-upload ceiling**, enforced client-side before any upload begins in both
  the submit and update paths, with correct removed/replaced-file exclusion (never double-counted).
- A pre-existing Storage Rules boundary inconsistency (`<` exclusive vs. the TS validators' inclusive
  semantics) was found and corrected to `<=`, so a file exactly at the limit is accepted at every
  layer.
- The previously-duplicated `withTimeout` preview/download helper was consolidated into a shared
  utility (`packages/shared/src/utils/withTimeout.ts`) — no behavior change, done to make the
  timeout-bounded-fallback property directly testable.
- The stale 15 MB deployed-callable behavior (Amendment 1) is corrected — both callables now enforce
  40 MB in `fresh-prints-dev`.

### Files Created

- `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`
  (includes Amendment 1, recorded in place)
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md`
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-test-report.md`
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-implementation-review.md`
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md`
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-qa-checkpoint.md`
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-review.md`
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-implementation-review.md`
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-functions-deployment-checkpoint.md`
- `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-signoff.md` (this file)
- `apps/portal/features/assisted-creation/utils/assistedCreationReferenceFilesValidation.ts` (+ test)
- `packages/shared/src/utils/withTimeout.ts` (+ test)
- ADR-FP-124 in `docs/project/DECISIONS.md`

### Files Modified

- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts` — 40 MB constant,
  new 320 MB total-ceiling constant.
- `storage.rules` — 40 MB literal, boundary correction (`<` → `<=`).
- `packages/shared/src/utils/assistedCreationValidation.ts` — total-ceiling enforcement added to both
  parsers.
- `packages/shared/src/utils/assistedCreationValidation.test.ts` — original boundary/total tests, plus
  Amendment 1's 9-test regression suite for the 15–40 MB boundary and message content.
- `packages/shared/src/constants/storageRulesAlignment.test.ts` — Rules-to-constant drift test.
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts` — delegates to the new
  pure validator; imports the shared `withTimeout`.
- `apps/portal/features/assisted-creation/components/AssistedCreationUpdateModal.tsx` — passes
  retained-byte sums to the validator on add/remove.
- `apps/studio/src/renderer/src/features/customer-requests/services/assistedCreationRequestsService.ts`
  — imports the shared `withTimeout`.

### Documentation Updated

- `docs/project/DECISIONS.md` — ADR-FP-124.
- `docs/project/ROADMAP.md`, `.cursor/workflow/state.md`,
  `references/project-chatgpt-handoff/CURRENT-STATE.md`,
  `references/project-chatgpt-handoff/03-roadmap-and-phases.md`,
  `references/project-chatgpt-handoff/13-recent-completed-work.md` — updated in this Signoff pass.

---

## Tests

### Automated

| Command | Exit | Result |
|---------|------|--------|
| `npm run lint` | 0 | pass |
| `npm run build --prefix functions` | 0 | pass |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |
| `npm run build:portal` | 0 | pass |
| `npm run build:studio` | 0 | pass |
| Changed-file lint | 0 | pass |
| `git diff --check` | 0 | pass |
| Focused tests (original Implement + Amendment 1 combined) | 0 | **53/53 pass** (44 original + 9 new Amendment 1 regression tests) |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Initial owner QA (8-test deployed-environment checkpoint) | **FAIL** — stale 15 MB on live Submit | Owner |
| Reduced owner re-QA (5-step, post-Amendment-1 deployment) | **PASS** | Owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | N/A | | No deployment in scope or performed |
| Database migration | N/A | | None |
| Design / UX | N/A | | No UI/UX change |
| Business / policy | N/A | | 40 MB/8-file/320 MB values were the owner's own explicit decision |
| Secrets / env | N/A | | None |
| Dev Storage Rules deployment | Obtained | 2026-07-29 | `firebase deploy --only storage`, exit 0, `fresh-prints-dev` only |
| Scoped Cloud Functions deployment | Obtained | 2026-07-29 | `firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest`, exit 0, `fresh-prints-dev` only |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Storage Rules and Cloud Functions are independently deployed Firebase resources; a future goal that changes shared validation logic must remember to deploy both, not just one | Low | This exact gap is now a documented precedent (Amendment 1) and covered by regression tests proving the correct boundary behavior; future goals touching this validation path should explicitly verify both deployment targets before requesting owner QA |
| ADR-FP-123's `withTimeout`/preview-fallback memory model assumption (carried from the prior related goal) remains an estimate, not empirically measured | Low | Already flagged in ADR-FP-123; unaffected by this goal |

---

## Deferred Items (Roadmap)

None created by this goal. The pre-production sequence continues as reconciled below.

---

## Open Blockers

- [x] None

---

## Verdict

**approved.** The 40 MB per-file limit, 8-file maximum, and 320 MB combined ceiling are live and
correctly enforced at every layer in `fresh-prints-dev` — Portal client, submit-path parser,
update-path parser, and Storage Rules. The stale 15 MB deployed-callable behavior discovered by the
first owner QA pass was root-caused (a Functions deployment gap, not a source defect), fixed via
regression tests plus a scoped, owner-approved Functions redeployment, and the reduced owner re-QA
confirmed the fix. All required verification commands exit 0. No migration, Storage cleanup, or
production action occurred at any point in this goal.

**Explicitly confirmed:**
- 40 MB per-file limit is live in `fresh-prints-dev` — Portal client, submit-path parser,
  update-path parser, and Storage Rules all agree.
- 8-file maximum remains unchanged.
- 320 MB combined ceiling remains active (application-layer pre-upload guard; Storage Rules cannot
  enforce a cross-object sum).
- The stale 15 MB deployed-callable behavior was corrected via the scoped Functions redeployment.
- Owner reduced re-QA passed.
- No migration occurred.
- No Storage cleanup occurred.
- Production was not touched at any point — every deployment action explicitly targeted
  `fresh-prints-dev` only.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` (for this goal)
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — not needed; no new persistent product risk
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/03-roadmap-and-phases.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Start Goal #11,
`customer-upload-oversized-pixel-normalization-and-processing-timeout-followup`, when ready — its own
Plan will need to investigate pixel-dimension rejection behavior, proportional normalized production
derivatives, the `Trimming transparent edges...` timeout/retry investigation, the 80 MB vs. 100 MB
limit discrepancy, and the ADR-FP-080 technical-safety downscaling exception. Goal #12
(`catalog-image-derivative-storage-consolidation`) and Goal #13 (`production-release`, blocked until
#9, #10, #11, and #12 are all signed off) remain queued after that.
