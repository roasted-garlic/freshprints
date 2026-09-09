# Plan — Legacy tag operational retirement and Smart Profile search parity

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Status | approved_with_changes — Formal Review conditions are part of this plan |
| Workflow | managed-phase |
| Parent program | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related review | `docs/workflow/reviews/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-review.md` |
| Checkout inspected | `development` |
| Authorization in this artifact | **Plan + Formal Review only** |
| Prohibited in this phase | application implementation, migrations, tag/data deletion, Firebase/Algolia mutations, deployment, provider calls, production, commit, push |

## Goal

Retire tags as an active Fresh Prints catalog and discovery authority while making the
existing `smart-profile-v1` contract the durable semantic discovery authority. The
implementation must retain customer search quality, preserve historical `design.tags`
non-destructively at first, and prove each replacement before removing the corresponding
tag consumer. This is the operational follow-up explicitly excluded from the Pass 1
release; it must not undo or duplicate Pass 1's AI-tag-authority retirement.

## Scope and non-goals

### In scope for a later authorized implementation

- Prove Smart Profile text-search and facet parity against current tag/alias behavior in DEV.
- Stop new *semantic/operational* tag authority writes while preserving the presently required
  empty-array compatibility field where the Rules/data contract still requires it.
- Retire Studio and Portal tag filters, tag-management/edit controls, and tag display where
  the parity and UX gates are met.
- Remove tag-specific Algolia record fields, search corpus terms, facets, and design-change
  index work only after the clients no longer query them.
- Eliminate unneeded tag taxonomy reads, materialization payload, tag-trigger work, and
  compatibility-only AI/tag modules once their import graph is proven inactive.
- Measure Firestore, Function, and Algolia deltas without inventing dollar savings.
- Document a separate, later production Smart Profile backfill goal and a separate,
  owner-only Portal Maintenance Mode prerequisite.

### Out of scope

- Re-running AI, starting an existing reprocess job, changing a setting, or enabling Smart
  Filters in any shared environment.
- Deleting `design.tags`, `tags/*`, taxonomy materialization chunks, Functions, Firestore
  indexes, or Algolia attributes/index settings.
- Altering category authority, Smart Profile schema, Pass 1 provider behavior, Pass 2's
  parked experiment, Autonomous state, or production.
- Designing or implementing Maintenance Mode, including choosing a settings document/path.

## Governing boundary from Pass 1

The 2026-09-07 Pass 1 Plan and Formal Review retired **AI-produced tag authority** only:
the active v39 parser does not emit tags; `aiEnrichmentPipeline` strips historical tag/rerank/
Suggestion Author fields; and active category resolution does not consume `design.tags`.
They intentionally retained staff tags, tag taxonomy, Studio/Portal discovery, Algolia tag
materialization, and historical fields. This plan begins at that boundary. It neither restores
AI tags nor treats the already-retired AI path as unfinished work.

## Repository evidence — active dependency inventory

The entries below are source-inspected active operational consumers at the reviewed `development`
checkout. Test fixtures, comments, CSS class names, and historical workflow documents are not
counted as runtime consumers unless called out as compatibility/deletion candidates.

