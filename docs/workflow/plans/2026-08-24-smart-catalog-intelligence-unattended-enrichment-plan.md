# Plan: Smart Catalog Intelligence and Unattended Enrichment

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Author | Planning Agent |
| Status | approved_with_amendments |
| Workflow | managed-phase |
| Goal slug | `smart-catalog-intelligence-unattended-enrichment` |
| Related | docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-unattended-enrichment-review.md |
| Amendments | **2026-08-24 — Catalog Processing Mode (Slice 4)** — see §7 + amendment review; **2026-08-25 — Catalog Reprocessing (Slices 4–6)** — see §11a + `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-catalog-reprocessing-amendment-plan.md` |
| FreshForge impact | Fresh Prints application only — **not** starter-surface distribution |

### Plan amendment log

| Date | Amendment | Runtime impact |
|------|-----------|----------------|
| 2026-08-24 | Owner-directed: add **Catalog Processing Mode** (`manual` \| `shadow` \| `autonomous`) as a required **Slice 4** deliverable — server-authoritative settings, fail-safe default, Studio Settings UX, active-mode visibility, Autonomous typed confirmation, Slice 5/6 mode interaction, Automation Health mode-aware metrics, ADR/workflow revision before live Autonomous | **Docs/planning only.** Does not expand Slice 2 or Slice 3 runtime. Does not authorize live Autonomous publication. |
| 2026-08-25 | Owner-directed: add first-class **Catalog Reprocessing** (owner-only Studio bulk ops for DEV+PROD) spanning Slices 4–6 — Slice 4 defines/implements control plane + job architecture; Slice 5 enables **Reprocess AI Review Queue**; Slice 6 enables **Reprocess Ready Catalog**; no client-side loops; Algolia via existing sync | **Docs/planning only.** Does not start Slice 4 implement. Does not authorize production or Autonomous live mode. |
| 2026-08-25 | Slice 4 Formal Review locks durable job architecture (**A:** `catalogReprocessJobs` + worker), soft pause, dual Autonomous gate (mode + live flag), owner-only reprocess/live enable, confirmation phrases | Plan + review only. Implement **not** authorized until owner confirms. See Slice 4 plan/review. |
| 2026-08-25 | **Between Slice 4 and Slice 5:** Smart Profile Quality + Canonicalization refinement **required** — includes code-first artwork background detection for light art + import-stage batch halftone/background overrides; halftone ≠ background; **blocks Slice 5** until signed off | Docs/planning: `docs/workflow/plans/2026-08-25-smart-profile-quality-canonicalization-and-import-background-plan.md` |
| 2026-08-25 | Owner approved bg/halftone locks; withheld implement until profiler quality specified at depth. Plan/Review **amended**: text-dominant, per-dim thoroughness, Stage‑1 canonicalization A+B+D, color-variant parity, caps, metrics, stay smart-profile-v1 + catalog-enrich-v28 | Docs only. Implement not authorized. |

---

## Goal

Replace Fresh Prints' manually governed approved-tag/alias taxonomy with a versioned AI-generated **Smart Profile / Search Intelligence** system; preserve and improve existing title/description generation; introduce confidence-routed unattended catalog approval with targeted verification and non-blocking Needs Review; migrate search/filtering to structured Smart Filters; reprocess the Needs Review backlog; backfill the ready catalog safely; and retire legacy tag infrastructure only after proven parity and rollback safety.

**Product intent:** Import a ZIP and walk away — human review becomes an exception inbox, not the normal ingestion workflow.

**This document is Slice 1 only.** No runtime implementation until owner approves Plan + Formal Review.

---

## Handoff reconciliation

The user-requested numbered handoff bundle (`01-project-brief.md` … `14-prompt-building-guide.md`, `references/project-chatgpt-handoff/CURRENT-STATE.md`) **does not exist** in this checkout.

| Requested path | Authoritative equivalent in repo |
|----------------|----------------------------------|
| 01-project-brief | `docs/project/PROJECT_BRIEF.md` |
| 02-architecture-overview | `docs/architecture/ARCHITECTURE.md` |
| 03-roadmap-and-phases | `docs/project/ROADMAP.md` |
| 04-features-inventory | `docs/project/ROADMAP.md` (phase sections) + `docs/architecture/ARCHITECTURE.md` |
| 05-workflows-summary | `docs/WORKFLOWS.md` + `docs/project/PROJECT_BRIEF.md` (Business Workflow) |
| 06-data-model-essentials | `docs/architecture/DATA_MODEL.md` |
| 07-backend-and-ai-pipeline | `docs/architecture/BACKEND.md` + `functions/src/ai/*` |
| 08-tech-stack-repo-map | `docs/architecture/ARCHITECTURE.md` + monorepo layout below |
| 09-coding-standards | `docs/standards/CODING_STANDARDS.md` |
| 10-security-essentials | `docs/standards/SECURITY.md` |
| 11-testing-commands | `docs/standards/TESTING.md` |
| 12-decisions-and-constraints | `docs/project/DECISIONS.md` |
| 13-recent-completed-work | `docs/project/ROADMAP.md` (top changelog) + recent signoffs in `docs/workflow/reviews/` |
| 14-prompt-building-guide | `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` + `packages/shared/src/constants/aiEnrichment.constants.ts` |
| CURRENT-STATE handoff | `.cursor/workflow/state.md` (authoritative) |

**Stale handoff claims corrected from source:**

| Handoff claim | Repo truth |
|---------------|------------|
| Prompt `catalog-enrich-v21` or `v25` | **`catalog-enrich-v26`** (`functions/src/ai/catalogTitleRules.ts`) |
| Dev prompt variant | **`catalog-enrich-dev-v26`** |
| Tag rerank prompt | **`catalog-tag-rerank-v1`** |
| Suggested-tag author prompt | **`catalog-suggested-tag-author-v2`** |
| Default vision model | **`gemini-2.5-flash-lite`** |
| Tag cap on lean path | **8** approved tags (`SIMPLE_ENRICHMENT_MAX_TAGS`) |
| Auto catalog approval | **None** — all AI success → `needs_review` (staff approve → `ready`) |
| Batch ID on designs | **Not persisted** — import `jobId` is session-scoped only |
| Source filename on designs | **Not persisted** — only initial `title` from filename |
| `categoryHints` on tags | **Not in schema** — bulk tag import rejects unknown keys |
| Portal tag-alias discoverability plan file | **Referenced in signoffs but plan file missing** — see Superseded work |

---

## Monorepo map (verified)

| Area | Path |
|------|------|
| Studio | `apps/studio/` (`@fresh-prints/studio`) |
| Portal | `apps/portal/` (`@fresh-prints/portal`) |
| Shared types/utils | `packages/shared/src/` |
| Cloud Functions | `functions/src/` |
| Algolia shared contract | `packages/shared/src/catalog-search/` |

---

## 1. Current-state inventory (repo paths)

### 1.1 AI pipeline

