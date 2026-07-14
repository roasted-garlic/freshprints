# Plan: Portal catalog standalone Halftone filter toggle

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-13-portal-catalog-halftone-filter-toggle-review.md |

---

## Goal

Give Portal customers a **standalone Halftone toggle** on the catalog filter bar so they can filter designs tagged as halftone without opening the Tags modal and hunting for the `halftone` tag.

## Background

Halftone is a first-class product concept (ADR-FP-080): staff confirm it and AI Review syncs the canonical lowercase tag `"halftone"` onto approved designs. Catalog filtering already supports tags via `filterCatalogDesignsByTags`, but customers must discover that tag inside the Tags drawer. Owner asked for a dedicated toggle for halftones alone.

## Scope

### In Scope

- Portal catalog / Design Library filter bar: add a **Halftone** on/off control next to Category / Tags
- Filter semantics: ON requires the design to include the canonical `"halftone"` tag (same AND semantics as other selected tags)
- Keep a single filter source of truth: toggle adds/removes `"halftone"` from `selectedTags` (no parallel boolean that can drift)
- Hide `"halftone"` from the Tags modal list and from active tag chips so the dedicated toggle is the primary UX surface (avoid duplicate controls)
- Tags button count excludes the hidden halftone tag when counting “other” tags, **or** continues to count all selected tags including halftone — prefer **exclude** so Tags `(n)` only reflects modal-visible tags
- Clear filters / “clear tags” paths remove halftone along with other tags (existing clear already clears `selectedTags`)
- CSS for a compact filter-bar toggle consistent with Portal secondary controls
- Unit coverage for any small helper that syncs/hides the canonical tag
- Manual UI checkpoint on Portal discover + library filter docks

### Out of Scope

- Studio Design Library halftone filter toggle (staff can still use Tags; optional follow-up)
- New Firestore field, index, or non-tag filter signal
- Changing how designs are tagged as halftone (upload checkbox, intake, AI Review)
- URL query persistence for filters (none exists today)
- Renaming / migrating existing tag values other than relying on canonical `"halftone"`

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/components/CatalogFilterBar.tsx`
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`
- `apps/portal/features/catalog/components/CatalogTagFilterModal.tsx` (and/or tag option builder)
- `apps/portal/features/catalog/utils/catalogSearch.ts` (+ `catalogSearch.test.ts`)
- Possibly small shared constant export for canonical name (prefer `packages/shared` next to `syncHalftoneTagInList`, or a Portal-local constant if shared export is overkill)
- `apps/portal/styles/catalog.css`

### Architecture Impact

- [x] Details: UI + existing client-side filter utils only; no new services or backend calls

### Security Impact

- [x] None — client-side filter of already-visible catalog designs; no auth/data exposure change

### Data Model Impact

- [x] None — continues to use design `tags` including canonical `"halftone"`

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Portal catalog filter dock (home discover + `/catalog` library). Manual UI review required.

### Migration Impact

- [x] None — designs without the tag simply won’t match when toggle is ON (expected)

---

## Approach

1. **Canonical tag**
   - Use lowercase `"halftone"` (same as `syncHalftoneTagInList` default). Optionally export `CANONICAL_HALFTONE_TAG` from shared for one definition.

2. **Filter bar control**
   - Add accessible toggle/checkbox control labeled **Halftone** in `CatalogFilterBar` secondary row (beside Tags).
   - Props: `halftoneFilterOn: boolean`, `onHalftoneFilterChange: (on: boolean) => void`.
   - Parent derives `halftoneFilterOn` from `selectedTags.includes(CANONICAL_HALFTONE_TAG)`.

3. **State wiring in `CatalogPageContent`**
   - On toggle ON → ensure `"halftone"` is in `selectedTags`.
   - On toggle OFF → remove `"halftone"` from `selectedTags`.
   - Existing `filterCatalogDesignsByTags` unchanged for semantics.

4. **Hide from Tags UX**
   - Filter `"halftone"` out of `buildCatalogTagOptions` results (or modal render list) so it doesn’t appear in the Tags drawer.
   - When rendering active tag chips, skip `"halftone"`.
   - Tags button label count uses non-halftone selected tags only.

5. **Helpers + tests**
   - Small helpers e.g. `isCanonicalHalftoneTag`, `withHalftoneTagFilter`, `withoutHalftoneTag`, `countVisibleSelectedTags` in `catalogSearch.ts` (or adjacent util).
   - Extend `catalogSearch.test.ts`.

6. **Styles**
   - Compact control that fits mobile secondary filter row; light/dark via existing CSS variables; no new card chrome.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npx tsx --test apps/portal/features/catalog/utils/catalogSearch.test.ts` | yes |
| Lint | ReadLints on touched files | yes |
| Typecheck | portal `tsc` / existing package script if quick | preferred |
| Build | no | |
| Integration / E2E / Backend | no | |

### Manual

- [x] Details: Portal catalog filter dock
  1. Toggle Halftone ON → only designs with `halftone` tag remain (with category/search still applying).
  2. Toggle OFF → halftone constraint removed.
  3. Tags modal does not list `halftone`; other tags still work with Halftone ON (AND).
  4. Clear / remove other tag chips does not leave a stale halftone-only state incorrectly; Clear tags / clear all filters clears toggle.
  5. Mobile + desktop filter dock layout remains usable.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval (not required beyond owner PASS on checkpoint)
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
| Designs marked via staff toggle but missing tag (data drift) | low | Existing ADR requires tag sync on approve; filter stays tag-based |
| Customers still expect `halftone` in Tags list | low | Dedicated toggle is the product ask; omit from modal to reduce duplication |
| Filter row crowding on small phones | medium | Compact label + CSS; verify in manual checkpoint |
| Studio parity gap | low | Explicitly out of scope; note on ROADMAP if desired later |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert Portal filter-bar / catalogSearch / CSS changes; catalog returns to Tags-only discovery of `halftone`.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md (no ADR change; tag remains source of truth)
- [x] Other: `docs/project/ROADMAP.md` Portal polish note on signoff; handoff CURRENT-STATE on close

---

## Open Questions

- [x] None blocking — Portal-only; Studio deferred; tag remains filter signal

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-13-portal-catalog-halftone-filter-toggle-review.md
- Verdict: pending