| Surface | Mechanically verified active dependency | Current behavior | Retirement disposition |
|---|---|---|---|
| Portal filter UI | `apps/portal/features/catalog/pages/CatalogPageContent.tsx`, `components/CatalogFilterBar.tsx`, `components/CatalogFiltersSheet.tsx`, `components/CatalogTagFilterModal.tsx`, `hooks/useCatalogTags.ts` | Keeps `selectedTags` in local state, opens the tag drawer, exposes selected-tag count/chips, and sends tag selections into catalog loads. Portal persists only `q` and `category` today; it has no tag query parameter. | Remove only after text and Smart Filter parity gates pass. Preserve `q`, category, discovery, selection, and design-ID URL behavior. |
| Portal catalog queries | `hooks/useCatalogDesigns.ts`, `services/catalogService.ts`, `services/portalAlgoliaCatalogSearchService.ts`, `utils/catalogSearch.ts`, `utils/portalCatalogExactIdSearch.ts`, `utils/featuredCatalogTags.ts`, `types/catalog.types.ts` | Algolia AND-filters `tagIds`; tag facet requests use `tagFacetKeys`; Firestore fallback query supports `tags array-contains`; local/exact-ID fallbacks use `design.tags`; featured tags directly read `tags` with `status == approved && isFeatured == true`. | Replace filter selection with existing Smart Filter dimensions; remove tag-only service/hook/type methods and direct featured-tag read after the drawer is gone. |
| Portal design presentation and DTOs | `components/CatalogDesignDetailsModal.tsx`, `pages/ShareDesignPortalPageContent.tsx`, `services/portalDesignShareMetaService.ts`, `services/catalogService.ts`, `features/show-designs/utils/mapPortalShowCatalogDesignCardToCatalogDesign.ts`, `functions/src/lib/portalShowCatalogDesigns.ts`, `functions/src/getPortalDesignShareOpenGraph.ts` | Public catalog, show catalog, and Open Graph/share DTOs carry and display tag arrays. | Remove customer-visible tag sections and public DTO fields as a coordinated compatibility slice; do not substitute raw internal Smart Profile provenance. |
| Studio Design Library filters and deep links | `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`, `components/DesignLibraryFilterControls.tsx`, `components/DesignLibraryTagFilterModal.tsx`, `constants/designLibraryFilters.ts`, `hooks/useDesignLibraryManagedSearch.ts`, `services/studioAlgoliaCatalogSearchService.ts`, `services/studioAlgoliaCatalogFacets.ts`, `utils/designLibrarySearch.ts`, `utils/designLibraryExactIdSearch.ts` | Supports `?tags=` (and migrates legacy `?tag=`), tag AND filtering, Halftone-as-tag, client fallback, Algolia tag facets, and category narrowing influenced by selected tags. | Replace normal-ready discovery with Smart Filters only after feature/config availability and parity; remove `tags` URL parse/write with an explicit legacy-link behavior test. Do not silently map a tag ID to an unrelated Smart Profile value. |
| Studio tag taxonomy and management | `hooks/useCatalogTags.ts`, `services/catalogTagService.ts`, `components/TagManagementModal.tsx`, `utils/catalogTagNormalizer.ts`, `utils/catalogTagSuggestions.ts`, `utils/bulkCatalogTagImport.ts`, `types/catalogTag.types.ts` | Staff list/create/edit/archive/restore/bulk-import approved tags; the service pages the entire collection (500/page) with a 12-hour per-user cache. | Remove the management entry point and write services after all tag editing is retired. Keep historical documents unchanged. Function/archive export deletion is a later explicit deployment checkpoint. |
| Studio taxonomy materialization/cache | `hooks/useGeneratedDesignLibraryTaxonomy.ts`, `services/taxonomyMaterializationService.ts`, Electron `electron/services/taxonomy/taxonomyDiskCache.ts` and `electron/ipc/taxonomyCache/taxonomyCacheIpcHandlers.ts`, shared `types/taxonomy/taxonomyMaterialization.types.ts` and `utils/taxonomyMaterializationBuilder.ts` | Normal Design Library/AI Review load the materialized category + approved-tag corpus; a cache miss falls back to direct category/tag reads. | Split/remove tag payload only after Design Library and AI Review no longer need it. Keep category materialization and its cache. Purge of old disk caches is compatibility cleanup, not data deletion. |
| Studio design edit | `components/DesignFormFields.tsx`, `components/EditDesignModal.tsx`, `utils/designFormMapper.ts`, `utils/designTagNormalizer.ts`, shared `TagChipInput.tsx`, `services/designService.ts`, `types/design.types.ts` | Manual edit accepts tags, normalizes them, and writes `design.tags`; `designService` maps every design's tag array. | Remove tag controls/writes. Until a separately reviewed data-contract migration, creation/mapping may retain an inert `tags: []` structural field because Rules require it. |
| Studio AI Review | `features/ai-review/components/AiReviewFormPanel.tsx`, `pages/AiReviewPage.tsx`, `hooks/useAiReviewInbox.ts`, `services/aiReviewInboxService.ts`, `utils/aiReviewFormState.ts`, `utils/aiReviewLocalReconciliation.ts`, `types/aiReviewInbox.types.ts` | Historical suggestion tags seed the editable Tags input; approval writes tags. The Halftone toggle currently mutates the canonical `halftone` tag through `syncHalftoneTagInList`. | Remove tag seeding/input/write and retain the existing Smart Profile display. Resolve Halftone separately (below); it has no Smart Profile dimension. |
| Studio Settings/reprocess metrics | `features/settings/components/CatalogReprocessingSettingsSection.tsx`, `services/aiEnrichmentSettingsService.ts`, shared `types/ai/aiEnrichmentSettings.types.ts`, `functions/src/ai/loadAiEnrichmentSettings.ts`, `functions/src/catalogReprocess/catalogReprocessEligibility.ts` | Shows tag-density buckets; loads/preserves `additionalTagExclusions` and historical rerank/suggestion fields although Pass 1 no longer consumes them as active authority. | Remove tag-density UX and compatibility-only settings fields only after a no-caller proof. Preserve unrelated AI settings and existing reprocess controls. |
| AI/taxonomy runtime | `functions/src/ai/loadAiCatalogReferenceSnapshot.ts`, `aiEnrichmentRuntimeCache.ts`, `aiEnrichmentCandidateCore.ts`, `aiEnrichmentPipeline.ts`, `simpleCatalogEnrichmentResponse.ts` | Candidate core uses active categories only, but the shared reference snapshot still loads materialized/Firebase tag data as part of the full taxonomy payload. Pipeline defensively strips historical AI tag fields. | Make the active category path category-only so ordinary enrichment stops loading tags. Keep the defensive strip until historical inputs are no longer possible; remove it only with import-graph proof. |
| Legacy AI tag code | `functions/src/ai/catalogTagResolver.ts`, `legacyAiTagNormalization.ts`, `aiTagExclusions.ts`, `catalogEnrichmentResponse.ts`, `catalogEnrichmentRetry.ts`, `halloweenTagGuard.ts`, `catalogThemeCategoryResolver.ts` | Source audit found no active non-test caller of the resolver, rerank, Suggestion Author, or theme resolver. Some modules reference one another; settings normalization still has compatibility reads. | Classify as dormant compatibility/deletion candidates, not safe to delete merely because Pass 1 stopped calling them. Delete or extract neutral helpers only after a compiled import-graph and test proof. |
| Functions taxonomy and archive operations | `functions/src/taxonomy/onTaxonomySourceWritten.ts`, `rebuildTaxonomyMaterialization.ts`, `functions/src/archiveTaxonomyWithGuards.ts`, `functions/src/index.ts` | `onTagTaxonomySourceWritten` rebuilds materialization after tag writes; archive guards read `tags/{id}` and query `designs.tags array-contains`. | Once no approved tag writes or management remain, remove tag-specific rebuild/guard behavior. Removing an exported deployed Function is a distinct owner-authorized external action, never an incidental source cleanup. |
| Functions/Algolia | `functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts`, `portalCatalogChangeClassifier.ts`, `syncPortalCatalogDesignToAlgolia.ts`, `reconcilePortalCatalogAlgoliaIndex.ts`, `algoliaAdminClient.ts`, shared `catalog-search/portalCatalogAlgoliaRecord.ts` | Ready records contain tag IDs, display facet keys, canonical names and aliases in `searchText`; ready design tag changes cause an upsert and per-token taxonomy reads. The scheduled/manual reconcile reads all tags/categories, clears, and rewrites ready records. | Remove tag fields and taxonomy load only after Portal/Studio queries no longer request them and alias/text parity is proven; then reindex through a separately authorized DEV index-settings/reconcile step. |
| Firestore contract/configuration | `firestore.rules`, `firestore.indexes.json` | Rules require `design.tags` to be a list on create/normal metadata updates; public read currently allows approved tags. Eighteen composite indexes include `designs.tags`; one `tags` composite supports `status + isFeatured`. | Do not change Rules or indexes in the first retirement slice. Consider a later schema/Rules/index retirement only after an active-consumer-zero audit and explicit owner authorization. |

