# Plan: Prelaunch catalog search, counts, and first-visit UX

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Planning Agent |
| Status | approved_with_changes (see Formal Review) |
| Workflow | managed-phase (prelaunch hardening / hotfix-style) |
| Goal slug | `prelaunch-catalog-search-count-and-first-visit-ux` |
| Related | docs/workflow/reviews/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-plan-review.md |

---

## Goal

Fix Studio and Portal catalog search/count behavior so both apps operate against the complete eligible Design Library rather than only the currently hydrated page, preserve Portal search state when opening a result, and add a first-visit “About this portal” modal before the public domain cutover — without eagerly hydrating the full catalog, without abandoning Algolia, and without bundling `myprintrequest.com` cutover.

---

## Background

- Prelaunch companion/censored production promote is **COMPLETE** (Studio v1.0.2 published; production Portal App Hosting live; production managed Algolia live).
- Owner-reported defects on production-like catalog search/counts and Portal first-visit UX.
- Domain/DNS/Coming Soon remain separately blocked on `APPROVE MYPRINTREQUEST.COM CUTOVER` — **out of scope**.
- Prior Algolia Stage 1b / production signoff artifacts confirm Portal managed search is the live path; this phase hardens query semantics and adjacent UX only.

---

## Verified Git / branch state (read-only, 2026-08-10)

| Ref | SHA |
|-----|-----|
| Local `HEAD` (`development`) | `cd33108506932acb7adc8550c6131c5c8748defa` |
| `origin/development` | `cd33108506932acb7adc8550c6131c5c8748defa` |
| `origin/production` | `b6e67be1b7fe02a69cd31077a203ee9102611ca5` |
| Local `production` | `8cc014fb23370be6a7ac3672436163a47d390103` (**behind** origin by 5 commits) |
| Merge-base(`origin/production`, `origin/development`) | `3fabbf67b93eaa6fd155cddf1922d45c98e2574d` |

Ancestry notes:

- Neither tip is a strict ancestor of the other (`merge-base --is-ancestor` fails both ways).
- `origin/development` is **1 commit ahead** of the merge-base (workflow signoff docs only: `cd33108`).
- `origin/production` contains merge commits from promotion PRs (`#53`, `#54`) not present as the same tip lineage on `development`.
- Working tree on `development` also has **unrelated parked** Chris Corner backfill artifacts (untracked) — do not fold into this branch.

### Recommended branch / release flow (matches `docs/standards/DEPLOYMENT.md` Hotfix workflow)

Preferred strategy (consistent with DEPLOYMENT.md § Hotfix workflow):

1. Create a narrow hotfix branch from **current `origin/production` tip** (`b6e67be…`), e.g. `hotfix/prelaunch-catalog-search-count-first-visit-ux`.
2. Implement + test on that branch (against prod-like validation as approved).
3. Open PR: base `production` ← hotfix branch; merge via protected PR workflow (no direct push to `production`).
4. Deploy/publish Studio + Portal only after explicit owner approval + production QA.
5. Open a second PR (or merge the same hotfix) into `development` to synchronize — **never force-push / rewrite development**.
6. Delete the temporary hotfix branch after both merges.

No Git merge/push/deploy during Plan/Review.

---

## Scope

### In Scope

1. Studio Design Library **full-catalog search** without full hydration on ordinary browse.
2. Studio Design Library **complete count** (not hydrated-card count).
3. Portal Algolia **exact whole-word** query behavior (`Kill` vs `Will` / `Willie`).
4. Portal catalog **complete eligible count** display (verify + fix any loaded-page mislabeling).
5. Portal **search state preservation** when opening/closing a design result.
6. Portal **first-visit About modal** reusing Help “About this portal” content + local dismiss/snooze.

### Out of Scope

- `myprintrequest.com` DNS / Coming Soon / domain cutover
- Abandoning Algolia or restoring generated catalog snapshot publishers
- Eager full-catalog hydrate for search or counts
- Production Algolia **index settings** mutation (unless Formal Review/implement proves query-time params insufficient — then human checkpoint)
- Algolia reconcile invoke
- Functions / Rules / indexes deploys (unless later proven necessary + re-reviewed)
- Print Request lifecycle, image upload/processing, catalog status model changes
- Changing `/help` FAQ CMS content (About panel reuse only; behavior of Help page preserved)
- Chris Corner tag backfill closeout (parked separately)
- Committing secrets; exposing Algolia admin keys to clients

