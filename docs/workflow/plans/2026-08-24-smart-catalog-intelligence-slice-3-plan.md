# Plan: Smart Catalog Intelligence — Slice 3 (Search Intelligence + Algolia + Smart Filters)

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Author | Planning Agent |
| Status | ready_for_review → **approved_with_owner_changes** (2026-08-24) |
| Workflow | managed-phase |
| Goal slug | `smart-catalog-intelligence-unattended-enrichment` |
| Slice | **3** — Search Intelligence + Algolia + Smart Filters |
| Master plan | docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md |
| Related | Slice 2 signoff `…-slice-2-signoff.md`; Catalog Processing Mode amendment (Slice 4, docs-only) |
| FreshForge impact | Fresh Prints application only |

---

## Goal

Make Smart Profile / Search Intelligence data usable by Algolia catalog search and introduce customer-facing **Smart Filters**, while **legacy tags continue to coexist** during migration. Preserve discoverability for title identity, structured dimensions, Visible Text, Search Concepts, and legacy tags without requiring unnecessary field duplication.

**This document is Slice 3 Plan only.** No runtime implementation until Formal Review approval **and** owner authorization to implement.

---

## Precondition reaffirmation — Catalog Processing Mode (Slice 4)

Already recorded in master plan §7 and amendment review. Reaffirmed before Slice 3 planning:

| Mode | Behavior |
|------|----------|
| Manual Review | AI runs; every success → Needs Review; no auto Design Library entry |
| Shadow Automation | Same decision/verifier path as Autonomous; records would-approve; still Needs Review |
| Autonomous | Policy-qualified designs may go `ready`; unresolved → Needs Review |

Requirements (unchanged; **not implemented in Slice 3**):

- Server-authoritative (`settings/aiEnrichment.catalogWorkflowMode`)
- Owner-controlled Studio Settings (AI Enrichment)
- Fail-safe never defaults to Autonomous (missing/invalid → `manual`)
- Active mode visible in AI Processing / AI Review
- Entering Autonomous requires explicit owner confirmation
- Shadow never publishes
- Slice 5 honors mode; Slice 6 ready backfill does **not** change lifecycle via mode
- Automation Health distinguishes shadow would-approve vs real autonomous approvals
- Staff-only approval ADR/workflow must be revised before live Autonomous
- Implementing the setting does **not** authorize live Autonomous publication

---

## Background

- Slice 2 **signed off** `approved_with_notes` — Smart Profile v1 + `catalog-enrich-v27` generating in DEV; shadow-only automation; Needs Review required.
- Current Algolia path indexes only ready designs with legacy `title` / `searchText` / `category*` / `tagIds` / `tagFacetKeys` / `readyAtMs`.
- **`smartProfile` is not in the Algolia record, builder allowlist, or change classifier** — Smart Profile-only writes are classified `operational` and do **not** sync.
- Owner decided Objects are **search-only** (not customer facet chips).
- Slice 2 QA calibration notes must guide ranking/faceting, not redesign Slice 2.

---

## Scope

### In Scope

- Repo-audited Algolia/search architecture documentation (this plan)
- Smart Profile → Algolia field mapping (searchable vs facetable vs search-only)
- Customer-facing Smart Filters UX plan (Portal primary; Studio parity where managed search exists)
- Legacy tag coexistence during Slice 3
- DEV-only reindex/reconcile approach (no ready-catalog Smart Profile backfill)
- `portalCatalogChangeClassifier.ts` impact (must include `smartProfile`)
- Concrete DEV search QA matrix (incl. Slice 2 calibration queries)
- Feature-flagged cutover / rollback

### Out of Scope

- Autonomous / Manual / Shadow Catalog Processing Mode implementation (Slice 4)
- Verifier, auto-approval, production Algolia mutation, production deploy
- Ready-catalog Smart Profile backfill (Slice 6)
- Legacy tag retirement / Tag Management removal
- Category auto-create; halftone authority changes
- Slice 5 reprocess
- Expanding approved-tag taxonomy or new alias-management dependence

