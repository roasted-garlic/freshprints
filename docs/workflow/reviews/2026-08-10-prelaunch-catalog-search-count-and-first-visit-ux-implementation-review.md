# Review: Prelaunch catalog search, counts, and first-visit UX (implementation)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Implementation Review Agent (independent) |
| Plan | docs/workflow/plans/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-plan.md |
| Formal Review | docs/workflow/reviews/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-plan-review.md |
| Portal count verification | docs/workflow/reviews/2026-08-10-prelaunch-catalog-search-portal-count-verification.md |
| Branch | `hotfix/prelaunch-catalog-search-count-first-visit-ux` |
| Base | `origin/production` @ `b6e67be1b7fe02a69cd31077a203ee9102611ca5` (HEAD matches; work uncommitted) |
| Verdict | **approved** (corrections applied 2026-08-10: archived count honesty, useCatalogDesigns comment, tmp/Chris Corner excluded from commit) |

---

## Summary

Independent repo verification confirms the hotfix implements the approved plan plus Formal Review §1–6 for Studio Algolia managed search, Portal exact-token params (list + facets), Portal `q` persistence, About modal reuse/fail-open, search-only credentials, and containment against `loadAll` / snapshots / backend mutation. One binding honesty gap remains: archived Design Library client-side search can still show unfiltered `libraryTotal` as the count chip. Commit scope must exclude parked Chris Corner artifacts and `tmp-patch-design-library.mjs`.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | No Functions/Rules/indexes/Algolia setSettings; domain cutover untouched |
| Architecture alignment | pass | Component → Hook → Service; Algolia IDs → ordered Firestore hydrate |
| Security impact addressed | pass | Search-only `VITE_ALGOLIA_*` / Portal public search keys only; no admin key in clients |
| Data model impact addressed | pass | About modal browser-local only; no Firestore preference schema |
| Backend impact addressed | pass | No Functions/Rules/indexes/admin client diffs vs `origin/production` |
| Test strategy adequate | pass | Focused containment/unit tests present; full Test phase not yet run |
| Human checkpoints identified | pass | Prod Portal/Studio rollout + owner QA still required post-merge |
| Roadmap alignment | pass | Prelaunch hotfix; cutover not bundled |
| Documentation plan | pass | `BACKEND.md` Studio Algolia search-only notes + `.env.example` updated |
| No silent scope expansion | fail → fix before commit | Chris Corner + `tmp-patch-design-library.mjs` present as untracked parked/temp files — must not enter commit |

---

## Independent verification (binding checklist)

| # | Requirement | Verdict | Evidence |
|---|-------------|---------|----------|
| 1 | No `loadAll` / full-catalog hydrate / generated snapshots | **Pass** | Design Library uses `useDesignLibraryManagedSearch` without `loadAll: true`; containment tests assert no `loadAll` / `useGeneratedReadyDesigns` / `onSnapshot` on managed path; fail-closed when Algolia env missing |
| 2 | No Algolia admin keys in Studio/Portal clients | **Pass** | `studioAlgoliaCatalogFlags.ts` / client use `VITE_ALGOLIA_SEARCH_API_KEY` only; containment asserts no `ALGOLIA_ADMIN` / `adminApiKey` / `setSettings`; `.env.example` warns never admin |
| 3 | No Functions/Rules/indexes/Algolia setSettings changes | **Pass** | `git diff --name-only origin/production` shows no `functions/**`, rules, or indexes changes in this implementation set |
| 4 | Portal exact-token params on list **and** facet queries | **Pass** | Shared `withPortalCatalogAlgoliaExactTokenSearchParams` (`typoTolerance: false`, `queryType: 'prefixNone'`) applied in `listMatchingDesigns` and `buildPortalAlgoliaFacetSearchParams`; exactToken tests cover both |
| 5 | Studio `getDesignsByIds` ordered hydrate exists and is used | **Pass** | New `designService.getDesignsByIds` preserves request order, omits missing/unauthorized; `hydrateStudioDesignsPreservingOrder` → used by `studioAlgoliaCatalogSearchService.listMatchingDesigns` |
| 6 | Studio count labels honest (no mislabeling library total as filtered) | **Pass with required change** | Ready path: aggregate / `nbHits` / `matching (loaded)` modes exist and are wired. **Gap:** archived + non-empty client search with no category/tags/needsCompanion still resolves `browse-unfiltered` and can show unfiltered `libraryTotal` while cards are search-filtered |
| 7 | Portal `q` persistence when opening `designId` | **Pass** | Debounced `q` sync into URL; `searchParams`→state effect skips when only `designId` fingerprint changes; source test present |
| 8 | About modal reuses `PORTAL_HELP_ABOUT_*` / `PortalHelpAboutPanel`; fail-open storage | **Pass** | `PortalAboutFirstVisitModal` renders `PortalHelpAboutPanel` + eyebrow constant; `portalAboutModalPreference.ts` try/catch fail-open; mounted in `PortalAppShell` behind public-browse + bootstrap gates |
| 9 | Portal count: verification says no UI change | **Pass / confirmed** | Verification doc: no Portal count UI change. Code: `designCountLabel` still from `matchingCount`; `CatalogPageContent` diff vs production is +33 lines for `q` persistence only (no count plumbing rewrite) |
| 10 | Chris Corner artifacts not in implementation commit scope | **Pass for code path; commit gate required** | No Chris Corner logic in Studio/Portal feature files. Untracked parked Chris Corner plans/reviews/scripts + `tmp-patch-design-library.mjs` remain in the working tree and **must be excluded** from the hotfix commit |