---

## Root causes (verified by repo trace)

### 1) Studio search limited to hydrated pages

| Layer | Path | Finding |
|-------|------|---------|
| Page | `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` | Search applied via `filterDesignsBySearch(visibleDesigns, searchQuery)` on **already loaded** designs |
| Utils | `apps/studio/.../utils/designLibrarySearch.ts` | Client substring `includes()` filter only |
| Query | `apps/studio/.../constants/designLibraryFilters.ts` | `buildCatalogDesignListQuery` — Firestore `statusIn: ["ready"]` (or archived); **no search field** |
| Hook | `apps/studio/.../hooks/useDesigns.ts` | Cursor pages (`DEFAULT_LIST_LIMIT = 100`); Design Library **forbids** `loadAll: true` |
| Service | `apps/studio/.../services/designService.ts` | `listDesignsPage` paginates; companion picker uses `loadAll` but Design Library must not |

**Root cause:** Search is a client-side filter over the cursor-paginated in-memory page, not a catalog-wide query.

### 2) Studio count = loaded/filtered length

| Finding | Detail |
|---------|--------|
| UI | `designCountLabel` = `` `${filteredDesigns.length} designs` `` (page comments already admit this is page-local) |
| Existing aggregate | `designService.countDesigns` → Firestore `getCountFromServer` + 15s cache — **already implemented**, used by AI Review tabs, **unused by Design Library** |

**Root cause:** Chip uses hydrated filtered array length; ignores existing `countDesigns`.

### 3) Portal `Kill` matches `Will` / `Willie`

| Layer | Path | Finding |
|-------|------|---------|
| Service | `apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts` | `searchSingleIndex` sends only `query`, `facetFilters`, `filters`, `hitsPerPage`, `page` |
| Defaults | Algolia engine defaults | `typoTolerance` enabled (≥4 chars → 1 typo) → **`Kill` ↔ `Will`**; default prefix matching can broaden toward `Willie` |
| Index settings | `functions/src/algolia/algoliaAdminClient.ts` | Searchable attrs + customRanking only — **no** typo/prefix overrides |
| Hook | `useCatalogDesigns.ts` | Intentionally **does not** re-filter Algolia hits client-side (preserves typo hits) |

**Root cause:** Query-time typo tolerance + prefix defaults — not a wrong index corpus. Prefer **client searchParams** fix over index mutation.

### 4) Portal count (~85)

| Finding | Detail |
|---------|--------|
| UI | `CatalogPageContent.tsx` → `matchingCount` from `useCatalogDesigns` |
| Ordinary browse | `catalogService.countReadyDesigns` (`getCountFromServer`) via `resolveOrdinaryMatchingCount` — **must not** seed from first-page length (TD-031) |
| Managed search | Algolia `nbHits` as `serverTotalCount` |
| Page size | Portal page size **40**, not 85 |

**Root cause (likely):** UI authority path is already aggregate/`nbHits`. Owner’s “~85 = loaded” may be (a) accurate ready membership ≈85, (b) Algolia/Firestore inventory mismatch vs Studio expectation, or (c) a residual fallback when aggregate fails / managed path uses `serverTotalCount ?? filteredDesigns.length`. **Implement must verify production** `countReadyDesigns({})` vs badge vs Algolia empty-query `nbHits` before inventing a new count backend.

### 5) Portal search clears on open result

| Finding | Detail |
|---------|--------|
| Typing | Updates React state only — **does not** write `?q=` (unlike category via `syncLibraryUrl`) |
| Open | `useCatalogDesignDeepLink.openDesignDetails` → `router.replace` with `designId` (preserves existing params, but `q` was never present) |
| Reset | `CatalogPageContent` `useEffect` on `[searchParams]`: `setSearchQuery(searchParams.get('q') ?? '')` → clears search |

**Root cause:** URL/`searchParams` sync effect overwrites local search when `designId` navigation changes params without `q`.

### 6) First-visit About modal (new requirement)