---

## A. Repo audit (source truth)

### A.1 Shared contract

| Path | Role |
|------|------|
| `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` | `PortalCatalogAlgoliaRecord`, `buildPortalCatalogSearchText`, tag facet key helpers |
| `packages/shared/src/catalog-search/portalCatalogAlgoliaExactSearchParams.ts` | Exact-token query params (`typoTolerance: false`, `queryType: 'prefixLast'`) |

**Current record fields:** `objectID`, `title`, `searchText`, `categoryId`, `categoryName`, `tagIds`, `tagFacetKeys`, `readyAtMs`

**`searchText` today:** title + description + categoryName + tag names + tag aliases (space-joined).

### A.2 Functions Algolia

| Path | Role |
|------|------|
| `functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts` | Builder; allowlist; **ready-only**; null if not ready / blank title |
| `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts` | `onDocumentWritten` `designs/{id}`; classifies then save/delete |
| `functions/src/algolia/portalCatalogChangeClassifier.ts` | `index-filter` / `card-only` / `operational` |
| `functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts` | Owner/admin callable + daily schedule; clear + rebuild ready |
| `functions/src/algolia/algoliaAdminClient.ts` | `ensurePortalCatalogAlgoliaIndexSettings` |
| `functions/src/algolia/algoliaSecrets.ts` | Admin API key secret |

**Index settings (current):**

```ts
searchableAttributes: ['title', 'searchText', 'categoryName', 'unordered(tagFacetKeys)'],
attributesForFaceting: ['filterOnly(tagIds)', 'filterOnly(categoryId)', 'tagFacetKeys'],
customRanking: ['desc(readyAtMs)'],
```

**Not configured in code:** synonyms API; custom `ranking` beyond `customRanking`.

**Classifier `INDEX_FILTER_FIELDS`:** `title`, `description`, `categoryId`, `tags`, `createdAt`, `readyAt` — **`smartProfile` absent** → Smart Profile-only updates do not sync.

### A.3 Portal

| Path | Role |
|------|------|
| `apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts` | Managed search: `q` + AND `tagIds` + optional `categoryId`; hydrate Firestore |
| `apps/portal/features/catalog/services/portalAlgoliaCatalogFlags.ts` | `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` (default on) + app/key/index |
| `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` | Search or multi-tag → Algolia; else bounded Firestore browse |
| `apps/portal/features/catalog/components/CatalogFilterBar.tsx` | Search, category, Halftone, censored, Tags |
| `apps/portal/features/catalog/components/CatalogTagFilterModal.tsx` | Tag AND modal + counts via `tagFacetKeys` |
| `apps/portal/features/catalog/components/CatalogFiltersSheet.tsx` | Mobile filters sheet |
| `apps/portal/features/catalog/pages/CatalogPageContent.tsx` | URL: `q`, `category`, …; **tags not URL-serialized** |

### A.4 Studio

| Path | Role |
|------|------|
| `apps/studio/.../studioAlgoliaCatalogSearchService.ts` | Same index contract as Portal |
| `apps/studio/.../studioAlgoliaCatalogFlags.ts` | `VITE_USE_ALGOLIA_CATALOG_SEARCH` |
| `apps/studio/.../hooks/useDesignLibraryManagedSearch.ts` | Managed search hydrate |
| `apps/studio/.../components/DesignLibraryTagFilterModal.tsx` | Tag facets |

### A.5 Env / flags

- Functions: `ALGOLIA_APP_ID`, `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` (default `portal_catalog_ready_dev`), admin secret
- Portal/Studio: public search key + index name + kill-switch envs

---

## B. Smart Profile → Algolia mapping

### B.1 Proposed additive record fields

Extend `PortalCatalogAlgoliaRecord` (public-safe only; no staff/AI internals, no automation reason codes):