### Dormant versus active classification

| Classification | Evidence and treatment |
|---|---|
| **Active now** | Every row above, including tag-bearing DTO/display mappings, counts as an active consumer even if it does not write a tag. It must be removed, replaced, or deliberately retained before physical cleanup. |
| **Pass 1-retired but retained** | Active parser response types accept deprecated historical tag keys and the pipeline strips them; historical `aiSuggestions.tags`, rerank, and Suggested New Tag fields remain readable only as compatibility data. Do not reactivate them. |
| **Dormant candidate** | `catalogTagResolver`, legacy normalizer/exclusion/rerank/Suggestion Author code, old retry/response utilities, and `catalogThemeCategoryResolver` have no audited non-test active caller. Their internal dependency edges mean they need an explicit import-graph/compiled build check before deletion. |
| **Historical/inert after retirement** | `design.tags`, taxonomy documents, old Algolia records, old URLs, and old tag AI payload fields. They remain intact until their consumers are mechanically zero and a separate cleanup plan is authorized. |

## Smart Profile replacement and parity matrix

The repository's authoritative Smart Profile fields are `subjects`, `objects`, `styles`,
`themes`, `interests`, `professionsGroups`, `occasions`, `places`, `colors`, `visibleText`,
`searchConcepts`, plus resolved `categoryId`/`categoryName` and provenance. The customer Smart
Filter subset is deliberately only `subjects`, `styles`, `themes`, `interests`,
`professionsGroups`, `occasions`, `places`, and `colors`. `objects`, `searchConcepts`, and
`visibleText` are searchable but not facets. No new Smart Profile fields are proposed.

