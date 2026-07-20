# Plan: Portal duplicate insert-right + durable sortOrder

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-portal-duplicate-insert-right-sortorder-review.md |

---

## Goal

On the Portal print request **detail** page, duplicating a design always places the copy **immediately to the right** of the source. List order is driven by durable `sortOrder` (not newest-first `createdAt`). Resize / qty / size edits must not reshuffle position. Cart working-items order stays consistent with the same sort rules.

## Background

Owner report: duplicate often lands as the **first** (leftmost) card because detail/cart use `sortWorkingCurrentRequestItems` (`createdAt` desc). That fights the duplicate callable’s fractional `sortOrder`.

Prior Portal work (`resolveDuplicateInsertBeforeSortOrder`) inserted **before** (left of) source under ascending `sortOrder` display. Studio already inserts **after** (right of) source. Owner wants **right of source** — align Portal with Studio.

Canonical docs (`DATA_MODEL.md` / ADR display ordering) already specify client sort: `sortOrder` → `createdAt` → `id` ascending. Recent “newest-first detail” change is superseded by this owner correction.

## Scope

### In Scope
- Shared helper: insert-**after** (midpoint with next sibling, else `source + 0.5`; anchor when source lacks `sortOrder`)
- Portal callable + detail optimistic UI use insert-after
- Portal detail + working-request item lists sort via `sortPrintRequestItemsForDisplay` (or equivalent)
- Cart drawer group order: prefer `sortOrder` so it does not fight detail (min group `sortOrder` ascending)
- Confirm resize path does not write `sortOrder` / `createdAt`
- Soft-reload Portal; deploy `duplicatePortalPrintRequestItem` to **fresh-prints-dev** only
- Unit tests for helper + Portal sort util

### Out of Scope
- Production deploy
- Drag-reorder / full integer renumber
- Studio duplicate rewrite (already insert-after)
- Changing Cap A / quota behavior

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/utils/printRequestItemDisplayOrder.ts` (+ tests)
- `functions/src/duplicatePortalPrintRequestItem.ts`
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`
- `apps/portal/features/print-requests/utils/sortWorkingCurrentRequestItems.ts` (+ tests) — switch to display-order rules
- `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts` (via shared sorter)
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx` — group order by sortOrder
- Docs: `DECISIONS.md` short ADR note; optional `DATA_MODEL` clarification that Portal matches Studio insert-right

### Architecture Impact
- [x] None (restore documented sortOrder display; align Portal duplicate with Studio)

### Security Impact
- [x] None

### Data Model Impact
- [x] Details: continues optional `sortOrder`; may write fractional values + occasional source backfill (existing pattern). No schema migration.

### Backend Impact
- [x] Details: `duplicatePortalPrintRequestItem` insert-after; deploy fresh-prints-dev only

### UI / UX Impact
- [x] Details: detail grid + cart item/group order; new adds appear at end (highest sortOrder) instead of leftmost newest-first

### Migration Impact
- [x] None. Legacy items without `sortOrder` fall back to `createdAt` then `id` (existing helper).

---

## Approach

### Root cause
1. Detail/cart sort by **`createdAt` desc** → new duplicate always leftmost after reload.
2. Portal insert helper places duplicate **before** source; owner wants **right** (Studio parity: after).

### Fix
1. Add `resolveDuplicateInsertAfterSortOrder` (Studio midpoint/next/`+0.5` / anchor `+50`). Keep or thin-wrap old before helper only if still referenced; prefer migrate callers and update tests.
2. Callable + `usePrintRequestDetail` optimistic path use after-helper; re-sort with display order.
3. Change `sortWorkingCurrentRequestItems` to delegate to `sortPrintRequestItemsForDisplay` (one Portal entry point; update tests/comments).
4. Cart drawer: sort groups by min `sortOrder` ascending (fallback createdAt/id) so order agrees with detail where groups differ by design.
5. Verify `updatePrintRequestItem` size path only touches size fields + `updatedAt`.
6. Deploy Function to fresh-prints-dev; soft-reload Portal :3100.

### Product order rules (post-fix)
| Action | Position change? |
|--------|------------------|
| Duplicate | Yes — insert immediately **right** of source |
| Add catalog/upload | Yes — append (next sortOrder) |
| Remove | Yes — gap left; neighbors stay |
| Resize / qty / size | **No** — `sortOrder`/`createdAt` unchanged |

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared unit | `node --test` on display-order tests | yes |
| Portal sort unit | vitest/node on `sortWorkingCurrentRequestItems.test.ts` | yes |
| Functions compile | existing functions build/typecheck | yes if callable changed |
| Portal typecheck | project script | preferred |

### Manual
1. Draft request with ≥3 designs; duplicate middle → copy immediately **right** of source (optimistic + after reload).
2. Resize one item → position unchanged.
3. Change qty → position unchanged.
4. Cart drawer / working items order does not contradict detail for multi-design requests.
5. Soft-reload Portal after deploy.

### Human checkpoints
- [x] Manual UI verification (owner)
- [ ] Production deploy — N/A (dev only)

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review
- [ ] Design approval
- [ ] Business logic decision — owner already decided insert-right + durable sortOrder
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Newest-first UX regresses for “just added” | Medium | Owner explicitly prefers insert-right / sortOrder; document ADR superseding newest-first detail |
| Fractional sortOrder density | Low | Same midpoint pattern as Studio; rare re-anchor if needed later |
| Cart groups ≠ per-item cards | Low | Align group order by min sortOrder; detail is source of truth for adjacency |

---

## Rollback Plan

Revert helper/callable/Portal sort commits; redeploy prior Function to fresh-prints-dev. No data migration to undo (fractional sortOrders remain valid under ascending sort).

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — clarify Portal duplicate inserts after source when using sortOrder display
- [x] BACKEND.md — note callable insert-after if documented
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — short ADR: Portal display order = sortOrder; duplicate = insert-right
- [ ] Other:

---

## Open Questions
- [x] None — owner specified insert-right and durable sortOrder

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-18-portal-duplicate-insert-right-sortorder-review.md
- Verdict: pending
