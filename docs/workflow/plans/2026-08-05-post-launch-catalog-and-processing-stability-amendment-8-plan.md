# Amendment 8 Plan: Snapshot Removal + Scalable Portal Catalog Read Architecture

| Field | Value |
|---|---|
| Date | 2026-08-05 (scalable-read addendum same day) |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 (open; **unmerged**) |
| Phase | Amendment 8 — **Plan + Formal Review only. No implementation.** |
| Current HEAD | `76dc046178be73c442dfe97b13b990b42e512e29` |
| Prior baseline | Snapshot-removal rebuild from independent audit; this pass adds the scalable read/search architecture addendum |
| Handoff package | `references/project-chatgpt-handoff/` **is present** (tracked; includes `CURRENT-STATE.md`). This planning pass does **not** update handoff files — Plan/Review docs only. |

**Implement is not authorized by this Plan.** No application source, tests, provider accounts, secrets, Firebase, Git mutation, merge, or deploy in this planning pass. This file is updated **in place** (no duplicate Amendment 8 Plan).

---

## 0. Why this addendum exists

Owner binding (CURRENT-STATE OVERRIDE):

1. AI Processing monotonic reconciliation repair is **signed off** (owner live QA **PASS**) at HEAD `76dc046`.
2. AI Processing remains **KEEP CURRENT** and **untouched** during Amendment 8.
3. The **2,000-design browser hydration service is rejected** as the permanent search/facet solution.
4. Generated snapshot architecture must still be **fully removed**, but only after replacement Firestore/search paths pass QA while the **deployed snapshot backend remains available** for rollback.
5. Firestore remains authoritative catalog metadata; Firebase Storage remains authoritative image/file store.
6. Metadata reads and Storage image downloads must be planned and measured **separately**.

The prior rebuild still stands for: 75-path matrix, Electron/AuthProvider teardown, ordinary FS gate cutover, Discover home wiring, Open Graph FS replacement, and staged retirement. This addendum **replaces** the hydration-as-permanent-search design and closes obsolete AI live-QA wording.

---

## 1. Final Gate — authorization status

| Gate | Status |
|---|---|
| Snapshot Git archaeology | Verified (§2) |
| AI Processing | **KEEP CURRENT** — **SIGNED OFF** at `76dc046` (§3) |
| 75-path one-file-per-row matrix | Revalidated at HEAD `76dc046` (§11–§12) |
| Portal ordinary / Discover cutover | Specified (§6–§7) |
| Scalable search (replaces §8 hydration) | Specified (§8) — **owner provider decision required for Phase 1B** |
| Open Graph replacement | Specified (§9) |
| Electron IPC + AuthProvider teardown sequencing | Specified (§5) |
| Rollout Stages 1–6 | Revised (§14) — **Implement Phase 1A / 1B**; snapshot backend live through Stage 3 QA |
| ADR-FP-120 supersession | Required at Implement (§1.1) |
| 2,000 hydration as permanent search | **REJECTED** |
| Production Function inventory | Stage 4 gate only — not a Stage 1 blocker (§14) |
| Provider account / secrets / billing | Later human checkpoints (§16); block **1B** only |

**Snapshot Functions, Rules, coordination documents, and generated Storage objects remain live through Stages 1–3.** Source cutover does not delete deployed Functions. **Portal generated search/facet readers stay until Phase 1B.**

### 1.1 Documentation supersession (required at Implement)

Accepted **ADR-FP-120** (generated Storage catalog read models as Portal search/browse architecture) is **superseded** by this Hybrid Plan (Firestore ordinary browse + managed search for text/multi-tag/facets; Storage for images only).

Same Implement workflow must update:

| Doc | Obligation |
|---|---|
| `docs/project/DECISIONS.md` | Supersede/amend **ADR-FP-120**; record Hybrid + managed-search decision |
| `docs/architecture/ARCHITECTURE.md` | Portal/Studio catalog read architecture |
| `docs/architecture/BACKEND.md` | Sync Functions, indices, env/secrets |
| `docs/standards/SECURITY.md` | Search-only keys, write-key never in client, index ≠ authz |
| `docs/architecture/DATA_MODEL.md` | If search records are documented as derived entities |

Planning pass does **not** edit those docs yet.

---

## 2. Required Git findings (independently verified)

| # | Finding | Value |
|---|---|---|
| 1 | Snapshot introduction | `b45542ab66a9f6fafb1142201b29fc6d7a969376` (single non-merge parent; squash of accumulated work onto master) |
| 2 | Pre-snapshot donor (sole parent) | `02519a52a4c4b6d29569902488c49d7e8c0e89b9` — zero snapshot paths |
| 3 | Donor Portal / Studio / AI taxonomy | Firestore-backed Portal catalog; no `useGeneratedReadyDesigns`; AI taxonomy via `functions/src/ai/loadAiEnrichmentSettings.ts` (`adminDb` only) |
| 4 | Background AI queue origin | `55c5c02bf7bc95fad49444ce3c9bcb4350bec573` — ancestor of donor |
| 5 | Practical first-bad AI race | `13a1099a2e6b78becf4b3c62be60cf5471683797` — unconditional `reloadDesigns()` per terminal event |
| 6 | First patch-based AI fix | `6c471705726ea78dcb75a516c17d7be1464f9704` — `reconcileBackgroundAiQueueEvent` + `applyDesignPatch` + generation guard |
| 7 | Monotonic reconciliation repair | Implement `30e1e28`; signoff docs `76dc046` — owner live QA **PASS** |
| 8 | Current HEAD | `76dc046178be73c442dfe97b13b990b42e512e29` |
| 9 | AI vs snapshots | Independent for queue/reconcile code. Taxonomy UI may call `useGeneratedDesignLibraryTaxonomy` without sharing the race mechanism. |

Donor commit is **read-only evidence only**. Implementation base remains current HEAD. No `git restore --source=<donor>`, no whole-file restoration from older SHAs.

---

## 3. AI Processing — KEEP CURRENT / SIGNED OFF

### 3.1 Closure

| Item | Status |
|---|---|
| Signoff | `docs/workflow/reviews/2026-08-05-ai-processing-monotonic-reconciliation-repair-signoff.md` |
| Owner live QA | **PASS** (2026-08-05) |
| Implement commit | `30e1e28` |
| Signoff commit | `76dc046` |

The prior “pending live AI QA” Amendment 8 blocker is **CLOSED**. Do **not** re-plan, re-investigate, retest, or modify AI Processing during Amendment 8.

### 3.2 Source action

**KEEP CURRENT** (do not touch) for:

- `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts` (+ sequencing tests)
- `apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.ts` (+ tests)
- `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` (patch / generation / **monotonic ledger**)
- `apps/studio/src/renderer/src/features/ai-review/utils/monotonicAiProcessingListMerge.ts` (+ tests)
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts`
- Amendment 4–7 / monotonic repair regression tests listed in §11
- AI queue trace infrastructure under `apps/studio/electron/ipc/aiQueueTrace/**`

Snapshot removal **must not** modify queue/reconciliation behavior, observer patch-primary path, `pendingAdvanceIndexRef`, `applyDesignPatch` / generation-counter / monotonic merge semantics.

### 3.3 Taxonomy vs processing

`useAiReviewInbox.ts` and `AiReviewPage.tsx` import `useGeneratedDesignLibraryTaxonomy` for **UI autocomplete / category filter options only**. That is not the background queue. See §4 for the in-place taxonomy contract that keeps these two files **KEEP CURRENT**.

---

## 4. Studio taxonomy hook — preserve public contract (classification change vs audit)

### 4.1 Source inspection

`useGeneratedDesignLibraryTaxonomy(user): TaxonomyState` returns `{ categories, tags, isLoading, isUnavailable, status }`.

Call sites:

| File | Usage | Snapshot-specific branching beyond the hook? |
|---|---|---|
| `useAiReviewInbox.ts` | `approvedTags: generatedTaxonomy.tags` | **No** |
| `AiReviewPage.tsx` | `categories`, `status: taxonomyStatus` | **No** |
| `DesignLibraryPage.tsx` | `usingGeneratedCatalog = !includeArchived`; switches categories/tags between generated hook vs Firestore hooks; `getDesignLibraryFirestoreLoadPolicy({ usingGeneratedCatalog, generatedTaxonomyStatus, ... })`; generated-unavailable error messaging | **Yes — MANUAL EDIT required** |

### 4.2 Preferred design (this Plan)

**REPLACE WITH CURRENT FIRESTORE SERVICE** on `useGeneratedDesignLibraryTaxonomy.ts` by rewriting **internals only**:

- keep export name `useGeneratedDesignLibraryTaxonomy`;
- keep `TaxonomyState` return shape;
- replace `studioCatalogAssetService.loadClientTaxonomy()` with Firestore-backed `categoryService` / `catalogTagService` (or existing hooks’ service layer) for active/approved display taxonomy;
- remove `generatedReadyDesignMapping` client-snapshot mappers once unused;
- rename the hook only in a later cleanup, not this cutover.

### 4.3 Matrix impact vs independent audit

| Path | Audit action | This Plan action | Reason |
|---|---|---|---|
| `useAiReviewInbox.ts` | MANUAL EDIT CURRENT HEAD | **KEEP CURRENT** | Public hook contract preserved; no other snapshot branching |
| `AiReviewPage.tsx` | MANUAL EDIT CURRENT HEAD | **KEEP CURRENT** | Same |

Mechanical totals therefore differ from the audit’s 13 KEEP / 25 MANUAL:

**15 KEEP · 35 DELETE · 23 MANUAL EDIT · 2 REPLACE · 0 NEEDS REPO CHECK · 75 TOTAL**

### 4.4 DesignLibraryPage.tsx — exact MANUAL EDIT CURRENT HEAD

Current HEAD (evidence):

- `usingGeneratedCatalog = !includeArchived` (line ~207)
- `useGeneratedDesignLibraryTaxonomy(usingGeneratedCatalog ? user : null)` (line ~208)
- `getDesignLibraryFirestoreLoadPolicy({ generatedTaxonomyStatus, requiresFullCategoryManagementData: isCategoryModalOpen, usingGeneratedCatalog })` — when `usingGeneratedCatalog`, `loadTags: false`, categories only if management modal needs full data (lines ~29–33 of `designLibraryFirestoreLoadPolicy.ts`)
- `categories` / `catalogTags` ternary between generated vs Firestore (lines ~231–232)
- load/error UI that prefers generated taxonomy unavailable messaging when `usingGeneratedCatalog` (lines ~637–645)

Required Stage 1 edits at current HEAD:

1. Stop treating normal browse as “generated catalog mode.” After the taxonomy hook is Firestore-backed, normal browse must not depend on generated Storage success/failure for categories/tags.
2. Update `getDesignLibraryFirestoreLoadPolicy` call sites / policy so archived management still loads full Firestore taxonomy when needed, without a generated-first branch for normal browse.
3. Remove generated-unavailable messaging that assumes Storage snapshot failure.
4. Keep design **list** path on `useDesigns` / `loadReadyDesignPage: true` (already Firestore-authoritative since Amendment 1) — do not reintroduce `useGeneratedReadyDesigns` for Design Library list.
5. Update `designLibraryAuthoritativeSource.test.ts` and `firestoreRouteContainment.test.ts` assertions that currently require `useGeneratedDesignLibraryTaxonomy` as a *generated* primary source.

---

## 5. Teardown sequencing (Studio)

### 5.1 Session override (AuthProvider first)

Atomic Stage 1 source change (same commit / same PR land unit):

1. **MANUAL EDIT** `AuthProvider.tsx`: remove `studioGeneratedCardOverrideService` import and `setSessionScope(...)` call; **preserve** `clearStudioTaxonomyCaches()`, auth subscribe, session bootstrap, persistence, and all unrelated auth behavior.
2. **DELETE** `studioGeneratedCardOverrideService.ts` + `.test.ts`.
3. **DELETE** `packages/shared/src/catalog-snapshots/catalogCardOverrides.ts` + `.test.ts` once no remaining imports (Studio override was the consumer).

Do not delete the override service while `AuthProvider` still imports it.

### 5.2 Electron catalog-asset IPC chain

Delete/edit order (after renderer consumers no longer call `studioCatalogAssetService` / `window.freshPrints.catalogAsset`):

1. Cut renderer consumers: REPLACE taxonomy hook internals; REPLACE/remove `useGeneratedReadyDesigns` snapshot path; DELETE `studioCatalogAssetService.ts`.
2. **MANUAL EDIT** `apps/studio/electron/preload.ts` — remove only `catalogAsset` bridge; preserve every unrelated preload API.
3. **MANUAL EDIT** `apps/studio/electron/main.ts` — remove only `registerCatalogAssetIpcHandlers` import/registration; preserve every unrelated IPC registration.
4. **DELETE** `catalogAssetIpcHandlers.ts`.
5. **DELETE** `catalogAssetIpcChannels.ts` + `.test.ts`.
6. **DELETE** `fetchCatalogAssetJson.ts` + `.test.ts` (host allowlist was for generated-asset fetch only).
7. **DELETE** `packages/shared/src/types/catalogAsset/catalogAssetIpc.types.ts` once no imports remain.

Verification: Studio main/preload typecheck/build; grep shows zero `catalogAsset` / `fetchCatalogAssetJson` / `generated/portal-catalog` fetch paths in active Studio runtime.

### 5.3 Dev console

1. **MANUAL EDIT** `AppShell.tsx` — remove `installCatalogSnapshotAdminConsole` import + `useEffect`.
2. **DELETE** `catalogSnapshotAdminService.ts`.
3. **MANUAL EDIT** `freshPrintsDevConsole.types.ts` — remove only `rebuildCatalogSnapshots?` and its type import; **keep** `backfillPrintRequestQueueTab?` and print-request types.

### 5.4 Assisted Creation

1. **REPLACE** `useGeneratedReadyDesigns.ts` with Firestore pagination-to-exhaustion (or equivalent complete ready index) — must not silently truncate to one page.
2. **MANUAL EDIT** `useReadyDesignsForAssistedCatalogPicker.ts` only if import/API changes (prefer keep calling the same hook name if REPLACE is in-place on internals + contract; if export removed, update import).
3. **MANUAL EDIT** `assistedCatalogPickerBrowseContract.test.ts`.
4. **DELETE** `generatedReadyDesignLoad.ts` + test, `generatedReadyDesignMapping.ts` + test after last importer gone.

---

## 6. Portal ordinary Firestore cutover (`useCatalogDesigns.ts`)

### 6.1 Current defect (must not be papered over)

`allowsBoundedCatalogFirestoreFallback` (`useCatalogDesigns.ts:92-98`) returns true only when there is **no** `categoryId`, **no** `searchQuery`, **no** tags, and **no** `discoveryMode`.

Consequences at current HEAD:

- With generated flag on and asset failure: category / single-tag / discovery / search / multi-tag **hard-error**.
- With generated flag off: same shapes **hard-error** (`233-240`), except unfiltered browse.

**Claiming “Firestore fallback already works for every route” is false.** Stage 1 must edit this file.

### 6.2 Exact Stage 1 changes

1. **Rewrite `allowsBoundedCatalogFirestoreFallback`** (or replace the gate) so the following are allowed on the bounded Firestore path without requiring generated assets:
   - unfiltered browse;
   - single `categoryId`;
   - single primary tag (`array-contains`);
   - `discoveryMode` sorts that map to existing `listReadyDesignsPage` / `listReadyDesignsPageWithSortFallback` sort fields (`createdAt` / `requestCount` / `favoriteCount` / `lastAddedToShowAt` as already used by server query builders).
2. Route those shapes through **`catalogService.listReadyDesignsPageWithSortFallback`** with existing:
   - `status == 'ready'`;
   - stable cursor pagination (`limit` + `startAfter`);
   - existing index-fallback chain inside `listReadyDesignsPageWithSortFallback`.
3. Preserve ready ordering semantics already intended by Amendment 3: client/default browse prefers `readyAtMs ?? createdAtMs` where the product requires it; document any remaining FS `orderBy('createdAt')` vs `readyAt` mismatch and either (a) switch query to `readyAt` where indexes exist, or (b) keep `createdAt` query with explicit product note — indexes for `status+readyAt` already exist.
4. Flag-off / snapshot-deleted behavior must **not** hard-error valid category, single-tag, or discovery queries.
5. Search and multi-tag (`selectedTags.length > 1`) do **not** use this ordinary path — they use **§8 managed search** (not client hydration).
6. Remove `generatedPortalCatalogEnabled()` branches and `portalCatalogAssetService` calls from ordinary paths after replacements work.
7. Update `useCatalogDesigns.test.ts`.

### 6.3 `catalogService.ts`

**MANUAL EDIT CURRENT HEAD**:

- Remove snapshot-first bodies for methods that already have bounded Firestore implementations (`listReadyDesignsPage`, `listReadyDesignsPageWithSortFallback`, `getReadyDesignsByIds`, `countReadyDesigns`, `listActiveCategories`, etc.).
- Reimplement `listApprovedTags` / `listNarrowedApprovedTags` via **§8 managed search facets** (no per-tag `getCountFromServer`; no 2,000 client hydrate).
- Keep `listHomeDiscoveryPool` as the Discover-home backend (§7) — it is **not** already wired to UI.
- Keep `listAllReadyDesigns(maxDesigns = 2000)` as a **legacy/emergency ceiling tool only** — not a customer browse or facet API.
---

## 7. Portal Discover home cutover

### 7.1 Current behavior

`useCatalogHomeDesigns` (`useCatalogDesigns.ts:430+`) calls **only** `portalCatalogAssetService.listDiscoverDesigns()`. On generated failure or flag-off it **throws** “Catalog discovery is temporarily unavailable.”

`catalogService.listHomeDiscoveryPool` (lines 408–461) exists (four bounded pages, merge-by-id, index fallback) but is **unused by UI**.

### 7.2 Explicit replacement

Stage 1 **MANUAL EDIT** of `useCatalogHomeDesigns`:

1. Call `catalogService.listHomeDiscoveryPool()` as the sole data source.
2. Preserve New / Popular / Most Liked / Recent ranking via existing client ranking helpers applied to that bounded pool (same product behavior as today’s discover-pool ranking, without Storage).
3. Preserve bounded pools (no unbounded scan).
4. Preserve friendly error handling for genuine fetch/index failures — do **not** treat “generated disabled” as unavailable.
5. Update tests; category rails on home continue to derive from the home pool + categories list.

Do **not** describe `listHomeDiscoveryPool` as already wired.

---

## 8. Scalable search architecture (REPLACES 2,000 hydration)

### 8.1 Binding rejection

The proposed **2,000-design browser hydration service is rejected** as the permanent search/facet solution. Silent truncation and inaccurate facets are forbidden. Prior rebuild §8.4 Option C (fund a different architecture) is adopted for text search, multi-tag AND, and facets.

`listAllReadyDesigns(maxDesigns = 2000)` remains a legacy/emergency tool only.

### 8.2 Options compared

| Option | Summary | Verdict |
|---|---|---|
| **1 — Hybrid (recommended)** | Bounded Firestore for ordinary browse/category/single-tag/discovery; managed search for text, multi-tag AND, exact + narrowed facets; Firestore for detail/mutations; Storage for images; Studio Firestore-first | **Recommend** |
| **2 — Managed index for all Portal grids** | Index supplies all Portal grids; Firestore for detail/validation/mutations; Studio Firestore | Viable; higher sync surface |
| **3 — Firestore-only scalable** | No managed index | **Reject** — cannot truthfully provide full-text + multi-tag AND + accurate facets at 10k–50k without hydration or incomplete counts |
| **4 — Other managed index** | Typesense Cloud / Meilisearch Cloud | Acceptable if owner prefers; same contracts |

No Algolia/Typesense/Meilisearch dependency exists in the repo today. Prefer **repository-owned sync Functions**. Do not adopt the Firebase Algolia Extension without separate lifecycle review.

### 8.3 Recommended architecture — Option 1 Hybrid

| Concern | System |
|---|---|
| Portal ordinary grid/card browse | Bounded Firestore (`status==ready`, page size **40**) |
| Category / single-tag / discovery list sorts | Firestore |
| Discover home pool | Firestore `listHomeDiscoveryPool` (page size **80** × 4) |
| Multi-tag AND / text search / facets + narrowed counts | Managed search index |
| Favorites membership | Firestore favorites services; no per-card scans |
| Design details / request validation | Authoritative Firestore |
| Images | Firebase Storage (`getDownloadURL` + `<img>`); **no Firestore** |
| Studio Design Library / taxonomy / Assisted picker | Firestore only |

**First-page FS (cold ordinary browse):** ~1 `getDocs` (≤41) + optional 1 cached `getCountFromServer` + bounded taxonomy — **0** per-card `getDoc`.  
**Warm return:** stable query-key page cache + shared in-flight Promise (patterns already in `portalCatalogAssetService.inflightByPath` / Studio `designPageCache` 15s TTL).  
**Search requests:** one per submit / multi-tag / facet refresh (debounce typing); hit page size aligned to 40.

Why Hybrid: reuses existing FS indexes for ordinary browse; puts only FS-weak operations on the vendor; browse can continue if search is down; avoids rejected full-catalog hydration.

### 8.4 Preferred provider (owner decision)

**Planning recommendation: Algolia** (Typesense Cloud acceptable alternative): JS/TS clients, facets + narrowed counts, AND filters, typo tolerance, search-only public keys with provider HTTP-referrer / app allowlists where supported, write/Admin keys **only** in Secret Manager and **never** in Portal/Studio client bundles, separate dev/prod indices. Index documents are **not** an authorization boundary. Document new env/secrets in `BACKEND.md` / `SECURITY.md` in the same Implement workflow. **No account/key/index/billing in this planning pass.**

### 8.5 Public search-record contract (minimum)

Include only public card/list/search/facet fields: `objectID`, title, search text from title, categoryId + display name, tags, readyAt/createdAt ms, thumbnailPath (+ previewPath if needed), artworkBackgroundHex, card dimensions only if shown without detail fetch. Popularity fields only if required for search ranking (browse sorts stay on Firestore under Hybrid).

**Never include:** originals, PII, private notes, print-request/customer-upload private fields, AI prompts/raw/internal stages, secrets, non-ready designs, auth claims, private Storage paths.

Only `status == ready` designs are indexed. Index membership is **not** an authorization boundary — trusted actions always validate Firestore (§8.7–8.9).

Write/Admin API keys **never** ship in Portal or Studio client bundles. Customer-facing keys are search-only and restricted (HTTP referrer / allowed apps) where the provider supports it.

### 8.6 Synchronization contract

Enter ready → upsert; public field change while ready → update; leave ready/archive/delete → delete; idempotent retries; out-of-order version guard; sync must not block FS writes; observable failures; reconciliation for missing/extra/stale; dry-run + resumable backfill; rebuild always from Firestore; index disposable. Prefer design `onWrite` → Admin sync Function. New paths: **`[NEEDS REPO CHECK]`** (suggested `functions/src/catalogSearch/**`).

### 8.7–8.9 Failure, stale index, authoritative validation

- Search/provider down: ordinary FS browse continues; search/facets show explicit unavailable — **no silent empty success / inaccurate full-catalog counts**.
- Index says ready but FS does not: reject for detail/request; drop after authoritative check.
- Ready in FS but missing from index: may be absent from search temporarily; FS browse still works; reconcile.
- Trusted actions always validate Firestore; never authorize from index alone.
- Short-lived detail cache OK if fail-closed for mutations.

### 8A. Current Portal read accounting (source)

Independent traces ([Portal catalog read paths](1222827d-efa0-4d57-8e94-8321754a1948), [Snapshot matrix + search options](e17196e0-9490-475e-a2c6-20b1c6be1b44)) at HEAD `76dc046`:

Constants: page **40**; home pool API **80** (unused by UI); discover publish cap **≤160**; home rails **25**; by-id cache 5 min/250; favorites list cache 30s; sitemap 500 (SEO).

| Surface | Metadata today | Images |
|---|---|---|
| Homepage/Discover | Generated `listDiscoverDesigns` only (≤160); `listHomeDiscoveryPool` **unwired**; rails 25 | Storage via `thumbnailPath` |
| Unfiltered library browse | Same discover asset loaded **in full (≤160)**, then client `visibleCount` windows by **40** | Storage |
| Category / tag / discovery / search / multi-tag | Generated shards/ID assets + card buckets; FS hard-error if generated fails | Storage |
| Facets | Generated tag facet / narrowed assets | n/a |
| Favorites | Unbounded favorites subcollection + `getReadyDesignsByIds` (missing → `getDoc`) | Storage |
| Detail / share | In-memory card OR `getReadyDesignsByIds`; share may hit OG Function | Storage preview |
| Print-request reuse | Summaries via `getReadyDesignsByIds`; selection save uses per-id `getReadyDesign` | Storage |

**Image fetch ≠ Firestore read:** thumb → `useCatalogDerivativeUrl` → Storage `getDownloadURL` only.

**Current grid loading:** `CatalogSelectionCard` sets `prioritizeLoading` → **`loading="eager"`** on catalog grids today. Panel default is lazy only when not prioritized. Target remains visible/near-visible lazy (§8C–8E); Stage 1 must correct grid prioritization unless first-viewport eager is deliberately bounded and measured.

Also today: **no search debounce**; generated JSON `inflightByPath` + 30s manifest TTL + 16 MiB cache; home hook lacks list-level Promise share; `getCountFromServer` / `listHomeDiscoveryPool` unused by UI.

### 8B. Current Studio read accounting (source)

Independent trace ([Studio catalog read paths](8146d7de-63a4-49ee-9964-93fa1e47c2d7)) at HEAD `76dc046`:

| Surface | Behavior |
|---|---|
| Design Library list | Firestore-only `useDesigns` — page **100**, peek ≤101, caches **15s**; **no** `loadAll`; **no** ready-index |
| Taxonomy (normal) | Generated Storage only |
| Taxonomy (archived) / Tag management | Firestore; tags paged **500→full corpus**; categories list **200**; taxonomy cache **12h** |
| Assisted picker | **Full** generated ready-index + buckets for ≤**80** visible IDs; FS page-100 fallback → REPLACE |
| AI Review | Taxonomy only KEEP CURRENT; processing separate |
| Idle | No Library catalog listeners/poll; taxonomy effect `[user]` only; taxonomy reload does **not** force list reload |
| Firebase Debug | Separates one-shots, listeners, callables, Storage classes, cache hit/miss, generated fallbacks |

Studio stays Firestore-authoritative after snapshot removal. No Portal search index required for Studio.

### 8C–8E. Desired contracts

Portal: first page = visible + small buffer (40) — **not** a ≤160 discover dump + client window; cursor pages; no full hydrate; no per-card `getDoc`; query-key cache + shared Promise; search debounce; next page near end; no silent incomplete facets. Studio: bounded FS; no snapshots; Assisted must not require full generated ready-index and must not silently truncate; no per-card listeners; no reload storms; immediate ready visibility. Images: Storage only; prefer native lazy below-fold (bounded first-viewport eager OK if measured); preserve artwork BG / error / transparency; no originals in grids; measure URL resolve vs byte download separately; no abandoned single-display-derivative revival without independent evidence.

---

## 8Z. After cutover deletions (search/facets consumers)

**Gate:** DELETE `portalCatalogAssetService.ts` (+ test) and `catalogSnapshotFlags.ts` only in **Implement Phase 1B** after managed-search consumers fully replace generated search/multi-tag/facets — **not** as part of Phase 1A ordinary FS/Discover/OG/Studio taxonomy land. Publisher source DELETE / un-export (§10) must not remove Portal generated **readers** before that gate.

---

## 9. Portal Global Open Graph

**MANUAL EDIT CURRENT HEAD** `functions/src/getPortalGlobalOpenGraph.ts` (+ test):

1. Replace Storage `generated/portal-catalog/manifest.json` + recent shard read with two Admin Firestore queries:
   - `status == 'ready'`, `orderBy readyAt desc`, `limit 40`;
   - `status == 'ready'`, `orderBy createdAt desc`, `limit 40`.
2. Merge by design ID; rank by `readyAt ?? createdAt` with **deterministic ID tie-break** (e.g. `id` desc, matching snapshot browse spirit).
3. Take top 40 candidates; call existing `pickLibraryOgRotatedIndex` unchanged.
4. Preserve: letterbox / `buildPortalOgShareImageFunctionUrl`; signed preview/thumbnail fallback; uploaded-logo branch; in-process TTL `PORTAL_GLOBAL_OPEN_GRAPH_CACHE_TTL_MS` (1h); HTTP `Cache-Control: public, max-age=300`.
5. Update accounting so `designDocumentsReturned` / `totalFirestoreDocumentReads` reflect real design docs (≤80 designs + settings), not hardcoded `0`.
6. Indexes: confirmed present in `firestore.indexes.json` for `status+readyAt` and `status+createdAt` — no new index required for this shape.
7. Tests: library path; legacy no-`readyAt` via createdAt query; merge/dedup; accounting; cache behavior.

---

## 10. Functions, exports, inventory, Rules

### 10.1 Stage 1 source vs Stage 4 live retirement

| Action | Stage |
|---|---|
| Un-export snapshot symbols from `functions/src/index.ts` (**MANUAL EDIT**) | After **Phase 1B** client search cutover (not during Phase 1A) — still source-only; live Functions remain until Stage 4 |
| DELETE snapshot publisher source + tests under `functions/src/catalogSnapshots/**` | Same gate as un-export: **after Phase 1B** search consumers live; Stage 1 source tree land unit that includes 1B, **not** 1A-only |
| DELETE `functions/scripts/retry-portal-catalog-publication-prod.mjs` | Same as publisher source (or Stage 4 with Functions) |
| DELETE Portal `portalCatalogAssetService` / `catalogSnapshotFlags` | **Phase 1B only** (§8Z) — keep generated search/facet readers through Phase 1A |
| Deployed Cloud Functions still serving traffic | **Remain until Stage 4** |
| Read-only `firebase functions:list` on **dev and prod** + owner approval | **Stage 4 gate** |

Deleting source / exports does **not** delete an already-deployed Function. Stage 4 retires live Functions only after inventory + approval. **Do not** remove Portal generated **readers** or un-export publishers in a Phase 1A land that still needs generated search/facets.

### 10.2 AI taxonomy Function

**MANUAL EDIT** `loadAiCatalogReferenceSnapshot.ts`: promote Firestore fallback to sole path; remove snapshot Storage primary. **KEEP** `aiEnrichmentRuntimeCache.ts` (60s layer).

### 10.3 Inventory tooling (do not delete capability)

**MANUAL EDIT** (prefer **Stage 5 cleanup**, not Stage 1 unless build breaks):

- `functions/src/inventoryCatalogImageStorage.ts`
- `packages/shared/src/utils/catalogImageStorageInventory.ts`
- `.test.ts`

Edit only generated snapshot-prefix accounting (`generated/catalog-reference`, `generated/portal-catalog`). Preserve original/preview/thumbnail inventory behavior.

### 10.4 Rules

**KEEP CURRENT** `storage.rules` and `firestore.rules` through Stages 1–4. Generated-path / `snapshotPublicationState` Rules edits only in **Stage 5** after rollback window.

---

## 11. Physical-file action matrix (one path per row)

Columns: Exact physical path | File type | Current purpose | Runtime or test | Snapshot dependency | Protected newer behavior | Exact action | Replacement or deletion evidence | Required future verification

Action values **only**: KEEP CURRENT · DELETE SNAPSHOT-ONLY · MANUAL EDIT CURRENT HEAD · REPLACE WITH CURRENT FIRESTORE SERVICE · NEEDS REPO CHECK

| Exact physical path | File type | Current purpose | Runtime or test | Snapshot dependency | Protected newer behavior | Exact action | Replacement or deletion evidence | Required future verification |
|---|---|---|---|---|---|---|---|---|
| `apps/studio/src/renderer/src/features/designs/hooks/useGeneratedDesignLibraryTaxonomy.ts` | hook | Generated taxonomy loader | runtime | yes | no | REPLACE WITH CURRENT FIRESTORE SERVICE | In-place Firestore internals; keep public contract (§4) | Active/approved taxonomy parity |
| `apps/studio/src/renderer/src/features/designs/services/catalogSnapshotAdminService.ts` | debug/admin | rebuildCatalogSnapshots console | runtime | yes | no | DELETE SNAPSHOT-ONLY | After AppShell edit | — |
| `apps/studio/src/renderer/src/features/designs/services/freshPrintsDevConsole.types.ts` | type | Dev console types | runtime | partial | print-request backfill types | MANUAL EDIT CURRENT HEAD | Remove rebuild member only | Keep backfill types |
| `apps/studio/src/renderer/src/features/designs/services/studioCatalogAssetService.ts` | service | Studio generated asset fetch | runtime | yes | no | DELETE SNAPSHOT-ONLY | After consumers + IPC teardown | — |
| `apps/studio/src/renderer/src/features/designs/services/studioGeneratedCardOverrideService.ts` | service | Session card overrides | runtime | yes | field-name only | DELETE SNAPSHOT-ONLY | After AuthProvider edit | — |
| `apps/studio/src/renderer/src/features/designs/services/studioGeneratedCardOverrideService.test.ts` | test | Override tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `apps/studio/src/renderer/src/features/designs/utils/generatedReadyDesignMapping.ts` | util | Design↔card mapping | runtime | yes | field-name only | DELETE SNAPSHOT-ONLY | After last importer gone | — |
| `apps/studio/src/renderer/src/features/designs/utils/generatedReadyDesignMapping.test.ts` | test | Mapping tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `apps/studio/src/renderer/src/features/designs/utils/generatedReadyDesignLoad.ts` | util | Generated-first load helper | runtime | yes | no | DELETE SNAPSHOT-ONLY | Only used by useGeneratedReadyDesigns | — |
| `apps/studio/src/renderer/src/features/designs/utils/generatedReadyDesignLoad.test.ts` | test | Load helper tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `apps/studio/src/renderer/src/features/designs/hooks/useGeneratedReadyDesigns.ts` | hook | Assisted ready-design source | runtime | yes | no | REPLACE WITH CURRENT FIRESTORE SERVICE | Pagination-to-exhaustion / useDesigns-equivalent | No silent page-1 truncate |
| `apps/studio/src/renderer/src/features/customer-requests/hooks/useReadyDesignsForAssistedCatalogPicker.ts` | hook | Assisted picker | runtime | yes | no | MANUAL EDIT CURRENT HEAD | Import/API if needed | Completeness |
| `apps/studio/src/renderer/src/shared/components/AppShell.tsx` | component | Installs snapshot admin console | runtime | yes | no | MANUAL EDIT CURRENT HEAD | Remove install call | — |
| `apps/studio/src/renderer/src/features/auth/context/AuthProvider.tsx` | component | Sets override session scope | runtime | yes | auth unrelated | MANUAL EDIT CURRENT HEAD | Remove override only; keep clearStudioTaxonomyCaches | Auth QA |
| `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` | component | Generated vs Firestore taxonomy branching | runtime | yes | list already Firestore | MANUAL EDIT CURRENT HEAD | §4.4 exact branches | Taxonomy + archived mode |
| `apps/studio/src/renderer/src/features/designs/hooks/studioDesignLibraryNewestFirst.test.ts` | test | Ordering vs generated fallback | test | yes | no | MANUAL EDIT CURRENT HEAD | Update assertions | — |
| `apps/studio/src/renderer/src/features/designs/utils/readyOrder.test.ts` | test | readyAt ordering | test | reference | readyAt | KEEP CURRENT | — | Re-run |
| `apps/studio/src/renderer/src/features/designs/pages/designLibraryAuthoritativeSource.test.ts` | test | List Firestore-authoritative | test | yes | no | MANUAL EDIT CURRENT HEAD | Taxonomy assertions after REPLACE | — |
| `apps/studio/src/renderer/src/features/print-requests/services/printRequestQueueTabBackfillAdminService.ts` | service | Unrelated backfill | runtime | comment only | no | KEEP CURRENT | — | Out of scope |
| `apps/studio/src/renderer/src/features/print-requests/services/printRequestQueueTabBackfillAdminService.test.ts` | test | Backfill tests | test | comment only | no | KEEP CURRENT | — | — |
| `apps/portal/features/catalog/components/CatalogTagFilterModal.tsx` | component | Tag facets via generated assets | runtime | yes | no | MANUAL EDIT CURRENT HEAD | Managed search facets (§8 Hybrid) | Exact/narrowed facets |
| `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` | hook | Browse/filter/search/home | runtime | yes | discovery ranking | MANUAL EDIT CURRENT HEAD | §§6–7 FS ordinary + §8 search | All Portal modes |
| `apps/portal/features/catalog/hooks/useCatalogDesigns.test.ts` | test | Hook tests | test | yes | no | MANUAL EDIT CURRENT HEAD | — | — |
| `apps/portal/features/catalog/services/catalogService.ts` | service | Snapshot + FS catalog | runtime | yes | bounded FS | MANUAL EDIT CURRENT HEAD | Promote FS ordinary; facets via managed search | — |
| `apps/portal/features/catalog/services/catalogService.test.ts` | test | Service tests | test | yes | no | MANUAL EDIT CURRENT HEAD | — | — |
| `apps/portal/features/catalog/services/catalogSnapshotFlags.ts` | flag | generatedPortalCatalogEnabled | runtime | yes | no | DELETE SNAPSHOT-ONLY | Phase 1B after search rewire (§8Z) | Delete last |
| `apps/portal/features/catalog/services/portalCatalogAssetService.ts` | service | Portal generated assets | runtime | yes | no | DELETE SNAPSHOT-ONLY | Phase 1B after search rewire (§8Z) | — |
| `apps/portal/features/catalog/services/portalCatalogAssetService.test.ts` | test | Asset tests | test | yes | no | DELETE SNAPSHOT-ONLY | Phase 1B (§8Z) | — |
| `functions/src/getPortalGlobalOpenGraph.ts` | HTTP fn | OG from Storage recent shard | runtime | yes | letterbox/logo/cache | MANUAL EDIT CURRENT HEAD | §9 dual Admin query | Accounting |
| `functions/src/getPortalGlobalOpenGraph.test.ts` | test | Cache/accounting | test | yes | no | MANUAL EDIT CURRENT HEAD | Library path tests | — |
| `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` | service | AI taxonomy snapshot-first | runtime | yes | FS fallback | MANUAL EDIT CURRENT HEAD | Promote fallback | Dedup/TTL |
| `functions/src/ai/aiEnrichmentRuntimeCache.ts` | service | 60s enrichment cache | runtime | indirect | no | KEEP CURRENT | — | — |
| `functions/src/catalogSnapshots/portalCatalogChangeClassifier.ts` | publisher support | Change classifier | runtime | yes | no | DELETE SNAPSHOT-ONLY | After Phase 1B; source land | Live delete Stage 4 |
| `functions/src/catalogSnapshots/portalCatalogChangeClassifier.test.ts` | test | Classifier tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` | publisher | Triggers/callables | runtime | yes | no | DELETE SNAPSHOT-ONLY | After Phase 1B; source/un-export | Stage 4 live |
| `functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts` | test | Publisher tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `functions/src/catalogSnapshots/snapshotBuilders.ts` | publisher support | Builders | runtime | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `functions/src/catalogSnapshots/snapshotBuilders.test.ts` | test | Builder tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `functions/src/catalogSnapshots/snapshotSchedulingCoalescing.test.ts` | test | Scheduling tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `functions/src/catalogSnapshots/targetedPortalPublication.test.ts` | test | Targeted pub tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `functions/src/catalogSnapshots/waveCReadContainment.test.ts` | test | Containment tests | test | yes | no | DELETE SNAPSHOT-ONLY | Successor taxonomy cache test recommended | — |
| `functions/src/catalogSnapshots/publicationRecovery.ts` | publisher support | Recovery | runtime | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `functions/src/catalogSnapshots/publicationRecovery.test.ts` | test | Recovery tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `packages/shared/src/catalog-snapshots/catalogCardOverrides.ts` | shared util | Override helpers | runtime | yes | field-name only | DELETE SNAPSHOT-ONLY | After Studio override gone | — |
| `packages/shared/src/catalog-snapshots/catalogCardOverrides.test.ts` | test | Override tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.ts` | parser | Manifest/shard parsers | runtime | yes | no | DELETE SNAPSHOT-ONLY | After OG + clients cut over | — |
| `packages/shared/src/catalog-snapshots/catalogSnapshot.parsers.test.ts` | test | Parser tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `packages/shared/src/catalog-snapshots/catalogSnapshot.types.ts` | type | Snapshot types | runtime | yes | field-name only | DELETE SNAPSHOT-ONLY | Delete last among shared | — |
| `tests/firebase/catalogSnapshot.rules.test.ts` | test | Rules tests | test | yes | no | DELETE SNAPSHOT-ONLY | Rules stay until Stage 5 | — |
| `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` | hook | AI Processing + taxonomy UI | runtime | taxonomy import only | AI monotonic repair | KEEP CURRENT | §4 taxonomy contract; signed off 76dc046 — do not touch | Taxonomy only |
| `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.liveDesignReconciliation.test.ts` | test | Amendment 7-follow-up | test | no | AI | KEEP CURRENT | Unchanged by snapshot work | Re-run |
| `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.observerSubscription.test.ts` | test | Amendment 7 observer | test | no | AI | KEEP CURRENT | Unchanged | Re-run |
| `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` | hook | List + applyDesignPatch + monotonic ledger | runtime | no | AI | KEEP CURRENT | Do not touch for snapshots | — |
| `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts` | service | Background AI pump | runtime | no | AI | KEEP CURRENT | — | — |
| `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueueSequencing.test.ts` | test | Sequencing | test | no | AI | KEEP CURRENT | — | — |
| `apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.ts` | util | Pure reconcile | runtime | no | AI | KEEP CURRENT | — | — |
| `apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.test.ts` | test | Reconcile tests | test | no | AI | KEEP CURRENT | — | — |
| `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` | component | Categories from taxonomy hook | runtime | taxonomy import | AI UI | KEEP CURRENT | §4 contract | — |
| `apps/studio/electron/services/catalogAsset/fetchCatalogAssetJson.ts` | service | Main-process asset fetch | runtime | yes | host allowlist | DELETE SNAPSHOT-ONLY | §5.2 order | — |
| `apps/studio/electron/services/catalogAsset/fetchCatalogAssetJson.test.ts` | test | Host allowlist tests | test | yes | security test | DELETE SNAPSHOT-ONLY | — | — |
| `apps/studio/electron/ipc/catalogAsset/catalogAssetIpcChannels.ts` | IPC | Channel allowlist | runtime | yes | IPC allowlist | DELETE SNAPSHOT-ONLY | — | — |
| `apps/studio/electron/ipc/catalogAsset/catalogAssetIpcChannels.test.ts` | test | Channel tests | test | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `apps/studio/electron/ipc/catalogAsset/catalogAssetIpcHandlers.ts` | IPC | Handlers | runtime | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `packages/shared/src/types/catalogAsset/catalogAssetIpc.types.ts` | type | IPC types | runtime | yes | no | DELETE SNAPSHOT-ONLY | — | — |
| `functions/src/index.ts` | export | Snapshot Function exports | runtime | yes | other exports | MANUAL EDIT CURRENT HEAD | Remove snapshot re-exports only | Live Functions until Stage 4 |
| `functions/scripts/retry-portal-catalog-publication-prod.mjs` | script | Prod retry publication | runtime | yes | no | DELETE SNAPSHOT-ONLY | After unused | — |
| `functions/src/inventoryCatalogImageStorage.ts` | callable | Storage inventory | runtime | partial | inventory | MANUAL EDIT CURRENT HEAD | Generated prefixes only @ Stage 5 | Preserve image inventory |
| `packages/shared/src/utils/catalogImageStorageInventory.ts` | shared util | Inventory helpers | runtime | partial | inventory | MANUAL EDIT CURRENT HEAD | Same | Stage 5 |
| `packages/shared/src/utils/catalogImageStorageInventory.test.ts` | test | Inventory tests | test | partial | no | MANUAL EDIT CURRENT HEAD | Same | Stage 5 |
| `storage.rules` | Rule | generated/** paths | runtime | yes later | security | KEEP CURRENT | Stage 5 only | Rollback window |
| `firestore.rules` | Rule | snapshotPublicationState | runtime | yes later | security | KEEP CURRENT | Stage 5 only | Rollback window |
| `apps/studio/src/renderer/src/features/customer-requests/utils/assistedCatalogPickerBrowseContract.test.ts` | test | Assisted picker contract | test | yes | no | MANUAL EDIT CURRENT HEAD | After ready-design REPLACE | — |
| `apps/studio/src/renderer/src/features/firebase/utils/firestoreRouteContainment.test.ts` | test | Design Library containment | test | yes | no | MANUAL EDIT CURRENT HEAD | After taxonomy REPLACE | — |
| `apps/studio/electron/main.ts` | export | Registers catalogAsset IPC | runtime | yes | other IPC | MANUAL EDIT CURRENT HEAD | Remove catalogAsset only | Unrelated IPC intact |
| `apps/studio/electron/preload.ts` | export | catalogAsset.fetchJson bridge | runtime | yes | other bridges | MANUAL EDIT CURRENT HEAD | Remove catalogAsset only | Unrelated bridges intact |

---

## 12. Mechanical count proof (revalidated at HEAD `76dc046`)

Verified via enumeration of the 75 paths above (same physical set as rebuild; Action totals unchanged):

| Action | Count |
|---|---|
| KEEP CURRENT | **15** |
| DELETE SNAPSHOT-ONLY | **35** |
| MANUAL EDIT CURRENT HEAD | **23** |
| REPLACE WITH CURRENT FIRESTORE SERVICE | **2** |
| NEEDS REPO CHECK | **0** |
| **TOTAL** | **75** |

Invariant: `unique paths = matrix rows = sum(Actions) = 75` → **PASS**.

Classification deltas vs original independent audit (only these two):

1. `useAiReviewInbox.ts`: MANUAL EDIT → KEEP CURRENT (§4).
2. `AiReviewPage.tsx`: MANUAL EDIT → KEEP CURRENT (§4).

**Replacement dependency change (Action column unchanged):** Portal facet/search MANUAL EDIT rows now target **managed search (Hybrid §8)**, not 2,000 hydration.

**Future search-sync modules** are not yet physical paths → `[NEEDS REPO CHECK]` at Implement; **not** invented as matrix rows.

Deletion timing: Phase **1A** keeps Portal generated search/facet readers; Phase **1B** deletes those readers after Hybrid search rewire; remaining client snapshot readers after Stage 1–3 replacement QA (backend remains); publisher source DELETE/un-export only after Phase 1B; publisher live retirement Stage 4; generated data + Rules Stage 5 after rollback window.

---

## 13. Protected newer features

Snapshot removal must not regress: per-design artwork background; AI Review artwork-background approval; Portal temporary BG preview; design issue reporting; Studio issue inbox; large-PNG / customer-upload normalization; current upload sizing/DPI; `readyAt` ordering + completeness guard; print requests; show queue; customer upload; donated intake; Whatnot remediation; Studio auto-updates; auth/roles; Rules/Storage security (unchanged in Stage 1); tag/category management (Firestore-native editors); AI enrichment improvements; **AI Processing monotonic reconciliation repair**; print-request limits/sizing; halftone; owner-only controls; Portal analytics; Firebase Debug; unrelated PR #40 fixes.

Designs must never become queued or printed via catalog reads. Production state remains on request items and show allocations.

Field-name references inside snapshot-only shims are **not** protected behavior and do not block DELETE.

---

## 14. Revised rollout stages

### Stage 1 — Replacement architecture (split 1A / 1B)

#### Implement Phase 1A — no managed-search provider required

- Portal ordinary FS gate + Discover home (`listHomeDiscoveryPool`) + Studio taxonomy/assisted REPLACE prep + AuthProvider/IPC teardown prep + Open Graph FS source.
- **Keep** generated search/facet/card assets and `portalCatalogAssetService` until Phase 1B.
- Tests + instrumentation for ordinary paths.
- **No production action. No provider account required.**

#### Implement Phase 1B — after owner provider decision (§16 #1)

- Managed search client + repo-owned sync Functions + search/multi-tag/facet rewire.
- Then DELETE `portalCatalogAssetService` / `catalogSnapshotFlags` (and related generated readers) per matrix §8Z gate.
- Publisher source DELETE / un-export only after 1B search consumers live (§10.1).
- Keep deployed snapshot **publisher** Functions/Rules/generated data **available** until Stage 4–5.
- **No production action.** Provider account/index creation remains a human checkpoint that may precede 1B coding.

### Stage 2 — Local development QA

- Studio locally; Portal **localhost only** against `fresh-prints-dev`.
- **No** development App Hosting backend.
- Test with snapshot **client** reads disabled for paths already cut over; snapshot **backend** intact for rollback.
- Phase 1A QA may complete before 1B; full “no generated client dependency” requires 1B.

### Stage 3 — Owner QA + read containment

- Protected Studio/Portal functions; measure FS / Storage / search per §15; lazy images; caches; no reload storms; no snapshot client reads on cut-over paths.
- Snapshot backend still available for `git revert` rollback of Stage 1 source.
- AI Processing: **do not re-run as Amendment 8 work** (already signed off); only ensure no accidental edits.

### Stage 4 — Snapshot Function / coordination infrastructure retirement

- Separate approval + mandatory read-only **dev and production** Function inventory.
- Remove publisher Functions only after both clients proven cut over (including 1B search).
- Do **not** delete generated objects yet.

### Stage 5 — Dry-run-first generated-data and generated-path Rules cleanup

- After defined rollback window: `snapshotPublicationState`; `generated/catalog-reference/**`; `generated/portal-catalog/**`; generated-path Rules; inventory prefix edits.
- Dry-run first. Production cleanup separate approval.

### Stage 6 — Separate **production** rollout authorization

- Production indices, Secret Manager entries, production backfill/reconciliation, **production** client cutover, observation window, later backend retirement/cleanup.
- Not a second Stage-1 source cutover. Not authorized by this Plan alone.

**Do not merge Stages 4, 5, and 6.**

---

## 15. Read-spike verification + future tests

Use `firestoreUsageTrace` / Firebase Debug; extend for search-index classes and Storage URL vs byte distinction.

Run owner-prompt scenarios 1–25 (cold/warm Portal; focus/visibility; filters; search; paging; scroll without page; favorites; detail; add-to-request; idle 5m; Studio library/search/filters/idle; Assisted picker; AI Review **taxonomy only**; snapshot-disabled client).

Capture: FS reads/queries/counts/listeners; Storage requests/bytes; search requests/hits; cache hit/miss; image cache; duplicate in-flight; remount/polling; unexpected generated paths; TTF card/image.

| Scenario | Expected FS (order of magnitude) | Storage URL resolves | Search |
|---|---|---|---|
| Cold ordinary Portal page | ~1 page ≤41 + optional count + taxonomy | ≤ visible thumbs + small buffer | 0 |
| Warm back-nav same query | 0 if page cache hit | 0 if URL cache hit | 0 |
| Next page | 1 page | new visible thumbs | 0 |
| Multi-tag / text search | 0 list (index) + detail getDoc on open | thumbs for hits | 1 (+ facets) |
| Design detail / add to request | authoritative id/validation reads | preview as needed | 0 |
| Studio Design Library cold | 1 page ≤101 | derivatives as today | 0 |
| Idle 5m | 0 | 0 | 0 |

Future Implement tests: query-key cache; in-flight dedupe; cursor pagination; no full hydrate; no per-card FS read; back-nav cache; invalidation; lazy images; next-page threshold; search debounce; category/single-tag/multi-tag AND; exact+narrowed facets; ready-only membership; sync enter/leave/archive/delete; idempotent/out-of-order; reconciliation; dev/prod index separation; search-only customer keys; server-only writes; authoritative validation; outage UI; stale rejection; no snapshot/IPC/publisher/Rules after staged removal; protected suites unchanged.

---

## 16. Remaining owner decisions and blockers before Implement

### Owner decisions still required

| # | Decision | Blocks |
|---|---|---|
| 1 | Select managed search provider (Algolia recommended; Typesense/Meilisearch acceptable) | **Phase 1B** search coding / account |
| 2 | Provider account creation + billing plan | Phase 1B / Stage 2 search |
| 3 | Dev index creation | Stage 2 (1B path) |
| 4 | Prod index creation | Stage 6 |
| 5 | Secret Manager write-key + public search-only key strategy | Stage 2/6 (1B path) |
| 6 | Confirm Hybrid outage UX (browse FS continues; search fails closed explicitly) | Product UX |
| 7 | Production backfill / cutover / observation | Stage 6 |
| 8 | Snapshot Function retirement approval | Stage 4 |
| 9 | Generated data deletion + Rules cleanup + rollback-window duration | Stage 5 |
| 10 | Production release authorization | Stage 6 |

### Resolved (do not re-ask)

- AI Processing live QA — **PASS / signed off** at `76dc046`.
- Reject 2,000 hydration as permanent search.
- Snapshot architecture still fully removed (sequenced).
- Firestore authoritative; Storage for images.
- Local Portal QA on localhost (no App Hosting for Stage 2).
- AI Processing KEEP CURRENT / untouched.

### Blockers before Implement

1. Formal Review outcome that does not leave unresolved implementation-relevant gaps.
2. **Phase 1A** may be authorized after Formal Review clears Required Changes — **no** provider decision required.
3. **Phase 1B** / search coding / Portal generated-asset DELETE blocked on owner managed-search provider decision (§16 #1).
4. No Implement land may DELETE Portal generated search readers or un-export publishers during Phase 1A.

### Not Phase 1A blockers

- Managed-search provider selection (blocks **1B** only).
- Production Function inventory (Stage 4).
- Generated object deletion (Stage 5).
- Production rollout (Stage 6).

---

## 17. Recommendation checklist (owner-facing)

1–11: Ordinary Portal grids/category/single-tag/discovery/home → **Firestore**; multi-tag/text/facets → **managed search**; favorites → **Firestore**; details/request validation → **Firestore**.  
12–14: FS for pages/counts/detail/mutations; Storage for images; search provider for text/multi-tag/facets.  
15–17: First page ~40 FS docs; warm cache hit; lazy visible images.  
18–21: Browse continues on search outage; stale index rejected for trusted actions; reconcile/rebuild from FS.  
22–24: Snapshot removal Stages 1–6 with backend live through Stage 3; Hybrid preferred; human checkpoints §16.

---

## 18. Safety (this planning pass)

This pass edits **only** this Plan file and its companion Formal Review (same paths). No application source, tests, workflow state (unless separately required), handoff files, commits, pushes, merges, resets, branch switches, Firebase actions, provider accounts/keys/indices, or deployments. PR #40 remains open/unmerged.