| Current user-facing behavior | Current tag dependency | Replacement / query | Exact search-index implication | UX or parity proof |
|---|---|---|---|---|
| Free-text Portal/Studio discovery | `searchText` contains canonical tag names + aliases; `tagFacetKeys` is searchable; local fallback searches `design.tags`. | Existing Algolia ordered fields: title; Smart Profile identity/intent fields; `searchConcepts`; `visibleText`; `objects`; `searchText`. | Remove tag names/aliases from `searchText` and remove `unordered(tagFacetKeys)` last, only after a corpus of real tag names/aliases demonstrates equal-or-better returned design IDs from Smart Profile/copy. | Build a deterministic DEV query corpus from current tag names, aliases, and representative customer searches; compare top/complete hit sets, record uncovered aliases, and block removal for any customer-relevant regression. |
| Multi-tag AND filter | `tagIds` is `filterOnly`; both clients build one AND facet group per tag. | Existing Smart Filter AND groups for the eight approved customer facets. | Retire `tagIds` filtering only when filter choices have an intentional Smart facet equivalent; no automatic tag-name-to-Smart-value mapping. | Test selected value AND semantics, clear/remove behavior, category narrowing, paginated load-more, exact-ID filter behavior, and no missing-profile false positives. |
| Dynamic tag counts/modal | `tagFacetKeys` facet distribution supplies display name/count; Portal has a direct featured-tag Firestore query. | Existing eight Smart facet distributions are already fetched with the active q/category/filter context. | Retire `tagFacetKeys` from `attributesForFaceting` and all facet calls after tag drawer removal. | Confirm Smart filter count freshness and constraint narrowing; verify tag modal/featured reads are not invoked. |
| Category selector narrowing | Current category facet query is constrained by tags and Smart selections. | Existing category facet query is constrained by q + Smart selections without a selected category. | Category remains `categoryId` faceted and `categoryName` searchable; it is not a tag replacement. | Preserve category options and selected category after removing tags; prove q + Smart selections narrow correctly. |
| Studio tag chips and manual design metadata | `TagChipInput`, approved taxonomy, `designService.updateDesign({ tags })`. | No one-to-one replacement. Existing owner/admin Smart Profile edit is a Ready-design, existing-profile-only server-authoritative feature. | None until visible tags are removed from all catalog DTOs. | Remove the tag editing surface rather than invent a new manual Smart Profile authoring workflow. If staff need non-Ready manual semantics, that is a separately reviewed product decision. |
| AI Review Suggested/Final tags | Historical `aiSuggestions.tags` seeds a form; approval writes tags. | Smart Profile is already visible in AI Review; canonical enrichment stays the authority. | None. | Remove field/seeding and assert historical records remain readable without producing a tag write. |
| Portal design/share tag display | `CatalogDesign.tags`, show catalog and share/OG payloads. | No automatic display replacement. Optional Smart Profile presentation needs separate privacy/UX review. | Remove tag array from public DTO/record only after all presentation callers are removed. | Manual portal/share QA: title, description, assets, add-to-request, and OG behavior continue with no tag section. |
| Halftone filter | Canonical `halftone` tag is toggled from the existing `halftoneStaffDecision` and selected as a tag. | **Not a Smart Profile field.** The existing `halftoneStaffDecision.value` is the only verified non-tag semantic source. | If retained, it requires a non-tag filter/index projection based on that existing field; if not retained, remove the filter and tag synchronization. | **[NEEDS OWNER DECISION]** Preserve as a dedicated existing staff-decision filter, or retire it with tags. Do not pretend that a Smart Profile dimension supplies this behavior. |
| Studio `?tags=` deep links | `DESIGN_LIBRARY_TAGS_QUERY_PARAM` and legacy `?tag=` parsing/writing. | No existing Smart Filter URL schema. | No index effect. | **[NEEDS OWNER DECISION]** Default safe behavior is to remove the tag query contract with a tested, non-crashing legacy-link fallback; adding a new Smart Filter URL contract requires its own compatibility design. Portal has no equivalent tag URL contract today. |

