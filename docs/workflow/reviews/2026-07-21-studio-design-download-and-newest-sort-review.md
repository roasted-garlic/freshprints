# Review: Studio design full-res download + newest-first sort

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-21-studio-design-download-and-newest-sort-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan is bounded, reuses existing Storage download patterns, and places the download control on the Design details modal per owner clarification. Sort should default Design Library to `createdAt` desc (Portal-aligned). Implementation must wait for owner go-ahead on sort surface (Library-only recommended) and “continue.”

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Download modal + Studio sort; Portal out |
| Architecture alignment | pass | UI → design services / Storage URL helper |
| Security impact addressed | pass | Staff Studio; existing auth URLs; purged guard |
| Data model impact addressed | pass | No schema change; use `originalPath` / `createdAt` |
| Backend impact addressed | pass | Client-only |
| Test strategy adequate | pass | Unit + manual |
| Human checkpoints identified | pass | Sort surface confirm before implement |
| Roadmap alignment | pass | Staff Studio UX follow-up after #6 Portal |
| Documentation plan | pass | Minimal |
| No silent scope expansion | pass | AI Review sort change gated |

---

## Architecture Review

**Findings:**
- Correct to reuse `designDerivativeUrlService.getDownloadUrlForCatalogPath` (already used for show ZIP originals).
- Design Library query builder currently omits sort → service default `updatedAt` — explicit `createdAt` desc is the right fix for “newest.”

**Required changes:**
- [ ] None beyond implement notes below

---

## Security Review

**Findings:**
- Staff-only; no new public endpoints; disable when `assetsPurgedAt` set.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] None (no production deploy in this goal)

---

## Data Model Review

**Findings:**
- Full-res path field: **`originalPath`**. Timestamps: **`createdAt`** / **`updatedAt`** only (no `importedAt`).

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- None.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Must cover query default + any merge/sort field bug when switching from `updatedAt`.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- ROADMAP / workflow state sufficient; ADR only if owner wants a durable “Studio library = createdAt” rule.

---

## Required Changes (if approved_with_changes)

1. **Implement only after owner go-ahead** — confirm sort surfaces (recommended: Design Library `createdAt` desc only; leave AI Review tab sorts as-is).
2. On implement: ensure `mergeDesignListPages` / cursor helpers honor `sortField` (do not hardcode `updatedAt` millis when sorting by `createdAt`).
3. Download control: **Design details modal only** (confirmed); not grid cards.

---

## Blockers (if blocked)

None — plan ready; human confirm before code.

---

## Verdict Rationale

**approved_with_changes** — scope and placement are sound; one non-blocking product confirm on sort surfaces, then implement.

---

## Next Step

Await owner: (1) accept recommended sort default or name extra lists, (2) **Continue Workflow** / **Next Phase** to implement.