| Field | Source (`design.smartProfile` / design) | Role |
|-------|------------------------------------------|------|
| `subjects` | `smartProfile.subjects` | Searchable + **facet** |
| `objects` | `smartProfile.objects` | **Search-only** (not faceted) |
| `styles` | `smartProfile.styles` | Searchable + facet |
| `themes` | `smartProfile.themes` | Searchable + facet |
| `interests` | `smartProfile.interests` | Searchable + facet |
| `professionsGroups` | `smartProfile.professionsGroups` | Searchable + facet |
| `occasions` | `smartProfile.occasions` | Searchable + facet |
| `places` | `smartProfile.places` | Searchable + facet |
| `colors` | `smartProfile.colors` | Searchable + facet |
| `visibleText` | `smartProfile.visibleText` | Searchable (not customer facet — too sparse/noisy) |
| `searchConcepts` | `smartProfile.searchConcepts` | Searchable (not facet — open-ended discovery phrases) |
| `smartProfileVersion` | `smartProfile.provenance.version` | Observability / partial-coverage diagnostics (optional searchable) |
| Existing | `title`, `searchText`, `categoryId`, `categoryName`, `tagIds`, `tagFacetKeys`, `readyAtMs` | Unchanged role |

**Normalization for index:** reuse Smart Profile normalizer rules (trim, length caps, dedupe). Persist **display casing** from profile for facet labels; filter matching case-insensitive via Algolia facet matching conventions (store canonical lowercase filter values **or** match Portal’s existing tag-id pattern — implement choice: **store normalized display strings as returned by Smart Profile**, facet with exact AND like tags; document case folding in builder tests).

**Partial coverage:** If `smartProfile` missing/empty, omit Smart fields (or empty arrays). Record remains valid via legacy `searchText` / tags / title.

### B.2 Searchable vs facetable vs search-only (explicit)

| Field | Full-text search | Customer Smart Filter facet | Notes |
|-------|------------------|----------------------------|-------|
| `title` | Yes (highest priority) | No | Exact identity (e.g. Highland Cow) |
| `searchConcepts` | Yes (high) | No | Alternate discovery; must not need to duplicate title |
| `visibleText` | Yes (high–mid) | No | OCR slogans |
| `subjects` | Yes | **Yes** | Evidence-grounded; prefer specificity (QA) |
| `styles` | Yes | **Yes** | |
| `themes` | Yes | **Yes** | |
| `interests` | Yes | **Yes** | |
| `professionsGroups` | Yes | **Yes** | |
| `occasions` | Yes | **Yes** | |
| `places` | Yes | **Yes** | |
| `colors` | Yes | **Yes** | Cap facet cardinality in UI (top-N / search-within-facet) |
| `objects` | Yes (**lower** priority) | **No** | Owner: search intelligence only |
| `searchText` (legacy) | Yes | No | description + tags + aliases |
| `categoryName` / `categoryId` | Yes / filter | Existing category filter | Keep Portal category control |
| `tagIds` / `tagFacetKeys` | filter / facet | Existing Tags UI | Coexistence |

**Do not** dump all dimensions into one undifferentiated `searchText` replacement without attribute priority — ranking uses ordered `searchableAttributes`.

### B.3 Proposed `searchableAttributes` priority

> **Owner approval 2026-08-24:** Do **not** place open-ended `searchConcepts` directly under `title` ahead of evidence-grounded structured fields. Structured identity/intent has greater ranking authority than broader Search Concepts. Search Concepts remain high-value additive recall **after** structured fields.

**Conceptual evidence hierarchy:**

1. Title  
2. Strong structured identity / intent (subjects, professionsGroups, occasions, places, themes, interests, styles; category via existing `categoryName`; colors)  
3. Search Concepts  
4. Visible Text  
5. Objects (search-only)  
6. Legacy `searchText` / tag intelligence (`tagFacetKeys`)

**Algolia representation (actual `searchableAttributes` order):**

```ts
searchableAttributes: [
  'title',
  'unordered(subjects)',
  'unordered(professionsGroups)',
  'unordered(occasions)',
  'unordered(places)',
  'unordered(themes)',
  'unordered(interests)',
  'unordered(styles)',
  'categoryName',
  'unordered(colors)',
  'unordered(searchConcepts)',
  'unordered(visibleText)',
  'unordered(objects)',
  'searchText',
  'unordered(tagFacetKeys)',
]
```

