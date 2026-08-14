# Plan: Studio production-smoke corrective (tag counts, Load More, Imports audit, AI existing tags, helper processing)

| Field | Value |
|-------|-------|
| Date | 2026-08-11 (amended 2026-08-12: D8-A + Workstream E + Show Queue settings) |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (hotfix-style production-smoke corrective) |
| Goal slug | `studio-production-smoke-corrective-library-import-ai-tags` |
| Related | docs/workflow/reviews/2026-08-11-studio-production-smoke-corrective-plan-review.md |
| Parent | Prefinal A–H + Track B production promote; Studio **1.0.3** installed and under reduced smoke |

---

## Goal

Resolve or accurately classify Studio 1.0.3 production-smoke findings **and** enable helper operational artwork processing, then return to final production signoff:

1. **A** — Design Library tag-filter counts must describe the intended complete ready-catalog scope, not only hydrated cards.
2. **B** — `Load more designs` must follow the **active result source**, not unfiltered Firestore browse, when a filter/search result set is exhausted.
3. **C** — Produce a repo-grounded Studio `/imports` capacity/safety answer (implementation only if Review finds a real defect).
4. **D** — AI Processing must not re-suggest tags already manually assigned on the design (canonical + alias-equivalent). **Owner decided D8-A.**
5. **E** — Helper role = operational artwork processor/reviewer (Imports / Send to AI / AI Review approve-reject-rerun), **not** admin; Show Queue **settings** stay owner/admin-only.

No Design Library / Imports / AI Review redesign. No Phase 9/10. No domain cutover. **Helper ≠ Admin.** ADR-FP-088 Assisted Creation remains helper read-only.

---

## Background