### Hotfix base

| Check | Result |
|-------|--------|
| Branch | `hotfix/prelaunch-catalog-search-count-first-visit-ux` |
| `HEAD` / merge-base vs `origin/production` | Both `b6e67be1…` — Formal Review §6 satisfied |
| Commits ahead of production | None yet (implementation is working-tree only) |

---

## Architecture Review

**Findings:**
- Studio ready-catalog search correctly routes through Algolia → ordered `getDesignsByIds` hydrate; ordinary browse remains Firestore cursor pagination.
- Shared exact-token helper under `packages/shared/src/catalog-search/` keeps Portal + Studio param parity.
- Layering preserved (page/hook/service); Companion picker `loadAll` remains outside Design Library.

**Required changes:**
- [x] Fix archived client-search count label honesty (see Required Changes §1)

---

## Security Review

**Findings:**
- Search-only credentials only in Studio flags/client/env example/types and Portal existing public keys.
- Managed search fails closed with clear UI when config missing — no silent `loadAll`.
- About modal localStorage fail-open is correct.

**Required changes:**
- [ ] None for preferred path

**Human approval needed before production:**
- [x] Production Portal App Hosting + Studio packaged release (post-merge; not this review)
- [ ] Algolia index settings mutation — still out of scope unless QA fails query-time params
- [ ] Domain cutover — not this phase

---

## Data Model Review

**Findings:**
- No Firestore schema / preference documents introduced.
- About dismiss/snooze keys are browser-local only.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- No Functions, Rules, indexes, or Algolia admin `setSettings` changes in the implementation tree vs `origin/production`.
- `BACKEND.md` documents Studio `VITE_ALGOLIA_*` search-only vars and fail-closed behavior.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Focused tests added/extended: Portal exact-token + `q` persistence source tests; About preference fail-open; Studio containment, `getDesignsByIds`, count-label unit tests; shared exact params tests.
- Full Test phase (typecheck/lint/builds/`git diff --check`) is **not** claimed here — still required before signoff.
- Plan C.6: `useCatalogDesigns.ts` still comments that client re-filter would discard “typo-tolerant hits”; behavior (no client re-filter on managed path) remains correct, but the comment is stale after exact-token semantics.

**Required changes:**
- [x] Update/remove stale typo-tolerance comment (Required Changes §2)
- [x] Extend count-label test for archived client search after §1 fix

---

## Documentation Review

**Findings:**
- `docs/architecture/BACKEND.md` and `apps/studio/.env.example` updated for Studio search-only Algolia.
- Portal count verification artifact present and matched by code (no fabricated count UI fix).

---

## Required Changes (if approved_with_changes)

1. **Studio count chip — archived client search honesty (Formal Review §2 / Plan Approach A)**  
   When `browsingArchived` (or otherwise non-managed) and trimmed search is non-empty, do **not** use `browse-unfiltered` / `libraryTotal`. Treat client-side text search like other page-local filters (`browse-client-filtered` / `matching (loaded)` wording, or equivalent). Add/extend unit coverage.

2. **Stale Portal managed-search comment (Plan C.6)**  
   In `apps/portal/features/catalog/hooks/useCatalogDesigns.ts`, update or remove the comment that still describes preserving Algolia typo-tolerant hits — managed search is now exact-token / no-typo / `prefixNone`.

3. **Commit scope hygiene (Formal Review / workflow Forbidden Actions)**  
   Before commit, **exclude**:
   - All Chris Corner parked artifacts (`functions/scripts/**chris*`, related workflow plan/review docs)
   - `tmp-patch-design-library.mjs`
   - Unrelated workflow state noise if not intentional  
   Include only prelaunch catalog search/count/first-visit UX sources + their plan/review/verification docs for this goal.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

**approved_with_changes** — Core implementation matches the approved plan and Formal Review §1–6: no eager hydrate / snapshot regression, search-only keys, no backend/index mutation, Portal exact params on list+facet, ordered Studio hydrate, Portal `q` persistence, About modal reuse + fail-open, Portal count correctly left unchanged per verification. Remaining corrections are narrow: archived client-search count-label honesty, one stale comment, and strict commit exclusion of parked Chris Corner / temp files. Not blocked.

---

## Next Step

Implementation Agent applies Required Changes §1–3 → resume Test phase → then commit on hotfix (clean scope) → prepare PR → **STOP** before merge/deploy.