| Concern | Path | Key symbols |
|---------|------|-------------|
| **Gemini provider** | `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts` | `createGeminiVisionEnrichmentProvider`, `callVision` |
| Provider routing | `functions/src/ai/providers/resolveAiEnrichmentProvider.ts` | `resolveAiEnrichmentProvider` |
| Dev/no-key fallback | `functions/src/ai/providers/developmentAiEnrichmentProvider.ts` | |
| **Prompt version** | `functions/src/ai/catalogTitleRules.ts` | `CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-v26"` |
| **Prompt template (settings)** | `packages/shared/src/constants/aiEnrichment.constants.ts` | `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`, placeholders, auto-upgrade chain |
| **Lean prompt builder** | `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` | `buildSimpleCatalogEnrichmentUserPrompt` — injects categories, excluded tags; **does not inject full tag list** (ADR-FP-041) |
| Legacy rich prompts | `functions/src/ai/catalogTitleRules.ts` | `CATALOG_ENRICHMENT_SYSTEM_PROMPT`, OCR blocks (not used by Gemini lean path) |
| **Response parser (active)** | `functions/src/ai/simpleCatalogEnrichmentResponse.ts` | `extractJsonObject`, `normalizeSimpleCatalogEnrichment`, `buildSimpleCatalogEnrichmentResult` |
| Legacy rich parser | `functions/src/ai/catalogEnrichmentResponse.ts` | Tests/legacy only |
| Vision completion | `functions/src/ai/visionCompletion.ts` | `VisionEmptyOutputError`, usage extraction |
| **Retry (HTTP)** | `functions/src/ai/visionRequestRetry.ts` | `fetchVisionWithRetry` — 429/5xx, max 3 |
| Retry config | `functions/src/ai/aiEnrichmentConfig.ts` | `VISION_REQUEST_MAX_RETRIES`, token caps |
| Quality/OCR retry (legacy) | `functions/src/ai/catalogEnrichmentRetry.ts` | **Not wired** to lean Gemini path |
| **Title rules** | `functions/src/ai/catalogTitleRules.ts` | `resolveLeanCatalogTitle`, `normalizeCatalogTitle`, `LEAN_CATALOG_TITLE_MAX_WORDS = 24`, `DEFAULT_CATALOG_TITLE_MAX_WORDS = 6` |
| Title tests | `functions/src/ai/catalogTitleRules.test.ts` | |
| **Visible text / OCR** | `functions/src/ai/visibleTextValidation.ts` | `resolveVisibleTextPhrases`, retry thresholds (legacy path) |
| **Category resolver (active)** | `functions/src/ai/catalogThemeCategoryResolver.ts` | `resolveThemeCategory` |
| Legacy category resolver | `functions/src/ai/catalogCategoryResolver.ts` | Alternate; verify usage before removal |
| **Approved-tag resolver** | `functions/src/ai/catalogTagResolver.ts` | `resolveAiCatalogTags`, alias matching |
| **Tag reranker** | `functions/src/ai/catalogTagRerankProvider.ts` | `callTagRerank`; gated by `shouldRunTagRerank` in pipeline |
| **Suggested-new-tag author** | `functions/src/ai/catalogSuggestedTagAuthorProvider.ts` | `callSuggestedTagAuthorStandalone` |
| Suggested-new-tags policy | `packages/shared/src/utils/suggestedNewTagsPolicy.ts` | |
| Tag exclusions | `functions/src/ai/aiTagExclusions.ts`, `packages/shared/src/constants/aiTagExclusions.constants.ts` | |
| Halloween guard | `functions/src/ai/halloweenTagGuard.ts` | |
| **AI settings load/write** | `functions/src/ai/loadAiEnrichmentSettings.ts`, `functions/src/updateAiEnrichmentSettings.ts` | Firestore `settings/aiEnrichment` |
| Runtime cache | `functions/src/ai/aiEnrichmentRuntimeCache.ts` | |
| Studio settings UI | `apps/studio/.../settings/hooks/useAiEnrichmentSettings.ts`, `aiEnrichmentSettingsService.ts` | |
| **Playground** | `functions/src/ai/aiEnrichmentPlayground.ts`, `functions/src/testAiEnrichmentPlayground.ts` | |
| Tag rerank playground | `functions/src/testAiEnrichmentTagRerank.ts` | |
| **Enqueue / orchestration** | `functions/src/enqueueAiEnrichment.ts` | Callable; runs pipeline **synchronously** |
| **Pipeline** | `functions/src/ai/aiEnrichmentPipeline.ts` | `runAiEnrichmentPipeline`, `markAiSuccess`, `markAiFailure` |
| Enqueue validation | `functions/src/ai/enqueueAiEnrichmentValidation.ts` | `rerunFromReview`, stale requeue |
| Image prep | `functions/src/ai/prepareAiAnalysisImage.ts` | 1024px canvas, grey `#808080` default background, flatten → WebP |
| Reference snapshot | `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` | Categories + approved tags |
| Stage updates | `functions/src/ai/designAiFields.ts` | `updateAiProcessingStage` |
| Reset for re-run | `functions/src/resetAiEnrichmentForProcessing.ts` | |
| **Provenance types** | `packages/shared/src/types/ai/aiProcessing.types.ts` | `DesignAiSuggestions`, `DesignAiAnalysis`, stages |
| Config | `functions/src/ai/aiEnrichmentConfig.ts` | `AI_ENRICHMENT_MAX_INSTANCES = 1`, `SIMPLE_ENRICHMENT_MAX_TAGS = 8` |
| Studio enqueue client | `apps/studio/.../ai-review/services/aiEnrichmentEnqueueService.ts` | |
| **Import background queue** | `apps/studio/.../imports/services/importAiBackgroundQueue.ts` | Sequential pump; continues after terminal states |
| Processing tab queue | `apps/studio/.../ai-review/hooks/useAiProcessingQueue.ts` | Auto-advance one-at-a-time |
| Failure handling | `aiEnrichmentPipeline.ts` → `markAiFailure` | `aiProcessingStage: failed`, preserves queue advance |

### 1.2 Design model (persisted `designs/{id}`)

**Canonical types:** `apps/studio/.../designs/types/design.types.ts`, `designStatus.types.ts`, `aiReview.types.ts`