| Finding | Detail |
|---------|--------|
| Content | Bundled constants in `apps/portal/features/help/portalHelpContent.ts` (`PORTAL_HELP_ABOUT_*`) — **not** Studio CMS; rendered by `PortalHelpAboutPanel.tsx` |
| Modal patterns | `PortalConfirmModal`; snooze pattern `artworkQualityModalSnooze.ts`; prefs `explicitContentPreferenceService.ts` |
| Shell | `PortalAppShell.tsx` — best mount after auth bootstrap; gate with public-browse / avoid stacking on guest auth overlay / loading |

**Root cause:** Feature gap — no first-visit About modal yet. Prefer content reuse + localStorage dismiss/snooze (no Firestore preference schema).

---

## Affected Areas

### Files / Modules (expected)

**Studio**

- `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`
- `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` (and/or new `useDesignLibraryCatalogSearch` coordinator)
- `apps/studio/src/renderer/src/features/designs/services/designService.ts` (`countDesigns` wiring; `getDesignsByIds` hydrate helper)
- `apps/studio/src/renderer/src/features/designs/utils/designLibrarySearch.ts` (keep for non-managed / archived client filters)
- New Studio Algolia search adapter + flags (mirror Portal; search-only key only), e.g. under `apps/studio/.../features/designs/services/`
- `apps/studio/.env.example` (+ packaged build env documentation)
- Focused Studio tests (`designLibrarySearch`, page/hook containment, count label)

**Portal**

- `apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts` (+ facet params builder)
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`
- `apps/portal/features/catalog/hooks/useCatalogDesignDeepLink.ts` (if needed)
- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` (count fallback audit only if needed)
- New: first-visit About modal component + localStorage preference util (mirror artwork-quality snooze)
- `apps/portal/features/navigation/components/PortalAppShell.tsx` (or adjacent shell child)
- `apps/portal/features/help/portalHelpContent.ts` / `PortalHelpAboutPanel.tsx` (reuse; avoid duplicate copy)
- Focused Portal tests (Algolia params, Kill/Will/Willie, URL persistence, modal snooze)

**Shared (only if justified)**

- Optional: shared Algolia exact-match searchParams helper under `packages/shared/src/catalog-search/` so Studio + Portal stay aligned — preferred if both apps send the same params.

**Functions / Rules / indexes**

- **Not expected** for the preferred solution. Index settings mutation only if query-time params fail owner QA → human checkpoint + plan amendment.

### Architecture Impact

- [x] Details: Keep Component → Hook → Service. Search business logic stays in services. Studio gains optional Algolia **search-only** path for ready-catalog text search (same disposable index as Portal; Firestore remains SoT). Ordinary browse remains Firestore cursor pagination.

### Security Impact

- [x] Details: Search-only Algolia keys only (never admin). No new public sensitive endpoints. localStorage preference fail-open (no crash). No Rules relaxation.

### Data Model Impact

- [x] None (no Firestore schema / preference docs)

### Backend Impact

- [x] Details: Prefer **no** Functions change. Studio needs new optional `VITE_ALGOLIA_*` (or equivalent) search-only env vars documented in `.env.example` / BACKEND or DEPLOYMENT notes. Portal Algolia query params only.

### UI / UX Impact

- [x] Details: Studio count/search labels; Portal search exactness; search persistence; first-visit About modal. Manual production QA required.

### Migration Impact

- [x] None for Firestore. Studio packaged builds must include Algolia search-only env for production Studio search path (human checkpoint for release packaging).

---

## Approach

### A. Studio complete count

1. On Design Library mount / archived toggle change, call existing `designService.countDesigns(user, buildCatalogDesignListQuery({ archived, tags: [] }))` (and category if moved server-side later).
2. Display **library total** from aggregate — never `filteredDesigns.length` as “complete library.”
3. When client-only filters or managed search results are active, keep concepts distinct, e.g.:
   - Unfiltered browse: `{libraryTotal} designs`
   - Active search (Algolia): `{nbHits} results` (optionally with library total secondary if useful)
   - Do **not** relabel paginated loaded length as total.

### B. Studio full-catalog search (no full hydrate)