## Algolia findings and strategy

Algolia is still the configured primary managed text-search provider when search-only credentials
are present. It is the default path in both Portal and Studio unless their emergency `*_USE_
ALGOLIA_CATALOG_SEARCH=false` kill switch is set. Retiring tags does **not** retire Algolia.

Current tag materialization is exact:

- `tagIds` is `filterOnly(tagIds)` and supports true AND filtering; it is not a text-search field.
- `tagFacetKeys` is both an attribute for faceting and the last searchable attribute. Its
  `tagId::tagName` value lets the UI show tag names/counts without a taxonomy hydration.
- `searchText` includes title, description, category name, tag names, and tag aliases.
- The record builder writes `tagIds` and `tagFacetKeys`; the ready-design sync classifies a
  `tags` change as `index-filter`, then reads the referenced tag document(s) before one
  object upsert. A tag document edit itself triggers taxonomy materialization, not an immediate
  Algolia record rewrite; scheduled/manual reconcile eventually rewrites all records.
- The existing Smart Profile fields above already participate in search. Its eight facet fields
  remain after tag retirement. Objects, search concepts, and visible text intentionally remain
  non-facet fields.

The post-parity Algolia slice must remove `tagIds`, `tagFacetKeys`, tag/alias contribution to
`searchText`, their shared record contract/tests, all client tag facet calls, and the associated
per-design tag taxonomy hydrate. It must then use the existing scoped reconcile path to apply
the new record/settings shape in DEV. It must not clear/recreate an index, call Algolia, or alter
settings during this planning phase.

Eliminating Algolia entirely is a separate future option. It would require a replacement for
full-catalog text search, pagination/ranking, q-aware category facets, eight Smart Filter
distributions, search-only credential/client configuration, ready-design hydration order, index
sync/reconcile/recovery, and failure UX. No evidence supports equating tag retirement with that
larger provider replacement.

