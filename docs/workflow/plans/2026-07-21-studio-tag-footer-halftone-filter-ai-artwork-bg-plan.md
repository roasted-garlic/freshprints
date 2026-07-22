# Plan: Studio tag footer, Design Library halftone filter, AI Processing artwork bg

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-21-studio-tag-footer-halftone-filter-ai-artwork-bg-review.md |

---

## Goal

Ship three narrow owner UI fixes: (1) right-align Cancel/Apply on Studio Design Library tag filter modal footer; (2) add a Halftone filter toggle to the Studio Design Library search/filter bar matching Portal’s existing tag-based filter behavior; (3) expose the same per-design artwork background control on Studio AI Processing approve/reject (Needs Review) so staff can set grey / `#2C2D2D` / custom hex before approve, using the existing `artworkBackgroundHex` write path.

## Background

Prior managed phase (library OG rotation + per-design artwork bg) is at a **manual checkpoint** and is not closed. Owner requested these three follow-ups without inventing PASS on that checkpoint. Investigation:

| Item | Finding |
|------|---------|
| Tag footer | `DesignLibraryTagFilterModal` uses `design-details-footer` 3-column grid but only renders **start** + **actions** (no center). Actions land in the middle column → look centered. |
| Halftone search toggle | **Portal** `CatalogFilterBar` already has Halftone switch wired to `selectedTags` via `setHalftoneInSelectedTags`. **Studio** `DesignLibraryFilterControls` lacks it. Owner phrasing said “just like in studio”; code shows the existing control is on Portal — fix **Studio Design Library** to mirror Portal. |
| AI Processing bg | Artwork bg UI lives in Design Library edit (`DesignFormFields`). AI Processing `AiReviewFormPanel` has title/category/description/tags/halftone only. `designService.updateDesign` already persists `artworkBackgroundHex` (deleteField when clearing to default grey). |

Prior phase remains parked for owner PASS/FAIL on rotation + bg mats/OG.

## Scope

### In Scope

1. Studio tag filter modal footer layout: Clear left; Cancel + Apply tags right.
2. Studio Design Library filter dock: Halftone toggle; same AND tag filter semantics as Portal; hide `halftone` from Tags button count / active chips / tag modal list (match Portal).
3. AI Processing Needs Review form: artwork background preset + custom hex; seed from design; dirty tracking; persist on approve via existing `updateDesign` path; reuse shared form helpers / extract shared control if needed.

### Out of Scope

- fb:app_id
- Production deploy
- Soft-deploy Functions (no Functions field/write-path change expected — Studio client write already exists)
- Per-share OG rotation
- Closing prior OG/artwork-bg manual checkpoint without owner PASS
- Portal CatalogFilterBar changes (already has Halftone)
- AC/request mats expansion

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/.../DesignLibraryTagFilterModal.tsx` (+ CSS only if needed)
- `apps/studio/.../DesignLibraryFilterControls.tsx`, `DesignLibraryPage.tsx`
- `apps/studio/.../designLibrarySearch.ts` (+ tests): halftone selected-tag helpers; exclude from facets
- `apps/studio/.../styles/components/design-library.css` (footer / filter toggle spacing)
- `apps/studio/.../ai-review`: `AiReviewDraftForm`, `aiReviewFormState`, `AiReviewFormPanel`, `aiReviewInboxService.approveFromInbox`
- Possibly extract `ArtworkBackgroundFields` from `DesignFormFields` for reuse
- Unit tests: `designLibrarySearch`, `aiReviewFormState`

### Architecture Impact

- [x] Details: UI + Studio service wiring only; no new modules; reuse existing design update field.

### Security Impact

- [x] None (same staff permissions / existing design update path)

### Data Model Impact

- [x] None (reuse `artworkBackgroundHex`; no new fields)

### Backend Impact

- [x] None (no Functions soft-deploy required)

### UI / UX Impact

- [x] Details: Studio Design Library filters + AI Processing Needs Review form; manual checkpoint required

### Migration Impact

- [x] None

---

## Approach

1. **Tag footer:** In `DesignLibraryTagFilterModal`, insert empty `design-details-footer-center` spacer (or equivalent) so actions occupy the right grid column — Clear stays left. Prefer markup fix over changing shared 3-column CSS used by `DesignDetailsModal`.

2. **Halftone filter (Studio Design Library):**
   - Add helpers mirroring Portal (`selectedTagsIncludeHalftone`, `setHalftoneInSelectedTags`, `visibleSelectedTags` / count).
   - Wire `Toggle` (Studio pattern) on `DesignLibraryFilterControls` next to Tags.
   - Page: toggle updates `selectedTags`; Tags count + chips use visible (non-halftone) tags; exclude `halftone` from `computeFacetedTagsForDraftSelection` output (and draft toggle UX) like Portal.
   - Existing `filterDesignsByTags` already ANDs selected tags including `halftone`.

3. **AI Processing artwork bg:**
   - Extend `AiReviewDraftForm` with `artworkBackgroundPreset` + `artworkBackgroundCustomHex`.
   - Seed via existing `mapArtworkBackgroundToForm` / mapper helpers; include in `isAiReviewDraftDirty`.
   - Reuse or extract artwork background fieldset UI into shared component used by `DesignFormFields` + `AiReviewFormPanel`.
   - On `approveFromInbox`, pass `artworkBackgroundHex` via `buildArtworkBackgroundUpdateValue` (null → deleteField / clear to grey per existing service rules). Validate custom hex before approve (same as Design Library edit).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (Studio search / AI draft) | `apps/studio` node tests for touched utils | yes |
| Typecheck Studio | existing studio typecheck script | yes |
| Lint | if configured for touched paths | no if none |
| Build / Functions | no | no (no Functions change) |
| Portal typecheck | no | no |

### Manual

- [x] Details: three fix checklists in human checkpoint doc after implement

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (three fixes)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Owner meant Portal for item 2 | Low | Code shows Portal already has toggle; Studio is the gap — document surface fixed |
| Footer CSS change breaks Design Details | Low | Prefer spacer markup in tag modal only |
| Invalid custom hex on approve | Medium | Block approve when custom invalid (same as edit form) |
| Prior OG checkpoint confusion | Low | Keep parked; do not invent PASS |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert Studio UI commits; no data migration. Designs with `artworkBackgroundHex` already persist independently.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md (already documents `artworkBackgroundHex`)
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: workflow plan/review/test/manual checkpoint; state + CURRENT-STATE handoff

---

## Open Questions

- [x] None (item 2 surface resolved from code: Studio Design Library)

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-studio-tag-footer-halftone-filter-ai-artwork-bg-review.md
- Verdict: pending