1. **Empty search:** keep current Firestore page + Load More (bounded).
2. **Non-empty search on ready catalog:** Algolia managed search (same prod/dev index as Portal) → page of objectIDs → hydrate via `getDoc`/`getDesignsByIds` preserving order → render cards.
3. Apply Algolia `facetFilters` / `categoryId` filters for tags/category when searching (align with Portal AND semantics).
4. `needsCompanion` remains post-hydrate client filter (field not in Algolia record) — document that this filter may require additional Algolia pages to fill the grid; do not full-scan Firestore.
5. **Archived + search:** Algolia indexes ready-only — keep client filter on archived pages **or** show explicit “search limited to loaded archived pages” (product note). Default ready path is the owner defect.
6. Clearing search returns to Firestore browse and clears managed-search state.
7. **Dependency:** add `algoliasearch` to Studio (same major as Portal `^5.x`) — acknowledged here for Review.
8. If Algolia env missing: fail closed for managed search with clear UI error (do not silently `loadAll`).

### C. Portal exact whole-word search

1. Extend `listMatchingDesigns` + `buildPortalAlgoliaFacetSearchParams` with query-time params (preferred):
   - `typoTolerance: false` — eliminates `Kill`→`Will`
   - `queryType: 'prefixNone'` — eliminates prefix expansion toward `Willie`
   - Keep existing ranking among true matches (`customRanking: desc(readyAtMs)` unchanged)
2. **Multi-word semantics (document, do not invent new language):** Algolia default AND of tokens; each token subject to the same exact/no-typo/no-prefix rules. Empty tokens ignored after trim.
3. Punctuation-adjacent matches: rely on Algolia tokenization (word separators) — covered by tests with fixtures / documented expectation for `Kill!`.
4. Case-insensitive: Algolia default.
5. Do **not** mutate production index settings in this phase unless query-time params fail QA.
6. Update/remove the hook comment that preserves typo-tolerant hits — behavior intentionally changes.

### D. Portal complete count

1. Verify production badge vs `countReadyDesigns({})` vs Algolia `nbHits` (empty query / facet query).
2. If plumbing already correct and membership ≈85: record as verified / no UI change; fix only if a fallback still advertises loaded length while paging incomplete.
3. Ensure managed-search badge uses `nbHits` (already) and ordinary browse never seeds from `designs.length` while `hasMore`.

### E. Portal search persistence

1. Sync debounced search into library URL via existing `buildCatalogLibraryHref` / `syncLibraryUrl` (write `q`).
2. Ensure `openDesignDetails` URL retains `q` (and category/tags as already in params where applicable).
3. Make the `searchParams`→state effect preserve local search when only `designId` changes **or** rely on `q` always being present once synced (prefer durable URL sync so refresh/share also work).
4. Avoid unnecessary remount/refetch storms: debounce URL writes; don’t reset Algolia results if `q` unchanged.

### F. First-visit About modal

1. Reuse `PORTAL_HELP_ABOUT_*` from `portalHelpContent.ts` (shared with `PortalHelpAboutPanel`) — no second hardcoded copy.
2. Modal UI: existing Portal modal overlay/panel patterns (`modal-overlay`, confirm-modal styling) + checkbox “Don’t show this again” + dismiss.
3. Persistence (browser-local):
   - Forever dismiss key, e.g. `fresh-prints-portal-about-modal-dismissed`
   - Or snooze-until ISO like artwork quality: normal dismiss → +24h; checkbox → far-future / dedicated forever flag
4. Storage try/catch fail-open (never crash).
5. Mount in `PortalAppShell` (or child) when:
   - Auth bootstrap past loading gates
   - Path is eligible public browse (`/`, `/catalog/**`, `/help`, optionally share) — avoid login/complete-profile/guest-auth overlay routes
   - No stacking over auth loading UI
6. Controllable time injection in unit tests (mirror artwork quality snooze tests).

---

## Firestore-read / Algolia-query impact

| Path | Before | After |
|------|--------|-------|
| Studio browse (no search) | ~100 docs/page | Unchanged |
| Studio count chip | 0 aggregate | +1 cheap `getCountFromServer` (cached 15s) per scope change |
| Studio search | 0 Algolia; client filter only | 1 Algolia query/page + N `getDoc` hydrates for hits (page-sized) |
| Portal browse count | Aggregate already | Unchanged if verified OK |
| Portal search | Algolia defaults (typo/prefix) | Same query volume; stricter params |
| Portal open result | Extra search reset/refetch | Should **reduce** wasteful refetch when search preserved |
| About modal | — | localStorage only; Help constants in bundle |