## Firestore findings and non-destructive compatibility

- Portal's all-tag modal list is currently Algolia-facet-backed, but its featured-tag pills make
  a direct Firestore `tags` query. Studio normally reads tags from materialization/disk cache and
  falls back to paginated direct collection reads; Tag Management deliberately reads the full
  authoritative collection.
- The AI category path is tag-independent in authority but its reference snapshot currently
  carries tag data, so an enrichment cache miss still loads tag materialization/Firebase fallback.
- `design.tags` remains a mandatory list in the present Rules/create model and fast paths. New
  design creation currently writes `tags: []`; that empty structural compatibility write is not
  new tag *authority* and must remain until a separately reviewed schema/Rules migration.
- There are exactly 18 committed composite indexes containing `designs.tags`: six
  `tags + status` variants (base, `createdAt`, `readyAt`, `requestCount`, `favoriteCount`,
  `lastRequestedAt`); four `categoryId + tags + status` variants (created/ready/request/last
  requested); `tags + status + updatedAt`; two `tags + aiReviewStatus + status + updatedAt`
  variants; two category/status/tags updated variants; and two `lastAddedToShowAt` variants
  (with and without category). One `tags` collection index is `status + isFeatured`.
- These index definitions are candidates for a later deletion-only deployment after source
  queries and Rule validators no longer require tags. Index deletion is not implied by removing
  a UI and remains explicitly owner-gated.

The compatibility rule is therefore: **stop operational reads/writes first, retain arrays and
documents inert, prove zero consumers, then separately evaluate physical field/document/index
cleanup with backups and rollback evidence.**

## Proposed phased implementation slices

1. **Baseline and parity harness (DEV, no behavior removal).** Capture exact tag/alias search and
   filter baselines; inventory Smart Profile coverage/version and gaps; add deterministic parity
   fixtures and telemetry counters. Do not flip shared feature flags or change Algolia settings.
2. **Stop operational tag authority writes.** Remove staff tag edit/AI Review write paths and
   historical form seeding; retain only required structural `tags: []` writes. Resolve the
   Halftone owner decision before changing `syncHalftoneTagInList`.
3. **Smart discovery rollout.** Enable/reveal the existing Smart Filter path only through an
   owner-authorized DEV configuration/build checkpoint, then replace Studio and Portal tag UI
   after parity success. Preserve non-tag existing URL state. Treat Studio legacy `?tags=` as a
   compatibility release item, not a silent conversion.
4. **Public/Studio DTO and taxonomy-read retirement.** Remove tag display/DTO projections,
   featured-tag reads, normal taxonomy tag payload/cache use, and the AI snapshot's tag load.
   Retain categories and historical documents.
5. **Algolia tag schema retirement.** After clients make zero tag queries and the free-text
   corpus passes, remove tag record fields/settings and per-design taxonomy hydrates; run the
   separately authorized DEV reconcile/reindex and compare before/after query behavior.
6. **Dead compatibility/taxonomy cleanup.** Compile/import-graph proof before deleting dormant
   tag resolver/rerank/Suggestion Author/settings code. Retire tag trigger/archive source only
   once no writer remains. Any deployed Function deletion is a separate owner checkpoint.
7. **Zero-consumer audit and deferred physical cleanup decision.** Search source, compiled exports,
   Rules/indexes, telemetry, DTOs, and deployed inventory. Leave `design.tags`/`tags/*` intact
   unless the owner authorizes a later destructive migration plan.

Every slice is independently rollbackable by restoring the preceding application revision while
historical fields and prior Algolia settings remain available. No slice may leap directly to index
or data deletion.

## Validation and cost-verification plan

### Automated validation

- Extend existing Algolia record, change-classifier, Portal Smart facet/narrowed-facet, Studio
  facet/managed-search, taxonomy-materialization, tag-retirement, Smart Profile normalization,
  Halftone, and catalog-reprocess tests. Add explicit contracts that tag query strings, tag
  fields, and tag taxonomy loads are absent in the applicable completed slice.
