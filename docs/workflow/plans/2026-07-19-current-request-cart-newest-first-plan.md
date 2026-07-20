# Plan: Current Request cart — newest added at top

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | ADR-FP-098; docs/workflow/plans/2026-07-18-portal-duplicate-insert-right-sortorder-plan.md |

---

## Goal

Portal **Current Request** cart drawer lists designs **newest-added at the top** through **oldest-added at the bottom**, so the last design the customer added is immediately visible at the top of the list.

## Background

Owner screenshot shows five Library items in the cart with the oldest / earliest `sortOrder` at the top. That matches ADR-FP-098 / `sortPrintRequestItemsForDisplay` (ascending `sortOrder` → `createdAt` → `id`), which was chosen so detail grids keep durable order and duplicates insert **to the right** of the source.

Owner now wants **cart drawer** UX to be reverse-chronological (last added → first added, top → bottom). Detail-page order and duplicate insert-right must stay ascending so ADR-FP-098 adjacency rules keep working.

Parked prior goal (smart contextual quota errors) remains awaiting owner manual QA; this is a separate narrow UX correction.

## Scope

### In Scope
- `CurrentRequestDrawer` group list order: highest `sortOrder` / newest `createdAt` first
- Small extractable sort helper + unit tests for cart group ordering
- Doc note: ADR-FP-098 / DATA_MODEL — cart presentation may be newest-first while canonical item order remains ascending

### Out of Scope
- Changing detail-page card order (`sortWorkingCurrentRequestItems` / shared display helper)
- Changing duplicate insert-after / callable `sortOrder` writes
- Changing how new adds assign `sortOrder` (still append / max + 1)
- Drag-reorder, Stash, Studio request boards
- Quota / Cap A UX (separate parked workflow)

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx` — reverse group sort
- `apps/portal/features/print-requests/utils/sortCurrentRequestDrawerGroups.ts` (new) — pure sort for groups
- `apps/portal/features/print-requests/utils/sortCurrentRequestDrawerGroups.test.ts` (new)
- `docs/project/DECISIONS.md` — amend ADR-FP-098 consequence (cart newest-first presentation)
- `docs/architecture/DATA_MODEL.md` — one sentence: Portal cart may reverse for display

### Architecture Impact
- [x] Details: Presentation-only in Portal UI layer. Canonical sort for detail/hooks stays shared ascending helper. No service/callable changes.

### Security Impact
- [x] None

### Data Model Impact
- [x] Details: Docs only — persisted `sortOrder` semantics unchanged; cart reverses for display.

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Current Request drawer list order flips to newest-first. Multi-item groups (same design) keep one row; group position uses **max** `sortOrder` (most recent add of that design) then newest `createdAt`.

### Migration Impact
- [x] None
- [x] Forward steps: N/A (client sort only)
- [x] Rollback / compatibility: Revert drawer sort helper / call site

---

## Approach

1. Extract `sortCurrentRequestDrawerGroups(entries)` that sorts `[groupKey, items[]]` by:
   - `max(sortOrder)` descending when any item has `sortOrder`
   - else `max(createdAt)` descending
   - else `groupKey` ascending for stability
2. Use it in `CurrentRequestDrawer` instead of ascending `groupMinSortOrder`.
3. Keep `workingItems` / detail sorted via existing ascending helpers (no change).
4. Unit-test: three groups with sortOrders 1,2,3 → display 3,2,1; missing sortOrder falls back to createdAt desc; same-design multi-item group uses max sortOrder.
5. Update ADR-FP-098 + DATA_MODEL note so cart newest-first is explicit, not a regression of durable order.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` (touched files / project lint) | yes |
| Unit tests | `npx tsx --test apps/portal/features/print-requests/utils/sortCurrentRequestDrawerGroups.test.ts` | yes |
| Build | Portal build | no (logic-only UI sort) |
| Integration | — | no |
| E2E | — | no |
| Backend/rules | — | no |

### Manual
- [x] Details: Soft-reload Portal; add designs A→B→C to Current Request; open cart — order top→bottom C, B, A. Duplicate on detail still inserts to the right; cart shows duplicate above source when same design is not collapsed, or updates group position via max sortOrder when grouped.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review — cart order after sequential adds
- [ ] Design approval
- [ ] Business logic decision — owner already requested newest-first cart; detail stays ascending
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Cart vs detail order diverge (confusing) | Low | Intentional: vertical cart = recency; horizontal detail = durable adjacency. Document in ADR. |
| Grouped same-design rows jump on second add | Low | Use max sortOrder so re-adding same design moves that row to top (matches “last added”). |
| Accidental reverse of detail sorter | Medium | Do not change `sortPrintRequestItemsForDisplay` / `sortWorkingCurrentRequestItems`. |
| Scope creep into assign-sortOrder-at-front | Medium | Out of scope — presentation reverse only. |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the drawer sort helper and `CurrentRequestDrawer` call site; restore ascending group sort. No data migration.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — cart may display reverse of canonical order
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — ADR-FP-098 cart presentation amendment
- [ ] Other:

---

## Open Questions
- [x] None — cart newest-first; detail remains ascending per existing ADR

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-19-current-request-cart-newest-first-review.md
- Verdict: approved