| Field group | Fields (verified) |
|-------------|-------------------|
| Catalog (approved) | `title`, `description?`, `categoryId?`, `tags[]`, artwork paths, print sizing, `readyAt?` |
| Lifecycle | `status`: `imported` \| `processing` \| `ready` \| `rejected` \| `archived` |
| AI review | `aiProcessed`, `aiReviewed`, `aiReviewStatus?`, `aiReviewedAt/By`, `aiReviewVersion?`, `aiReviewNotes?`, `aiReviewConfidence?` |
| AI pipeline | `aiProcessingStage?`, `aiSuggestions?`, `aiAnalysis?`, `aiRequestedVisionModelId?` |
| Explicit/censored | `isExplicitContent?`, `censoredTerms?` (staff-only; Portal masks) |
| Companion | `companionDesignIds?`, `companionSetIncomplete?`, deprecated `companionSetId?` |
| Halftone | `halftoneStaffDecision?`, `halftoneSubmitterResponse?`, deprecated `halftoneDetection?` |
| Metrics | `queueCount`, `requestCount?`, `showAddCount?`, `printCount?`, `favoriteCount?`, activity timestamps |
| Audit | `uploadedBy`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt` |
| **Absent today** | `importBatchId`, `sourceFileName`, Smart Profile fields, automation decision fields |

**Mapper:** `apps/studio/.../designs/services/designService.ts` (`MAX_TITLE_LENGTH = 200`)

**Portal read model:** `apps/portal/features/catalog/types/catalog.types.ts` — `CatalogDesign` (no AI fields)

### 1.3 Import / batch context

| Concern | Path | Finding |
|---------|------|---------|
| Batch types | `packages/shared/src/types/import/batchImport.types.ts` | `BatchImportJobId`, manifest, final report with `jobId` + `designId[]` |
| Orchestration | `apps/studio/.../imports/services/importBatchOrchestrationService.ts` | Passes `jobId` to `importValidatedPngFile` |
| Single/batch import | `apps/studio/.../imports/services/importOrchestrationService.ts` | Creates design with filename-derived `title` only |
| Electron discovery | `apps/studio/electron/services/import/folderScanner.ts`, `zipExtractor.ts` | |
| Post-import AI | `importAiBackgroundQueue.ts` | Sequential enqueue per design |

**Gap:** Batch membership is **not persisted** on the design document. Batch coherence for Slice 4+ requires **new persisted fields** (proposed below) or time-window heuristics (weaker). Plan recommends persisting `importBatchId`, `importSourceFileName`, and optional `importRelativePath` at create time.

### 1.4 Approval / lifecycle state machine

```
Import create → status: imported, aiReviewStatus: pending
Derivatives     → status: processing (transient) → imported
AI enqueue      → aiProcessingStage: queued → … → ready_for_review
AI success      → aiReviewStatus: needs_review (always today)
Staff approve   → status: ready, aiReviewStatus: approved, readyAt set
Staff reject    → status: rejected, aiReviewStatus: rejected
Re-run AI       → resetAiEnrichmentForProcessing (clears aiSuggestions/analysis)
Reopen rejected → status: imported, needs_review (preserves prior AI output)
```

| Step | Path |
|------|------|
| AI success write | `functions/src/ai/aiEnrichmentPipeline.ts` → `markAiSuccess` |
| Staff approve | `apps/studio/.../ai-review/services/aiReviewInboxService.ts` → `catalogApprovalService.approveDesignForCatalog` |
| Ready transition | `designService.applyCatalogApprovalUpdate` sets `readyAt` |
| Algolia sync | `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts` on `designs/{id}` write |
| Reconcile | `functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts` (callable + daily schedule) |

**Queue non-blocking (verified):** Background import queue (`importAiBackgroundQueue.ts`) processes designs **sequentially but independently** — a design in `needs_review` does not block subsequent enqueues. `enqueueAiEnrichmentValidation.ts` treats duplicate enqueue on already-`needs_review` as idempotent no-op. **Needs Review does not stall the import pump.**

**Staff-only approval (verified):** No server path auto-sets `status: ready` after AI. ADR/workflow change required before unattended approval.

### 1.5 Search / Algolia

| Concern | Path |
|---------|------|
| Record contract | `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` |
| Record builder | `functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts` |
| Sync trigger | `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts` |
| Change classifier | `functions/src/algolia/portalCatalogChangeClassifier.ts` |
| Index settings | `functions/src/algolia/algoliaAdminClient.ts` |
| Portal search | `apps/portal/features/catalog/services/portalAlgoliaCatalogSearchService.ts` |
| Studio search | `apps/studio/.../services/studioAlgoliaCatalogSearchService.ts` |
| Normalization | `packages/shared/src/utils/catalogSearchNormalization.ts` |
| Exact token params | `packages/shared/src/catalog-search/portalCatalogAlgoliaExactSearchParams.ts` |
| Studio ID search | `apps/studio/.../utils/designLibraryExactIdSearch.ts` (Firestore parallel lookup) |

**Current Algolia record:** `objectID`, `title`, `searchText` (title + description + category + tag names + aliases), `categoryId`, `categoryName`, `tagIds`, `tagFacetKeys`, `readyAtMs`

**Searchable attributes:** `title`, `searchText`, `categoryName`, `unordered(tagFacetKeys)`

**Facets:** `filterOnly(tagIds)`, `filterOnly(categoryId)`, `tagFacetKeys`

**Publication recovery:** Real-time sync (log-only on failure) + manual/scheduled reconcile. Stage 4 Storage publisher **retired**.

**Algolia unavailable:** Portal managed search **fail-closed** with user message; bounded Firestore browse continues for unfiltered/single-tag/category paths.

### 1.6 Legacy tag dependency graph

```
tags/{tagId} (CatalogTag: name, aliases[], preferredWhen, status)
    ↑ written by Tag Management UI (owner/admin taxonomy)
    ↑ bulk import: bulkCatalogTagImport.ts
    ↓ loaded into AI pipeline: loadAiCatalogReferenceSnapshot.ts
    ↓ matched by catalogTagResolver.ts → design aiSuggestions.tags
    ↓ optional rerank: catalogTagRerankProvider.ts
    ↓ optional suggested-new: catalogSuggestedTagAuthorProvider + suggestedNewTagsPolicy
    ↓ staff approve copies tags → design.tags (canonical lowercase names)
    ↓ taxonomyMaterialization: rebuildTaxonomyMaterialization.ts, onTaxonomySourceWritten.ts
    ↓ Algolia: tagIds + tagFacetKeys + searchText aliases
    ↓ Portal/Studio filters: tag modals, AND facet on tagIds
    ↓ halftone: syncHalftoneTagInList on approve (packages/shared/utils/halftoneReviewState.ts)
```

**Studio UI:** `TagManagementModal.tsx`, `catalogTagService.ts`, `CategoryManagementModal.tsx`

**Settings:** `settings/aiEnrichment` — tag rerank mode, suggestion author, exclusions, prompt template

**Rules/indexes:** Firestore rules validate tag documents; materialization chunks under `taxonomyMaterialization/`

### 1.7 Category architecture

- Collection: `categories/{categoryId}` — human-governed, limited set
- AI receives category names + descriptions in prompt (`simpleCatalogEnrichmentPrompt.ts`)
- Server resolver: `resolveThemeCategory` chooses **existing** category ID
- AI **cannot** create categories (ADR-FP-041 family)

### 1.8 Halftone / explicit / companion (preserved)

| Concern | Policy | Path |
|---------|--------|------|
| Halftone | **Human-only** (ADR-FP-080) — staff toggle; `"halftone"` tag synced on approve | `halftoneReviewState.ts`, AI Review UI |
| Explicit | Staff `isExplicitContent`, Portal censored masking | design types, Portal catalog |
| Companion | `companionSetService`, max 50 links, needs-companion queue | `companionSetService.ts` |

### 1.9 Superseded queued work

**`portal-tag-alias-search-discoverability`**

- Status in recent signoffs: **queued only, never activated**
- Plan file `docs/workflow/plans/2026-08-16-portal-tag-alias-search-discoverability-plan.md`: **missing** (references only)
- Related completed work: `2026-07-01-ai-tag-alias-reconciliation-plan.md` (approved-tag alias matching in resolver — different scope)

**Action (Slice 1 doc-only):** Mark **`portal-tag-alias-search-discoverability` CANCELLED / SUPERSEDED** by this goal. Preserve historical signoff references; do **not** implement alias-search-on-taxonomy behavior. Search Concepts + Smart Profile replace alias governance.

---

## 2. Proposed Smart Profile schema

### 2.1 Design principles

- Strongly typed in `packages/shared` — no `any` on persisted fields
- Versioned (`smartProfileVersion`) for reprocessing
- Separate from production flags (halftone, explicit, companion)
- Legacy `tags[]` and `aiSuggestions.tags` coexist during migration
- Strip undefined before Firestore writes (existing `removeUndefinedFields` pattern)

### 2.2 Proposed persisted shape

```typescript
/** Current contract version for reprocess/backfill eligibility */
export const SMART_PROFILE_VERSION = "smart-profile-v1";

export interface SmartProfileDimensionLists {
  subjects?: string[];
  objects?: string[];
  styles?: string[];
  themes?: string[];
  interests?: string[];
  professionsGroups?: string[];
  occasions?: string[];
  places?: string[];
  colors?: string[];
  visibleText?: string[];
  searchConcepts?: string[];
}

export interface SmartProfileProvenance {
  version: string;           // SMART_PROFILE_VERSION
  provider?: string;
  model?: string;
  promptVersion?: string;    // links to catalog-enrich-v*
  generatedAt?: string;      // ISO
  normalizerVersion?: string;
  verifierInvoked?: boolean;
  titleOutcome?: "first_pass" | "repaired" | "manual";
  automationDecision?: "shadow" | "auto_approved" | "needs_review" | "failed";
  automationDecisionAt?: string;
  automationReasonCodes?: string[];
}

