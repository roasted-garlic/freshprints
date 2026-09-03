# Backend and AI Pipeline

## Customer temporary Print Request + Show quota override (ADR-FP-159 — DEV 2026-09-02)

| Callable | Purpose |
|----------|---------|
| `updateCustomerPrintRequestQuotaOverride` | Owner-only set/clear `customers/{id}.printRequestQuotaOverride`; activity events; omit undefined metadata |

Portal consumers resolve effective limits via `loadEffectivePrintRequestLimitsForCustomer`: add catalog, upload attach, duplicate, qty update, assisted proof add, `queuePortalPrintRequestToShow`. Staff / Show Move / DNP bypass unchanged. Firestore Rules: override client-immutable. Corrective DEV redeploy of owner callable for Internal Save (`expiresAtMs` omit when unset). Production **not authorized**.

## Interactive artwork enhance — WS-TOGGLE (DEV — 2026-08-31)

| Callable | Purpose |
|----------|---------|
| `setPrintRequestItemArtworkEnhanceMode` | Toggle baseline vs enhanced; first pass generates non-destructive derivative; reuse on subsequent ON |

Studio Settings also persist `defaultPrintRequestWidthInches` (WS-CONFIG). Deployed on `fresh-prints-dev` with Storage rules for `{designId}.interactive.png` staff reads. Production **not authorized**.

## Customer identity management — WS1–WS4 (DEV — complete 2026-08-30)

| Item | Value |
|------|--------|
| Program | **WS1–WS4 DONE on `fresh-prints-dev`** |
| WS4 signoff | `docs/workflow/reviews/2026-08-30-customer-account-identity-management-ws4-signoff.md` |
| Production | **NOT authorized** |

### WS2 — Transfer Username (owner)

| Callable | Purpose |
|----------|---------|
| `previewDuplicateAccountResolution` | Verified duplicate preview |
| `transferCustomerUsername` | Username transfer between verified duplicates |

### WS3 — Merge Accounts (owner)

| Callable | Purpose |
|----------|---------|
| `previewCustomerAccountMerge` | Merge preview + checksum |
| `applyCustomerAccountMerge` | Resumable merge job |
| `getCustomerAccountMergeStatus` | Job status |

Job collection: `customerMergeJobs/{jobId}` (staged checkpoints).

### WS4 — Customer activity (Studio read paths)

No new Functions required for MVP — Studio services query `printRequests`, `showAllocations`, `customerActivityEvents` with `resolveLogicalCustomerIds` for merged survivors.

### Account lifecycle callables (owner) — WS1

