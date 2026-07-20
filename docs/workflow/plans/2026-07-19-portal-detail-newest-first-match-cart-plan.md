# Plan: Portal request detail — newest-first (match cart)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-19-current-request-cart-newest-first-plan.md; ADR-FP-098 |

---

## Goal

Portal **print request detail** lists items in the **same order as the Current Request cart**: last added at the start (left / top) through first added at the end. **Duplicate** still places the copy **immediately to the right** of the source. **Resize / qty / size** still must not reshuffle position (`sortOrder` / `createdAt` unchanged).

## Background

Cart already presents newest-first. Detail still uses ascending `sortPrintRequestItemsForDisplay` via `sortWorkingCurrentRequestItems`. Owner wants both surfaces aligned.

Under **newest-first** (descending `sortOrder`) LTR layout, “to the right of source” means a **lower** fractional `sortOrder` than the source — i.e. Portal duplicate must use **insert-before** in ascending sort-space (`resolveDuplicateInsertBeforeSortOrder`), not insert-after. Studio remains ascending + insert-after (unchanged).

Resize/qty paths already avoid writing `sortOrder`/`createdAt`; confirm no regression.

## Scope

### In Scope
- Portal detail / working-items sort: newest-first (shared helper or Portal wrapper)
- Portal duplicate callable + optimistic UI: insert-before for visual-right under newest-first
- Unit tests for sort + duplicate placement under newest-first display
- ADR-FP-098 / DATA_MODEL update: Portal surfaces newest-first; duplicate visual-right via insert-before
- Redeploy `duplicatePortalPrintRequestItem` to **fresh-prints-dev**

### Out of Scope
- Studio request board order or Studio duplicate math
- Changing how new catalog/upload adds assign `sortOrder` (still append max+1; newest-first display puts them first)
- Drag-reorder
- Production Function deploy

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/utils/printRequestItemDisplayOrder.ts` — newest-first sort helper; undeprecate / document insert-before for Portal
- `packages/shared/src/utils/printRequestItemDisplayOrder.test.ts`
- `apps/portal/features/print-requests/utils/sortWorkingCurrentRequestItems.ts` (+ tests)
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` — optimistic duplicate uses before-helper
- `functions/src/duplicatePortalPrintRequestItem.ts` — before-helper
- `apps/portal/features/print-requests/utils/sortCurrentRequestDrawerGroups.ts` — comment alignment (optional keep as-is; still correct)
- `docs/project/DECISIONS.md`, `docs/architecture/DATA_MODEL.md`

### Architecture Impact
- [x] Details: Portal presentation newest-first; durable ascending `sortOrder` values unchanged (new adds still highest). Duplicate adjacency = visual right via insert-before when display is desc.

### Security Impact
- [x] None

### Data Model Impact
- [x] Details: Docs only — no schema change; fractional `sortOrder` still valid

### Backend Impact
- [x] Details: `duplicatePortalPrintRequestItem` insert direction change; deploy fresh-prints-dev only

### UI / UX Impact
- [x] Details: Detail grid matches cart order; duplicate still right of source; resize does not jump

### Migration Impact
- [x] None
- [x] Forward steps: client + Function only
- [x] Rollback: revert sort + duplicate helper; redeploy prior Function

---

## Approach

1. Add `sortPrintRequestItemsNewestFirst` in shared (ascending helper then reverse, or inverted compare — same result for total order).
2. Point `sortWorkingCurrentRequestItems` at newest-first; update Portal unit tests.
3. Portal duplicate (callable + `usePrintRequestDetail` optimistic): `resolveDuplicateInsertBeforeSortOrder`; document why (visual right under desc display).
4. Keep cart group sorter (already newest-first); no behavior change required.
5. Confirm size/qty update paths do not write `sortOrder`/`createdAt`.
6. Deploy Function to fresh-prints-dev; manual QA detail + cart + duplicate + resize.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | Portal + Functions build | yes |
| Unit | shared display-order tests; Portal `sortWorkingCurrentRequestItems` tests | yes |
| Lint | touched files | yes |
| Build | Portal full build | no |

### Manual
- [x] Soft-reload; add A→B→C; detail + cart both show C, B, A (left/top → right/bottom)
- [x] Duplicate middle item → copy immediately to its right; order otherwise stable
- [x] Resize / change qty → position unchanged

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review
- [ ] Production deploy
- [x] Other: fresh-prints-dev Function redeploy (dev only)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Insert-after left under newest-first | High | Switch Portal duplicate to insert-before |
| Studio regresses | Low | Studio keeps own ascending sorter + insert-after |
| Stale Function on emulator/cloud | Medium | Redeploy duplicate callable to fresh-prints-dev |

---

## Rollback Plan

Revert Portal sort + duplicate helper choice; redeploy prior Function to fresh-prints-dev.

---

## Documentation Updates Required
- [x] DATA_MODEL.md
- [x] DECISIONS.md (ADR-FP-098)
- [ ] Other:

---

## Open Questions
- [x] None — owner directed detail to match cart; keep duplicate-right + resize-stable

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-19-portal-detail-newest-first-match-cart-review.md
- Verdict: approved