export interface DesignSmartProfile extends SmartProfileDimensionLists {
  /** Controlled category — same ID space as today */
  categoryId?: string;
  categoryName?: string;
  categoryAlternatives?: Array<{ categoryId: string; categoryName: string; reason?: string }>;
  categoryGapSuggested?: boolean;
  categoryGapEvidence?: string;
  provenance: SmartProfileProvenance;
}
```

**Storage location (proposed):** top-level `design.smartProfile` on `designs/{id}`; keep `aiSuggestions` during transition for title/description/category/tags until Slice 6 retirement plan executes.

**Shadow halftone (Slice 2):** `aiAnalysis.halftoneShadowAssessment?: { likelihood?: string; evidence?: string; modelNote?: string }` — **evidence only**, no auto `halftoneStaffDecision`.

### 2.3 Normalization layer (deterministic)

New module: `packages/shared/src/utils/smartProfileNormalization.ts` (+ functions mirror if needed)

- Trim, collapse whitespace, lowercase storage for facet keys where appropriate
- Dedupe within/across dimensions (configurable rules — e.g. subject also listed as search concept OK)
- Singular/plural: conservative rules only (documented); prefer Algolia `ignorePlurals` where sufficient
- **No** manual alias approval queue
- Preserve multi-word phrases in `searchConcepts`

### 2.4 Field size limits (proposed — tune in Slice 2 tests)

| Field | Max items | Max string length | Rationale |
|-------|-----------|-------------------|-----------|
| Each dimension array | 12 | 64 chars/item | Model quality + Algolia record size |
| searchConcepts | 24 | 80 chars/item | Retrieval expansion |
| categoryAlternatives | 3 | — | Verifier output |

Algolia total record size must stay within Algolia limits (~10KB safe target); validate in Slice 3 tests.

---

## 3. Title-length analysis and recommended rule

### 3.1 Facts from repo

| Rule | Source | Value |
|------|--------|-------|
| **Character max (hard validation)** | `designService.ts`, `DATA_MODEL.md`, `approvePublicCatalogDesignTitle.ts` | **200 characters** |
| **Lean word cap (normalization)** | `catalogTitleRules.ts` | **`LEAN_CATALOG_TITLE_MAX_WORDS = 24`** |
| Legacy word cap | `catalogTitleRules.ts` | `DEFAULT_CATALOG_TITLE_MAX_WORDS = 6` (OCR-era path) |
| Readable wording preservation | Signed-off lean title behavior | `resolveLeanCatalogTitle`, `resolveReadableWordingForTitle` |

### 3.2 Owner-reported defect

Occasional **extremely long titles** despite generally good quality — likely long multi-word titles within the 24-word cap and under 200 chars, or edge cases exceeding char cap.

### 3.3 Recommended rule (proposed — **no new silent limit**)

1. **Keep 200-character hard cap** — already canonical across Studio, Portal analytics, DATA_MODEL.
2. **First-pass prompt improvement (Slice 2):** Add explicit instruction: produce descriptive titles preserving readable design wording, but **must not exceed 200 characters**; prefer concise phrasing without dropping differentiating detail.
3. **Deterministic post-pass validation:** Reject/flag titles > 200 chars; measure word count distribution in dev fixtures.
4. **Word cap evaluation (OWNER DECISION):** Current lean cap is **24 words**. If overlong titles remain frequent after prompt tightening, consider lowering to **12–16 words** *without* reverting to generic 2–3 word labels. Plan Slice 2 test report must include title length histogram before changing word cap.

### 3.4 Conditional second-pass title fixer (Slice 4, if needed)

Only if Slice 2–3 evidence shows first-pass + validation insufficient:

- Trigger: title violates 200-char cap OR approved word-cap rule (if owner adjusts)
- Input: proposed title, description, Smart Profile subset, visible text
- Single job: condense while preserving identity
- Track `provenance.titleOutcome`: `first_pass` | `repaired` | `manual`
- Max **one** repair call; if still invalid → Needs Review with reason `invalid_title_after_repair`

---

## 4. Category decision model

1. **Controlled list only** — AI selects `categoryId` from loaded active categories (`loadAiCatalogReferenceSnapshot`).
2. **Dominant design intent rule** — add/retain in prompt (see user examples: cross ≠ auto Faith, football ≠ auto Sports, etc.).
3. **Existing-category preference** — choose broad existing category when reasonable; Smart Profile carries specificity.
4. **Server validation** — `categoryId` must exist and be active; reject unknown IDs.
5. **Alternatives** — store in `smartProfile.categoryAlternatives` for verifier/review UI; do not treat model confidence as calibrated probability.
6. **Category gap** — see §14.

**Active resolver:** keep `resolveThemeCategory`; extend inputs with Smart Profile signals in Slice 2 shadow mode.

---

## 5. Batch context / coherence design

### 5.1 Current gap

No persisted batch linkage. **Proposed Slice 2 addition** on design create:

```typescript
importBatchId?: string;        // BatchImportJobId
importSourceFileName?: string; // original PNG filename
importRelativePath?: string;   // from ZIP/folder manifest when available
importedAt?: Timestamp;        // already have createdAt — batch window uses createdAt + importBatchId
```

Write in `importOrchestrationService.ts` / `importBatchOrchestrationService.ts` when `jobId` present.

### 5.2 Coherence inference (Slice 4)

- Load sibling designs sharing `importBatchId` with Smart Profile category/subject distributions
- Compute batch coherence score (e.g. dominant category > 70% of batch → coherent)
- Mixed batch (many categories/themes) → batch weight → 0
- **Never** force outlier to majority category

### 5.3 Filename/folder hints

- Use `importRelativePath` / folder segments as **weak** evidence only when batch coherent
- Prompt currently says "Do not use filenames" — batch verifier may use metadata server-side only

---

## 6. Targeted outlier verifier (Slice 4)

**Trigger conditions (deterministic gates, not raw confidence):**

- Category ambiguity: alternatives within score threshold
- Coherent batch outlier: design category ≠ batch dominant AND batch coherence high
- First-pass internal conflict: category vs dominant Smart Profile subjects/themes

**Verifier call:** separate prompt/function `catalogClassificationVerifier` (new), optional second Gemini text call with image + batch summary + first-pass evidence.

**Instructions:** batch context is evidence not truth; determine dominant intent independently.

**Outcomes:**

- Confirmed → proceed toward auto-approval (shadow then live)
- Still ambiguous → Needs Review with structured reason + evidence
- **Never blocks queue** — isolate per design

---

## 7. Catalog Processing Mode + automation design

> **Amendment 2026-08-24:** Live autonomy is not only an abstract owner checkpoint. Slice 4 must ship an owner-controlled, **server-authoritative** Catalog Processing Mode. Implementing the setting does **not** authorize production Autonomous publication — that remains behind ADR revision + explicit owner live-mode checkpoint.

### 7.1 Three operating modes (required product contract)

| Mode | User-facing label | Behavior |
|------|-------------------|----------|
| `manual` | **Manual Review** | AI enrichment, Smart Profile, and search intelligence still run. Automation decision logic may run internally. **Every** successful design routes to Needs Review. Nothing auto-enters the Design Library. Traditional safe workflow. |
| `shadow` | **Shadow Automation** | Run the **same** automation decision policy and targeted verifier path intended for Autonomous. Record proposed decision, reason codes, evidence/confidence, verifier invocation/result, and whether the design **would** have auto-approved. **Despite that decision, every successful design still routes to Needs Review.** Used to evaluate Autonomous risk under prompt/model/schema/threshold changes without publishing. |
| `autonomous` | **Autonomous** | Designs satisfying the approved automation policy may transition to `ready` / Design Library. Unresolved uncertainty → Needs Review. Targeted verification may allow auto-approval only if the verifier resolves the required uncertainty. Technical failures/retries stay isolated. Publication/search sync requirements still apply before an automated design is operationally complete. |

**Cross-slice constraints:**

- **Slice 2:** Smart Profile + shadow *evidence* only. No Catalog Processing Mode setting. No live Autonomous. Do not retroactively expand Slice 2 for this feature.
- **Slice 3:** Algolia + Smart Filters; legacy tags coexist; Objects remain search-only. Catalog workflow remains non-autonomous unless separately authorized. Do not implement this setting early merely because Slice 3 touches search.
- **Slice 4:** **Implementation slice** for Catalog Processing Mode + autonomy engine + verifier (see §24).

### 7.2 Server-authoritative settings (repo-checked)

| Item | Repo truth |
|------|------------|
| Settings document | Firestore `settings/aiEnrichment` (`AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment"`) |
| Load path | `functions/src/ai/loadAiEnrichmentSettings.ts` |
| Update path | Callable `updateAiEnrichmentSettings` (`functions/src/updateAiEnrichmentSettings.ts`) |
| Shared contract | `packages/shared/src/types/ai/aiEnrichmentSettings.types.ts` (`AiEnrichmentSettingsDocument`) |
| Studio Settings UI | `apps/studio/.../settings/pages/SettingsPage.tsx` — **AI Enrichment** tab (`id: "aiEnrichment"`) |
| Studio settings service/hook | `aiEnrichmentSettingsService.ts`, `useAiEnrichmentSettings.ts` |
| Current write permission | `assertOwnerAdminCaller` — **owner and admin** (not owner-only today) |