`unordered(...)` within a tier is appropriate for multi-value arrays; ordered list encodes cross-tier priority.

**Rationale vs Slice 2 QA:** Title still wins for “highland cow”; structured Subjects outweigh speculative concepts; Search Concepts expand recall (Scottish cow, nurse gift) without outranking identity fields; Visible Text helps slogan lookup without overpowering semantics; Objects remain lowest Smart-tier search signal.

### B.4 Proposed `attributesForFaceting`

```ts
attributesForFaceting: [
  'filterOnly(tagIds)',
  'filterOnly(categoryId)',
  'tagFacetKeys',
  'subjects',
  'styles',
  'themes',
  'interests',
  'professionsGroups',
  'occasions',
  'places',
  'colors',
  // objects intentionally omitted
]
```

`customRanking`: keep `desc(readyAtMs)`. No synonym upload required in Slice 3 (Search Concepts cover colloquial discovery).

### B.5 Allowlist update

Extend `PORTAL_CATALOG_ALGOLIA_ALLOWED_FIELDS` in builder to include new Smart fields only. Continue excluding staff-only / AI internal / automation provenance / halftone decisions.

---

## C. Smart Filters (Portal UX)

### C.1 Customer-facing dimensions (proposed)

Bounded set (Objects **excluded**):

1. Subjects  
2. Styles  
3. Themes  
4. Interests  
5. Professions / Groups  
6. Occasions  
7. Places  
8. Colors  

### C.2 UX approach (reuse Portal conventions)

- Extend `CatalogFilterBar` / `CatalogFiltersSheet` with a **Smart Filters** entry (or dimension chips) alongside existing Tags — **do not remove Tags** in Slice 3.
- Prefer a modal/sheet pattern similar to `CatalogTagFilterModal`: searchable list, counts from Algolia facet distribution, AND within a dimension; document cross-dimension AND (all selected filters apply together with category + `q` + tags).
- **Facet cardinality control:** `maxValuesPerFacet` (reuse ~2000 cap cautiously); UI shows top counts + typeahead; empty → “No matching filters” (mirror tag empty copy).
- **Mobile:** fold into `CatalogFiltersSheet`.
- **URL serialization:** decide in implement — prefer additive query params (e.g. `subject=`, multi) **or** keep state-only like tags initially; Formal Review note: tags today are **not** URL-serialized — either match that or improve both in one intentional UX decision (recommend: state-only for Slice 3 parity with tags to reduce scope).
- **Feature flag:** e.g. `NEXT_PUBLIC_USE_SMART_FILTERS` / Studio `VITE_USE_SMART_FILTERS` (default off until DEV QA).

### C.3 Studio

Parity for Design Library managed-search path when flag on: facet params + filter modal(s) mirroring Portal dimensions. Archive/management UIs unchanged.

---

## D. Search Intelligence behavior

A design must be discoverable via combined corpus:

| Signal | Mechanism |
|--------|-----------|
| Title / description | `title` + legacy `searchText` |
| Category | `categoryName` + `categoryId` filter |
| Smart dimensions | Per-attribute searchable arrays |
| Visible Text | `visibleText` |
| Search Concepts | `searchConcepts` (additive; not required to repeat title) |
| Legacy tags | `tagIds` / `tagFacetKeys` / aliases in `searchText` |

**Example:** Title `Highland Cow With Bow` + Subjects `["cow"]` + Search Concepts `Scottish cow`, `fluffy cow`, … → query `highland cow` hits **title**; query `Scottish cow` hits **searchConcepts**; query `cow` hits Subjects/title/concepts.

---

## E. Legacy tag coexistence

| Rule | Detail |
|------|--------|
| Keep | Tag filters, tag facets, tag contribution to `searchText`, Tag Management |
| Do not | Expand approved-tag taxonomy; build new alias dependence; make tags foundational to Smart Filter architecture |
| Retirement | Slice 6 only after coverage/parity + owner approval |

