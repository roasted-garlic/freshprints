# Review: Stage 1b-A Algolia search replacement — implementation

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Independent Implementation Review (adversarial) |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-search-replacement-plan.md` |
| Decision analysis | `docs/workflow/reviews/2026-08-07-stage-1b-d1-search-architecture-decision-analysis.md` |
| Secrets checkpoint | `docs/workflow/reviews/2026-08-07-stage-1b-algolia-dev-secrets-checkpoint.md` |
| D1 | **A = Algolia** (selected; code path under review) |
| Verdict | **APPROVED_WITH_CHANGES** |

---

## Summary

Stage 1b-A Algolia wiring matches the binding architecture: Firestore remains SoR, index is ready-only / public-allowlisted / disposable, ordinary browse stays on Firestore, publishers are untouched, and secrets are not committed. Three correctness defects were found and fixed during this review (pagination offset, client re-filter defeating typo tolerance, multi-word tag taxonomy lookup). Live enablement correctly remains stopped at the owner secrets/account checkpoint — no Algolia account, Secret Manager, or deploy was performed.

---

## Challenge matrix

| Challenge | Result | Evidence |
|-----------|--------|----------|
| Algolia not SoR? | **PASS** | Hits → `getReadyDesignsByIds` / Rules; mutations stay Firestore; sync deletes on leave-ready |
| Only ready indexed? | **PASS** | `buildPortalCatalogAlgoliaRecord` null if `status !== 'ready'`; sync deletes; reconcile queries `status==ready` then clear+rewrite |
| Private fields leak? | **PASS** | Allowlist `objectID/title/searchText/categoryId/categoryName/tagIds/tagFacetKeys/readyAtMs`; unit test rejects AI/staff notes |
| True multi-tag AND? | **PASS** | `facetFilters: [[tagIds:a],[tagIds:b]]` (outer AND); matches generated AND contract |
| Facets preserved? | **PASS** | Global + narrowed via `tagFacetKeys`; `catalogService` routes when configured |
| `readyAt`? | **PASS** | Indexed `readyAtMs` + `customRanking: desc(readyAtMs)`; FS browse/`New This Week` unchanged |
| FS by-ID order preserved? | **PASS** | `hydrateCatalogDesignsPreservingOrder` remaps Algolia hit order |
| No full-catalog hydrate? | **PASS** | `isHydrating = false`; managed path pages; ordinary path bounded FS pages |
| No per-keystroke storm? | **PASS** | `CATALOG_SEARCH_DEBOUNCE_MS = 300`; no InstantSearch |
| Outage leaves FS browse healthy? | **PASS** | Search/multi-tag errors stay on managed path; ordinary browse never calls Algolia; facet errors → modal “unavailable” |
| Generated reads zero when Algolia enabled? | **PASS** | `useAlgoliaSearch` short-circuits before `portalCatalogAssetService`; facets dynamic-import Algolia only when configured |
| Publishers remain? | **PASS** | Sync is sibling; does not call publisher; asset service retained for transition |
| No Stage 4/5/6 slipped in? | **PASS** | No publisher delete / Storage cleanup / prod promotion in this diff |
| Secrets not committed? | **PASS** | Admin via `defineSecret`; Portal `.env.example` placeholders only; no secret values in reviewed source |
| Circular import / correctness bugs? | **PASS after fixes** | Facet path uses dynamic import to avoid cycle; three bugs corrected (below) |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Stage 1b-A only; Stage 4/5/6 gated |
| Architecture alignment | pass | Hybrid search; FS SoR; no Option C/D; no full hydrate |
| Security impact addressed | pass | Search-only client key; admin Secret Manager; index ≠ auth |
| Data model impact addressed | pass | No FS schema migration; disposable index schema |
| Backend impact addressed | pass | Sync + reconcile + scheduled reconcile; skip when unconfigured |
| Test strategy adequate | pass | Record allowlist + containment + multi-word tag tests; live QA still Stage 1b-C |
| Human checkpoints identified | pass | Secrets/account/deploy STOP (existing checkpoint doc) |
| Roadmap alignment | pass | Post-launch catalog stability; Amendment 9 not reopened |
| Documentation plan | pass | Checkpoint + plan appendix; env example documented |
| No silent scope expansion | pass | Publishers retained; generated transition path kept |

---

## Architecture Review

**Findings:**
- Ordinary browse / category / single-tag / Discover / Home stay on Firestore (`allowsBoundedCatalogFirestoreFallback`).
- Search + multi-tag use Algolia when `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` **and** public config present; otherwise generated transition path (until Stage 4).
- Card hydrate is FS by-id only — index omits artwork URLs (minimal record).
- Sync classification reuses `classifyPortalCatalogDesignChange` (skips operational/card-only) — aligned with publisher skip semantics; taxonomy renames rely on 24h reconcile (acceptable safety net per plan).

**Required changes:**
- [x] Skip client-side q/tag/category re-filter on managed search results (applied)
- [x] Paginate by Algolia hit offset / `hitCount`, not hydrated length (applied)
- [x] Resolve `designs.tags` canonical names → taxonomy slug ids for facet/searchText (applied)

---

## Security Review

**Findings:**
- Portal only receives search-only env vars; admin key is `ALGOLIA_ADMIN_API_KEY` Secret Manager.
- Non-ready / Rules-denied IDs omitted on hydrate — Algolia never authorizes.
- Reconcile callable requires owner/admin staff.
- Unconfigured sync no-ops (empty `ALGOLIA_APP_ID`).

**Required changes:**
- [ ] None (code)

**Human approval needed before production:**
- [x] Dev Algolia account + secrets + Functions deploy (existing checkpoint — **STOP**)
- [ ] Later: Stage 6 production promotion (separate)

---

## Data Model Review

**Findings:**
- No Firestore migration.
- Index fields match analysis §3 (+ `tagFacetKeys` for named facets).
- `designs.tags` store lowercase **names**; tag docs use slug **ids** — indexing must resolve both (fixed).

**Required changes:**
- [x] Taxonomy map keyed by id **and** name; sync loads slug fallback (applied)

---

## Backend Review

**Findings:**
- `syncPortalCatalogDesignToAlgolia`, `reconcilePortalCatalogAlgoliaIndex`, `reconcilePortalCatalogAlgoliaIndexScheduled` exported; secrets wired.
- Reconcile clear-then-save is appropriate at current catalog scale.
- Flag off → zero Algolia client traffic from Portal.

**Required changes:**
- [ ] None beyond taxonomy lookup fix (applied)

---

## Testing Review

**Findings:**
- Unit: `buildPortalCatalogAlgoliaRecord.test.ts` (allowlist + multi-word).
- Containment: `portalCatalogStage1bAlgoliaContainment.test.ts` (debounce, Algolia prefer, hydrate, hit offset, publishers retained).
- Ran this review: **19/19 pass** (`buildPortalCatalogAlgoliaRecord`, Stage 1b + Phase 1a containment, `useCatalogDesigns` gate tests).
- Stage 1b-B/C live verification still blocked on secrets checkpoint.

**Required changes:**
- [ ] None for this review pass

---

## Documentation Review

**Findings:**
- Checkpoint doc correctly forbids pasting secrets and lists env/Function names.
- Plan Stage 4/5/6 remain separate.

---

## Corrections applied during review

1. **`useCatalogDesigns` + Algolia service — pagination**  
   Load-more used `offset: allDesigns.length` (hydrated cards). If Rules omit hits, offset drifts and can re-fetch page 0. Now tracks `managedSearchNextOffset` / `hitCount`.

2. **`useCatalogDesigns` — client re-filter**  
   Managed results were re-filtered with `filterCatalogDesignsBySearch`, which drops Algolia typo-tolerant hits. Managed path now skips client q/tag/category re-filter.

3. **Algolia record taxonomy — multi-word tags**  
   Sync looked up `tags/{designTagToken}` only; multi-word names (e.g. `mama bear` → doc `mama-bear`) missed aliases/facet keys. Now slug-fallback load + name-keyed taxonomy maps.

---

## Residual notes (not blockers)

- `matchingCount` can exceed visible cards when some Algolia hits fail FS hydrate (intentional fail-closed).
- Taxonomy rename without design write waits for scheduled/manual reconcile.
- `catalogNeedsFullClientHydrate` name is legacy; runtime hydrate flag is hard-`false` (no full-catalog hydrate).
- Live “generated reads = 0” proof requires Stage 1b-B after flag-on + reconcile.

---

## Required Changes (if approved_with_changes)

1. ~~Pagination hit-offset~~ — **done in review**
2. ~~Skip managed-search client re-filter~~ — **done in review**
3. ~~Multi-word tag taxonomy resolution~~ — **done in review**
4. **Owner:** remain at secrets checkpoint — create Algolia app/keys, Secret Manager, deploy sync, reconcile, then enable Portal flag (phrases in checkpoint doc). Do **not** treat this review as deploy authorization.

---

## Blockers

None for **code** acceptance. Live integration remains **WAITING ON OWNER** per secrets checkpoint (expected STOP).

---

## Verdict Rationale

**APPROVED_WITH_CHANGES** — architecture and security gates hold; three correctness bugs required and received in-review fixes; remaining gate is the pre-existing human secrets/account checkpoint, not further code redesign. Not **BLOCKED** (no unresolved code defect). Not unconditional **APPROVED** because changes were required and live cutover is still checkpoint-gated.

---

## Next Step

1. Keep PR #40 unmerged; no Algolia account/secrets/deploy from agents.
2. Owner completes `2026-08-07-stage-1b-algolia-dev-secrets-checkpoint.md` approval phrases when ready.
3. Then Stage 1b-B local verification (generated-read trace = 0 on former A1–A3) → Stage 1b-C owner QA.
4. Stage 4/5/6 remain separate human checkpoints after QA PASS.