**Proposed field (Slice 4 — additive on existing doc; do not invent a parallel settings collection):**

```typescript
catalogWorkflowMode?: "manual" | "shadow" | "autonomous";
```

- Strongly typed in shared + Functions contracts.
- Backend enrichment/approval path resolves mode from Firestore settings — **must not depend on Studio being open**.
- Client UI permissions alone are insufficient; trusted backend enforces mode on every design decision.
- Owner can change mode **without redeploying Functions**.

**Permissions note for Slice 4 Formal Review:** Existing AI enrichment settings allow **owner and admin**. Catalog Processing Mode (especially Autonomous) is high-impact. Slice 4 Formal Review must explicitly decide whether to:

1. Keep owner+admin (consistent with current AI settings), or
2. Restrict Autonomous enablement to **owner-only** without silently expanding access beyond current patterns.

Do not weaken current settings permissions.

### 7.3 Fail-safe default (mandatory)

Missing, malformed, legacy, unavailable, or unreadable `catalogWorkflowMode` must **NEVER** default to `autonomous`.

| Condition | Required behavior |
|-----------|-------------------|
| Field absent / null / unknown string / settings read failure | Resolve to **`manual`** (deterministic safe fallback) |
| Explicit `shadow` | Shadow Automation |
| Explicit `autonomous` | Autonomous **only if** ADR + owner live-mode gate are satisfied for that environment; otherwise treat as non-publishing fail-safe per Slice 4 Formal Review / ADR |

**Rationale for `manual` over `shadow` as missing-field default:** Absence must not imply evaluation-of-autonomy policy; Manual is the traditional staff-approval workflow and cannot silently enable automatic publication. Slice 4 Formal Review may document a one-time owner migration to set `shadow` after deploy if calibration is desired.

Under no circumstances may absence of the field silently enable automatic publication.

### 7.4 Studio Settings UX (Slice 4)

Home: existing **AI Enrichment** settings area on `SettingsPage` — do not create an unrelated Settings section.

**Preferred user-facing concept: Catalog Processing Mode**

| Option | Helper copy (conceptual) |
|--------|--------------------------|
| Manual Review | Every AI-processed design requires staff approval. |
| Shadow Automation | AI evaluates the autonomous workflow but still sends every design to Needs Review. |
| Autonomous | Designs meeting the approved automation policy may enter the Design Library automatically. Exceptions go to Needs Review. |

### 7.5 Active mode visibility (Slice 4)

Surface active mode in AI Processing / AI Review without requiring Settings. Conceptual badges:

- `Catalog Processing: Manual`
- `Catalog Processing: Shadow`
- `Catalog Processing: Autonomous`

Use existing Studio badge/status conventions (AI Processing header / inbox chrome) — do not invent unnecessary UI patterns. Exact component placement: **[Slice 4 Formal Review — AI Review layout check]**.

### 7.6 Autonomous enable confirmation (Slice 4)

Transitioning **into** Autonomous must require explicit high-impact confirmation because it changes catalog publication authority.

**Repo confirmation convention (checked):** destructive/high-impact actions use typed confirmation phrases (e.g. `DISABLE CUSTOMER`, `BACKFILL QUEUE TAB`) passed to callables — not a separate confirmation framework.

**Proposed Slice 4 pattern (locked by Slice 4 Formal Review 2026-08-25):** Selecting Autonomous mode may use a confirm dialog; enabling **live** publication requires typed phrase **`ENABLE AUTONOMOUS`**, validated server-side when setting `catalogAutonomousLiveEnabled` to true (dual gate with `catalogWorkflowMode === "autonomous"`). Confirmation copy must state:

- Qualifying AI-processed designs may enter the Design Library without individual staff approval.
- Unresolved designs still route to Needs Review.
- Owner can later return to Manual or Shadow **without redeploying code**.

Returning to Manual or Shadow does not require the same typed phrase (lower risk); Slice 4 Formal Review may still require a simple confirm dialog.

### 7.7 Decision model (field-level)

Avoid single global confidence. Example gates:

| Route | Conditions (illustrative — calibrate in Slice 5) |
|-------|---------------------------------------------------|
| Auto-approve (Autonomous only publishes) | Valid title/description/category; Smart Profile structurally valid; no category gap; no verifier disagreement; explicit/companion/halftone not ambiguous |
| Verifier | Moderate category ambiguity OR batch outlier |
| Needs Review | Verifier disagreement, category gap, title repair failure, explicit uncertainty |
| Retry/fail | Transient vision errors via existing retry; bounded failures → `failed` isolated |

**Shadow vs Autonomous:** Same policy + verifier. Shadow records `would_auto_approve` / proposed decision and still writes `needs_review`. Autonomous may apply `auto_approved` → `ready` + required publish/search sync.

**Server authority:** pipeline-internal (or callable) `applyCatalogAutomationDecision` — **not** client-writable. Firestore rules must deny client `status: ready` without staff role until ADR amends.

### 7.8 ADR / workflow revision required before live Autonomous

Staff-mandatory catalog publication is current repo doctrine:

| Source | Statement |
|--------|-----------|
| `docs/architecture/DATA_MODEL.md` (AI pipeline) | “Staff approval is always required for catalog publish.” |
| `docs/workflow/reviews/phase-5-ai-review-architecture-review.md` | AI completion → `needs_review` unconditionally; “No auto-publish to catalog” |
| This plan (ADR-FP-NEW-1) | Unattended catalog approval ADR required before live auto-approve |

Slice 4 must **identify and intentionally amend** the relevant ADR/workflow docs (new **ADR-FP-XXX** / ADR-FP-NEW-1 plus DATA_MODEL + WORKFLOWS updates) before Autonomous may be enabled in any shared environment.

- Merely implementing the setting is **not** approval to change production authority.
- Initial Slice 4 implementation/deployment must remain fail-safe and **non-autonomous** until the owner explicitly authorizes the live Autonomous checkpoint.

### 7.9 Phased rollout (updated)

| Phase | Slice | Behavior |
|-------|-------|----------|
| Shadow evidence only | 2 | Pipeline records shadow automation provenance; always Needs Review; **no** Catalog Processing Mode setting |
| Search cutover | 3 | Non-autonomous; no mode setting |
| Mode + engine | 4 | Implement `catalogWorkflowMode`, decision engine, verifier, Settings UX, visibility, observability; deploy with fail-safe `manual`; owner may select Shadow; Autonomous gated |
| Owner live Autonomous checkpoint | After Slice 4 evidence + ADR | Explicit owner authorization to use Autonomous in that environment |
| Calibration reprocess | 5 | Honors active mode (see §12) |
| Ready backfill | 6 | Mode does **not** change ready lifecycle (see §13) |

---

## 8. Manual review evidence model

Persist on design when `needs_review`:

```typescript
aiReviewReasonCodes?: string[];  // e.g. category_ambiguity, category_gap, verifier_disagreement, ...
aiReviewEvidence?: {
  summary?: string;
  categoryAlternatives?: ...;
  batchContext?: { batchId, dominantCategory, coherenceScore };
  verifierNotes?: string;
};
```

Studio AI Review UI: display reason + evidence panel (no raw API keys/secrets).

---

## 9. Retry / idempotency / versioning

| Concern | Approach |
|---------|----------|
| HTTP retry | Existing `fetchVisionWithRetry` (max 3) |
| Per-design isolation | Already sequential queue; maintain — one failure doesn't abort pump |
| Idempotent enqueue | Existing stale-stage + idempotent needs_review handling |
| Re-run | `resetAiEnrichmentForProcessing` clears AI fields; Smart Profile version check skips unchanged |
| Backfill | Cursor/checkpoint doc `catalogMigration/smartProfileBackfill` with lastId, counts, version |
| Reprocess filter | `smartProfile.provenance.version < SMART_PROFILE_VERSION` |
| Provenance | Extend `SmartProfileProvenance` + retain `aiReviewVersion` compatibility |