- Run touched TypeScript tests with the repository's `npx tsx --test` convention, then
  `npm --prefix functions run build`, `npm run build:portal`, targeted ESLint, and Studio's
  direct Vite/typecheck checks. Record any known baseline failure without claiming a full pass.
- Run `npm run test:rules` only if `firestore.rules` changes. Run `git diff --check` in every
  implementation/test handoff.

### Manual DEV parity matrix

- Compare a curated set of common names, aliases, synonym-like tag queries, coarse interests,
  visible-text terms, subjects/objects, colors, professions/groups, and multi-filter cases.
- Exercise Portal Discover, normal Catalog, show catalog, deep-link/share page, add-to-request,
  paginated load-more, zero-results, filters clear/remove, and mobile filter sheet.
- Exercise Studio ready/archived/request-selection library modes, text/category/Smart filtering,
  old `?tags=` links, design edit, AI Review approval, Tag Management removal, and permission
  behavior.
- Confirm tag writes, direct tag reads, tag facet requests, and tag-driven Algolia upserts are
  absent where the slice says they are; confirm unaffected Algolia text/category/Smart queries
  continue.

### Measurable indicators — baseline before each DEV slice, compare after

| Indicator | Evidence source | Expected interpretation |
|---|---|---|
| Studio taxonomy reads/cache behavior | Existing `firestoreUsageTrace` events from `catalogTagService` and taxonomy materialization; cold/warm route captures | Fewer tag documents/pages/chunks only after relevant Studio consumers disappear. |
| Portal tag reads | Trace `catalogService.listFeaturedApprovedTags`; tag-modal request logs | Tag modal/featured reads become zero; normal ready-design/category reads may remain. |
| Design reads due to tag workflows | Firestore trace correlation IDs and manual route scenarios | Compare identical filter flows; do not attribute all catalog reads to tags. |
| Function taxonomy/rebuild work | `taxonomy-materialization-rebuild-success` and trigger logs, `tagCount`, chunk/count/hash fields | Tag document mutations should no longer schedule tag-driven rebuilds after writer/trigger retirement. |
| Algolia indexing work | Sync/reconcile logs (`algolia-portal-catalog-upsert`, `tagCount`) plus provider dashboard operation metrics | Design tag edits cease to cause tag-specific upserts/taxonomy reads; ordinary ready/Smart Profile upserts remain. |
| Algolia query/facet work | Provider analytics/dashboard and browser/network capture for base search, tag facets, Smart facets | Tag facet calls drop; text/category/Smart queries remain. Never infer monetary savings from query count alone. |
| Record size | JSON byte length of representative `PortalCatalogAlgoliaRecord` before/after, provider record-usage metrics if available | Quantify removed tag arrays/alias text only; do not claim provider billing savings without plan/pricing evidence. |

## Anticipated DEV deployment inventory

No deploy is authorized by this plan. The final list must be reconciled from the approved diff,
but the source-inspected candidate inventory is: Functions `enqueueAiEnrichment` only if its
active category/taxonomy loader changes; `syncPortalCatalogDesignToAlgolia` and
`reconcilePortalCatalogAlgoliaIndex` for the Algolia record transition; and, only in the final
taxonomy slice, `onTagTaxonomySourceWritten`, `rebuildTaxonomyMaterialization`, and any archive
exports affected by code removal. Portal hosting and Studio publish are separate owner checkpoints.
Firestore Rules/indexes and Algolia settings/reconcile are separate external-state checkpoints.
No secret, provider key, production setting, migration, or unscoped Functions deploy is allowed.

## Rollback strategy

- Retain historical `design.tags`, taxonomy documents, tag fields in the prior index revision,
  and a tagged pre-change deployment revision throughout DEV QA.
- If search parity fails before index retirement, restore the prior UI/query path without data
  mutation. If it fails after a DEV index-settings update, restore the previous shared record
  contract/settings and reconcile from the retained Firestore data.
