# Backend and AI Pipeline

## Firebase stack

| Service | Use |
|---------|-----|
| Firebase Auth | Staff + customer identity |
| Firestore | Metadata, settings, profiles, requests, uploads |
| Cloud Storage | Catalog originals/derivatives + customer-upload objects |
| Cloud Functions | Provisioning, AI enrichment, Portal/show callables, **customer upload finalize** |

No custom REST API for core ops. Business logic in app services + Cloud Functions.

Deploy target for current work: **`fresh-prints-prod`** is live under Goal #13; still require explicit
owner phrases for production deploys / catch-up / Stage 2 / domain.

### Generated catalog publication recovery (ADR-FP-120 amendment, 2026-07-31)

- Tag/category edits remain full `index-filter` republishes of `generated/portal-catalog/**`
- Transient Storage/`FetchError` retries + catch-up loop (no lease-busy abandon of higher `requestedGeneration`)
- Owner/admin callable `retryPortalCatalogPublication` drains dirty watermark without bumping generation
- Production catch-up published portal-catalog generation **9**; slice signed off (owner QA PASS)

### Brand logos (ADR-FP-114)

- Firestore `settings/brandLogos` (public read; client writes denied)
- Storage `brand/{studio|portal}/{full|collapsed}/…` (owner create; PNG ≤ 2 MiB)
- Callables: `finalizeBrandLogoSlot` (Admin-derived metadata/URL), `updateBrandLogoDisplaySizes` (AR-locked boxes; separate Portal header vs sidebar; defaults height 52)
- Soft-deployed to **fresh-prints-dev** 2026-07-22; **production** Functions/rules/storage still need explicit APPROVE
- Splash / favicons out of scope

### Portal public browse + guest donate (ADR-FP-106)

- Guests may read ready catalog (home + `/catalog/**`); gated routes use in-shell overlay
- Guest donate: Firebase **Anonymous Auth** + existing donation callables; attribution `guest`; no unauthenticated Storage/Firestore writes
- **Deploy follow-up (owner):** enable Anonymous Auth; deploy Firestore/Storage rules + Functions before relying on cloud guest donate / public catalog rules
- **#14 Done:** `onShowAllocationCreated` soft-deployed to `fresh-prints-dev` 2026-07-21 (Recently Requested / `lastAddedToShowAt`, ADR-FP-107)

### Portal show-queue cutoff (ADR-FP-103)

- Setting: `settings/showQueue.portalQueueCutoffHoursBeforeStart` (default 5, clamp 1–72)
- `listPortalAllocatableShows` marks past-cutoff shows non-allocatable; `queuePortalPrintRequestToShow` rejects `SHOW_QUEUE_CUTOFF`
- Studio staff allocation after cutoff still allowed
- Shared util: `packages/shared/src/utils/showQueueCutoff.ts`

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
  → upscale at most once per ADR-FP-080 (`image-quality-v2`: ≤6× toward 12″; never past target; never downsample)
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

Limits (shared constants): 100 files/batch, 80 MB/image (`CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES`; distinct from the separate 100,000,000-pixel total-pixel ceiling, `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS`), 2 GB batch/ZIP, concurrency **8**, daily finalize **200**, daily create-batch **100**.

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

## Assisted Creation callables

| Callable | Role |
|----------|------|
| `submitAssistedCreationRequest` | Submit one open customer brief |
| `customerUpdateAssistedCreationRequest` | Update own brief/references while `submitted` |
| `staffUpdateAssistedCreationStatus` | Owner/admin start, resume, reject, cancel, or restore |
| `staffAddAssistedCreationProof` | Owner/admin attach proof and transition to `proof_ready` |
| `customerRespondToAssistedCreationProof` | Approve or request revisions |

Proof-ready emails are the next planned backend phase. The design will put Resend behind a provider interface, preserve the existing invite path, and keep API keys in Secret Manager rather than Firestore or Studio.

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
