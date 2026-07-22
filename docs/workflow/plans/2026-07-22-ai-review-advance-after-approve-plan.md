# Plan: AI Review advance to next item after approve/reject

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-22-ai-review-advance-after-approve-review.md |

---

## Goal

When staff approve or reject a design in the Studio AI Review inbox (button or A/R shortcuts), selection must move to the item that was immediately below the removed one — not jump back to the top of the list.

## Background

Owner report: navigating 4 down the list and approving the 4th returns selection to the 1st item instead of what was the 5th.

Current code already stores `pendingAdvanceIndexRef = selectedIndex` after approve/reject and, after reload, selects `designs[advanceFromIndex]` (correct once the removed row shifts the list). A separate selection-retention effect then runs in the same flush: it sees `pendingAdvanceIndexRef` already cleared and `selectedDesignId` still pointing at the removed design, and falls back to `designs[0]`.

Prior goal `firestore-usage-efficiency` remains parked awaiting manual QA.

## Scope

### In Scope
- Fix post-approve/reject selection advance so the next-below item wins over the fallback-to-first path.
- Extract a small pure helper for the advance index math and cover it with unit tests.
- Keep existing approve/reject service behavior unchanged.

### Out of Scope
- AI processing auto-queue advance (`resolveAdvanceIndexAfterProcessing`) — already behaves differently and is not the reported path.
- Tab-switch default selection (`designs[0]` on tab change).
- Cross-tab reopen/rerun selection.
- Firestore efficiency wave / other parked work.
- Production deploy.

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts`
- `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewInboxSelection.ts` (or new tiny helper colocated with selection utils)
- Matching `*.test.ts` for the helper

### Architecture Impact
- [x] None — hook coordination + pure util only

### Security Impact
- [x] None

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Needs Review (and any inbox action using `runInboxAction`) keeps place in the queue after approve/reject/archive-style removals.

### Migration Impact
- [x] None

---

## Approach

1. Add `resolveAdvanceIndexAfterInboxRemoval(listLength, removedIndex): number | null` — when the removed row is gone, the former next-below item sits at the same index; clamp to last when the removed item was last; return `null` when the list is empty.
2. Update the pending-advance effect to use that helper.
3. Fix the race: keep `pendingAdvanceIndexRef` set until `selectedDesignId` matches the advanced target (or the list is empty), so the retention effect continues to skip while advance is in flight and cannot overwrite with `designs[0]`.
4. Unit-test the helper for: empty list, middle removal, last-item removal, out-of-range clamp.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npx tsx --test apps/studio/src/renderer/src/features/ai-review/utils/aiReviewInboxSelection.test.ts` (or new helper test file) | yes |
| Typecheck | Studio `tsc` if practical; document pre-existing failures | no (pre-existing TS5103 known) |
| Lint | scoped if changed files linted | no |
| Build | no | no |
| Integration | no | no |
| E2E | no | no |
| Backend/rules | no | no |

### Manual
- [x] Details: In Needs Review, select item 4, Approve (or A); expect selection on former item 5. Repeat with Reject/R. Approve last item; expect selection on new last (former previous). Empty list clears selection.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review — brief smoke after implement
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Advance effect loops if selection never sticks | low | Clear pending when target id already selected; empty-list path clears immediately |
| Archive/other `runInboxAction` callers change behavior | low | Same “next below” is desired for all removals from the current tab list |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the hook/util change; selection falls back to prior (buggy) top-of-list behavior.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: workflow plan/review/test/signoff only; no durable product doc change required for this UX bugfix

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-22-ai-review-advance-after-approve-review.md
- Verdict: pending