| Callable | Role | Deploy (DEV) |
|----------|------|--------------|
| `disableCustomerAccount` | Reversible disable — Auth disabled, `users.isActive=false`, history + username preserved | Yes |
| `restoreCustomerAccount` | Re-enable — clears disable fields, Auth enabled, `users.isActive=true` | Yes |
| `previewHardDeleteCustomerAccount` | History-free delete preview + checksum (single-use) | Yes |
| `hardDeleteCustomerAccount` | History-free Apply — identity/bootstrap only; **Apply gated to `fresh-prints-dev`** (ADR-FP-151) | Yes |
| `updateCustomer` | Staff username/displayName + resumable `propagateCustomerIdentitySnapshots` | Yes (corrective #1) |
| `tombstoneCustomerAccount` | Close Account Permanently — unchanged ADR-FP-115 semantics | Pre-existing |

**Distinctions (do not merge):**

- **Disable** — reversible; Auth disabled; all history kept; username reserved (ADR-FP-150).
- **Close / tombstone** — one-way in normal product flow; `isDeleted`; history kept; username **permanently reserved** (ADR-FP-115).
- **Hard delete** — only when eligibility proves **no** meaningful history; removes Auth + identity docs; **releases** username (ADR-FP-151); Apply dev-gated in WS1.

Portal gate: `requirePortalCustomer` rejects disabled and tombstoned customers. Mid-session disable: client listeners sign out before Firestore `callerIsActive()` denial.

**Audit:** append-only `customerActivityEvents` (staff read via Rules); not lifecycle source of truth.

**Rules (DEV):** `customerRequiredFieldsValid` WS1 field whitelist; `customerActivityEvents` / preview collection rules — deployed with WS1 + corrective #1 records.

### Portal working-request callables (corrective #4 DEV deploy)

These three import `functions/src/lib/portalWorkingPrintRequest.ts` and resolve/create **Portal-editable** continuable requests only (`portal_customer`, not internal):

| Callable | WS1 behavior |
|----------|----------------|
| `createPortalPrintRequest` | `createWorkingPrintRequestInTransaction` — legacy `studio_customer` drafts do **not** block Portal create |
| `confirmCustomerUploadsAndAttachToRequest` | `resolveOrCreateWorkingPrintRequestInTransaction` |
| `customerAddAssistedApprovedProofToPrintRequest` | same resolver |

**Not redeployed in corrective #4** (unchanged bundle; inline origin guards only):

- `addPortalCatalogDesignToPrintRequest`
- `updatePortalPrintRequestItemQuantity`
- `removePortalPrintRequestItem`
- `duplicatePortalPrintRequestItem`

### Firestore index (DEV — Studio customer picker)

Composite on `printRequests` for `listCustomerIdsWithContinuableCustomerRequests`:

| Field | Order |
|-------|-------|
| `status` | ASC |
| `isInternal` | ASC |
| `__name__` | ASC (Firestore-generated suffix) |

Query: `status in [draft, editing]` + `isInternal == false`. Index ID on dev: `CICAgNi6rIIK` (deploy record in corrective #4 dev deploy doc). **Production:** not deployed.

### Portal customer profile (prior — DEV 2026-08-27)

| Callable | Purpose |
|----------|---------|
| `updatePortalCustomerProfile` | Self-service display name + username (30-day cooldown) |
| `updateCustomer` | Staff path via shared `applyCustomerProfileUpdate` + propagation worker |

Identity snapshots propagate resumably to `printRequests` and `designIssueReports`. Propagation updates snapshot fields only — not `name`, `requestOrigin`, `isInternal`, or `customerId`.

---

## Show Queue recovery + DEV fixtures (DEV — 2026-08-30)

| Callable | Purpose |
|----------|---------|
| `previewShowProductionRecovery` | Preview Did Not Print / recovery actions incl. `requeue_unfulfilled` |
| `applyShowProductionRecovery` | Trusted apply (move / release-only) |
| `upsertDevFixtureShow` | DEV-only fixture show create/update (`fresh-prints-dev` gate) |

**Production:** NOT authorized. Recovery extends ADR-FP-149 patterns (ADR-FP-156).

---

## Smart Catalog enrichment (DEV — 2026-08-27)

| Item | Value |
|------|--------|
| Prompt | **catalog-enrich-v30** |
| Normalizer | **smart-profile-normalizer-v4** |
| Mode | **shadow** (Needs Review lifecycle preserved) |
| Live Autonomous | **OFF** (`catalogAutonomousLiveEnabled=false`) |
| Ready Catalog reprocess | **Unlocked on DEV** — Slice 6 complete; full Ready backfill done |
| Smart Profile UI | Owner/admin editing + Design Library local reconciliation (Slice 6 corrective) |
| Slice 6 | Signed off **approved_with_notes** on `fresh-prints-dev` (2026-08-27) |
| Production enrichment | Untouched |

## Firebase stack

| Service | Use |
|---------|-----|
| Firebase Auth | Staff + customer identity |
| Firestore | Metadata, settings, profiles, requests, uploads |
| Cloud Storage | Catalog originals/derivatives + customer-upload objects |
| Cloud Functions | Provisioning, AI enrichment, Portal/show callables, **customer upload finalize** |

No custom REST API for core ops. Business logic in app services + Cloud Functions.

`queuePortalPrintRequestToShow` asserts the same 200 DPI + 22″ Print Request size policy before queueing.

Deploy target: **`fresh-prints-prod`** is live under Goal #13; still require explicit owner phrases for
production deploys / App Hosting / Studio publish.

### Public shows + conversion (2026-08-22/24 — ADR-FP-141 / ADR-FP-142)

| Callable | Purpose | Prod status |
|----------|---------|-------------|
| `listPortalPublicShows` | Public Our Shows calendar | On production Git; **Gate D deploy pending** |
| `listPortalShowCatalogDesigns` | Public per-show catalog gallery | On production Git; **Gate D deploy pending** |
| `convertCustomerPrintRequestToInternal` | Customer → Internal conversion | On production Git; **Gate D deploy pending** |
| `completeStaffGangSheetAndOpenNext` | Finish sheet + reconcile Internal Printed | Updated on production Git; **Gate D update pending** |

Also deploys matching **Firestore Rules** for conversion closure fields (client spoofing blocked).

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
| `createPortalPrintRequest` | Start customer request (one Portal-editable working request; ADR-FP-071) |
| `confirmCustomerUploadsAndAttachToRequest` | Attach uploads via Portal-editable working-request resolver |
| `customerAddAssistedApprovedProofToPrintRequest` | Assisted proof attach via same resolver |
| `addPortalCatalogDesignToPrintRequest` | Add catalog design (inline `portal_customer` / `isInternal` guard; not in corrective #4 deploy) |
| `updatePortalPrintRequestItemQuantity` / `removePortalPrintRequestItem` / `duplicatePortalPrintRequestItem` | Item mutations (inline origin guards; not in corrective #4 deploy) |
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