---

## 10. Category-gap intelligence (minimal)

**Collection (proposed):** `categoryGapSignals/{autoId}` or aggregated subcollection under `catalogIntelligence/categoryGaps`

Fields: `designId`, `batchId?`, `evidence`, `suggestedLabel?`, `createdAt`, `status: open|dismissed|approved`

**Studio surface (minimal):** owner-only list when ≥ N independent signals share normalized label (threshold e.g. 5 — tune in Slice 4)

**No auto category creation.**

---

## 11. Halftone shadow-test design

| Requirement | Plan |
|-------------|------|
| Preserve ADR-FP-080 | No auto halftone staff decision |
| Analysis image | `prepareAiAnalysisImage.ts` — grey flatten canvas; investigate white/transparent visibility in Slice 2 dev fixtures |
| Optional improved analysis render | Separate function e.g. `prepareAiAnalysisImageHighContrast` — **never** persist as production artwork |
| Shadow output | `aiAnalysis.halftoneShadowAssessment` optional fields |
| Enable automation | Separate owner checkpoint + ADR-FP-080 amendment if evidence supports |

---

## 11a. Catalog Reprocessing (owner-only control plane — Slices 4–6)

> **Amendment 2026-08-25:** The owner must be able to safely initiate bulk AI/catalog reprocessing from Studio in **DEV and PROD** without ad hoc scripts or per-design manual work. Detail plan: `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-catalog-reprocessing-amendment-plan.md`.

### 11a.1 Product contract

| Action | Primary slice | Target |
|--------|---------------|--------|
| **Reprocess AI Review Queue** | 5 | Eligible Needs Review / AI Review designs |
| **Reprocess Ready Catalog** | 6 | Eligible `status: ready` designs |

**Studio surface:** Settings → AI Enrichment → **Catalog Reprocessing** (`SettingsPage.tsx` / `aiEnrichment` tab). Environment (**DEV** / **PRODUCTION**) displayed prominently from configured Firebase project.

**Before start:** eligible count, exclusions, Catalog Processing Mode (when relevant), confirmation. Production requires high-impact typed confirmation that clearly identifies PRODUCTION (repo phrase + server validation pattern).

**Progress (minimum):** total eligible, processed, succeeded, routed/remained Needs Review, automatically approved (if applicable), failed, retrying, skipped. Support resume, retry failed, durable history across Studio restart; pause if architecture allows safely.

**Execution:** trusted backend only — **not** a client loop that requires Studio to stay open (do not reuse `useAiProcessingQueue` for this).

### 11a.2 Slice ownership

| Slice | Responsibility |
|-------|----------------|
| **4** | Define server-authoritative architecture; owner-only permissions; Studio UX; durable/resumable job state; rate/isolation; env safety; Catalog Processing Mode interaction; implement shared control-plane/job infra if Formal Review requires it for 5/6. **Do not** run Needs Review migration or Ready backfill in Slice 4. |
| **5** | Enable **Reprocess AI Review Queue**; honor Catalog Processing Mode (§12); preserve staff edits per Slice 5 plan; failure isolation; resumable/idempotent |
| **6** | Enable **Reprocess Ready Catalog**; keep `ready` throughout; Catalog Processing Mode must **not** alter lifecycle; Smart Profile + Algolia via existing sync; preserve title/description/category by default; tags until separate retirement gate |

### 11a.3 Architecture guidance (repo-audited) — **locked by Slice 4 Formal Review (2026-08-25)**

| Pattern | Role |
|---------|------|
| `backfillPrintRequestQueueTab` | **Start gates only:** owner gate, typed phrase, dryRun, eligibility preview |
| `emailDeliveryJobs` + `onEmailDeliveryJobCreated` | **Selected processing pattern:** durable job doc + backend worker, lease, Studio disconnect |
| Algolia `syncPortalCatalogDesignToAlgolia` / reconcile | Only search publication path for ready reprocess |

**Decision (Slice 4 Formal Review):** Collection `catalogReprocessJobs` + worker; soft pause (finish current design, stop claiming, checkpoint); one active job per `(projectId, targetType)`. Do **not** use Studio client loops or `useAiProcessingQueue` for bulk catalog migration. Do **not** invent Cloud Tasks. Detail: `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-slice-4-plan.md` §C + `docs/workflow/reviews/2026-08-25-smart-catalog-intelligence-slice-4-review.md`.

### 11a.4 Permissions & safety

- **Owner-only** in Studio presentation and trusted backend authorization
- Same feature code for DEV/PROD; project isolation absolute
- Bounded concurrency; resumable; idempotent; per-design isolation; no duplicate designs; no accidental status changes; no tag retirement or category auto-creation from reprocess alone; rejected/archived excluded by default

---

## 12. Needs Review reprocess (Slice 5)

- Input: designs with `aiReviewStatus: needs_review` (not rejected)
- Use original artwork + existing metadata as hints
- Preserve authoritative staff edits on approved fields (if any partial — unlikely in needs_review)
- Regenerate Smart Profile; run automation policy
- **Owner starts via Catalog Reprocessing → Reprocess AI Review Queue** (§11a) — not ad hoc scripts
- **Must honor active Catalog Processing Mode** (§7):

| Active mode | Reprocess behavior |
|-------------|--------------------|
| Manual | Reprocess metadata/intelligence; review remains required |
| Shadow | Record what would auto-approve; designs remain Needs Review |
| Autonomous | Qualifying designs may auto-approve under owner-approved policy; unresolved remain Needs Review; failures isolated |

- Any additional migration-specific safeguard discovered during Slice 5 planning still applies
- Track metrics: would-auto-approve vs automatically approved, verifier outcomes, remaining manual, title repairs, category disagreements
- **Do not** combine with ready backfill
- Job must be resumable/idempotent with per-design failure isolation

---

## 13. Ready catalog backfill (Slice 6)

- Eligible: `status: ready`
- **Owner starts via Catalog Reprocessing → Reprocess Ready Catalog** (§11a)
- **Default:** preserve published `title`, `description`, `categoryId`; legacy `tags` as hints only
- Generate Smart Profile + Search Concepts + Algolia expansion via **existing** sync/reconcile architecture (no parallel publisher)
- Design stays `ready` throughout — **never** route to Needs Review solely for backfill
- **Catalog Processing Mode MUST NOT change lifecycle state for ready-catalog backfill.** Those designs are already published. Manual / Shadow / Autonomous must not send ready designs through approval lifecycle merely because they are being backfilled.
- Bounded/resumable/checkpointed/rate-aware job (callable/worker + durable progress — finalize in Slice 4/6 Formal Review)
- Rate/cost limits: configurable; owner triggers in DEV first; PRODUCTION confirmation required

**Legacy tag retirement (unchanged):** Tags remain temporary compatibility data through Slices 2–5. Final retirement remains Slice 6 after Smart Profile coverage, Search Intelligence proof, Smart Filter/search parity, ready backfill complete, and **owner approval**. Coexistence in Slices 2–5 must not be reinterpreted as making legacy tags permanent. Reprocessing alone must **not** retire tags.

---

## 14. Algolia migration / cutover (Slice 3)

> **Slice 3 detail plan:** `docs/workflow/plans/2026-08-24-smart-catalog-intelligence-slice-3-plan.md` (Plan + Formal Review gate before implement).

### 14.0 Repo baseline (audited 2026-08-24)

- Record: `objectID`, `title`, `searchText`, `categoryId`, `categoryName`, `tagIds`, `tagFacetKeys`, `readyAtMs`
- Settings: `searchableAttributes: title, searchText, categoryName, unordered(tagFacetKeys)`; facets `filterOnly(tagIds)`, `filterOnly(categoryId)`, `tagFacetKeys`; `customRanking: desc(readyAtMs)`
- Classifier **does not** include `smartProfile` today — Slice 3 **must** add it to `INDEX_FILTER_FIELDS`
- Objects: **search-only** (owner decision) — not customer Smart Filter facets

