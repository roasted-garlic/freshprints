# Amendment 8 Phase 1B Stage 1a — Owner QA Amendment 1

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Baseline | Stage 1a `b397ec0` |
| Trigger | Owner QA item #7 FAIL — inactive categories appearing |
| Items 1–6, 8–12 | PASS (preserved) |

## Exact root cause

1. **Authoritative active-state field** is boolean `categories.isActive` (`DATA_MODEL.md`, Studio `categoryService`, Firestore Rules `isPublicCatalogCategory`).
2. Stage 1a already queried `where('isActive', '==', true)`.
3. The **client mapper** introduced with Wave C / kept in Stage 1a only checked `typeof name === 'string'` and **did not** require `data.isActive === true`. Pre–Wave C Portal code used `mapCategoryDocument` with `data.isActive !== true → null`.
4. That missing client enforcement is the source-proven defect: archived / malformed docs could be mapped if ever present in a result set (defense-in-depth gap vs Studio mapper).
5. **Live `fresh-prints-dev` read (Admin SDK) during this investigation:** **0** documents with `isActive: false` (18/18 boolean `true`). Generated `catalog-reference` client snapshot likewise lists the same 18 as active. Empty-ready categories (9 of 18) are still **active** schema records — not inactive.
6. No generated taxonomy path, cache merge, or UI reintroduction of inactive docs was found on the Stage 1a path (`useCatalogCategories` → `listActiveCategories` only).

## Correction

Restored strict `mapPortalActiveCategory` (`name` string **and** `isActive === true`) plus `sortPortalCatalogCategories`. Firestore-only load retained. No generated taxonomy restore. No data migration. No Stage 1b changes.

## Files changed

- `apps/portal/features/catalog/services/catalogService.ts`
- `apps/portal/features/catalog/services/catalogService.test.ts`
- This record + re-QA checklist + impl review; workflow state / local CURRENT-STATE

## Regression test

`Amendment 1 — mapPortalActiveCategory excludes inactive` in `catalogService.test.ts`:

- active included;
- `isActive: false` excluded (control proves b397ec0-style weak mapper would accept);
- missing / string / numeric `isActive` excluded;
- ordering unchanged;
- `listActiveCategories` uses mapper + FS query, not `loadClientTaxonomy`.

## Verification

| Check | Result |
|---|---|
| Focused catalogService + containment tests | **pass** |
| Portal typecheck | **pass** |
| Portal build | Retry hit `EPERM` on `.next/trace` while `dev:portal` held the lock; Stage 1a build was already green at `b397ec0`. Re-run build when Next is idle if desired. |
| Lint | **pass** |
| `git diff --check` | **pass** |

## Implementation Review

See companion review doc — **APPROVED**.

## Reduced owner re-QA

`docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-1-manual-qa.md`