Ready designs **without** Smart Profiles remain searchable via existing fields after reconcile.

---

## F. DEV migration / reindex (no Smart Profile backfill)

| Step | Action |
|------|--------|
| 1 | Deploy DEV Functions: builder + classifier + index settings ensure |
| 2 | `reconcilePortalCatalogAlgoliaIndex` **dryRun** on `fresh-prints-dev` |
| 3 | Apply reconcile (clear + rebuild ready) — **DEV only** |
| 4 | Designs with `smartProfile` populate new attributes; without → empty Smart fields, legacy search intact |
| 5 | Enable Smart Filters flag for Portal/Studio DEV QA |
| 6 | Production Algolia / App Hosting / prod reconcile — **explicit later owner checkpoints** (not Slice 3 implement default) |

**Idempotency:** Reconcile already clear+rebuild; sync on write remains save/delete. Stale Smart values cleared when profile removed/reset (builder omits; save overwrites).

**Not in Slice 3:** generating Smart Profiles for ready catalog (Slice 6).

---

## G. Change classification (required)

Update `portalCatalogChangeClassifier.ts`:

- Add **`smartProfile`** to `INDEX_FILTER_FIELDS` (or equivalent deep-stable compare) so Smart Profile changes on **ready** designs trigger Algolia sync.
- Keep ready-boundary behavior for Needs Review → ready (full record includes Smart Profile at publish).
- Add/extend unit tests: smartProfile-only change on ready → `index-filter`; on non-ready → `operational` / non-ready churn rules unchanged.

Without this, approved designs with profiles written only while `needs_review` still sync on ready transition; **post-ready** profile edits / re-enrichment would silently skip Algolia — unacceptable for Slice 3.

---

## H. DEV search QA matrix

Environment: Portal (and Studio) against `fresh-prints-dev` after reconcile + Smart Filters flag. Prefer designs from Slice 2 QA set when still `ready` or re-approve a subset for search QA (owner action).

| Query | Expect hit via | Calibration note |
|-------|----------------|------------------|
| highland cow | **title** primarily | Even if Subjects=`cow` |
| Scottish cow | searchConcepts | Alternate discovery |
| fluffy cow / baby cow / cow cartoon | searchConcepts | |
| nurse | Subjects/professions/interests/title | |
| nurse gift / busy nurse / nurse loading | searchConcepts | Strong QA examples |
| Christmas humor / sarcastic Santa | themes / searchConcepts / title | Avoid relying on awkward “Santa I don't believe” |
| beach vibes / tropical | searchConcepts / themes / interests | |
| Seattle raccoon / Jimothy | places / subjects / searchConcepts / visibleText | |
| gardening humor / plant lover | themes / interests / searchConcepts | Speculative concepts OK if related |
| Exact Visible Text slogans | visibleText / title | |
| Legacy-only design (no smartProfile) | title / searchText / tags | Must still work |
| Filter: Subjects=cow (or highland cow if present) | facet | |
| Filter: Occasions=Christmas | facet | |
| Filter: Places=Seattle | facet | |
| Filter: Professions=nurses | facet | |
| Objects never appear as facet chip | UI | Search-only verified |
| Multi Smart Filter AND + category + tag | combined | |

**Ranking checks:** Title-exact matches should rank above concept-only matches for the same query when both exist; document observed order in test report.

---

## Affected Areas

### Files / Modules (expected implement — identify only)

- `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` (+ tests)
- `functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts` (+ tests)
- `functions/src/algolia/algoliaAdminClient.ts` (index settings)
- `functions/src/algolia/portalCatalogChangeClassifier.ts` (+ tests)
- `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts` (if taxonomy load needs Smart fields only via builder)
- Portal: flags, `portalAlgoliaCatalogSearchService.ts`, filter bar/sheet/modal(s), `useCatalogDesigns.ts` as needed
- Studio: flags, search service, Design Library filter UI / managed search hook
- Docs: `DATA_MODEL.md`, `BACKEND.md`, `ARCHITECTURE.md` (search), `DEPLOYMENT.md` as needed