- If the Studio/Portal UI change fails, redeploy the previous client build; no backfill is needed.
- If a tag-trigger/function source change fails, restore/redeploy the prior explicit function
  allowlist. Never recover by bulk-writing or deleting tags.

## Explicit production exclusions

Production search settings, Function deployment/deletion, Portal/Studio publication, environment
flags, Rules/indexes, reindex/reconcile, reprocess/backfill, tag mutations, and data deletion are
all excluded. A production change requires a new reviewed managed phase and explicit owner action.

## Later production-backfill managed goal (outline only)

**Proposed future goal:** `production-smart-profile-backfill-and-catalog-maintenance-mode`.

It must first perform a read-only inventory of current AI Processing and Ready Design Library
records: Smart Profile/provenance versions, prompt/normalizer versions, missing/invalid profile
counts, staff-edited/import-preset protection, exact eligibility criteria, and expected Algolia
sync volume. Existing `catalogReprocess` evidence shows owner-only controls, bounded design IDs,
cursor checkpoints, durable outcomes, retry IDs, pause/resume, and Ready-preserving
`ready_backfill` processing. Their production suitability, concurrency, provider cost estimate,
rollback behavior, and complete target coverage remain **[NEEDS REPO CHECK]** in that future goal.

That goal must specify an owner-approved dry run; idempotent/resumable batching; bounded
concurrency; retry/backoff/error classes; pause/resume; per-record and aggregate progress;
checkpoint visibility; provider/token cost estimate; Firestore read/write and Algolia index volume;
failure isolation/rollback; and separate owner authorization before each production mutation.
It must not reuse a DEV job against production by assumption.

## Later owner-only Maintenance Mode prerequisite (outline only)

The same later production-backfill goal must first inspect the existing settings architecture and
record the chosen document/path as **[NEEDS REPO CHECK]**. Its required contract is:

- an owner-only Studio Settings control using `permissionService` for UX and a server-authoritative
  owner callable/Rules boundary for mutation;
- Studio stays usable while Portal renders a branded, user-friendly maintenance splash;
- all customer mutations are rejected at a trusted backend boundary while active, so existing
  browser sessions cannot bypass the freeze;
- disabling is always available to an active owner; no secret/config enters Firestore or clients;
- the mode is explicit owner action in production and must not be toggled by an automated job.

The later plan must enumerate all customer callable and direct-write paths rather than guarding
only the Portal page. It must cover print request, favorites, customer uploads, assisted creation,
account/profile, and any other customer mutation surface found in that audit. Maintenance Mode is
not an implementation prerequisite for this DEV tag-retirement plan unless a later Formal Review
proves a narrowly scoped need.

Because customer Firestore and Storage paths can be direct-client paths while Admin SDK callables
bypass Rules, that later audit must enforce the same mode in Firestore Rules, Storage Rules, and
every Portal-mutating callable. Callable/transaction guards must read fresh mode state inside the
trusted transaction to avoid enable-versus-commit races. A direct Firebase Auth email-verification
operation is also present in the Portal and cannot be frozen by a Firestore/Callable-only guard;
whether identity/Auth actions are intentionally outside the operational freeze is
**[NEEDS OWNER DECISION]** for that future phase.

## Open owner decisions

- **Halftone:** retire it with tag filters, or preserve it as a dedicated filter derived from the
  already-existing `halftoneStaffDecision.value` (not Smart Profile).
- **Studio legacy `?tags=` links:** remove with a tested no-filter fallback, or authorize a
  separately designed Smart Filter URL contract. No automatic mapping is safe.
- **Physical cleanup:** default remains no deletion of `design.tags`, tags taxonomy, indexes, or
  Functions. Any later cleanup needs its own migration/rollback authorization.

## Approval

Formal Review is recorded in
`docs/workflow/reviews/2026-09-08-legacy-tag-operational-retirement-and-smart-profile-search-parity-review.md`.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT LEGACY TAG OPERATIONAL RETIREMENT + SMART PROFILE SEARCH PARITY]`
