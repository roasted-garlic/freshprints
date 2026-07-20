# Plan: Portal duplicate Custom/Uploaded — order + optimistic controls

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (narrow bugfix) |
| Related | docs/workflow/reviews/2026-07-18-portal-duplicate-item-order-controls-review.md |

---

## Goal

On Portal print request review/detail, duplicating a Custom or Uploaded (or catalog) item places the new card **immediately before** the source in display order (visually to the left; if source was last on a row, source wraps to first of next row), and the optimistic card shows the **same control chrome** as a real card (disabled until the real id lands)—no “Qty only” flash.

## Background

Owner report + screenshot: optimistic duplicate landed far left of the grid (not adjacent), with only “Qty N” until the callable returned. Custom purple badge must remain. Assisted Custom items must keep working.

Prior workflow (Small Managed Items #1) parked at manual QA; this is a separate narrow bugfix.

## Scope

### In Scope
- Display order for Portal duplicate: insert **before** source (`sortOrder` midpoint / `-0.5`; anchor when source lacks `sortOrder`)
- Align Admin callable `duplicatePortalPrintRequestItem` with same order rules (persist correctly across reload)
- Optimistic card UI: full size/qty/actions chrome, interactions disabled until real id
- Soft-reload Portal; deploy Functions to **dev** only if callable changes
- Keep Custom badge / `fromAssistedCreation` behavior

### Out of Scope
- Studio duplicate order changes
- Production deploy
- Small Managed Items backlog #2–#10
- Drag-reorder / full integer renumber of all items

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/utils/printRequestItemDisplayOrder.ts` — helper for insert-before sortOrder
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` — optimistic sortOrder
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` — optimistic controls
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` — stop forcing readOnly solely for optimistic ids
- `functions/src/duplicatePortalPrintRequestItem.ts` — persist insert-before sortOrder (+ optional source anchor)

### Architecture Impact
- [x] None (same layers; shared helper for order math)

### Security Impact
- [x] None (existing callable auth/ownership unchanged)

### Data Model Impact
- [x] Details: continues to use optional `sortOrder`; may write fractional values and occasionally backfill source `sortOrder` when missing (same pattern as Studio duplicate)

### Backend Impact
- [x] Details: `duplicatePortalPrintRequestItem` order logic; deploy to fresh-prints-dev only

### UI / UX Impact
- [x] Details: duplicate position + optimistic card chrome on request detail

### Migration Impact
- [x] None (no schema migration; existing items without sortOrder remain valid)

---

## Approach

### Root causes
1. **Order:** Optimistic uses `(source.sortOrder ?? 0) + 0.5`. When source has **no** `sortOrder`, that assigns `0.5` while siblings remain unsorted → optimistic sorts **first** (far left). Callable uses `+0.5` (after) and skips sortOrder when source missing—reload order diverges. Owner wants insert **before** source.
2. **Controls flash:** `readOnly || isOptimisticItem` hides editors and shows only “Qty N”. When pending id → real id (`key={item.id}`), full controls remount—looks broken for seconds.

### Fix
1. Add `resolveDuplicateInsertBeforeSortOrder` in shared display-order util (midpoint with previous, else `source - 0.5`; if source lacks sortOrder, return source anchor + duplicate before it).
2. Hook: compute optimistic sortOrder via helper against current sorted items; if source needs anchor, update source in local state too.
3. Callable: load sibling items in transaction; apply same helper; write duplicate `sortOrder`; update source when anchoring.
4. Card: when request editable, always render editor chrome; if optimistic, disable inputs/buttons (no save/duplicate/remove). Detail view: `readOnly={!isEditable}` only.
5. Deploy Functions to dev; soft-reload Portal.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared unit (if easy) | targeted test or typecheck | preferred |
| Portal typecheck / lint | project scripts | if touched |
| Functions compile | existing functions test/build | if callable changed |

### Manual
1. Draft request with ≥3 items including Custom/Uploaded not first and not only item.
2. Duplicate Custom → new card immediately left of source; Custom badge present; full controls visible immediately (disabled briefly ok).
3. Duplicate last-on-row item → source becomes first of next row; duplicate takes prior last slot.
4. After save settles, reload page → order preserved.
5. Assisted Custom still duplicates and shows Custom badge.

### Human checkpoints
- Manual UI verify after soft-reload (no production)

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Fractional sortOrder crowding | Midpoint pattern already used elsewhere; rare |
| Callable/client order mismatch | Shared helper |
| Disabled optimistic still looks “stuck” | Prefer full chrome; unlock on real id |

Rollback: redeploy previous Functions revision; revert Portal files.

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Workflow artifacts only |
| Development History | No |

---

## Open Questions
- None blocking (insert-before matches “to the left” + wrap behavior).