### Architecture Impact

- [x] Details: Additive Algolia attributes; Portal/Studio filter UI; Functions sync/classifier; **no** Catalog Processing Mode; Firestore remains source of truth; Algolia disposable

### Security Impact

- [x] Details: Public-safe allowlist only; no automation/staff fields in Algolia; search API key remains search-only; admin reconcile remains owner/admin

### Data Model Impact

- [x] Details: No Firestore schema change required for Slice 3 indexing (reads existing `smartProfile`). Optional docs-only Algolia contract fields

### Backend Impact

- [x] Details: Builder, classifier, index settings, DEV reconcile; env flags for Smart Filters UI

### UI / UX Impact

- [x] Details: Portal Smart Filters; Studio parity; Tags remain; manual DEV QA required

### Migration Impact

- [x] Forward: DEV Functions deploy → dry-run reconcile → apply reconcile → flag enable → QA
- [x] Rollback: disable Smart Filters flag; revert builder/settings; reconcile; Tags-only UX
- [x] Compatibility: ready designs without Smart Profile remain searchable

---

## Approach (implement order — after approval)

1. Shared record types + searchText helpers if needed  
2. Builder maps Smart Profile → Algolia fields + allowlist  
3. Index settings update  
4. Classifier includes `smartProfile`  
5. Portal search params for Smart facetFilters  
6. Portal Smart Filters UI behind flag  
7. Studio parity behind flag  
8. DEV deploy Functions → reconcile dry-run → apply  
9. DEV search QA matrix + test report  
10. Owner checkpoint before any production Algolia action  

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Builder tests: Smart fields present/absent; objects not required for facets; allowlist | Yes |
| Classifier tests: smartProfile on ready → index-filter | Yes |
| Index settings unit/assert searchableAttributes order | Yes |
| Portal/Studio search param builders for Smart facets | Yes |
| Functions build; Portal/Studio typecheck; existing Algolia tests green | Yes |

### Manual

- Full §H matrix on `fresh-prints-dev`
- Confirm Objects not in facet UI
- Confirm legacy tag path still works
- Confirm no auto-approval / no tag retirement

---

## Human Checkpoints

| Checkpoint | When |
|------------|------|
| **This Plan + Formal Review approval** | Before Slice 3 implement |
| DEV Functions deploy (Algolia builder/classifier/settings) | After implement |
| DEV reconcile apply | After dry-run review |
| Smart Filters flag enable for QA | After reconcile |
| Production Algolia settings/reconcile | Separate owner authorization — not automatic |
| Catalog Processing Mode / Autonomous | Slice 4 only |

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Algolia record bloat | Medium | Dimension caps from Smart Profile constants; omit empty; size tests |
| Facet explosion (colors/themes) | Medium | UI top-N + search; maxValuesPerFacet |
| smartProfile sync miss | High | Classifier update + tests (required) |
| Ranking regression vs tag-only | Medium | Ordered searchableAttributes; QA matrix |
| Partial Smart Profile coverage | Medium | Legacy searchText retained |
| Speculative Search Concepts | Low | Search-only; monitor; Slice 2 notes |

---

## Documentation updates (on implement)

- `docs/architecture/BACKEND.md` / Algolia section  
- `docs/architecture/DATA_MODEL.md` (Algolia derived fields pointer)  
- `docs/architecture/ARCHITECTURE.md` if search surface changes  
- Master plan §14 refined to match this Slice 3 detail  

---

## Open questions (non-blocking for review)

1. Smart Filter URL serialization vs tag state-only parity — recommend state-only Slice 3.  
2. Exact facet UI: one multi-dimension modal vs per-dimension chips — implement chooses within Portal conventions.  
3. Whether `interests` facet proves too broad in DEV QA — may demote to search-only in follow-up without plan reopen if review allows.

---

## Approval

- Formal Review: `docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-slice-3-review.md`
- Verdict: **pending**
- **STOP** — no implementation until owner approves Plan + Review
