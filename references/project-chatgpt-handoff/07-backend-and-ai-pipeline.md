# Backend and AI Pipeline

## Firebase stack

| Service | Use |
|---------|-----|
| Firebase Auth | Staff + customer identity |
| Firestore | Metadata, settings, profiles, requests, uploads |
| Cloud Storage | Catalog originals/derivatives + customer-upload objects |
| Cloud Functions | Provisioning, AI enrichment, Portal/show callables, **customer upload finalize** |

No custom REST API for core ops. Business logic in app services + Cloud Functions.

Deploy target for current work: **`fresh-prints-dev` only** unless human approves production.

---

## Customer upload processing (Portal → Functions)

Trusted boundary (ADR-FP-073):

```
createCustomerUploadBatch (paths + quotas)
    ↓
Client uploads source object to Storage (rules-enforced)
    ↓
finalizeCustomerUpload / finalizeCustomerUploadZip
    ↓
processCustomerUploadImageBytes (sharp):
  check format → sample transparency
  → convert only if needed (e.g. WebP)
  → trim only if empty margins need it
  → upscale only if below print target
  → DPI / print-size assess → create WebP previews
  → save production (+ GCS copy when source PNG reused)
    ↓
confirmCustomerUploadsAndAttachToRequest
  (ownership required; catalogUse optional)
    ↓
Creates printRequestItems with sourceType: customer_upload
```

Staff callables: `promoteCustomerUploadToAiReview`, `excludeCustomerUploadFromCatalog`, `restoreCustomerUploadCatalogEligibility`, `retryCustomerUploadProcessing`.

Granular `technicalProgressStage` values power Portal progress labels (checking transparency, converting, trimming, upscaling, checking DPI, creating previews, saving).

Limits (shared constants): 100 files/batch, 100 MB/image, 2 GB batch/ZIP, concurrency **8**, daily finalize **200**, daily create-batch **100**.

---

## Portal / show callables (selected)

| Callable | Role |
|----------|------|
| `createPortalPrintRequest` | Start customer request (one working) |
| `duplicatePortalPrintRequestItem` | Duplicate line for another size |
| `listPortalAllocatableShows` | Shows customer may join |
| `queuePortalPrintRequestToShow` | Attach full request to one show (no override / no re-queue) |
| `getPortalShowPrintProgress` | Progress for Printing tab |

---

## AI enrichment (Studio catalog)

Current prompt target: **`catalog-enrich-v21`** (Gemini vision; business-context framing). Provider key: Firebase Secret Manager (`GEMINI_API_KEY`). Settings: `settings/aiEnrichment` (vision model, optional tag rerank / suggestion author modes — defaults **off**).

```
enqueueAiEnrichment → onDesignAiEnrichmentQueued
  → load settings/categories/tags → vision call → parse
  → server tag/category resolve → write aiSuggestions
```

Optional second passes: tag rerank (`catalog-tag-rerank-v1`), suggestion author (`catalog-suggested-tag-author-v1`) — see ADR-FP-042 / ADR-FP-043.

**Team user functions:** `createTeamUser`, `updateTeamUser`.

**Playground / diagnostics:** `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank` (owner/admin).

Full AI module detail lives under `functions/src/ai/` and repo `docs/architecture/BACKEND.md` / FIREBASE docs. When handoff and repo disagree, **repo wins**.

---

## Functions TypeScript note

`functions/tsconfig.json` sets `"rootDir": ".."` because it compiles `functions/src` **and** `packages/shared/src` into `lib/functions/...` + `lib/packages/...` (`main`: `lib/functions/src/index.js`).