No full-catalog Firestore scan. No snapshot publishers restored.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Studio focused unit tests | `npx tsx --test` on Design Library search/count + Algolia params helpers | yes |
| Portal focused unit tests | Algolia searchParams (`Kill`/`Will`/`Willie`), URL persistence, About snooze | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes |
| Studio Vite build | `npx vite build` (from `apps/studio/`) | yes |
| Portal production build | `npm run build:portal` | yes |
| `git diff --check` | yes | yes |
| Functions build | — | **no** unless Functions touched |
| Rules suite | — | **no** unless Rules touched |

### Manual (prepare; execute after approved prod rollout)

See Production QA checklist below.

---

## Human Checkpoints Anticipated

- [x] Production Portal App Hosting rollout (after merge)
- [x] Production Studio release build/publish (Algolia search-only env baked into packaged config)
- [x] Production owner QA (Studio + Portal checklist)
- [x] Hotfix PR merge into `production`, then sync PR into `development`
- [ ] Domain cutover — **explicitly not this phase**
- [ ] Algolia **index settings** mutation — only if query-time fix fails (stop + amend)
- [ ] Functions/Rules/indexes deploy — only if plan amended

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Studio Algolia env missing in packaged build | High | Document env; gate release QA; fail closed with clear message |
| `needsCompanion` + search incomplete totals | Medium | Post-hydrate filter + paging; document limitation |
| Archived search still page-local | Low | Document; ready catalog is owner defect |
| Exact search too strict for multi-word UX | Medium | Document AND semantics; QA with real queries |
| Portal count already correct (~85 real) | Low | Verify before changing; avoid fake “fixes” |
| New `algoliasearch` Studio dependency | Medium | Same library as Portal; Review acknowledgment |
| Scope creep into domain cutover | High | Explicit out-of-scope + state forbidden actions |

---

## Rollback Plan

1. Revert hotfix PR / redeploy previous Portal App Hosting revision.
2. Studio: previous published installer channel version.
3. Algolia query params are client-side — rollback restores prior typo/prefix behavior without index surgery.
4. About modal: remove mount; localStorage keys harmless.
5. No Firestore migration to roll back.

---

## Documentation Updates Required

- [ ] `docs/architecture/BACKEND.md` or Portal/Studio env notes — Studio Algolia search-only vars
- [ ] `docs/standards/TESTING.md` — only if new test commands/patterns need recording
- [ ] `docs/project/DECISIONS.md` — short ADR for Portal exact-token search semantics + Studio Algolia search reuse (if Review requests)
- [ ] Help page content — **no** copy change unless reuse refactor preserves behavior

---

## Production QA checklist (prepare; do not run during Plan/Review)

### Studio production

1. Record complete Design Library count (visible without Load More).
2. Confirm count ≠ merely hydrated card count.
3. Identify a design outside the first page.
4. Search for it **before** Load More → must appear.
5. Clear search → bounded pagination intact.
6. Spot-check category/tags/halftone/needs-companion still work.

### Portal production

1. Confirm complete catalog count (vs hydrated page).
2. Search `Kill` → only exact-word matches; no `Will`/`Willie`.
3. Open one result → close → `Kill` + results/filters remain.
4. Reset About preference → modal appears on eligible visit.
5. Dismiss without checkbox → suppressed ~24h (test via controllable storage/time).
6. “Don’t show this again” → indefinite suppress.
7. `/help` About content still matches modal source.
8. Regression: Discover, filters, favorites, details, share, Add to Current Request.

---

## Open Questions

- [x] Branch flow — resolved: hotfix from `origin/production` per DEPLOYMENT.md
- [ ] **Owner confirm if needed:** Portal production ready membership truly >85? (verification step; not a planning blocker)
- [ ] **Product note (non-blocking):** Archived Design Library search remains page-local unless a follow-up indexes archived — acceptable for this phase?
- [ ] **Product note (non-blocking):** Multi-word = Algolia AND of exact tokens — confirm acceptable

None of the open notes block Plan approval if Review accepts the documented defaults.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-plan-review.md`
- Verdict: **approved_with_changes** (2026-08-10) — implement only with Required Changes §1–6
