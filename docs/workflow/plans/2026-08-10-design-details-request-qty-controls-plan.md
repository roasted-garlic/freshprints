# Plan: Design Details modal Current Request quantity controls

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (narrow corrective) |
| Related | docs/workflow/reviews/2026-08-10-design-details-request-qty-controls-review.md |

---

## Goal

Make the Portal **Design Details** modal reflect Current Request state the same way catalog/list cards do: show **Add to request** when absent; when present, replace it with the **existing** quantity controls (qty display, increment/decrement, zero/remove rules). Sync immediately after add from the open modal and whenever Current Request aggregates change — no extra Firestore listeners.

## Background

Owner DEV QA for staff text censoring passed with a follow-up corrective: list cards (`CatalogSelectionCard`) already swap Add → qty stepper via `isSelected` + `onQuantityChange` / `onRemove` wired to `useAddDesignToRequestFlow`. `CatalogDesignDetailsModal` receives `isInCurrentRequest` but still always renders **Add to request**.

Repo check:
- List control: `apps/portal/features/catalog/components/CatalogSelectionCard.tsx` (qty UI + commit logic)
- Modal: `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx` (Add-only primary action)
- Wiring: `CatalogPageContent.tsx`, `CatalogHomePageContent.tsx` (aggregates + add flow; modal missing qty props)

## Scope

### In Scope
- Extract shared quantity-control UI/logic from `CatalogSelectionCard` into a reusable component
- Use that component in SelectionCard **and** Design Details modal
- Pass `quantity`, `onQuantityChange`, `onRemove` (and busy/canAdd) from catalog home + library pages into the modal (including selection mode)
- Automated source/unit tests for modal Add vs qty swap + wiring; Portal typecheck
- Owner DEV QA checklist; stop before prod promote

### Out of Scope
- Share page Add→qty parity (separate follow-up unless trivial leftover)
- New Firestore listeners / duplicate add-flow logic
- Changing quantity limits, DPI/sizing, companion post-add, favorites/share/report, censor UX
- Production / Algolia / myprintrequest.com

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/catalog/components/CatalogRequestQuantityControls.tsx` (new extract)
- `apps/portal/features/catalog/components/CatalogSelectionCard.tsx`
- `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx`
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`
- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- `apps/portal/styles/catalog.css` (only if modal needs layout class reuse)
- Tests under `apps/portal/features/catalog/...`

### Architecture Impact
- [x] Details: UI extract only; still driven by existing Current Request aggregates + `useAddDesignToRequestFlow` / selection mode hooks

### Security Impact
- [x] None (same auth-gated callbacks as list cards)

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Design Details primary action row matches list-card Current Request controls

### Migration Impact
- [x] None

---

## Approach

1. Extract `CatalogRequestQuantityControls` from SelectionCard (stepper markup, input commit, trash-at-1 / remove-at-0 rules, increase disabled when `!canAddPrints`).
2. Refactor SelectionCard to render the extract (behavior unchanged).
3. Extend Details modal: when authenticated + in request + qty handlers present → show controls; else keep Add / guest Sign-in.
4. Wire quantity from the same aggregate formulas as cards; selection mode uses selectionMode qty handlers.
5. Tests: source asserts + typecheck; owner QA.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit` in `apps/portal` (or package script) | yes |
| Unit / source asserts | focused portal catalog tests | yes |
| Lint | if cheap / configured | no |
| Build | no | no |
| Rules / Algolia | no | no |

### Manual
- [x] Owner DEV QA: open Details when already in request; add from modal; inc/dec; sync with list card; remove at zero; companion suggestion still works

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (owner DEV QA)
- [ ] Production deploy — forbidden this pass

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate qty UI drift | medium | Single extracted component |
| Selection mode missed | low | Explicit wiring in CatalogPageContent |
| Regress companion post-add | medium | Do not change addDesign / suggestion hooks |

---

## Rollback Plan

Revert the extract + modal prop wiring on `development` / DEV Hosting only.

---

## Documentation Updates Required
- [ ] Other: owner QA checklist + workflow state / ROADMAP note

---

## Open Questions
- [x] None — Share page deferred intentionally

---

## Approval
- Review doc: docs/workflow/reviews/2026-08-10-design-details-request-qty-controls-review.md
- Verdict: pending
