# Plan: AI Processing queue multi-select mode

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-03-ai-processing-queue-multi-select-review.md |

---

## Amendment (2026-09-03)

Owner: Delete must apply to the multi-select set. Widen the existing permanent-delete modal so multiple titles fit, truncate long titles, and scroll when the list is long. Reuse `deleteEligibleUnapprovedDesign` (max 25 ids). No new callable.

## Amendment 2 (2026-09-03)

Owner: In multi-select mode, Shift+click selects every loaded queue card from the first (anchor) card through the Shift-clicked card, inclusive.

## Goal

On Studio **AI Processing**, let staff turn on a multi-select mode from the preview ⋯ menu, then click queue cards to toggle a highlight set, and exit with a visible **Cancel** control. **Delete** from the ⋯ menu (and the same dialog) must delete every highlighted eligible design when multi-select is on.

## Background

Queue cards today are single-select (`selectedDesignId`). The preview ⋯ menu currently appears only when permanent delete is allowed and only contains **Delete**. Owners asked for a lightweight way to pick several cards by click, without changing backend or adding bulk actions yet.

## Scope

### In Scope

- Add a non-destructive **Multiple select** item to the AI Processing preview overflow menu.
- Show that menu whenever there is at least one queue-relevant action (multi-select and/or Delete), not only when Delete is allowed.
- Entering the mode: clicks on queue cards toggle membership in a local selection set and highlight those cards.
- Visible **Cancel** exits the mode, clears the set, and restores single-select click behavior.
- Exit also on tab change and Escape.
- Seed the set with the currently focused card when entering the mode (if any).
- Automated unit tests for toggle/exit helpers; contract coverage that the menu item exists and is not marked danger.
- When multi-select is on, **Delete** sends the highlighted set through the existing owner hard-delete dialog and callable.
- Dialog: wider panel, full title list (no 12-item cap), ellipsis truncation, vertical scroll for long lists.
- In multi-select mode, Shift+click fills the inclusive range between the last plain-clicked (or seeded) card and the Shift-clicked card. Only currently loaded list rows (not unloaded “Load more” pages).

### Out of Scope

- Bulk process, bulk archive, or other writes besides owner hard-delete.
- Shift-click range select.
- Persisting the set across sessions or routes.
- Portal or Design Library selection chrome.
- Production deploy.

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx`
- `apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx`
- `apps/studio/src/renderer/src/features/ai-review/components/AiReviewQueueList.tsx`
- `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewQueueMultiSelect.ts` (new)
- `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewQueueMultiSelect.test.ts` (new)
- `apps/studio/src/renderer/src/features/ai-review/utils/optionBPermanentDeleteUi.contract.test.ts`
- `apps/studio/src/renderer/src/styles/components/ai-review.css`
- `apps/studio/src/renderer/src/features/designs/components/DeleteEligibleUnapprovedDesignDialog.tsx`
- `apps/studio/src/renderer/src/styles/components/modals.css` (or dialog-specific rules imported via globals)

### Architecture Impact

- [x] None beyond UI state on the existing AI Review page (hooks/page coordinate; list remains presentational).

### Security Impact

- [x] Reuses owner-only `deleteEligibleUnapprovedDesign`. No new permission. Same confirmation phrase. Cap 25 ids (existing server/shared max).

### Data Model Impact

- [x] None.

### Backend Impact

- [x] None.

### UI / UX Impact

- [x] Details: overflow menu gains **Multiple select** (`danger: false`). Queue panel shows a compact bar (count + Cancel) while the mode is on. Multi-highlighted cards use a distinct selected style. J/K/A/R shortcuts pause while the mode is on so they do not fight click-toggle.

### Migration Impact

- [x] None.

---

## Approach

1. Extract small helpers: toggle id in list, whether a card is highlighted, whether to treat a click as toggle vs focus.
2. Hold `isMultiSelectMode` and `multiSelectedIds` on `AiReviewPage`. Enter from workspace overflow; cancel via queue bar, Escape, or tab change.
3. In multi-select, `AiReviewQueueList` does not call `requestSelectDesign`; it toggles ids. Workspace preview stays on the existing focused design.
4. Overflow items: **Multiple select** when not already in the mode and the current tab has designs (or a selected design). **Delete** unchanged. Hide the ⋯ control when the items array is empty.
5. CSS: reuse selected border/background for multi-highlighted cards; optional `--checked` class if we need to distinguish focus vs set later (not required if only the set is highlighted in this mode).
6. Tests: helper unit tests + contract that workspace includes Multiple select with `danger: false`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Lint | `npm run lint` | yes |
| Unit tests | `npx tsx --test apps/studio/src/renderer/src/features/ai-review/utils/aiReviewQueueMultiSelect.test.ts apps/studio/src/renderer/src/features/ai-review/utils/optionBPermanentDeleteUi.contract.test.ts` | yes |
| Build | Studio Vite not required for this CSS/TSX-only change unless typecheck is insufficient | no |
| Integration | n/a | no |
| E2E | n/a | no |
| Backend/rules | n/a | no |

### Manual

- [x] Owner verifies enter/toggle/highlight/cancel on AI Processing queue (human checkpoint at test phase).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (queue highlight + Cancel)
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
| Overflow still hidden for non-delete users | Medium | Show ⋯ whenever Multiple select is available |
| Danger styling on Multiple select | Low | Set `danger: false` on that item |
| Keyboard shortcuts mutate the wrong design | Low | Disable A/R/J/K while mode is on |
| Staff expect bulk actions immediately | Low | Out of scope; Cancel-only this pass |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the Studio AI Review UI files; no data or backend rollback.

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
- [x] Other: workflow plan/review/test/signoff only

---

## Open Questions

- [x] None blocking. Bulk actions on the selected set are a follow-up if requested.

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-03-ai-processing-queue-multi-select-review.md
- Verdict: pending
