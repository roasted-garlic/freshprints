# Plan: AI Processing hard-delete failure feedback

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-03-ai-processing-hard-delete-failure-feedback-review.md |

---

## Goal

When an owner permanently deletes an unapproved design from AI Processing (Processing / Needs Review / Rejected) and the `deleteEligibleUnapprovedDesign` callable returns **no successful deletes**, the confirm dialog must show the server refusal reason and stay open so the owner can cancel or retry after fixing the blocker—instead of appearing to do nothing.

## Background

Owner reported a Needs Review design (PRINT TEST 4x4) that would not delete: ⋯ → Delete → confirm → **Permanently delete** could be clicked repeatedly with no phrase/error feedback and no removal.

Root cause (code inspection):

- Callable returns per-item `failed` results with `error` strings (mid-pipeline stage, print-request refs, companion links, customer-upload provenance, ineligible status, etc.) without throwing.
- `AiReviewPage.handleConfirmPermanentDelete` collects successful ids; when `successfulIds.length === 0` it **returns with no `setError`**, so `DeleteEligibleUnapprovedDesignDialog` keeps showing with empty `error`.
- Design Library archived purge already surfaces total failure via `setActionError` from the first result error. AI Processing does not.

Parked goal `ai-enrichment-visible-text-and-catalog-copy-quality` remains queued after this hotfix; do not auto-resume it.

## Scope

### In Scope

- Surface callable per-item / aggregate failures on the AI Processing hard-delete confirm path when **zero** designs were deleted or skipped-as-already-deleted.
- Expose a way for the page to set the dialog error (extend `useDeleteEligibleUnapprovedDesign` with a small `reportError` / `setError` helper, or equivalent page-local error merged into the dialog `error` prop).
- Keep dialog open on total failure (current behavior) **and** show the message.
- Contract or unit coverage that the page no longer early-returns on empty success without reporting an error (extend Option B permanent-delete UI contract test and/or a pure helper for message selection).
- Optional: when **partial** success occurs (some deleted, some failed), keep current reconcile-of-successes behavior; optionally append a short failure note via the same error channel **only if** low-cost—prefer documenting partial as follow-up if it expands UI beyond the reported bug.

### Out of Scope

- Changing delete eligibility rules, Cloud Function blockers, or confirmation phrase.
- New callables or schema changes.
- Unblocking a specific stuck design’s data (pipeline stage / print refs)—owner may still need Test Data Reset or domain cleanup after seeing the real error.
- Design Library purge UX changes.
- Resuming `ai-enrichment-visible-text-and-catalog-copy-quality` or Smart Profiling.
- Production deploy.

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` — report failure when `successfulIds.length === 0`.
- `apps/studio/src/renderer/src/features/designs/hooks/useDeleteEligibleUnapprovedDesign.ts` — expose `reportError` / clear path for non-throw failures (if used).
- Optional pure helper under `apps/studio/src/renderer/src/features/ai-review/utils/` (e.g. `resolveHardDeleteFailureMessage(results)`) for testability.
- `apps/studio/src/renderer/src/features/ai-review/utils/optionBPermanentDeleteUi.contract.test.ts` (and/or new unit test for helper).

### Architecture Impact

- [x] None (UI / hook coordination only; still uses existing callable + dialog).

### Security Impact

- [x] None — still owner-only; still server-authoritative eligibility. UI only displays server-returned error text already intended for the caller.

### Data Model Impact

- [x] None

### Backend Impact

- [x] None — no Functions / Rules / deploy required for this fix.

### UI / UX Impact

- [x] Details: Delete confirm dialog shows an error alert (existing `error` prop styling) when hard delete returns only failures. Manual smoke on AI Processing recommended.

### Migration Impact

- [x] None

---

## Approach

1. Add a small pure helper, e.g. `resolveHardDeleteTotalFailureMessage(results)`, that picks the first `failed` entry’s `error`, or a safe fallback (`Unable to permanently delete the selected design(s).`).
2. Extend `useDeleteEligibleUnapprovedDesign` with `reportError(message: string)` that sets the same `error` state the dialog already consumes (keeps one error channel with callable throws).
3. In `handleConfirmPermanentDelete`, after `hardDeleteDesigns` resolves:
   - If `successfulIds.length === 0`: `reportError(resolve…(result.results))` and **return** (dialog stays open).
   - Else: clear designs / reconcile as today (optional note: do not expand partial-failure messaging unless trivial).
4. Extend Option B contract test to assert the page does **not** early-return on empty success without calling `reportError` / setting failure message (source-level match), plus unit test for the helper.
5. No Cloud Function changes.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit / contract | `npm test --workspace @fresh-prints/studio -- optionBPermanentDeleteUi` (and helper test if added) | yes |
| Typecheck | studio/shared as touched | yes if TS surfaces |
| Lint | as configured for touched files | yes if available |
| Build | no | no |
| Integration | no | no |
| E2E | no | no |
| Backend/rules | no | no |

### Manual

- [x] Details: Owner on AI Processing → select a design known to fail delete (or any) → ⋯ → Delete → phrase → Permanently delete. On refusal, dialog stays open **with visible error**. Cancel still works. Successful delete still closes and removes from list.

---

## Human Checkpoints Anticipated

- [x] Manual UI smoke (brief) after implement
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: none blocking for implement on `development`

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Error text exposes internal wording | Low | Reuse existing callable `error` strings already returned to Studio |
| Partial batch failure still quiet | Low | Document as out-of-scope / follow-up; reported bug is total failure |
| Hook API change unused elsewhere | Low | Only AI Processing page uses this hook today |

---

## Rollback Plan

Revert the Studio page/hook/test commits on `development`. No backend rollback.

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
- [ ] Other: none required beyond plan/review/test/signoff artifacts

---

## Open Questions

- [x] None — product intent is clear: never silently swallow total hard-delete failure.

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-03-ai-processing-hard-delete-failure-feedback-review.md
- Verdict: approved
