# Amendment 8 Phase 1B Stage 1a — Owner QA Amendment 2

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Baseline | Amendment 1 `c15a7be` |
| Trigger | Owner re-QA FAIL — archived category still in Portal after refresh/restart |
| Case | **A** (Firestore still active) |
| Signoff | **Not created** (per instructions) |

## Archived category identification

No category document on `fresh-prints-dev` transitioned to inactive during the failing QA.

| Evidence | Result |
|----------|--------|
| Collection `categories` | 18 docs |
| `isActive: false` count | **0** |
| All `isActive` | boolean `true` |
| Latest `updatedAt` among all | still **2026-07-01** (none updated by archive) |
| `archiveCategoryWithGuards` POSTs (90d) | **0** (tag archive POSTs exist 2026-08-04) |

Exact ID/name of “the archived category” cannot be recovered from Firestore because **no archive write persisted**. Empty unused candidates for owner re-QA (0 design refs): e.g. **Occasions** (`R84NWfeL2u4WyxKvCzuv`), Kids & Baby, Occupations, Patriotic & Americana, Luxury & Fashion Inspired, Awareness & Causes, Floral & Nature, School & Education, Western & Country.

## Live document evidence (Case A)

Authoritative `fresh-prints-dev` Admin SDK read during this pass: every category remains active. Portal showing all categories after refresh was **correct** for that data.

Amendment 1 mapper (`isActive === true`) remains correct defense-in-depth; it could not hide a category that was never archived.

## Root cause (evidence-tight)

1. **Case A:** Firestore never became inactive → Portal list was correct.
2. Studio archive depended on callable `archiveCategoryWithGuards` with **no postcondition** that the returned doc is `isActive === false`, and **no client Rules fallback** when the callable did not persist (unreachable / owner-only deploy vs UI admin / etc.).
3. Deployed Function `assertOwnerAdmin` was **owner-only** while Studio UI + Rules allow **admin** (latent footgun). Source fixed this pass; **Function not deployed** (forbidden).
4. Zero category-archive POSTs means this FAIL is **not** proven as “callable returned success without writing.” Prefer: guards path never successfully persisted + missing client postcondition/fallback.

## Correction

- `persistCategoryArchive`: prefer guards callable → verify inactive → client `categoryService.archiveCategory` fallback → refuse success if still active; do not bypass `blocked`.
- Client `archiveCategory` counts referencing designs before `isActive: false`.
- Function source: allow owner **or** admin (deploy deferred).
- Portal: focus/visibility reload of Firestore categories (no module TTL; Amendment 1 mapper retained).

## Files changed

- `apps/studio/.../persistCategoryArchive.ts` (+ test)
- `apps/studio/.../useArchiveCategory.ts`
- `apps/studio/.../categoryService.ts`
- `apps/studio/.../taxonomyArchiveCacheInvalidation.test.ts`
- `apps/studio/.../categoryService.archiveGuard.test.ts`
- `apps/portal/.../useCatalogCategories.ts` (+ freshness test)
- `apps/portal/.../catalogService.ts` (mapper path unchanged; no category TTL)
- `functions/src/archiveTaxonomyWithGuards.ts` (source only)
- This record + impl review + re-QA checklist; workflow state / CURRENT-STATE

## Discriminating regression tests

- `persistCategoryArchive.test.ts` — client fallback when guards “succeed” but doc stays active; admin/unreachable throw; refuse if still active; blocked not bypassed.
- `useCatalogCategories.freshness.test.ts` — focus/visibility reload; Firestore-only; no TTL cache.
- `categoryService.archiveGuard.test.ts` — design-ref guard + Function admin source.
- Stage 1a containment + Amendment 1 mapper tests remain green.

## Verification

| Check | Result |
|-------|--------|
| Focused Studio persist + Portal freshness + containment | **pass** (34) |
| Portal typecheck | **pass** |
| Studio typecheck | **pass** |
| Portal production build | **partial** — `EPERM` on `.next/trace` while `dev:portal` holds lock; Portal tsc green; Stage 1a build previously green |
| Lint (touched files) | **pass** |
| `git diff --check` | **pass** |
| Function deploy | **not done** (forbidden) |

## Implementation Review

Initial: **APPROVED_WITH_CHANGES** ([Review](2eeef54a-2cc5-43e1-b2de-907dcf612175)).  
Corrections applied: tightened root-cause (no false-success callable claim); dropped Portal category TTL; retained focus/visibility freshness.  
Final: **APPROVED** (see companion review doc).

## Reduced owner re-QA

`docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-2-manual-qa.md`