### 14.1 Record expansion (additive)

```typescript
// On PortalCatalogAlgoliaRecord — public-safe only
subjects?: string[];
objects?: string[];          // searchable, NOT faceted
styles?: string[];
themes?: string[];
interests?: string[];
professionsGroups?: string[];
occasions?: string[];
places?: string[];
colors?: string[];
visibleText?: string[];      // searchable, not customer facet
searchConcepts?: string[];   // searchable, not customer facet
smartProfileVersion?: string;
```

Legacy `searchText` / tags retained for coexistence and for ready designs without Smart Profiles.

### 14.2 Index settings (server-only)

- Ordered `searchableAttributes`: title → structured identity/intent (subjects, professionsGroups, occasions, places, themes, interests, styles, categoryName, colors) → searchConcepts → visibleText → objects → searchText → tagFacetKeys
  - **Owner 2026-08-24:** Search Concepts must **not** rank above evidence-grounded structured fields
- Facets: subjects, styles, themes, interests, professionsGroups, occasions, places, colors (+ existing tag/category facets)
- Keep legacy `tagIds` / `tagFacetKeys` during coexistence
- Version settings in `ensurePortalCatalogAlgoliaIndexSettings`

### 14.3 Cutover

1. Deploy Functions builder + **classifier** updates (`smartProfile` → index-filter)
2. Dev reconcile dry-run → apply (DEV only)
3. Expand Portal/Studio Smart Filters UI behind flag
4. Production: separate owner checkpoint for reconcile + flag enable

### 14.4 Rollback

- Feature flags for Smart Filters UI
- Revert record builder / settings; reconcile
- Legacy tag search remains until Slice 6 retirement

### 14.5 Slice 2 QA carry-forward (search design)

- Prefer title identity over requiring Search Concepts to duplicate title phrases (Highland cow)
- Search Concepts = alternate discovery language
- Structured facets more evidence-constrained than Search Concepts
- Do not treat `shadow_would_auto_approve` as search quality signal

---

## 15. Legacy tag retirement (Slice 6 — owner checkpoint)

** Preconditions per design:**

1. Smart Profile write + validation OK
2. Algolia sync OK or recoverable via reconcile
3. Smart Filter parity spot-checks pass

**Progressive retirement:**

1. Hide Tag Management UI (owner flag)
2. Stop tag reranker / suggested-new-tag author calls
3. Remove tag facets from Portal/Studio UI
4. Archive `tags` collection (soft — keep read for audit)
5. Remove taxonomy materialization triggers if unused
6. Update ADR-FP-041 lineage — document supersession

**Preserve:** historical workflow docs; migration audit log

---

## 16. Automation health / observability (compact)

**Studio surface (proposed):** extend AI Review or Settings → "Automation Health" panel

Must understand **active Catalog Processing Mode** and distinguish:

| Metric class | Meaning |
|--------------|---------|
| analyzed | Designs that completed enrichment decision path |
| would-auto-approve | Shadow (or Manual-internal) policy would publish — **not** a real approval |
| automatically approved | Real Autonomous publications only |
| targeted verifier invoked / confirmed / unresolved | Verifier funnel |
| routed to Needs Review | Exception inbox count |
| retries / failures | Isolation health |
| category-gap cases | Gap intelligence volume |

Also retain: index/publish failures, Smart Profile version coverage %, title repair %, manual review %.

Do not overbuild dashboards beyond this lightweight Automation Health scope.

Implementation: aggregate from Firestore queries + existing pipeline logs — not a new analytics platform.

---

## 17. Learning from corrections

- Record staff overrides: `catalogCorrectionEvents/{id}` with field, before, after, designId, timestamp
- No self-training or silent prompt mutation
- Periodic human review of correction patterns → manual prompt/version bumps

---

## 18. Cost / latency estimate

**Baseline (current lean path, per design):**

- 1× Gemini vision call (primary enrichment)
- Optional: tag rerank (settings default **off**), suggestion author (default **off**)

**Target architecture incremental cost (estimated):**

| Slice | Additional calls | Notes |
|-------|------------------|-------|
| 2 | +0 (shadow fields in same JSON) | Same single vision call if prompt expanded modestly |
| 4 | +0–2 | Verifier + title repair **conditional** only |
| 5–6 backfill | N × (1 + conditional) | Bounded rate; reuse dev cost fields in `DesignAiSuggestions` |

Use existing `estimatedCostUsd` / token fields for dev measurement. Prompt expansion for Smart Profile dimensions: monitor token usage in playground before production.

**Latency:** Sequential queue unchanged; per-design latency may increase 0–4s if verifier/title repair triggers (~15–25% of designs target).

---

## 19. Security / permissions

| Action | Authority |
|--------|-----------|
| Auto approve → ready | **Cloud Functions only** (new) |
| Category create | Owner/human only (unchanged) |
| Backfill / reprocess jobs | **Owner-only** callable/worker (Catalog Reprocessing §11a; Formal Review may record admin exclusion vs existing AI settings owner+admin) |
| Algolia reconcile | Owner/admin callable (existing) |
| Smart Profile write during AI | Functions pipeline (existing pattern) |
| Client design writes | Must not set automation fields or bypass review without role |

**Rules updates (Slice 2+):** validate new fields; deny client writes to `smartProfile.provenance.automationDecision` except staff nulling?

**Secrets:** Gemini key in Secret Manager only — unchanged.

---

## 20. ADR changes required

| ADR | When | Summary |
|-----|------|---------|
| **ADR-FP-144** Unattended catalog approval under Catalog Processing Mode | Before live auto-approve (Slice 4 gate) | Dual gate: mode + `catalogAutonomousLiveEnabled`; staff exception inbox |
| **ADR-FP-NEW-2** Smart Profile / search intelligence | Slice 2 signoff | Supersedes approved-tag taxonomy as discovery source |
| **ADR-FP-041 amendment** | Slice 6 | Document tag taxonomy retirement |
| **ADR-FP-080 amendment** | Only if halftone automation approved | Separate checkpoint |

---

## 21. Rollback strategy by slice

| Slice | Rollback |
|-------|----------|
| 2 | Stop writing `smartProfile`; revert prompt version; no publication change |
| 3 | Disable Smart Filter flags; revert Algolia builder; reconcile legacy-only |
| 4 | Disable automation; force shadow mode; staff approval only |
| 5 | Stop reprocess job; designs retain last good state |
| 6 | Stop backfill; keep legacy tags; Smart Profile optional fields ignored by search |

---

## 22. Test matrix by slice

| Slice | Automated | Manual DEV QA |
|-------|-----------|---------------|
| **1** | Doc consistency | N/A |
| **2** | `npx tsx --test functions/src/ai/**/*.test.ts`, smart profile validation tests (new), parser tests | Import batch → AI Review shows Smart Profile shadow; title quality spot-check |
| **3** | Algolia record tests, facet tests, search containment tests | Portal/Studio search examples (synonym, profession, location queries) |
| **4** | Verifier routing tests, queue non-blocking tests, automation decision tests | Shadow metrics review; owner checkpoint |
| **5** | Reprocess idempotency tests | Needs Review backlog sample |
| **6** | Backfill checkpoint/resume tests | Ready designs remain published; search parity |

**Standard commands:** `docs/standards/TESTING.md` — lint, Studio/Portal typecheck, Functions build, `npm run test:rules` if Rules change.

---

## 23. Human checkpoints

