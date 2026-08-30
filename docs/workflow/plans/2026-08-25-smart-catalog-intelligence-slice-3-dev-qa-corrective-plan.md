# Plan: Slice 3 DEV QA Corrective — Portal search post-filter + Filters toolbar

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (Slice 3 corrective) |
| Related | `docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-slice-3-test-report.md` |

---

## Goal

Restore real Portal UI Smart Profile search so named queries (e.g. `Scottish cow`) surface Path B QA designs, and hide the mobile-only Filters toolbar trigger on desktop — without changing Algolia index settings, prompt, or production.

## Background

Owner **SLICE 3 DEV QA: FAIL** after Path B. Direct Algolia/agent QA passed (16/17 named queries). Real local Portal UI failed the same queries. Smart Filters facets/category narrowing still worked. Desktop showed mobile `Filters` trigger.

## Diagnosis (repo check)

### Defect 1 — Portal search

**Root cause:** `useCatalogDesigns` runs Algolia managed search correctly, then **re-filters hydrated cards** with `filterCatalogDesignsBySearch` (title / description / tags only via `catalogDesignTextMatchesSearch`). Smart Profile hits (searchConcepts, themes, etc.) that are not in legacy text are dropped.

Evidence:
- `portalAlgoliaCatalogSearchService.listMatchingDesigns` + exact-token params return Highland for `Scottish cow` against `portal_catalog_ready_dev`
- `.env.local` index matches agent QA (`portal_catalog_ready_dev`)
- Client post-filter still passes `search: options.searchQuery` when `isManagedSearchQuery` is true (tags/category already skipped; **search was not**)

**Not the cause:** wrong index, missing searchableAttributes, feature-flag branching for Smart Filters, or need to copy Search Concepts into `searchText`.

### Defect 2 — Desktop Filters button

**Root cause:** `.design-library-open-filters-button { display: none }` loses to later same-specificity rules `.portal-button-sm` / `.portal-button-leading-icon { display: inline-flex }` in `catalog.css` / `globals.css`. Mobile `@media (max-width: 47.99rem)` still shows the button intentionally.

## Scope

### In Scope
- Skip client title/tag search re-filter when Algolia managed search already applied `q`
- Raise CSS specificity so desktop hides Filters trigger; mobile unchanged
- Tests at Portal search filter boundary + responsive CSS containment
- Same-class Studio managed-search title re-filter (drops Smart Profile text hits after Algolia) — narrow parity fix
- Slice 3 test report / corrective review bookkeeping

### Out of Scope
- Slice 4 / Catalog Processing Mode / auto-approval / verifier / backfill / tag retirement
- Production / App Hosting
- Smart Profile v2 / `catalog-enrich-v27` / category model
- Unrelated Portal redesign; do not remove mobile Filters sheet

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts`
- `apps/portal/features/catalog/utils/catalogSearch.ts` (optional pure helper)
- `apps/portal/styles/catalog.css`
- Portal tests under `apps/portal/features/catalog/`
- `apps/studio/.../useDesignLibraryManagedSearch.ts` (+ Studio containment/test if present)
- `docs/workflow/reviews/*slice-3*`

### Architecture Impact
- [x] Details: Algolia remains authority for managed `q`; client post-filter must not undo Smart Profile recall

### Security Impact
- [x] None (still hydrate via Firestore ready-by-id; no Algolia-only authorization)

### Data Model Impact
- [x] None

### Backend Impact
- [x] None (no Functions/Algolia settings deploy required for this corrective)

### UI / UX Impact
- [x] Details: Portal search results match Algolia; desktop toolbar hides mobile Filters; Smart Filters preserved

### Migration Impact
- [x] None

---

## Approach

1. When `isManagedSearchQuery`, pass empty `search` into `useFilteredCatalogDesigns` (keep tags/category skip). Update comment to state Algolia already applied `q`.
2. Extract a small pure helper (e.g. `resolveManagedSearchClientFilterInput`) for unit tests proving Smart Profile queries are not re-filtered by title.
3. CSS: `.design-library-open-filters-button.portal-button-sm { display: none }` (and mobile media `inline-flex`) so it beats `.portal-button-sm`.
4. Studio: stop applying `designMatchesSearchQuery` to Algolia hit lists (keep `designMatchesSmartFilters` consistency); exact-id path unchanged as needed.
5. Strengthen containment + add regression tests.
6. Run Portal typecheck + affected tests; stop for owner Portal UI QA (no Slice 3 signoff).

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Portal unit/containment | existing `tsx --test` patterns for catalog hooks/utils | yes |
| Portal tsc | `apps/portal` typecheck | yes |
| Studio managed-search test if touched | Studio containment/unit | yes if Studio changed |
| git diff --check | yes | yes |

### Manual (owner after fix)
Portal named searches + desktop/mobile Filters + Smart Filters/category narrowing (preserve prior PASS behaviors).

---

## Human Checkpoints

- Owner DEV Portal UI re-QA before Slice 3 signoff
- No production

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Skipping client search filter changes case/separator edge cases | Algolia exact-token params already enforce; legacy browse path unchanged |
| CSS specificity still overridden | Target `.portal-button-sm` combo; containment assert |

Rollback: revert Portal hook + CSS (+ Studio hook if included).

---

## Open Questions

None blocking — owner FAIL + AC authorize this corrective.
