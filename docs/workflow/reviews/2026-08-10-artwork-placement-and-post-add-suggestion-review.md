# Review: Artwork Placement + post-add Matching Designs suppression

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-10-artwork-placement-and-post-add-suggestion-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan is correctly scoped for DEV-only continuation of the companion/censor goal. `artworkPlacement` on the design (not the edge) matches owner intent and repo conventions. Post-add exclusion / no-nested-modal approach is the minimal fix using existing `workingItems`. No unresolved product decisions.

Proceed Implement → Test. Apply required changes below.

---

## Checklist

- [x] Scope bounded (DEV; no Algolia/prod)
- [x] Architecture (updateDesign for placement; companion service untouched for links)
- [x] Security (optional string; staff edit only via existing design edit permission)
- [x] Data model clear; no migration
- [x] Test strategy adequate
- [x] STOP for owner QA

---

## Required changes

1. Persist allowlisted strings only; unknown → omit/Unspecified on read.
2. Companion modal editor must call `updateDesign` with **only** placement (+ audit) — never status / companionDesignIds.
3. Portal badge is display-only; no filter/search.
4. Suggestion exclude uses **design id** from working request items regardless of quantity/size.
5. Adding from suggestion modal must not call `announceDesignAdded`.
6. Rules: add `isOptionalString(data, "artworkPlacement")`; deploy DEV only if Rules change.
7. Do not rename `DesignDetailsModal.companionPlacement.test.ts` unless necessary — that file tests modal placement of the panel, not the field.

---

## Verdict

**approved_with_changes** — implement immediately.