| Checkpoint | When |
|------------|------|
| **Plan + Review approval** | Before Slice 2 (complete) |
| Title word-cap change (if needed) | After Slice 2 metrics |
| Catalog Processing Mode — live Autonomous enable | After Slice 4 implement + ADR revision + owner typed confirmation + environment gate |
| Enable Catalog Processing Mode setting (non-autonomous) | Slice 4 deploy — fail-safe Manual; owner may choose Shadow |
| Halftone automation | Separate; ADR-FP-080 |
| Dev Algolia Smart Filter cutover | Slice 3 |
| Needs Review reprocess (dev) | Slice 5 start |
| Ready catalog backfill (dev) | Slice 6 start |
| Production Functions deploy | Each slice promotion |
| Production Algolia reconcile | Slice 3+ |
| Legacy tag retirement | Slice 6 end |

---

## 24. Six-slice execution plan

### Slice 1 — Baseline (this document)

Deliverables: inventory, schema proposal, migration plan, superseded goal cleanup, ADR list, Slice 2 file list. **NO runtime changes.**

### Slice 2 — Smart Profile foundation + shadow mode

Implement typed contract, prompt additions, normalization, validation, shadow automation decisions, optional halftone shadow, import batch fields. **No auto-approve; no tag removal; no Portal cutover.**

### Slice 3 — Search Intelligence + Algolia + Smart Filters

**Detail plan:** `docs/workflow/plans/2026-08-24-smart-catalog-intelligence-slice-3-plan.md`

Algolia record expansion from Smart Profile; ordered searchableAttributes; customer Smart Filters (Objects search-only); legacy tags coexist; classifier must sync `smartProfile`; DEV reconcile only (no ready Smart Profile backfill). **No Catalog Processing Mode setting.** Catalog workflow remains non-autonomous unless separately authorized.

### Slice 4 — Autonomy engine + Catalog Processing Mode + verifier + Catalog Reprocessing control plane + conditional title repair

**Required deliverables:**

- Catalog Processing Mode setting (`manual` \| `shadow` \| `autonomous`) on `settings/aiEnrichment`
- Server-authoritative mode resolution in enrichment/approval path
- Fail-safe default (`manual` when missing/invalid)
- Owner Settings UX (AI Enrichment → Catalog Processing Mode)
- Active mode visibility in AI Processing / AI Review
- Automation decision engine + targeted verifier + confidence/evidence routing
- Category ambiguity + category-gap intelligence hooks
- Retry/isolation behavior preserved
- Automation Health mode-aware metrics (shadow vs real approvals)
- Required ADR/workflow revision (DATA_MODEL staff-approval doctrine + ADR-FP-NEW-1)
- Explicit owner gate + typed confirmation before live Autonomous operation
- **Catalog Reprocessing control plane (§11a):** owner-only Studio UX; environment display; job architecture (durable/resumable); permissions; rate/isolation; PRODUCTION confirmation pattern; wiring hooks for Slice 5/6 actions — **do not execute** Needs Review backlog or Ready backfill in Slice 4

Implementing the setting / control plane does **not** itself authorize live Autonomous publication or Slice 5/6 bulk runs.

### Slice 5 — Needs Review reprocess + calibration

Backlog only via **Reprocess AI Review Queue**; tune thresholds. **Honors active Catalog Processing Mode** (§12). Uses Slice 4 control plane.

### Slice 6 — Ready backfill + tag retirement

Owner checkpoint for retirement. **Reprocess Ready Catalog** via §11a; **Ready backfill ignores Catalog Processing Mode for lifecycle** (§13). Uses Slice 4 control plane + existing Algolia sync.

---

## 25. Files expected to change in Slice 2

### Shared types / utils

- `packages/shared/src/types/catalog/smartProfile.types.ts` (new)
- `packages/shared/src/utils/smartProfileNormalization.ts` (new)
- `packages/shared/src/utils/smartProfileValidation.ts` (new)
- `packages/shared/src/types/ai/aiProcessing.types.ts` (extend)
- `packages/shared/src/constants/aiEnrichment.constants.ts` (prompt template placeholders)

### Functions

- `functions/src/ai/catalogTitleRules.ts` (prompt version bump → v27)
- `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/catalogThemeCategoryResolver.ts`
- `functions/src/ai/prepareAiAnalysisImage.ts` (optional contrast variant)
- `functions/src/ai/smartProfileBuilder.ts` (new — maps AI JSON → DesignSmartProfile)
- `functions/src/ai/automationDecisionShadow.ts` (new)
- Tests alongside each module

### Studio

- `apps/studio/.../designs/types/design.types.ts`
- `apps/studio/.../imports/services/importOrchestrationService.ts` (batch fields)
- `apps/studio/.../imports/services/importBatchOrchestrationService.ts`
- `apps/studio/.../ai-review/components/*` (read-only Smart Profile display)

### Docs (behavior change)

- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md`
- `docs/project/DECISIONS.md` (ADR-FP-NEW-2 draft)

### Explicitly NOT in Slice 2

- Algolia record changes
- Auto-approval to `ready`
- Tag Management removal
- Production backfill

---

## Scope

### In Scope

- Full Smart Profile architecture across six slices
- Catalog Processing Mode (Manual / Shadow / Autonomous) as Slice 4 deliverable
- **Catalog Reprocessing** owner-only control plane (Slice 4) + AI Review Queue / Ready Catalog actions (Slices 5–6) — §11a
- Shadow → gated Autonomous (ADR + owner checkpoint)
- Algolia Smart Filters
- Needs Review reprocess + ready backfill (separate; Studio-triggered)
- Legacy tag retirement after parity
- Supersede `portal-tag-alias-search-discoverability`

### Out of Scope

- Phase 9 / Assisted Creation / Print Request / Show Queue changes
- Production lifecycle on `designs` without owner gates
- Self-training / autonomous prompt mutation
- Automatic halftone enablement (shadow only until ADR)
- Ecommerce / billing
- Implementing Catalog Processing Mode or Catalog Reprocessing runtime in Slice 2 or Slice 3
- Client-side bulk reprocess loops that require Studio to stay open

---

## Owner decisions still required

| # | Decision | Default if deferred |
|---|----------|---------------------|
| 1 | Approve Plan + Review to start Slice 2 | Done (owner APPROVE PLAN) |
| 2 | Lower lean word cap from 24? | Keep 24; enforce 200-char + prompt only until Slice 2 metrics |
| 3 | Enable live Autonomous after Slice 4 ADR + evidence | Remain Manual/Shadow; never auto-default Autonomous |
| 4 | Smart Filter facet dimensions for Objects | Search-only (not faceted) — owner decided |
| 5 | Legacy tag retirement | Indefinite coexistence until Slice 6 owner gate |
| 6 | Production backfill timing | Dev only until explicit approval |
| 7 | Autonomous live enable + Catalog Reprocessing role | **Locked Slice 4 FR:** owner-only (stricter than AI enrichment settings owner+admin). Admin not included unless owner overrides. |

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Title quality regression | High | Slice 2 shadow QA; preserve lean title helpers; conditional repair only |
| Algolia record bloat | Medium | Field limits; reconcile tests |
| Auto-approve false positives | High | Catalog Processing Mode; Shadow calibration; fail-safe Manual; ADR + owner Autonomous gate |
| Missing settings → accidental Autonomous | Critical | Deterministic fail-safe to `manual`; never default Autonomous |
| Batch field migration | Low | Additive optional fields |
| Tag retirement breaks search | High | Coexistence until Slice 6 gate; rollback flags |
| Cost increase | Medium | Conditional verifier/repair; rate limits on backfill |

---

## Documentation updates (by slice)

- Slice 2: DATA_MODEL, BACKEND, DECISIONS (Smart Profile ADR)
- Slice 3: ARCHITECTURE (search), DEPLOYMENT (Algolia)
- Slice 4: DECISIONS (unattended approval ADR), WORKFLOWS, DATA_MODEL (staff-approval doctrine amendment), BACKEND (catalogWorkflowMode)
- Slice 6: DATA_MODEL (tag retirement), ROADMAP

---

## Approval

- Master review: `docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-unattended-enrichment-review.md` — **approved_with_changes**
- Plan amendment review: `docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-catalog-processing-mode-plan-amendment-review.md`
- Slice 4 Formal Review (full implement gate) remains required before Slice 4 code changes