Production Portal quick QA **PASS**. Functions / Rules / App Hosting / Track A APPLY complete. Studio **1.0.3** packaged from production lineage (PR #59 Algolia bake-in + PR #60 lint fix) and is now under reduced production smoke. These four findings came from that smoke — they block final production signoff, not a new product phase.

Prior related work: `docs/workflow/plans/2026-08-10-prelaunch-catalog-search-count-and-first-visit-ux-plan.md` fixed **text search** + **library total count** via Algolia + `countDesigns`. It intentionally left **tag/category faceting page-local** (`DesignLibraryPage` still omits `tags` from the Firestore query and facets in memory). That leftover is the A/B root.

AI tag resolution: ADR-FP-035/036 + `resolveAiCatalogTags` (`SIMPLE_ENRICHMENT_MAX_TAGS = 8`). Assigned `designs.tags` are **not** part of the pipeline `DesignRecord` today.

Import limits: ADR-FP-010/012/013 + `packages/shared/src/constants/import/batchImportLimits.constants.ts`. Portal customer-upload limits are a **different** contract and must not be copied.

---

## Verified Git / branch state (read-only, 2026-08-11 ~22:13 local)

| Ref | SHA |
|-----|-----|
| `origin/production` | `15c6492322157bf972168635787c8244898bfd9e` (PR **#60** merge; Studio `1.0.3`) |
| `origin/development` | `0605c6c156450e71886c839c16b4a548af7877fc` (PR **#61** production → development reconcile) |
| Freeze product | `3b7a978f324d3c133ead8707ffc51454a20e1f5d` (ancestor of production) |

Ancestry: `origin/production` **is** an ancestor of `origin/development`. Tips are reconciled after Studio 1.0.3 release work. Do **not** assume this without re-fetch at Implement start.

---

## Scope

### In Scope

- **A.** Full-catalog-accurate Studio tag counts (ready library; no eager full Firestore hydrate).
- **B.** Correct Load More / pagination for the active search/filter source.
- **C.** Repo-grounded Studio Imports capacity/safety audit; **documentation-only by default** (owner accepted; no new numeric limit unless Formal Review proves a safety defect).
- **D.** AI enrichment awareness of already-assigned `designs.tags` (server-side deterministic reconciliation + AI Review seed). **D8-A approved.**
- **E.** Helper operational image-processing / AI Review permissions via centralized `permissionService` + matching Functions gates; least-privilege Show Queue settings split.
- Focused automated tests + localhost/dev verification + **helper-account manual QA**.
- Doc updates (`DATA_MODEL`, `BACKEND`/`TESTING`, ADRs for D8-A + helper/Show Queue settings).

### Out of Scope

- Portal catalog redesign; Portal customer-upload limit changes (100-file / 80-MB / 2-GB)
- Algolia index **settings** mutation or reconcile **unless** Formal Review + owner explicitly approve a separate checkpoint (not required for A/B — see below)
- Full Firestore catalog hydration; replacing Algolia; tag taxonomy redesign
- New AI providers; expanding Gemini prompt with full taxonomy solely for D
- Design / Print Request lifecycle changes; migrations/backfills; customer-upload lifecycle
- Domain/DNS cutover; Phase 9 / Phase 10; unrelated Studio 1.0.3 packaging changes
- Making helper equivalent to admin; team/user admin; secrets; taxonomy bulk admin; owner-only Settings/AI model config; Test Data Reset; Algolia Admin
- **Changing ADR-FP-088** Assisted Creation (`owner/admin mutate; helper view-only`) unless separately owner-approved
- Helper access to **Show Queue settings/configuration** (explicitly excluded)

---

## Workstream A — Tag filter counts

### 1. Verified root cause

Tag modal counts are computed **in memory from currently hydrated designs**, not from the ready catalog.

| Layer | Path | Finding |
|-------|------|---------|
| Page | `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` | Firestore list query **omits tags/category** (`tags: []`, `categoryId: undefined`) so browse is unfiltered ready/archived pages (`DEFAULT_LIST_LIMIT = 100`). Comment: tag filtering is “fully client-side (AND + live faceting)”. |
| Modal | `.../components/DesignLibraryTagFilterModal.tsx` | `computeFacetedTagsForDraftSelection({ baseDesigns, ... })` |
| Call site | `DesignLibraryPage.tsx` ~L963 | `baseDesigns={categoryFilteredDesigns}` |
| Facet util | `.../utils/designLibrarySearch.ts` `computeFacetedTagsForDraftSelection` | Counts tags on the **passed design array** only |
| Browse source | `useDesigns` when **no text search** | Cursor pages; Load More hydrates more cards → facet counts change |
| Managed search | `useDesignLibraryManagedSearch` | Active **only** when `trimmedSearch.length > 0 && !browsingArchived` |

**Count meaning today**

| Context | What the number is |
|---------|--------------------|
| Unfiltered ready browse | Tags on **loaded** ready page(s), not catalog-wide |
| Category selected (no search) | Tags on loaded designs **in that category among hydrated cards** |
| Text search (Algolia) | Tags on **hydrated Algolia hit pages**, not full `nbHits` facet distribution |
| Archived | Page-local (Algolia index is ready-only) |

Loading another browse page **does** change counts — matches owner smoke.

**Not** Firestore aggregate. **Not** Algolia `tagFacetKeys` facets (Portal already uses those).

### 2. Exact files involved

- `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`
- `apps/studio/src/renderer/src/features/designs/components/DesignLibraryTagFilterModal.tsx`
- `apps/studio/src/renderer/src/features/designs/utils/designLibrarySearch.ts` (+ tests)
- `apps/studio/src/renderer/src/features/designs/hooks/useDesignLibraryManagedSearch.ts`
- `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearchService.ts`
- `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogFlags.ts` / `studioAlgoliaClient.ts`
- Reuse pattern from Portal (do **not** copy blindly): `apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts` (`buildPortalAlgoliaFacetSearchParams`, `facets: ['tagFacetKeys']`, `hitsPerPage: 0`)
- Shared: `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` (`encodePortalCatalogTagFacetKey` / `parsePortalCatalogTagFacetKey`)

### 3. Current data/control flow

Unfiltered / tag / category (no search) → Firestore page → client `filterDesignsBy*` → modal facets from that array.

Text search → Algolia IDs + Firestore hydrate → client needsCompanion filter → modal still facets **hydrated hits**, not Algolia facet API.

### 4. Proposed narrow correction

Reuse **existing production Algolia facet infrastructure** (search-only key). **No index-settings mutation.**

Production index already has:

```text
attributesForFaceting: ['filterOnly(tagIds)', 'filterOnly(categoryId)', 'tagFacetKeys']
```

- `filterOnly(tagIds)` / `filterOnly(categoryId)` → usable in `facetFilters` / `filters`, **not** facet histograms.
- `tagFacetKeys` → **not** `filterOnly` → **can** return facet counts today (Portal already does).

**Studio ready (non-archived) tag modal:**

1. On open (and when draft tag/category/search constraints change), call a new Studio search-only helper (mirror Portal `buildPortalAlgoliaFacetSearchParams`): `query` (may be `''`), `facetFilters` from selected draft tags (`tagIds:<canonical name>` — same as `designs.tags` / Algolia `tagIds`), `filters` for category, `facets: ['tagFacetKeys']`, `hitsPerPage: 0`, `maxValuesPerFacet` aligned with Portal (2000).
2. Map distribution via `parsePortalCatalogTagFacetKey` / merge-by-name (same as Portal).
3. Keep existing live-faceting UX (draft selection narrows remaining tags) using Algolia facets under those constraints — **not** hydrated cards.
4. Halftone remains the canonical `"halftone"` tag (exclude from modal list as today; toggle stays separate).
5. Missing Algolia env → **fail closed** (clear unavailable state; do not invent Firestore hydrate fallback).
6. **Archived** browse: Algolia ready-index cannot answer. Keep page-local faceting **or** label counts as loaded-only. Do not hydrate all archived docs.

**Unfiltered ready meaning:** facet counts = ready catalog tag usage (same corpus as Portal ready index).

**With category/search/other Algolia constraints:** counts = tag usage **within that constrained ready set** (Portal narrowed-facet behavior).

**needsCompanion:** not on Algolia records. Tag counts while needsCompanion is on stay a **known gap** unless Review approves indexing `companionSetIncomplete` (separate Algolia settings + reconcile checkpoint — **not** in default A). Default: when needsCompanion is the only extra constraint, document that tag counts remain unconstrained by companion status **or** apply a client post-filter only to **displayed cards**, not to modal totals. Prefer **not** lying: if companion cannot refine facets, do not claim companion-narrowed tag counts. Formal Review should confirm: tag modal ignores needsCompanion (honest) vs checkpoint for Algolia field.

### 5. Why this fits architecture

Studio `/designs` = approved library. Algolia is the existing complete-ready membership index. Search-only key only. No Admin. No full hydrate. Renderer stays UI/hooks/services; no Electron privilege change.

### 6. Tests

See Test Strategy (Design Library matrix).

### 7. Deployment / release

Studio renderer + package (**1.0.4** if smoke requires a new binary). Query-only Algolia. **No** Functions. **No** Algolia `setSettings` in default path.

### 8. Rollback

Revert Studio hotfix / stop distributing 1.0.4; keep 1.0.3. Counts regress to page-local.

### 9. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `tagIds` name vs taxonomy slug mismatch | High | Verify Studio selected tags are canonical **names** (they are: `designs.tags` + modal labels). Algolia `tagIds` are those same strings. |
| Facet max 2000 truncates rare tags | Medium | Same as Portal; document. |
| Index lag after tag edit | Medium | Existing Algolia eventual consistency; Firestore remains card authority. |
| needsCompanion not facetable | Medium | Explicit Review choice; no silent wrong counts. |

### 10. Human checkpoints

- Formal Review.
- Algolia **settings** mutation **only if** Review rejects `tagFacetKeys` query-only path (unexpected) or wants `companionSetIncomplete` indexed.

---

## Workstream B — Load More under filters

### 1. Verified root cause

```412:414:apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx
  const catalogHasMore = managedSearchActive ? managedSearchHasMore : hasMore;
  const catalogIsLoadingMore = managedSearchActive ? managedSearchIsLoadingMore : isLoadingMore;
  const handleLoadMore = managedSearchActive ? managedSearchLoadMore : loadMoreDesigns;
```

`managedSearchActive = trimmedSearch.length > 0 && !browsingArchived`.

**Tag-only / category-only / needsCompanion-only** still use Firestore `useDesigns.hasMore` (unfiltered cursor). Client `filterDesignsByTags` / `filterDesignsByCategory` / `filterDesignsByNeedsCompanion` shrink the **visible** set; Load More still means “more unfiltered Firestore documents exist.”

That is exactly the owner bug: 3 matching designs shown, button still visible.

Text search already uses Algolia `nbHits` / `nextOffset` (`useDesignLibraryManagedSearch`).

A and B share the same routing mistake: **managed catalog path is search-only**, not filter-aware.

### 2. Exact files involved

Same as A, plus:

- `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts`
- `apps/studio/src/renderer/src/features/designs/utils/designLibraryCountLabel.ts` (+ tests)
- `apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts` (URL filters unchanged unless routing flag)

### 3. Current pagination sources

| Mode | Result source | Load More meaning today |
|------|---------------|-------------------------|
| Ready browse, no search/tags/category | Firestore cursor | Correct |
| Ready + **text search** | Algolia pages | Correct (managed) |
| Ready + **tags and/or category**, no search | Firestore unfiltered cursor + client filter | **Wrong** |
| Ready + search + tags/category | Algolia (tags already passed as `facetFilters`) | Mostly correct |
| Archived ± filters | Firestore archived cursor + client filter | Page-local; Algolia N/A |
| needsCompanion on (no search) | Firestore + client filter | **Wrong** (same class as tags) |

### 4. Proposed narrow correction

**Share one managed result source with A** for ready catalog when any of: text search, selected tags, category ≠ All.

1. Redefine `managedSearchActive` (name may stay) to: `!browsingArchived && (search \|\| tags.length \|\| categoryId)`.
2. Allow **empty query** in `studioAlgoliaCatalogSearchService.listMatchingDesigns` + `useDesignLibraryManagedSearch` (today the hook **bails if `!searchKey`** — must change). Empty query + `facetFilters` / `filters` is the standard Algolia browse-by-facet pattern Portal already uses.
3. Load More ↔ Algolia `page` / `nbHits` only for that active source.
4. Unfiltered ready browse: unchanged Firestore `useDesigns` + Load More.
5. Clear filters → back to Firestore browse; reset managed state (no stale button).
6. Query change → cancel/ignore in-flight load-more; do not leave stale `hasMore`.
7. **Archived:** keep Firestore pagination; do not claim Algolia. If archived + tag filter exhausts the **loaded** page but Firestore `hasMore`, either keep current (known limitation) or hide Load More when filtered visible count is 0 and page isn’t full — **do not** infer “no more matches” from a short filtered page (matches may sit on later archived pages). Prefer documenting archived+tag as still page-local unless Review wants a Firestore `array-contains` query (indexes exist per `DATA_MODEL.md`; optional, not default — avoid new query surface without need).

**needsCompanion-only (no search/tags/category):** still not in Algolia. Options for Review:

| Option | Behavior | Recommend? |
|--------|----------|------------|
| B1 | Leave needsCompanion client-side on Firestore browse (Load More bug remains for this toggle alone) | Only if owner accepts |
| B2 | When needsCompanion is on **with** search/tags/category, post-filter Algolia pages (Load More may over-fetch until exhausted; `hasMore` slightly conservative) | Default when combined |
| B3 | Add `companionSetIncomplete` to Algolia record + `attributesForFaceting` + reconcile | Separate human checkpoint; **out of default scope** |

Default proposal: **B2** when other managed constraints exist; **B1** documented for companion-only until B3 is approved. Do not invent a fake “no more” from a short first page.

### 5. Why this fits architecture

Same managed-search adapter already used for full-catalog text search. No new backend. No loadAll.

### 6–10. Tests, deploy, rollback, risks, checkpoints

See shared Design Library test matrix. Deploy = Studio package. Rollback = revert 1.0.4. Risk: empty-query Algolia + exact-token params (`withPortalCatalogAlgoliaExactTokenSearchParams`) must remain valid for `query: ''` (Portal facet helper already does this). Checkpoint: Formal Review; Algolia settings only if B3 chosen.

**A+B should share one managed Algolia/filter-result source: YES.**

---

## Workstream C — Studio `/imports` capacity / safety audit

### 1. Verified current behavior (not Portal limits)

Portal customer-upload caps (**100 files / 80 MB / 2 GB**, `CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES = 100`) **do not apply** to Studio Imports.

Authoritative Studio constants: `packages/shared/src/constants/import/batchImportLimits.constants.ts` + ADR-FP-010/012/013.

| Constraint | Current actual value | Enforcement location | Behavior when exceeded |
|------------|---------------------:|----------------------|------------------------|
| Selected / processed PNG count | **500** (`MAX_BATCH_FILES`) | `folderScanner.ts`, `folderBatchDiscovery.ts`, `selectMultiplePngFiles.ts`, zip extract `maxCandidates` | Truncate; discovery summary `skippedByLimit` / `MAX_BATCH_FILES` |
| Folder recursion | **Yes**, max depth **12** (`MAX_FOLDER_DEPTH`) | `folderScanner.ts` | Deeper dirs skipped; `directoriesSkippedDepth` |
| Directory entries visited | **10,000** (`MAX_FOLDER_SCAN_ENTRIES`) | `folderScanner.ts` | Scan stops; truncation reason |
| ZIP files inside selected folder | **Yes**, up to **50** (`MAX_FOLDER_ZIPS`) | `folderScanner.ts` + `folderZipProcessor.ts` | Extra ZIPs skipped (`zipsSkipped` / `zipsSkippedByLimit`) |
| Nested ZIP-in-ZIP | **Yes**, max depth **3** (`MAX_NESTED_ZIP_DEPTH`) | `zipExtractor.ts` | Deeper nested ZIPs counted `nestedZipsNotOpened` |
| ZIP compressed size | **floor(2.1 × 1024³)** (~2.1 GiB) | `zipExtractor.ts`, `selectImportZipFile.ts`, folder ZIP scan | Reject that ZIP; message via `importLimitMessages.ts` |
| ZIP entries scanned | **2000** (`MAX_ZIP_ENTRIES`) | `zipExtractor.ts` | Abort that archive extraction |
| Cumulative extracted bytes | **10 GiB** (`MAX_EXTRACTED_BYTES`) | `zipExtractor.ts` shared budget | Abort; zip-bomb / disk guard |
| Compression ratio | **100:1** (`MAX_ZIP_COMPRESSION_RATIO`) | `zipExtractor.ts` | Abort pathological entry |
| Individual image size | **150 MB** (`MAX_SINGLE_PNG_SIZE_BYTES`) | PNG validator + Storage rules alignment | Reject that file |
| Supported extensions | **`.png` only** (`ALLOWED_EXTENSIONS`) | scanner / extractor / validator | Other files ignored |
| Image dimensions / DPI | Min DPI **300**; derivative max 320 / 1280 (no upscale unless import upscale path) | `pngValidator`, derivative constants | Validation warnings / reject per existing import rules |
| Parallel image processing (Sharp) | **1** (`DERIVATIVE_PROCESSING_CONCURRENCY`) | `derivativeConcurrencyQueue.ts` | Queue; memory-bounded |
| PNG validation concurrency | **1** (`VALIDATION_CONCURRENCY`) | batch discovery | Serial validate |
| Parallel Storage uploads | **2** (`UPLOAD_CONCURRENCY`) | `importBatchOrchestrationService.ts` | Bounded `runWithConcurrency` |
| AI enqueue concurrency | **1 sequential** session FIFO | `importAiBackgroundQueue.ts` (ADR-FP-014) | No N parallel `enqueueAiEnrichment` |
| Firestore design create | Per-file via import orchestration | `importOrchestrationService.ts` | Per-file failure isolation |
| Cancellation | Job cancel token + `shouldCancel` in scan/extract/upload | `cancelBatchImportJob.ts`, zip/folder extract | Cooperative cancel |
| Progress | Discovery + upload progress panels | `BatchImportProgressPanel`, IPC progress | UI remains on path/name/counts, not full bytes in renderer |

**Flow (verified):** renderer `ImportsPage` / `useBatchImport` → preload IPC (`importIpcChannels`) → `importIpcHandlers.ts` → `selectImportFolder` / zip / multi-PNG → `folderBatchDiscovery` → `folderScanner` (paths only) → `folderZipProcessor` / `zipExtractor` (**yauzl `lazyEntries`, stream entry to disk**, not full in-memory expand) → validate PNG → renderer upload concurrency 2 reads **one validated path at a time** via IPC (`readBatchValidatedPngFileBytes`) → Storage + design doc → derivative Sharp (main, concurrency 1) → AI background pump (sequential).

### Audit answers (owner question)

1. **500 / 1,000 / several thousand files?** Scan may walk up to 10k entries and 50 ZIPs; **at most 500 PNGs are processed**. Thousands of PNGs: remainder skipped with discovery summary — not silently imported. Renderer does **not** hold all file bytes; main extract uses disk + streaming.
2. **ZIPs:** streamed entry-by-entry to disk (`lazyEntries` + write stream). Not expanded fully in RAM.
3. **Malformed ZIP:** `folderZipProcessor` increments `zipsSkippedError` per ZIP; other ZIPs/loose PNGs continue. One bad ZIP does not abort the whole folder batch.
4. **Backpressure:** validation 1, Sharp 1, upload 2, AI 1 — yes, explicit.
5. **Overwhelm Firebase / Sharp / Electron / AI?** Practical bottleneck is **time** (serial Sharp + sequential AI) and **disk** (extract up to 10 GiB), not unbounded RAM. Firebase: 2 uploads + 1 AI enqueue at a time — designed after ADR-FP-014 429 storms.
6. **Zip-bomb protections:** `MAX_EXTRACTED_BYTES`, `MAX_ZIP_COMPRESSION_RATIO`, `MAX_ZIP_ENTRIES`, path safety (`resolveSafeZipEntryPath`), symlink skip.
7. **Nested ZIPs:** supported to depth 3; beyond that ignored/counted.
8. **UI communication:** `BatchImportDiscoverySummary` already exposes processed / skipped-by-limit / ZIP skip reasons (`zipsSkippedByLimit` vs other). If owner still “doesn’t know the limit,” that is a **copy/discoverability** issue, not a missing constant.

### 2. Exact files (audit / any later code)

- Renderer: `apps/studio/src/renderer/src/features/imports/pages/ImportsPage.tsx`, `hooks/useBatchImport.ts`, `services/importBatchOrchestrationService.ts`, `importOrchestrationService.ts`, `importAiBackgroundQueue.ts`, `importDesktopService.ts`, `components/batch/*`
- Electron: `electron/ipc/import/importIpcHandlers.ts`, `folderBatchDiscovery.ts`, `selectImportFolder.ts`, `selectImportZipFile.ts`, `selectMultiplePngFiles.ts`, `electron/services/import/folderScanner.ts`, `folderZipProcessor.ts`, `zipExtractor.ts`, `derivativeGenerationService.ts`, `derivativeConcurrencyQueue.ts`
- Shared: `packages/shared/src/constants/import/batchImportLimits.constants.ts`, `importValidation.constants.ts`, `derivativeGeneration.constants.ts`, `utils/importLimitMessages.ts`, `utils/batchDiscoverySummary.ts`

### 3–4. Proposed correction

**Default: documentation only.** Record the table above in `docs/architecture/BACKEND.md` (or Import subsection) + owner-facing note in `TESTING.md` / Imports help if needed. **Do not invent a new cap.**

Optional Review-only product work (not required to close the audit):

- Stronger empty-state / tooltip: “Up to 500 PNGs per batch; folder ZIPs up to 50; max ZIP ~2.1 GiB…”
- That is **messaging**, not a new limit.

Implementation only if Review finds a **defect** (e.g. a path that still buffers entire ZIP in memory — current `zipExtractor` does not). No new batching model proposed.

### 5. Architecture

Filesystem/ZIP/Sharp stay in Electron main behind IPC. Renderer never gets Admin/Firebase Admin. Portal limits stay Portal-only.

### 6. Tests / probes (no giant committed binaries)

Unit/contract tests already exist for limits/messages/discovery summary. Add focused tests only if a bug is proven. Manual/dev probes: folder of many tiny PNGs + ZIPs; malformed ZIP; nested dirs; unsupported extensions; cancel mid-discovery. Use temp dirs, do not commit thousands of PNGs.

### 7–10. Deploy / rollback / risks / checkpoints

- Deploy: **none** if docs-only; Studio package only if UI copy or Electron fix is approved.
- Rollback: revert docs/code.
- Risk: owner expects Portal-like 100-file cap — mitigate by explicit docs, not by silently applying Portal limits.
- Checkpoint: **any new user-visible numeric cap** → owner decision before Implement. Formal Review chooses docs-only vs copy tweak vs code fix.

**C needs implementation? Default NO (documentation only).** Copy/discoverability optional.

---

## Workstream D — AI existing manual tags

### 1. Verified root cause

**Confirmed in repo**, not assumed from smoke alone.

1. `designs.tags` = canonical lowercase **names** (`DATA_MODEL.md`; Algolia builder comment). Not IDs/objects.
2. Pipeline local type **omits tags**:

```113:123:functions/src/ai/aiEnrichmentPipeline.ts
interface DesignRecord {
  id: string;
  title: string;
  previewPath?: string;
  thumbnailPath?: string;
  artworkBackgroundHex?: string;
  aiRequestedVisionModelId?: string;
  aiProcessingStage?: string;
  aiReviewStatus?: string;
  status?: string;
}
```

3. `designSnapshot.data()` is cast to that type; **`tags` are discarded**.
4. `resolveAiCatalogTags({ approvedTags, candidates: rawTags ?? suggestions.tags, maxApprovedTags: SIMPLE_ENRICHMENT_MAX_TAGS, ... })` — taxonomy + model candidates only. **No existing design tags.**
5. `markAiSuccess` writes **`aiSuggestions` / `aiAnalysis` only** — does **not** mutate `designs.tags`. Re-run does not delete human tags in Firestore. The smoke failure is **re-suggestion / AI Review seed**, not silent wipe on disk.
6. AI Review form seed (`createAiReviewDraftFromDesign`): if `aiSuggestions.tags` is non-empty, **Final Catalog tags = suggestions only**, not `union(design.tags, suggestions)`. Staff then **see** the duplicate as the suggested/final list; accepting the form can **replace** catalog tags with the AI list (human tags omitted if not in suggestions).

Alias example (`cannabis` vs approved alias): resolver already maps aliases → canonical **for model output vs taxonomy**, but never subtracts **already assigned** canonical/alias on the design.

### 2. Exact files involved

- `functions/src/ai/aiEnrichmentPipeline.ts` (+ tests)
- `functions/src/ai/catalogTagResolver.ts` (+ tests)
- `functions/src/ai/catalogTagRerankProvider.ts` / `catalogSuggestedTagAuthorProvider.ts` (pass already-covered names into `approvedMatchedTags` / reserved terms)
- `functions/src/ai/aiEnrichmentConfig.ts` (`SIMPLE_ENRICHMENT_MAX_TAGS`)
- Studio AI Review: `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewFormState.ts` (+ tests), `AiReviewSuggestionsSection.tsx` only if server+seed still shows dupes
- Types: `apps/studio/.../types/design.types.ts` `tags: string[]`; shared `DesignAiSuggestions`

### 3. Current flow

Queued design → download preview → vision provider → `resolveAiCatalogTags` → optional rerank / suggestion-author → `resolveThemeCategory({ matchedTags: suggestions.tags })` → persist `aiSuggestions` → Studio seeds form from suggestions.

### 4. Proposed narrow correction

**Deterministic server-side reconciliation after vision** (requirement 8–10). Do **not** inject full taxonomy into the Gemini prompt solely for this.

1. Read `designs.tags` on the snapshot (extend `DesignRecord`).
2. Normalize existing tags with the **same** `normalizeTagCandidate` / alias lookup already in `catalogTagResolver`.
3. After `resolveAiCatalogTags` (and after rerank if it runs), **subtract** any resolved suggestion that is the same canonical tag or alias-equivalent to an existing assignment.
4. Strip `suggestedNewTags` whose name/aliases resolve to an already-assigned approved tag.
5. Treat existing tags as **already-covered** for rerank heuristics / suggestion-author `approvedMatchedTags` / `buildReservedCatalogTagTerms` inputs (so author does not reinvent assigned concepts).
6. Category resolution: `matchedTags = unique(existingCanonical ∪ suggestions.tags)` so theme category still sees human tags.
7. **Do not** write `designs.tags` in `markAiSuccess`. No migration. No rewrite of assignments.
8. **Halftone / exclusions:** keep existing exclusion filter and human-only `"halftone"` behavior; do not have AI re-suggest `halftone` if already assigned; do not remove it.
9. **Studio seed:** Final Catalog tags = **stable unique union** of `design.tags` then new `aiSuggestions.tags` (human first). Suggestions panel lists **only new** AI tags (not already on the design).

### 5. Why this fits architecture

AI enrichment stays in Cloud Functions. Studio remains review UI. Resolver remains authority. Search-only Algolia untouched.

### 6. Eight-tag semantics (verified)

| Question | Answer |
|----------|--------|
| What is `SIMPLE_ENRICHMENT_MAX_TAGS`? | **8** (`aiEnrichmentConfig.ts`; test asserts 8). Comment: “Max single-word tags retained from the simplified playground-style enrichment response.” |
| Model candidates? | Indirect: `simpleCatalogEnrichmentResponse` also slices to this cap when normalizing parsed JSON. |
| Resolved AI tags (`aiSuggestions.tags`)? | **Yes** — passed as `maxApprovedTags` into `resolveAiCatalogTags`. |
| AI Review UI list? | Displays whatever was persisted on `aiSuggestions.tags` (capped upstream). |
| Final persisted `designs.tags` total? | **No.** Catalog max is **20** (`DATA_MODEL.md`). Pipeline does not write `designs.tags`. |
| Human tags consume the 8 today? | **No** — they are invisible to the resolver. |

**Owner decision (2026-08-12): D8-A — APPROVED.**

| Rule | Binding interpretation |
|------|------------------------|
| `designs.tags` | Authoritative human/catalog state |
| `SIMPLE_ENRICHMENT_MAX_TAGS = 8` | Up to **8 AI-resolved additional** tag suggestions (**excluding** already-assigned) |
| Existing human tags | Covered concepts for deterministic duplicate/alias suppression only — **do not** consume the 8 |
| Exact / alias-equivalent assigned tags | Must not be re-suggested; must not appear under `suggestedNewTags` |
| Human tags vs ceiling | **Never** removed merely to satisfy the AI 8-tag ceiling |
| Final persisted design tags | Still subject to existing design-level maximum (**20**) and validation — **do not** change the design-level max in this corrective |

Rejected alternatives D8-B / D8-C are out of scope.

### 7. Deployment

**Scoped Functions deploy** (AI enrichment pipeline + tests). **Do not hide inside a Studio-only release.** Studio AI Review seed is a **Studio package** change (can ship in same 1.0.4 binary as A/B, but Functions must be live first or seed union still helps while suggestions still contain dupes).

Order: Functions DEV → owner QA → production Functions (human checkpoint) → Studio 1.0.4 if A/B/D UI included.

### 8. Rollback

Redeploy previous Functions revision; revert Studio seed. No data migration to undo.

### 9. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Existing tags stored as slug vs name | Medium | Resolve existing tokens through taxonomy map (id or name), same as Algolia `indexPortalCatalogTaxonomyTag` |
| Rerank reintroduces assigned tag | High | Subtract again **after** rerank |
| Form union vs staff wanting AI-only replace | Medium | Human tags authoritative per owner intent; document |
| Eight-tag surprise | Medium | **D8-A owner-approved** |

### 10. Human checkpoints

- Formal Review.
- D8-A **decided** (no longer blocking).
- DEV Functions deploy; production Functions deploy.
- Studio patch publish if UI seed ships with A/B.

---

## Workstream E — Helper operational image-processing permissions

### Owner intent (approved for Plan/Review)

`helper` = **operational artwork processor/reviewer**, not administrator.

Helpers must be able to: Send eligible Uploaded Designs to AI; access Processing / Needs Review / Rejected; edit normal AI Review catalog fields (title, description, category, tags, halftone); approve/reject; re-run/retry AI; process imported + legitimately promoted customer-upload designs through the established workflow.

Helpers must **not** gain: team/user admin, secrets, owner-only settings, taxonomy bulk admin, Test Data Reset, Algolia Admin, production deploy controls, **Show Queue settings**, or Assisted Creation mutate (ADR-FP-088).

**Helper ≠ Admin.**

### 1. Verified root cause

Helpers are blocked primarily by **centralized capability mapping** that conflates catalog **administration** with **operational processing**, then mirrored in **Functions** callables. Firestore design writes are already broadly `isStaff()` (including helper) for many catalog paths — UI/Functions fail closed first.

| Layer | Finding |
|-------|---------|
| `permissionService.ts` | `canApproveDesignForCatalog` / `canRejectDesignFromCatalog` / `canRerunAiSuggestions` / `canManageAiReview` / `canEditAiReviewInbox` / `canPromoteCustomerUploadToAiReview` / `canRetryCustomerUploadProcessing` → **owner/admin only**. Helpers keep `canImportDesigns`, `canViewAiReview`, `canSkipAiReview`, `canExcludeCustomerUploadFromCatalog`, `canEditDesigns`, `canArchiveDesigns`. |
| UI | Intake `canPromote`/`canRetry`; AI Review approve/reject/rerun/edit gates use those capabilities (`useCustomerUploadIntake`, `useAiReviewInbox`, `AiReviewWorkspace`). |
| Functions | `assertCanPromoteOrRetryCustomerUpload` → owner/admin (`functions/src/lib/customerUploadStaffAuth.ts`). `enqueueAiEnrichment` / `resetAiEnrichmentForProcessing` → owner/admin. Promote callable uses assertPromote. |
| Firestore `designs` | `allow update: if isStaff() && (… catalogMetadataOnlyUpdate \|\| catalogApprovalStatusOnlyUpdate …)` — **helper already permitted** for many design review writes if client reached them. |
| Firestore `settings/showQueue` | `allow create, update: if isStaff()` — **helper can write settings today**. |
| Show Queue UI | Settings gear on `UpcomingShowsPage` is shown to **all** staff (no separate gate). `updateSettings` checks `canManageUpcomingShows` (**includes helper**). ADR-FP-085 previously documented helpers keeping Show Queue Settings — **superseded by this owner intent**. |
| Assisted Creation | ADR-FP-088 + `assistedCreationRequests.ts` `assertOwnerAdminCaller` — helper mutate blocked. **Leave untouched.** |
| Taxonomy / suggested-tag approve | `canApproveSuggestedTags` → `canManageTags` → owner/admin. **Keep owner/admin** (not operational artwork processing). |

**Root cause class:** operational processing capabilities were folded into owner/admin-only “catalog approve / AI manage” gates; Show Queue settings incorrectly share `canManageUpcomingShows` with day-to-day queue ops.

### 2. Permission / action matrix (verified current → desired)

| Workspace / action | Owner | Admin | Helper now | Helper desired | Capability (actual names) | UI gate | Service/backend gate |
|---|---|---|---|---|---|---|---|
| Imports: start/import artwork | yes | yes | **yes** (`canImportDesigns`) | operational (unchanged) | `canImportDesigns` | Imports routes | Electron + Firestore create `isStaff` |
| Imports: enqueue AI (background) | yes | yes | **blocked** at callable | **allowed** | today tied to enqueue owner/admin | import AI pump | `enqueueAiEnrichment` **owner/admin** |
| Uploaded Designs: open intake | yes | yes | yes | yes | `canViewCustomerUploadIntake` / `canImportDesigns` | intake | Rules staff |
| Uploaded Designs: Send to AI | yes | yes | **blocked** | **allowed** | `canPromoteCustomerUploadToAiReview` → today `canApproveDesignForCatalog` | `canPromote` | `assertCanPromoteOrRetryCustomerUpload` **owner/admin** |
| Uploaded Designs: retry processing | yes | yes | **blocked** | **allowed** | `canRetryCustomerUploadProcessing` | `canRetry` | same promote/retry assert |
| Uploaded Designs: exclude/restore eligibility | yes | yes | yes | yes (unchanged) | `canExcludeCustomerUploadFromCatalog` | intake | staff assert |
| Uploaded Designs: delete eligible | yes | yes | no | **no** (keep) | `canDeleteEligibleCustomerUpload` | intake | delete assert owner/admin |
| AI Review: view Processing / Needs Review / Rejected | yes | yes | **view** | full operational | `canViewAiReview` | routes | — |
| AI Review: edit title/description/category/tags/halftone | yes | yes | **blocked** (`canEditAiReviewInbox`→manage) | **allowed** | `canEditAiReviewInbox` / `canManageAiReview` today OA | workspace | `aiReviewInboxService` + Firestore staff |
| AI Review: approve / reject | yes | yes | **blocked** | **allowed** | `canApproveDesignForCatalog` / `canRejectDesignFromCatalog` | buttons | inbox service + Rules staff |
| AI Review: re-run / retry AI | yes | yes | **blocked** | **allowed** | `canRerunAiSuggestions` | buttons | `enqueueAiEnrichment` / `resetAiEnrichmentForProcessing` OA |
| AI Review: approve suggested **new taxonomy** tags | yes | yes | no | **no** (keep OA) | `canApproveSuggestedTags`→`canManageTags` | inbox | taxonomy OA |
| Design Library: normal edit/archive | yes | yes | yes | yes | `canEditDesigns` / `canArchiveDesigns` | UI | Rules staff |
| Design Library: restore | yes | yes | no | **no** | `canRestoreDesigns` | UI | — |
| Taxonomy management | yes | yes | no | **no** | `canManageTags` / `canManageCategories` | UI | Functions OA |
| Settings / AI enrichment config | yes | yes | no | **no** | `canManageSettings` / AI settings callables | Settings | OA Functions |
| Users/team management | yes | admin limited | no | **no** | `canManageUsers` / roles | Users | — |
| Show Queue: operational (add/edit shows, allocate) | yes | yes | yes | **yes** (if already allowed) | `canManageUpcomingShows` | Show Queue | Rules staff |
| Show Queue: **Settings** modal (capacity, Whatnot URL, cutoff, gang sheet) | yes | yes | **yes today (undesired)** | **no** | today `canManageUpcomingShows`; **split** → `canManageShowQueueSettings` OA only | Settings button ungated | `updateSettings` + Firestore `settings/showQueue` **isStaff** |
| Whatnot Import Shows | yes | yes | no | **no** | `canImportWhatnotShows` | button | service |
| Assisted Creation mutate | yes | yes | view-only | **view-only** | ADR-FP-088 | Studio Assisted | `assertOwnerAdminCaller` |

### 3. Exact files involved

- `apps/studio/src/renderer/src/features/permissions/services/permissionService.ts` (+ `.aiReview.test.ts`, `.helperRestrictions.test.ts`, new helper-processing tests)
- `apps/studio/src/renderer/src/features/permissions/types/permission.types.ts` — add `canManageShowQueueSettings` to `PermissionKey`; wire `hasPermission` switch in `permissionService.ts`
- Intake / AI Review already consume capabilities — preferably **no scattered role checks**; only capability flips
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` — **split** Settings action from `canManageUpcomingShows` actions: Settings requires `canManageShowQueueSettings`; operational Add/etc. stay on `canManageUpcomingShows`
- `apps/studio/src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts` — `updateSettings` → `canManageShowQueueSettings`
- `functions/src/lib/customerUploadStaffAuth.ts` — expand promote/retry to helper
- `functions/src/enqueueAiEnrichment.ts` — staff operational gate (owner/admin/**helper**); keep playground/settings OA
- `functions/src/resetAiEnrichmentForProcessing.ts` — same if used by helper re-run path
- `firestore.rules` — `settings/showQueue` writes: **owner/admin only** (required for authoritative Show Queue settings lock)
- Docs: `DECISIONS.md` (amend ADR-FP-085; record helper processing ADR); SECURITY/BACKEND as needed
- **Do not** change `assistedCreationRequests.ts` / ADR-FP-088

### 4. Proposed narrow correction (binding)

1. **Expand existing operational capabilities to active staff including helper** (do **not** invent a parallel `canProcessAiReviewWorkflow` unless Formal Review later requires it):
   - `canApproveDesignForCatalog`, `canRejectDesignFromCatalog`, `canRerunAiSuggestions`, `canManageAiReview` (and dependents: `canEditAiReviewInbox`, `canApproveAiReview`, `canRejectAiReview`, `canOverrideAiReview`, promote/retry) → `hasActiveRole(user, ["owner", "admin", "helper"])` / `isStaff` as appropriate for those operational paths.
   - Keep **owner/admin (or owner-only)** for: `canManageTags`, `canManageCategories`, `canApproveSuggestedTags`, `canManageSettings`, `canManageUsers` / roles, `canRestoreDesigns`, `canDeleteEligibleCustomerUpload`, `canImportWhatnotShows`, `canOpenDevTools`, AI enrichment **settings**/playground callables, Assisted Creation mutate.
2. New **`canManageShowQueueSettings`**: owner/admin only. Wire Settings UI + `showQueueSettingsService.updateSettings`. Keep `canManageUpcomingShows` for operational Show Queue (helper retains).
3. Functions: promote/retry + `enqueueAiEnrichment` + reset-for-processing allow **helper**; do **not** open AI playground / AI enrichment **settings** / taxonomy / Assisted mutate.
4. Firestore: tighten `settings/showQueue` create/update to owner/admin. Design Rules stay `isStaff` (already OK).
5. Update ADR-FP-085: helpers **lose** Show Queue Settings; gain operational AI processing.
6. Explicit: **Helper does not become Admin.**
7. No scattered `role === "helper"` in components — capability flips only.

### 5. Security analysis

- Least privilege: only artwork processing capabilities.
- UI and Functions must agree — no enabled button that fails `permission-denied`.
- Rules change for Show Queue settings is a **tightening**, not a relaxation.
- Expanding promote/enqueue to helper is a **narrow** Functions change, not “all authenticated.”
- Taxonomy suggested-tag approval stays OA (creating global tags ≠ processing one design).
- Storage: promote already copies via Admin SDK after staff assert — helper on that assert is enough; do not relax Storage to customers.

### 6. Rules / backend impact

| Layer | Change? |
|-------|---------|
| Studio `permissionService` + UI gates | **Yes** |
| Functions promote/retry + enqueue/reset | **Yes** |
| Firestore `settings/showQueue` write | **Yes** (restrict to OA) |
| Firestore `designs` | **No** (already staff) |
| Storage Rules | **Likely no** (Admin SDK promote path) |
| Assisted Creation | **No** |
| Studio 1.0.4 package | **Yes** (permission UI) |

### 7. Tests

- permissionService matrix: owner/admin/helper/customer for all E capabilities + Show Queue settings false for helper.
- Helper can promote eligible upload; cannot delete eligible; cannot manage tags/settings/users.
- Helper can approve/reject/rerun; cannot approve suggested taxonomy tags.
- Functions unit/assert tests for promote/enqueue helper allow + customer deny.
- Rules tests for `settings/showQueue` helper write deny / OA allow (if rules harness covers settings).
- Regression: customer cannot write designs/settings.
- Manual DEV QA as real `role: helper` account (not owner).

### 8. Manual helper QA checklist (future)

1. Sign in as helper on DEV.
2. Imports: import PNG; confirm AI enqueue succeeds.
3. Uploaded Designs: Send to AI on eligible Pending; blocked on ineligible.
4. AI Review: edit fields, approve one, reject one, re-run one.
5. Confirm no Users / AI Settings / Tag Management mutate / Test Data Reset / Show Queue **Settings**.
6. Assisted Creation: view-only still; mutate fails.
7. Owner/admin unchanged smoke.

### 9. Deployment impact

Studio **1.0.4** + **Functions** (promote, enqueue, reset) + **Firestore Rules** (`settings/showQueue`) — **combination**. Separate human checkpoints for Rules + Functions production deploys. Not UI-only.

### 10. Rollback

Revert permissionService/UI; redeploy prior Functions; redeploy prior Rules (restores helper Show Queue settings write — document). No data migration.

### 11. Explicit statement

**Helper does not become Admin.** Operational AI/catalog review ≠ Users, Settings, taxonomy admin, secrets, Deploy, Assisted mutate, or Show Queue settings.

---

## Cross-workstream dependency map

```text
A (tag facets) ──┐
                 ├── share managed Algolia source + Studio 1.0.4 package
B (Load More) ───┘
C (Imports audit) ── docs-only (owner accepted); no dependency
D (AI tags) ── Functions deploy ── then Studio AI Review seed (same 1.0.4 OK)
E (helper perms) ── Studio 1.0.4 + Functions (promote/enqueue/reset) + Firestore Rules (showQueue tighten)
Final production re-smoke ── after A/B/E package + D/E Functions (+ Rules)
Prefinal A–H signoff ── after re-smoke PASS
```

A/B can Implement without D/E. D and E both touch Functions — coordinate allowlists; do not hide Functions inside Studio-only notes. C remains docs-only.

---

## Affected Areas (summary)

### Files / Modules (expected)

See workstream file lists. No fake paths.

### Architecture Impact

- [x] Details: Studio Design Library result-source routing; optional shared/small Algolia facet helper in Studio (or shared catalog-search package if Formal Review prefers DRY with Portal — default: Studio-local mirror to avoid Portal import cycles). Functions AI pipeline reads `designs.tags`. No layer violations.

### Security Impact

- [x] Details: Algolia **search-only** only. No Admin key in Studio. Import ZIP path traversal already guarded. No new secrets. E = least-privilege helper processing + Show Queue settings **tighten**; ADR-FP-088 untouched.

### Data Model Impact

- [x] Details: No schema change. Document AI existing-tag reconciliation + **D8-A** eight-tag meaning. `designs.tags` unchanged at rest.

### Backend Impact

- [x] Details: D = AI pipeline Functions. E = promote/enqueue/reset Functions + Firestore `settings/showQueue` Rules. A/B = query-only Algolia. C = none (docs).

### UI / UX Impact

- [x] Details: Tag modal counts; Load More; AI Review tags; helper-visible processing controls; Show Queue Settings gated OA. Manual Studio QA required (incl. helper account).

### Migration Impact

- [x] None. No backfill.

---

## Approach (Implement sequence — after Review + owner approval)

1. Re-fetch `origin/production` / `origin/development`; open hotfix from **current production tip** (see Branch strategy).
2. Implement A+B together (managed source + facet counts + Load More + tests).
3. Implement D Functions + tests; then Studio AI Review seed (D8-A).
4. Implement E: `permissionService` + Show Queue settings split + Functions promote/enqueue/reset + Rules `settings/showQueue` tighten + tests.
5. C: docs only (Imports constraint table; no new numeric cap).
6. Localhost Studio verify A/B/E UI; DEV Functions + Rules + AI re-run for D/E; helper-account QA.
7. Owner QA → protected PR → production → Rules prod (E) → Functions prod (D+E) → Studio 1.0.4 → reduced re-smoke → signoff.

No implementation in this Plan pass.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck Studio | `npx tsc -p apps/studio --noEmit` (after packagedBuildConfig if needed) | yes (A/B/D UI) |
| Typecheck Portal | `npm run typecheck --workspace @fresh-prints/portal` | only if shared catalog-search helper changes |
| Lint | `npm run lint` | yes |
| Unit tests | `npx tsx --test` on listed files | yes |
| Functions build | `npm --prefix functions run build` | yes if D/E |
| Studio Vite build | `npx vite build` (apps/studio) | yes if A/B/D/E UI |
| Studio installer | `npm run build:studio` / `studio-release.yml` | yes only at 1.0.4 publish |
| Firestore Rules tests | project rules harness covering `settings/showQueue` | **yes for E** |
| Integration / E2E | — | no (manual helper QA covers E workflow) |

### Design Library matrix (A/B)

- Fixture catalog **150+** where only first **100** hydrate: tag only on “page 2” still correct **before** Load More (Algolia facet mock / unit of facet mapper + hook).
- Tag across pages → total count, not loaded count.
- Tag-only filter, **3** matches, page size 100 → **no** Load More.
- Managed filter/search with **>1** Algolia page → Load More until `offset >= nbHits`.
- Text search + tag filter pagination.
- Clear filters → Firestore browse Load More restored.
- Full-catalog text search regression (existing containment + count label tests).
- No DEV/prod Algolia cross-env (existing flag/env tests; package exclusion gates unchanged).
- Archived: no Algolia facet call; fail closed if someone enables managed search while archived.

### AI matrix (D)

- Assigned canonical + same AI canonical → not in `aiSuggestions.tags`.
- Assigned tag + AI alias of that tag → suppressed.
- Multiple existing + additional valid new AI tags → new tags kept; existing not removed on disk.
- Existing colliding with `suggestedNewTags` → stripped.
- Rerank on / off; suggestion-author on / off.
- Exclusions still applied; `halftone` human-only intact.
- Eight-tag boundary per **D8-A** (8 = additional AI tags; human tags do not consume allowance).
- Form seed union: human tags remain in Final Catalog input when suggestions omit them.

### Helper permissions (E)

- permissionService owner/admin/helper/customer matrix for processing + Show Queue settings.
- Helper promote/retry/approve/reject/rerun allow; delete-eligible / manage tags / manage settings / manage users / Show Queue settings deny.
- Functions assert promote/enqueue helper allow + customer deny.
- Rules: helper cannot write `settings/showQueue`; OA can.
- Regression: enabling helper processing does not enable customer writes.

### Imports (C)

Documentation/probes only: many loose PNGs; folder PNG+ZIP; large entry count; malformed ZIP; nested dirs; unsupported files; concurrent job guard; cancel — confirm documented limits; no new code cap.

### Manual

- [x] Localhost Studio Design Library tag modal + Load More (prod-like Algolia **dev** index, never prod from dev Studio).
- [x] DEV AI re-run on a design with a manual tag.
- [x] Imports: confirm discovery summary numbers vs 500/50/2.1 GiB (optional).
- [x] **Helper-account** DEV QA (Workstream E checklist).
- [x] After promote: reduced production re-smoke (not full DEV suite).

---

## Deployment matrix

| Workstream | Studio renderer/package | Functions | Firestore Rules | Algolia query-only | Algolia settings | Docs only |
|------------|-------------------------|-----------|-----------------|--------------------|------------------|-----------|
| A | Yes (1.0.4) | No | No | Yes (`tagFacetKeys`) | **No** (default) | Facet meaning |
| B | Yes (1.0.4) | No | No | Yes | No unless B3 | — |
| C | No | No | No | No | No | **Yes** (owner accepted) |
| D | Yes (AI Review seed) | **Yes** (pipeline) | No | No | No | DATA_MODEL / ADR D8-A |
| E | Yes (permission UI) | **Yes** (promote / enqueue / reset) | **Yes** (`settings/showQueue` tighten to OA) | No | No | ADR-FP-085 amend + helper processing ADR |

Do **not** hide Functions or Rules inside Studio release notes as if it were installer-only.

---

## Human Checkpoints Anticipated

- [x] Formal Review approval of this Plan
- [x] AI eight-tag **D8-A owner-approved** (2026-08-12)
- [x] C documentation-only **owner-accepted** (no new import numeric cap unless Review proves defect)
- [x] Algolia index-settings mutation (only if Review chooses B3 / companion facet or rejects `tagFacetKeys`)
- [x] DEV Functions deploy (D + E)
- [x] Production Functions deploy (D + E)
- [x] Firestore Rules production deploy (E Show Queue settings tighten) — human approval
- [x] Studio patch package/publish **1.0.4** (A/B/D UI/E) — `studio-release.yml` from **production**, `stable`, `internal-unsigned`
- [x] Manual helper-account QA (E) + Design Library / AI tag QA (A/B/D)
- [x] Reduced production re-smoke + final Prefinal A–H signoff

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Scope creep into library redesign | High | A+B = routing + facets only |
| Implementing before Review | Critical | This document is Plan-only until Formal Review |
| Algolia settings assumed allowed | High | Default path is query-only |
| Portal limits copied into Studio | High | C table + explicit non-copy |
| AI form seed drops human tags after server subtract | High | Required UI union |
| Helper accidentally becomes admin | Critical | Capability matrix + Show Queue settings split + ADR-FP-088 untouched |
| Expanding enqueue/promote without Rules showQueue tighten | High | Bundle E Rules tightening with permission expansion |
| Production/dev lineage drift at Implement | Medium | Re-fetch tips before branch |
| Studio 1.0.3 smoke still open | Medium | This corrective gates final signoff; do not start Phase 9 |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

| Component | Rollback |
|-----------|----------|
| Studio 1.0.4 | Stop distributing; keep 1.0.3 |
| Functions D/E | Redeploy previous AI enrichment / promote / enqueue / reset revisions |
| Firestore Rules E | Redeploy prior rules (note: restores helper `settings/showQueue` write) |
| Docs C | Revert doc commit |
| Algolia | No settings change in default path — nothing to roll back |
| Data | No migration |

---

## Documentation Updates Required

- [ ] DATA_MODEL.md — AI existing-tag reconciliation; **D8-A** eight-tag meaning
- [ ] BACKEND.md — Studio Algolia facet counts; Imports limit table; helper processing + Show Queue settings gate
- [ ] TESTING.md — new test files/commands if added (A/B/D/E)
- [ ] DEPLOYMENT.md — 1.0.4 + Functions + Firestore Rules sequencing
- [ ] DECISIONS.md — ADR for **D8-A**; amend ADR-FP-085 (Show Queue settings OA; helper AI processing); helper≠admin note
- [ ] SECURITY.md — helper capability boundary if required
- [ ] STYLE_GUIDE.md — only if Load More / tag modal copy changes
- [x] Other: this Plan; Formal Review; Implement/test/signoff artifacts later

---

## Branch / release strategy

Matches `DEPLOYMENT.md` hotfix workflow:

1. At Implement start: `git fetch origin`; confirm tips.
2. Branch from **`origin/production`**: e.g. `hotfix/studio-smoke-corrective-a-e`.
3. PR → **`production`** (protected; no direct push).
4. After merge: sync into **`development`** via PR (no force-push). Re-check ancestry.
5. Studio publish: `studio-release.yml` **Use workflow from: production**, ref `production`, `stable`, `internal-unsigned` → **1.0.4**.
6. Functions: scoped DEV then production (D pipeline + E promote/enqueue/reset) via `safe-backend-change` + human checkpoint.
7. Firestore Rules: DEV then production for `settings/showQueue` tighten + human checkpoint.

No push/merge/deploy during Plan/Review.

---

## Open Questions

- [x] Eight-tag vs human tags: **D8-A APPROVED** (2026-08-12).
- [x] C documentation-only: **owner accepted**.
- [x] Formal Review: confirm A+B shared managed source; needsCompanion B1/B2 (B3 out of default); E capability expansion + Show Queue settings split.
- [ ] None other blocking A–E scoping.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-11-studio-production-smoke-corrective-plan-review.md`
- Verdict: **approved_with_changes** (owner map: PASS WITH REQUIRED CHANGES) — 2026-08-12
- Implement must apply Review Required Changes 1–6; no Plan re-review if scope unchanged.

---

## Acceptance criteria (future implementation)

### A. Tag counts

- Before Load More, ready tag counts match intended complete ready scope (Algolia `tagFacetKeys`), not only hydrated cards.
- Loading another ordinary browse page does not change a tag’s count merely because more cards entered memory.
- Search still finds designs outside the first browse page.
- No eager full-catalog Firestore hydration.
- Tag/category/halftone behavior preserved; needsCompanion facet limitation explicit.
- Missing Algolia env fails closed.

### B. Load More

- Unfiltered bounded browse keeps Firestore Load More.
- Filtered/search result with no further **matching** Algolia page: no actionable Load More.
- Further matching pages: Load More works.
- Clear filters restores ordinary browse.
- No duplicate cards / ordering regression.
- Query change cannot leave a stale Load More.

### C. Imports

Owner answer is the constraint table above (documentation). No new Studio numeric limit unless a proven safety defect requires one.

### D. AI assigned-tag awareness

- Re-run preserves `designs.tags`.
- Exact and alias-equivalent duplicates not suggested; not in `suggestedNewTags`.
- Additional relevant new tags still allowed (up to **8 new** under **D8-A**).
- Category uses final intended tag signal (existing ∪ new).
- Rerank / author / exclusions / halftone intact.
- Human tags never removed to satisfy the AI 8-tag ceiling.
- Design-level tag max (**20**) unchanged.
- No full-taxonomy prompt injection; no migration.

### E. Helper operational processing

- Helper can Send eligible Uploaded Designs to AI; retry processing; full AI Review operational edit/approve/reject/rerun.
- Helper cannot manage users, owner-only settings, taxonomy admin, secrets, Test Data Reset, Whatnot Import Shows, delete-eligible uploads, restore designs, or **Show Queue settings**.
- Direct Show Queue settings write unauthorized for helper (UI + service + Rules).
- Owner/Admin unchanged; customer unchanged; ADR-FP-088 Assisted Creation helper read-only unchanged.
- No button that appears enabled then fails with `permission-denied` for allowed helper actions.

---

## Verification strategy (post-approval)

1. Plan (this doc)  
2. Formal Review  
3. Owner implementation authorization  
4. Implement locally on hotfix from production  
5. Localhost Studio first  
6. DEV Functions / Rules / Algolia (dev index only) as needed  
7. Owner QA including **helper account**  
8. Protected PR  
9. Production promotion only after explicit approval (Rules + Functions + Studio sequenced)  
10. Studio 1.0.4 package/publish  
11. Reduced production re-smoke  
12. Final Prefinal A–H signoff  

Do not jump from Implement to production.
