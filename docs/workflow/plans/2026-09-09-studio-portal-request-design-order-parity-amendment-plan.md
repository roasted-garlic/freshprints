# Plan Amendment: Align Studio request design order with Portal

| Field | Value |
|-------|-------|
| Date | 2026-09-09 |
| Author | FreshForge Planning |
| Status | ready_for_review |
| Type | **Amendment** (display-order parity) |
| Parent corrective | `docs/workflow/plans/2026-09-09-studio-editing-readd-show-queue-permissions-corrective-plan.md` |
| Parent Formal Review | `docs/workflow/reviews/2026-09-09-studio-editing-readd-show-queue-permissions-corrective-review.md` |
| Trigger | Owner ask during Editing→re-add corrective: Studio request design order must match Portal |
| FreshForge impact | Application only — not Starter Surface |

---

## Goal

Print Request design grids in **Studio** and **Portal** show the same order for the same
request items (same `sortOrder` / `createdAt` / id tie-break semantics).

## Current behavior (repo fact)

| Surface | Helper | Order |
|---------|--------|-------|
| Portal Current Request / detail | `sortWorkingCurrentRequestItems` → `sortPrintRequestItemsNewestFirst` | **Newest added first** (highest `sortOrder`) |
| Studio Print Request detail / item lists | local + shared `sortPrintRequestItemsForDisplay` | **Oldest added first** (ascending `sortOrder`) |

Persisted `sortOrder` values stay ascending appends on both apps. Only presentation differs.
Duplicate insert helpers already split by display direction:
- Studio: `resolveDuplicateInsertAfterSortOrder` (visual-right under oldest-first)
- Portal: `resolveDuplicateInsertBeforeSortOrder` (visual-right under newest-first)

Owner Portal screenshot is the reference grid; product ask is parity with Portal.

## Recommended product direction

**Align Studio display to Portal newest-first** (do not reverse Portal back to oldest-first).

Rationale: Portal Continuable/editing UX already trains “last added at the front”; Studio staff
editing the same request should see that same sequence.

## Scope

### In scope

1. Studio Print Request item display lists (detail grid / hooks / service list reads used for UI)
   switch to `sortPrintRequestItemsNewestFirst` (prefer shared package helper; remove or thin
   duplicate Studio-local sorter if safe).
2. Studio Duplicate action uses `resolveDuplicateInsertBeforeSortOrder` so a duplicate still
   appears immediately to the **visual right** under newest-first (same as Portal).
3. Focused unit/contract tests updated for Studio display + duplicate insert.
4. Brief DATA_MODEL / shared helper comment update so docs no longer say Studio=asc only.

### Out of scope

- Changing persisted `sortOrder` assignment rules for normal Add (still append higher values).
- Reordering Portal (Portal stays newest-first).
- Gang-sheet layout / export / production placement algorithms unless they currently reuse the
  **display** sorter for staff-facing request grids (verify during implement; do not silently
  change production nest order).
- Show Queue allocation row order (separate from request design grid).
- The already-deployed Editing→re-add callable/Rules corrective (orthogonal).

## Approach

1. Inventory every Studio call site of `sortPrintRequestItemsForDisplay` / duplicate insert.
2. For **request design UI** paths: use newest-first + Portal-equivalent duplicate insert.
3. Leave non-UI / production nest paths on ascending chronological order unless they are the
   same staff-facing request grid.
4. Update tests + docs comments.
5. Owner manual QA: open the same Editing/Continuable request in Portal and Studio; grids match
   left-to-right / top-to-bottom.

## Test strategy

| Check | Required |
|-------|----------|
| Shared display-order unit tests | yes |
| Studio duplicate-insert / display contract tests | yes |
| Portal newest-first tests unchanged (still pass) | yes |
| Manual: same request Portal vs Studio grid parity | yes (owner) |

## Human checkpoints

- [x] Product direction default: Studio → Portal newest-first (confirm or override)
- [ ] Owner visual QA after implement
- [ ] No production publish in this amendment unless separately authorized

## Risks

| Risk | Mitigation |
|------|------------|
| Studio Duplicate places on wrong side after display flip | Switch to `resolveDuplicateInsertBeforeSortOrder` with Portal |
| Accidental production nest reorder | Inventory call sites; only change display grids |
| Confuses staff used to oldest-first | Owner-confirmed Portal parity; note in QA |

## Sequencing relative to Editing→re-add corrective

The Editing→re-add corrective is **DEV-deployed** and waiting on owner re-QA. This amendment is
**orthogonal** and must not block that re-QA.

Preferred sequencing:
1. Owner completes Editing→re-add DEV re-QA (PASS / FAIL).
2. Owner confirms this order-parity amendment (Studio→Portal newest-first).
3. Formal Review of this amendment → implement → test → Studio DEV publish checkpoint as needed.

If owner wants both in one follow-up session, say so explicitly after re-QA.
