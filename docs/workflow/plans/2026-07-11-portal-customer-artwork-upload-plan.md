# Plan: Portal Customer Artwork Uploads and Studio Catalog Intake

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Author | Agent |
| Status | approved_with_changes — **revised 2026-07-11** (nine review lock-downs incorporated; still planning/review only) |
| Workflow | managed-phase (planning only; **does not replace** active `admin-operational-test-data-wipe`) |
| Related | `docs/workflow/reviews/2026-07-11-portal-customer-artwork-upload-review.md` — **approved_with_changes** |
| Roadmap | Phase 8 fast-follow — Customer-Provided Request Artwork (before Phase 9 Custom Request Q&A) |
| ADR draft | ADR-FP-073 (to be added in `DECISIONS.md` during implementation sub-phase A) |

### Revision note (2026-07-11)

This plan revision incorporates all nine binding changes from the review. It remains **planning/review work only**. Do **not** implement, and do **not** change the active wipe workflow goal.

---

## Goal

Plan a secure customer artwork upload workflow so Portal customers can upload technically valid transparent images, add them to their **single existing working print request**, and separately route those images into a staff-controlled Studio `/imports` intake queue for optional AI processing and eventual Design Library approval.

Customer-uploaded artwork and approved catalog designs remain **independent entities** with separate lifecycles: request-use vs catalog promotion.

**This document is planning only.** Do not implement until FreshForge Review passes and the owner approves—and until the open wipe track is formally parked or signed off (see [Implementation sequencing](#26-implementation-sequencing-around-the-open-wipe-track)).

---

## Background

### Product state (complete)

- Portal MVP, auth, catalog, Design Library, print requests, catalog add-to-request, show selection, one working request (ADR-FP-071), print progress rail
- Studio Show Queue, export, gang sheets, Imports (staff PNG/ZIP), AI Review (`catalog-enrich-v21`)
- Symmetric monorepo (`apps/studio`, `apps/portal`, `packages/shared`, `packages/show-picker`, `functions`) — signed off; **do not restructure**

### Why now

Customers can only add **ready catalog designs** to requests. There is no Portal upload UI, no `customerUploads` collection, and Storage `/customer-uploads/` is documented but **deny-all** in `storage.rules`. Staff imports are Electron/PNG-only and auto-create `designs` documents—unsuitable for untrusted public uploads.

### Active workflow constraint

`.cursor/workflow/state.md` goal remains **`admin-operational-test-data-wipe`** (implement/test, not signed off). This plan is a **parallel planning artifact**. It must not overwrite wipe state, claim wipe DONE, or start a second implementation track under one FreshForge goal.

**Recommendation:** Complete Review on this plan now. **Park this feature for implementation** until the owner either (a) signs off wipe, or (b) formally parks wipe and switches the managed goal to this feature. Do not silently run two implementation tracks.

### Related docs / ADRs

| Doc | Relevance |
|-----|-----------|
| ADR-FP-071 | One working Portal request |
| ADR-FP-047 | Print Request DPI display |
| ADR-FP-044 | `catalog-enrich-v21` |
| ADR-FP-068 | Wipe designs target |
| `print-size-dpi-normalization-plan.md` | Shared DPI / 3000px upscale |
| `2026-07-06-import-auto-upscale-plan.md` | Studio upscale |
| `2026-07-10-admin-operational-test-data-wipe-plan.md` | Wipe extension points |
| `2026-07-11-portal-one-working-request-plan.md` | Working-request rules |
| `2026-07-10-portal-catalog-add-to-request-plan.md` | Catalog → request UX |

---

## Scope

### In Scope

- Customer image uploads (single, multiple, folder via browser, ZIP)
- First-release formats: transparent PNG + static transparent WebP
- SVG security decision (defer)
- Trusted transparency validation; 10″ @ ≥300 DPI / ≥3000 px width; Studio-aligned normalization
- Dedicated `customerUploads` (+ batches) persistence
- Ownership + catalog-use confirmations (persisted)
- Attach to one working request; typed request-item source union
- Show Queue / export / gang-sheet source resolution for customer uploads
- Studio `/imports` customer-upload intake (Send to AI Review / Do not add to catalog)
- Idempotent promotion → `designs` `imported` + existing AI enqueue
- Firestore + Storage rules; limits; cleanup; wipe integration planning
- Tests + documentation + ADR

### Out of Scope

- Auto-publish to Design Library; auto-AI before staff action
- Background removal; customer catalog approval; customer Studio access
- Second working request; replacing AI Review or Print Request workflows
- Phase 9 Custom Request Q&A; ecommerce/payment/shipping; native apps
- Raw SVG rendering; production deploy without approval; monorepo restructure
- AI enrichment prompt changes; unrelated wipe bug fixes
- Modifying wipe implementation during **this planning** task

---

## Affected Areas

### Files / Modules (expected)

#### Shared (`packages/shared`)

- New types: `src/types/customerUpload/` (upload + batch + status enums + confirmation)
- `src/types/printRequest/printRequest.types.ts` — item source union; `designId` no longer universally required
- `src/types/showAllocation/showAllocation.types.ts` — optional `customerUploadId` / source snapshots
- `src/types/gangSheet/gangSheet.types.ts` — upload-backed `GangSheetItem` source fields + production path snapshot
- `src/constants/design/designStoragePaths.ts` or new `customerUploadStoragePaths.ts`
- `src/utils/printSizeMath.ts` / `printRequestItemSizing.ts` — reuse; no duplicate DPI formulas
- New: transparency assessment utils (pure, testable)
- New: customer upload limit constants (separate from staff `batchImportLimits`)
- `src/utils/operationalWipeTargets.ts` + wipe types — new wipe target(s) (sub-phase G)
- `firestoreCollections` / shared collection name constants if centralized

#### Functions (`functions/src`)

- New callables (names conceptual): `createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip`, `confirmCustomerUploadsAndAttachToRequest`, `promoteCustomerUploadToAiReview`, `excludeCustomerUploadFromCatalog`, optional `retryCustomerUploadProcessing`
- Prefer **finalize-after-Storage-upload** over large callable bodies; evaluate Storage `onObjectFinalized` only as secondary/abandoned-processing aid
- Update `onPrintRequestItemCreated.ts` — skip `designs.requestCount` unless `sourceType` is `catalog_design` (empty `designId` already no-ops; keep explicit)
- Update `queuePortalPrintRequestToShow.ts` — copy source fields / resolve snapshots without requiring catalog `designId`
- Extend `wipeOperationalTestData.ts` when wipe integration ships
- `index.ts` exports
- **Deploy with sub-phase B:** `firestore.rules`, `storage.rules`, `firestore.indexes.json` (before Portal UI)

#### Portal (`apps/portal`)

- New feature folder: `features/customer-uploads/` (components, hooks, services)
- `features/print-requests/` — item cards, detail view, create/attach flows; selection mode must not assume every item has `designId`
- Request detail + empty/catalog CTAs for upload
- No Electron / Node filesystem imports

#### Studio (`apps/studio`)

- `features/imports/` — customer-upload intake tab/section on `ImportsPage` (`/imports`)
- Services/hooks for listing pending uploads, promote/exclude
- Show Queue / export / gang sheet asset loaders — resolve customer-upload production path
- Permissions: intake view vs promote
- Electron **not** used for Portal uploads; staff intake is Firestore/Storage only

#### Rules / indexes

- `firestore.rules`, `storage.rules`, `firestore.indexes.json` — **ship in sub-phase B** (trusted backend), before Portal upload UI is enabled

#### Docs

- `DATA_MODEL.md`, `ARCHITECTURE.md`, `SECURITY.md`, `BACKEND.md` / `FIREBASE.md`, `TESTING.md`, `ROADMAP.md`, `DECISIONS.md` (ADR-FP-073), `RISK_REGISTER.md`, wipe docs, `CURRENT-STATE.md` (at signoff)

### Architecture Impact

- [x] Details: New domain entity (`customerUploads`) parallel to `designs`. Portal Component → Hook → Service → Firebase/callable. Studio same; no Portal→Electron. Trusted decode/process in Cloud Functions (sharp). Shared pure math/types in `packages/shared`.

### Security Impact

- [x] Details: Untrusted public uploads; new Storage namespace; new Firestore collections; staff promotion path; rate/limit controls; rules deploy = human checkpoint. See [Security](#security-requirements).

### Data Model Impact

- [x] Details: New collections; print request item + show allocation source fields; no write of request/production statuses onto `designs.status`.

### Backend Impact

- [x] Details: Multiple new callables; optional Storage trigger; wipe target extension; memory/timeout for image processing (target ≥512MiB / 180s like AI enqueue).

### UI / UX Impact

- [x] Details: Portal upload UX; Studio Imports intake; confirmation wording (human legal checkpoint); manual QA required.

### Migration Impact

- [x] Forward: Additive fields on `printRequestItems` / `showAllocations` / `gangSheetItems`; legacy items without `sourceType` treated as `catalog_design`. No destructive migration. Optional backfill `sourceType: "catalog_design"` not required if readers default.
- [x] Rollback: Feature-flag or undeploy callables + deny Storage writes; legacy catalog items unchanged.

---

## Repo inspection summary (resolved paths)

### Print requests / working request

| Area | Path |
|------|------|
| Item type | `packages/shared/src/types/printRequest/printRequest.types.ts` — `designId: string` **required today** |
| One-working rule | `packages/shared/src/utils/portalOneWorkingPrintRequest.ts`; ADR-FP-071 |
| Create callable | `functions/src/createPortalPrintRequest.ts` |
| Portal service | `apps/portal/features/print-requests/services/portalPrintRequestService.ts` |
| Catalog add flow | `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` |
| Request detail | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` |
| Item card | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` |

### Studio import / DPI / storage

| Area | Path |
|------|------|
| Upscale | `apps/studio/electron/services/import/upscaleImportImage.ts` + `packages/shared/src/utils/printSizeMath.ts` → **3000 px** at 10″×300 DPI |
| Print size constants | `packages/shared/src/constants/printSize.constants.ts` |
| Design storage | `packages/shared/src/constants/design/designStoragePaths.ts` — `originals/`, `thumbnails/`, `previews/` only |
| Source vs production | **Studio stores one normalized PNG** as `originals/{designId}.png` — no separate untouched source blob |
| ZIP limits (staff) | `packages/shared/src/constants/import/batchImportLimits.constants.ts` — 2.1 GB / nested depth 3 — **do not copy to customers** |
| SVG import | **None** — PNG only in Studio import |
| Imports UI | `apps/studio/.../features/imports/pages/ImportsPage.tsx` route `/imports`, permission `importDesigns` |
| Catalog approve | `catalogApprovalService.ts` — owner/admin |
| AI enqueue | `functions/src/enqueueAiEnrichment.ts`; prompt `catalog-enrich-v21` |

### Functions / rules / wipe

| Area | Finding |
|------|---------|
| Storage triggers | **None** today |
| App Check / HTTP rate limit | **Not implemented** on callables |
| `customerUploads` | **Does not exist** |
| Portal upload UI | **None** (catalog Storage is read-only download URLs) |
| `/customer-uploads/` in rules | Documented; **deny-all** catch-all |
| Wipe extension | `operationalWipeTargets.ts` + `wipeOperationalTestData.types.ts` + Studio wipe UI options |

### Collection naming

Active collections use **camelCase plural** (`printRequests`, `printRequestItems`, `showAllocations`). Plan uses `customerUploads` and `customerUploadBatches`.

---

## Approach

### Recommended architecture

```text
Portal (authenticated customer)
  → callable: createCustomerUploadBatch (+ per-file upload records for direct images)
  → client uploads:
       • images → canonical source path per uploadId
       • ZIP → canonical batch ZIP path (not browser-extracted)
  → callable: finalizeCustomerUpload (per image) OR finalizeCustomerUploadZip
       • ZIP: server extracts → creates per-file customerUploads + sources; nested ZIP rejected
       • then trusted validate + process + derivatives per file
  → client shows per-file Ready / Failed
  → customer checks ownership + catalog-use confirmations
  → callable: confirmCustomerUploadsAndAttachToRequest (see attach invariants)
       └─ sets catalogReviewStatus = pending_staff_review

Studio /imports intake
  → staff Send to AI Review (idempotent promote → designs imported + enqueueAiEnrichment)
  → or Do not add to catalog (exclude; request asset unchanged)
```

**Folder vs ZIP:** Folder / multi-select = browser sends individual image files (each gets its own upload record + `finalizeCustomerUpload`). ZIP = client uploads the archive once; **only the server** extracts into per-file `customerUploads`. Nested ZIPs are rejected.

**Why not large callable bodies:** Firebase callable payload limits and timeouts make ZIP/image bodies unsafe. **Why not Storage-trigger-only:** harder to bind Auth + confirmations + idempotent business writes; finalize callable after upload is clearer. Optional `onObjectFinalized` may later reclaim abandoned sources—not required for v1 if finalize + TTL cleanup exist.

**Deploy gate (review lock-down #1):** Firestore rules, Storage rules, and required indexes deploy as part of the **trusted-backend** sequence (sub-phase **B**), **before** Portal upload UI is enabled (sub-phase **C**). Portal CTAs stay hidden/disabled until that backend+rules deploy is live.

### Attach callable invariants (review lock-down #8)

`confirmCustomerUploadsAndAttachToRequest` (name conceptual) **must**:

1. **Require an authenticated Portal customer** (`requirePortalCustomer` / equivalent).
2. **Verify upload and batch ownership** (`customerUid` / `customerId` match the caller).
3. **Require both confirmations**, a known `termsVersion`, and only uploads with `technicalStatus === ready`.
4. **Reuse ADR-FP-071’s transactional one-working-request creation gate** when creating a request (same transactional check as `createPortalPrintRequest`).
5. **Attach to the existing working request** (`draft` / `editing`) **or create one only when none exists**.
6. **Fail closed** if more than one continuable request unexpectedly exists.
7. **Do not display a working-request picker** in Portal upload UX (no multi-working pick branch).
8. **Make attachment idempotent:** if a `printRequestItem` already exists on the target request for the same `customerUploadId`, do not create a duplicate item; return success with the existing item id(s).

### ADR-FP-073 scope (review lock-down #9)

When written in sub-phase A, ADR-FP-073 **must** state that:

- Customer-provided **request artwork** (`customerUploads`) is a Phase 8 fast-follow for print-request assets.
- It is **separate from** Phase 9 `customRequests` and the Custom Request Q&A / Etsy referral workflow.
- Reuse of the `/customer-uploads/` Storage prefix does **not** mean Phase 9 custom-design intake is in scope for this feature.

---

## Required planning decisions (1–27)

### 1. Exact upload and batch schemas

**Collections:** `customerUploadBatches`, `customerUploads` (camelCase plural).

**`customerUploadBatches`**

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Doc ID |
| `customerUid` | string | Firebase Auth UID |
| `customerId` | string | `customers` doc ID |
| `printRequestId` | string \| null | Set when attached |
| `status` | enum | `open` \| `confirmed` \| `abandoned` \| `failed` |
| `fileCount` | number | Declared / accepted count |
| `readyCount` | number | |
| `failedCount` | number | |
| `ownershipConfirmed` | boolean | Set at confirm |
| `catalogUseAcknowledged` | boolean | |
| `termsVersion` | string | e.g. `customer-upload-terms-v1` |
| `confirmedAt` | Timestamp \| null | |
| `createdAt` / `updatedAt` | Timestamp | |
| `createdBy` | string | UID |

**`customerUploads`** — see field list in Goal prompt; repository names:

| Conceptual | Persisted name |
|------------|----------------|
| technical status | `technicalStatus` |
| catalog intake | `catalogReviewStatus` |
| failure | `technicalFailureCode` (machine) + `technicalFailureMessage` (user-safe) |
| source/prod/preview/thumb paths | `sourceStoragePath`, `productionStoragePath`, `previewStoragePath`, `thumbnailStoragePath` |
| dims / print | `widthPx`, `heightPx`, `printWidthInches`, `printHeightInches`, `effectiveDpi` |
| promotion | `promotedDesignId` \| null |
| confirmations | `ownershipConfirmed`, `catalogUseAcknowledged`, `termsVersion`, `confirmedAt` |
| format | `sourceFormat`: `png` \| `webp` |
| original name | `originalFilename` |
| batch / customer / request | `batchId`, `customerUid`, `customerId`, `printRequestId` |
| transparency | `transparencyPassed: boolean`, `transparentPixelRatio?: number` |
| processing | `wasUpscaled?: boolean`, `sourceWidthPx?`, `sourceHeightPx?` |
| audit | `createdAt`, `updatedAt` |

### 2. Exact status values

**`technicalStatus`:** `awaiting_upload` → `uploading` → `validating` → `processing` → `ready` \| `failed`

**`catalogReviewStatus` (locked — review #4):**

```text
not_eligible → pending_staff_review → sent_to_ai_review
                                  ↘ excluded_from_catalog
```

| Value | Meaning |
|-------|---------|
| `not_eligible` | Pre-confirm / not yet attached to a request for staff intake |
| `pending_staff_review` | Confirmed + attached; waiting in Studio `/imports` |
| `sent_to_ai_review` | Staff promoted; `promotedDesignId` set; AI pipeline owns catalog path |
| `excluded_from_catalog` | Staff chose not to add to catalog; request asset unchanged |

**Do not** use a `promoted_to_design` status. Promotion linkage is **`promotedDesignId`** on the upload (and `sourceCustomerUploadId` on the design).

**Do not** put request/production statuses on uploads or `designs.status`.

### 3. Request-item source model

```ts
export type PrintRequestItemSourceType = "catalog_design" | "customer_upload";

export interface PrintRequestItem {
  id: string;
  printRequestId: string;
  /** Defaults to catalog_design when absent (legacy docs). */
  sourceType?: PrintRequestItemSourceType;
  /** Required when sourceType is catalog_design (legacy always has this). */
  designId?: string;
  /** Required when sourceType is customer_upload. */
  customerUploadId?: string;
  /** Display fallback for upload-backed items. */
  titleSnapshot?: string;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  // ... existing status/audit fields unchanged
}
```

Runtime invariant (enforced in services + rules where practical):

- `catalog_design` ⇒ non-empty `designId`
- `customer_upload` ⇒ non-empty `customerUploadId`; `designId` absent or ignored for catalog readiness

### 4. Backward compatibility for existing request items

- Readers: missing `sourceType` ⇒ `catalog_design`; require `designId` string as today.
- Writers: new catalog adds set `sourceType: "catalog_design"` explicitly going forward.
- No migration job required for MVP.
- Portal selection mode today keys by `designId` — **must** gain item-id / source-aware keys for upload items (detail page already uses item id for qty/size).

### 5. Trusted processing boundary

**Recommend:** authorized Storage source upload + **finalize callable** (server sharp validate/normalize/derivatives). Client preflight optional only.

Do **not** send raw ZIP/image bodies through callables as the primary path.

### 6. Direct Storage upload authorization

1. Callable creates `customerUploads` doc (`technicalStatus: awaiting_upload`) with server-generated `id` and canonical `sourceStoragePath`.
2. Storage rules: customer may **create** object only at that exact path pattern under own `customerUid`, content-type/size limited, only while doc exists and status allows upload.
3. Finalize callable verifies Auth ownership + object exists + path match; client cannot choose arbitrary paths.

### 7. PNG and WebP validation

- Accept: PNG and static WebP with meaningful transparency (decoded).
- Reject: JPEG, GIF, AVIF, HEIC, PDF, SVG (v1), animated WebP/APNG (**reject**, do not flatten in v1).
- Validate magic/signature + sharp decode; ignore claimed MIME/extension as authority.

### 8. SVG support or deferral

**Defer SVG from first release.** Repo has no reviewed SVG sanitization/rasterization import path. Do not render raw SVG inline or in iframes.

### 9. Meaningful-transparency threshold

Trusted rule (implement + unit-test; tune only with fixtures):

1. Decoded image must have an alpha channel (or WebP alpha).
2. Compute `transparentPixelRatio = count(alpha < 250) / (width * height)`.
3. **Pass** if `transparentPixelRatio >= 0.005` (0.5%) **OR** lossless trim of fully transparent edges would shrink either axis by ≥ 1%.
4. **Fail** if no alpha, ratio &lt; 0.5% and trim shrink &lt; 1% (opaque / near-opaque “fake transparent” formats).
5. Corrupt alpha / decode failure → fail closed (`could_not_decode` / `transparency_check_failed`).
6. Artwork touching canvas edges is allowed if (3) passes.
7. Do **not** auto-remove backgrounds.

Label user failure: **“Background is not transparent.”**

### 10. Customer upload limits

| Limit | Recommendation |
|-------|----------------|
| Max single image | **25 MB** |
| Max files per batch | **25** |
| Max total batch uncompressed images | **100 MB** |
| Max width or height | **15,000 px** |
| Max total pixels | **100 MP** (width×height) |
| Concurrent finalize ops / customer | **3** in flight; soft client queue |

#### Per-UID daily abuse limits (review lock-down #6) — locked

Enforced in callables (UTC calendar day). App Check remains a future enhancement and is **not** assumed present.

| Callable | Max per UID per UTC day |
|----------|-------------------------|
| `createCustomerUploadBatch` | **10** |
| `finalizeCustomerUpload` (single image) | **50** |
| `finalizeCustomerUploadZip` | **5** |

Exceeding a cap returns a user-safe `resource-exhausted` / failed-precondition style error without leaking internals. Counters may live in a small Firestore doc keyed by UID+date (Admin SDK) or equivalent; exact storage is an implementation detail within this limit contract.

### 11. ZIP extraction limits

| Limit | Recommendation |
|-------|----------------|
| Max compressed ZIP | **50 MB** |
| Max decompressed total | **200 MB** |
| Max entries scanned | **100** |
| Max compression ratio | **20:1** |
| Max image candidates extracted | **25** (same as batch file cap) |

Reuse Studio path-safety ideas (`resolveSafeZipEntryPath`) but with customer limits; extract only PNG/WebP candidates.

#### ZIP handling (locked — review #2)

1. Client uploads the ZIP bytes to a **canonical batch ZIP Storage path** (not individual extracted files).
2. `finalizeCustomerUploadZip` performs **trusted server-side extraction**.
3. Extraction creates **one `customerUploads` record per accepted image** (with its own source object under the upload namespace).
4. Each extracted file then follows the same validate/normalize/derivative path as a direct image upload (inline in the ZIP finalize or via per-file finalize — either is fine if limits and per-file outcomes are preserved).
5. **Folder selection** remains **client-side multi-file** upload (browser `webkitdirectory` / multi picker) — no server ZIP involved.
6. Browser-side ZIP unpacking is **out of scope** for the authoritative path.

### 12. Nested ZIP policy

**Reject nested ZIPs** (effective max nested depth **0**). Staff Studio depth 3 must not apply. Any `.zip` entry inside a customer ZIP fails that entry / fails the archive per the ZIP finalize contract (prefer fail the nested entry and continue other candidates only if safe; otherwise fail the ZIP with a user-safe message — implement fail-closed for the nested entry at minimum).

### 13. Source and production asset roles

Unlike Studio catalog import (single normalized `originals/{id}.png`):

- **`sourceStoragePath`** — immutable customer bytes (never overwritten by derivatives).
- **`productionStoragePath`** — normalized PNG used for print/export (trim + upscale as needed).
- **`previewStoragePath` / `thumbnailStoragePath`** — WebP derivatives (reuse Studio derivative size caps: 1280 / 320).

Catalog promotion copies or re-uploads **production** PNG into `originals/{designId}.png` and generates design derivatives per existing import rules.

### 14. Upscaling method

Reuse shared `resolveImportUpscaleTargetPx()` + sharp `.resize(..., { fit: "fill", withoutEnlargement: false }).png()` equivalent in Functions (same algorithm as `upscaleImportImageIfNeeded`). Prefer extracting shared pure target math (already shared) and a Functions-side sharp helper; do not fork DPI numbers.

Optional: apply transparent-edge trim before upscale (parity with Studio import)—**in scope** as reuse of Studio order-of-operations, not as “background removal.”

### 15. Handling images larger than 3,000 pixels (locked — review #5)

If `widthPx >= 3000` after trim: **do not downscale**.

**Locked metadata path:** build upload print-size fields exclusively via shared **`buildImportPrintSizeCreateFields`** (`packages/shared/src/utils/importPrintSizeMetadata.ts`), which uses **`calculatePrintSizeAtTargetDpi`** / **`calculateEffectiveDpi`** with the existing target-DPI constants (`TARGET_PRINT_DPI` = 300). That yields `printWidthInches` / `printHeightInches` / `effectiveDpi` from pixels÷inches — **never** metadata-only DPI claims.

Do **not** invent a second path that forces the upload record to 10″ while leaving pixel width unchanged. Customer-facing default size on the **request item** may still use existing `resolveInitialPrintRequestItemSize` (preferred ~10″ UI default) after attach; that is separate from persisted upload normalization metadata.

### 16. Promotion idempotency

Staff **Send to AI Review** in a Firestore transaction:

1. Read upload; require `technicalStatus === ready`, confirmations true, `catalogReviewStatus === pending_staff_review` (or already `sent_to_ai_review` with `promotedDesignId`).
2. If `promotedDesignId` set → return existing id; **do not** create another design or re-enqueue unless explicit owner/admin rerun path (out of scope for default click).
3. Else create `designs` doc `status: "imported"` with `sourceCustomerUploadId`, copy metadata/paths, set upload `promotedDesignId` + `catalogReviewStatus: sent_to_ai_review`.
4. After commit, call existing `enqueueAiEnrichment` once (guard with design AI state so double-invoke is safe).

Failed partial promote: if design created but enqueue failed, staff retry enqueue via existing AI tools without creating a second design.

### 17. Show Queue, export, and gang sheet source resolution

Update all paths that assume `designId` always exists (review lock-down #3 includes gang sheets):

| Area | Change |
|------|--------|
| `queuePortalPrintRequestToShow` | Copy `sourceType`, `customerUploadId`, snapshots; make `designId` optional on allocation when upload-backed |
| `ShowAllocation` | Add `sourceType?`, `customerUploadId?`; `designId?`; keep title/filename snapshots |
| `GangSheetItem` | Additive source fields (`sourceType?`, `customerUploadId?`; `designId?` when upload-backed); `originalPathSnapshot` must store the **production** path for the active source (design `originals/…` or customer-upload `production.png`) |
| Gang sheet writers | `gangSheetService.addGangSheetItem` (and related) must accept upload-backed allocations without requiring a catalog design |
| Asset loaders | `useGangSheetShowAssets` and any design join must resolve customer-upload production/preview paths |
| Export resolvers | `useExportShowZip`, `useExportGangSheetPng`, Electron export helpers — resolve production bytes from design **or** customer upload |
| `onPrintRequestItemCreated` | Increment `requestCount` **only** for `catalog_design` items (explicit `sourceType` check) |
| Summaries | `uniqueDesignCount` counts catalog design IDs only; optionally add `uniqueArtworkCount` later |

### 18. Customer deletion restrictions

- Before confirm: customer may remove failed/pending files from batch (delete source if uploaded).
- After attach to request: customer may remove **request item** only while request is `draft`/`editing` (existing rules); must **not** delete Storage production assets still referenced.
- Customer cannot delete staff-promoted design assets.
- Hard delete of upload docs/storage is staff/wipe/cleanup only.

### 19. Retention after request completion

**Recommend:** Retain upload metadata + production assets for the life of the print request (including `completed` / `archived`). No auto-delete on completion in v1. Future retention policy = separate human decision.

### 20. Retention after catalog exclusion

Keep upload + production assets; request/show/export remain valid. Exclusion only flips `catalogReviewStatus` to `excluded_from_catalog`.

**Reversal:** Owner/admin may move `excluded_from_catalog` → `pending_staff_review` if never promoted; once `promotedDesignId` exists, use normal AI/catalog tools on the design.

### 21. Cleanup of abandoned uploads

- Batches/`awaiting_upload` older than **24 hours** without finalize → mark `abandoned`; delete orphan source objects.
- `failed` sources eligible for deletion after **7 days** if not attached to a request.
- Implement via scheduled function or wipe-adjacent admin job in sub-phase G (human approve schedule deploy).

### 22. Staff permissions

| Action | Roles |
|--------|-------|
| View customer-upload intake on `/imports` | All staff (`importDesigns`) |
| Open linked request | Existing print-request view perms |
| Do not add to catalog | All staff |
| Send to AI Review (promote) | **Owner / admin** (align with `canApproveDesignForCatalog` / AI manage) |
| Retry technical processing | Owner / admin |

Add explicit permission helpers rather than scattering role checks in UI.

### 23. Firestore and Storage rules (review lock-down #7)

**Deploy:** with trusted backend (sub-phase **B**), **before** Portal upload UI is enabled.

**Firestore `customerUploads` / `customerUploadBatches`:**

- Customer read: own `customerUid` only
- Customer create/update: **deny** direct writes for processing fields — mutations via callables (Admin SDK)
- Prefer callable-only mutations for v1
- Staff read: `isStaff()`
- Staff client write: deny sensitive fields; promote/exclude via callable

**`printRequestItems`:** **attach via callable only** for v1 (Admin SDK writes). Do not relax client create rules to allow upload-backed items without the attach callable — keeps confirmations and ADR-FP-071 atomic.

**Storage `/customer-uploads/{userId}/{uploadId}/{fileName}` — rules enforce only:**

| Concern | Enforced in |
|---------|-------------|
| Canonical path pattern under caller `userId` | **Storage rules** |
| Owner (`userId == auth.uid`) for customer write/read of own objects | **Storage rules** |
| Max source object size | **Storage rules** |
| Allowed source content types / extensions for the `source` (and batch ZIP) object name | **Storage rules** |
| Upload lifecycle / `technicalStatus` / path-to-doc binding / processing validation | **`finalizeCustomerUpload` / `finalizeCustomerUploadZip`** (callable), not complex Storage↔Firestore status coupling |
| Derivative writes (`production.png`, preview, thumbnail) | **Admin SDK / Functions only** (deny customer write) |
| Unauthenticated / cross-customer access | **Deny** |

Catch-all remains deny. Ready-design public derivative read patterns must **not** apply to unapproved customer uploads.

### 24. Required indexes

- `customerUploads`: `catalogReviewStatus` ASC + `createdAt` DESC (intake queue)
- `customerUploads`: `customerUid` + `createdAt` DESC
- `customerUploads`: `printRequestId` + `createdAt` DESC
- `customerUploads`: `technicalStatus` + `updatedAt` (cleanup queries)
- `customerUploadBatches`: `customerUid` + `createdAt` DESC  

Add composite entries to `firestore.indexes.json` and **deploy in sub-phase B** with rules (before Portal UI).

### 25. Operational wipe integration

**Do not modify wipe during planning.** Implementation must include **contained wipe integration** in sub-phase G (preferred over a vague follow-up):

New wipe target e.g. `customerUploads`:

- Delete `customerUploadBatches`, `customerUploads`
- Delete Storage prefixes `customer-uploads/`
- When wiping `printRequests`, customer-upload-backed items go with items
- When wiping `designs`, also clear promotions; do not leave orphan `promotedDesignId` confusion—order: uploads after or with designs carefully documented
- **Never** add production project to wipe allowlist

If wipe track is still open when this feature implements, coordinate so wipe bugs and new target land without conflicting half-deploys—or park wipe first.

### 26. Implementation sequencing around the open wipe track

| Option | Verdict |
|--------|---------|
| Implement uploads while wipe still active under same state | **Forbidden** — two tracks under one goal |
| Plan + Review now; implement after wipe signoff | **Preferred** |
| Owner formally parks wipe, switches goal to this feature | **Allowed** with explicit Decision Log entry |

**Planning/Review of this plan may proceed now** without parking wipe. **Implementation must wait.**

### 27. Human checkpoints

See [Human Checkpoints](#human-checkpoints-anticipated). Blocking before implement: wipe park/signoff decision; confirmation wording; retention OK; SVG deferral OK; rules/functions/Portal deploys.

---

## Customer upload flow (product)

### Steps 1–7

1. **Select** — file picker, multi, `webkitdirectory` folder (client multi-file), ZIP (upload archive for server extract), drag-drop where supported (browser only).
2. **Preflight** — client-only hints (name, type, size, decode, rough transparency/dims); non-authoritative.
3. **Trusted validate/process** — per-file after direct upload finalize, or after server ZIP extract + per-file processing; batch continues on individual failures; user-safe codes only.
4. **Normalize** — Studio-aligned trim/upscale/derivatives via shared print-size helpers; preserve larger originals.
5. **Confirm** — two unchecked checkboxes; persist UID, customerId, batchId, upload IDs, timestamp, `termsVersion`, both booleans.
6. **Attach working request** — `confirmCustomerUploadsAndAttachToRequest` per [attach invariants](#attach-callable-invariants-review-lock-down-8); no working-request picker; idempotent by `customerUploadId`; qty/size reuse; failed files excluded.
7. **Studio intake** — same moment as attach → `pending_staff_review` on `/imports`; **no** auto AI.

### Proposed confirmation wording (human/legal final)

> ☐ I own this artwork or have permission to reproduce and print it.
>
> ☐ I understand Fresh Prints may review this artwork and, if staff approve it, add it to the shared Design Library for other customers to use. Adding it to my print request does **not** mean it is in the Design Library.

`termsVersion`: `customer-upload-terms-v1`

### Customer-facing clarity

- Technical pass = printable on **their** request, not catalog approval.
- Staff may exclude from catalog without removing from request.
- No Gemini / Firestore / “AI Review” jargon in Portal copy.

---

## Studio Imports workspace

Extend `ImportsPage` with a **Customer uploads** section/tab (not a fourth core workspace).

**Show:** preview, filename, customer name/email, upload date, linked request + status, show assignment if any, dims, print size, effective DPI, format, transparency result, confirmations, technical + catalog statuses, failure reason.

**Actions:** Send to AI Review; Do not add to catalog; Retry processing (when allowed); Open request. Avoid generic “Approve.”

---

## Portal UX surfaces

- Primary: working request detail — “Upload artwork”
- Secondary: empty request / catalog empty state CTA
- Per-file progress + results; batch summary; retry/remove; qty + print-size after attach; double-submit guards; refresh recovery via batch id in URL or latest open batch query

---

## Suggested implementation sub-phases

Each sub-phase needs its own approved implement scope if split.

**Hard deploy order (review #1):** Rules + indexes + trusted callables (**B**) before Portal upload UI enabled (**C**).

| Sub-phase | Focus |
|-----------|--------|
| **A** | Shared contracts, **ADR-FP-073** (must distinguish Phase 8 request artwork from Phase 9 `customRequests`), storage helpers, transparency pure utils, security design docs |
| **B** | Trusted Functions processing (create/finalize/ZIP extract/limits/daily abuse caps/derivatives/retry) **+ deploy Firestore rules, Storage rules, and required indexes**. Portal upload CTAs remain disabled until B is live. |
| **C** | Portal upload UI + confirmations + attach callable wiring (invariants already defined). Enable UI only after B deploy verified. |
| **D** | Request item union + Show Queue + **GangSheetItem / writers / asset loaders / export resolvers** + `onPrintRequestItemCreated` skip |
| **E** | Studio `/imports` intake UI + exclude/promote callables |
| **F** | AI handoff verification (imported → enrich v21 → AI Review → catalog approve); rejection must not unlink request |
| **G** | Abandoned cleanup, **wipe target**, hardening QA, optional rules emulator tests / residual risk docs. (**Not** the first place rules/indexes land — that is B.) |

**Start implement only after wipe park/signoff + owner go-ahead on this revised plan.** This revision does not start implementation.

---

## Test Strategy

### Automated commands (no root `npm test`)

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` (repo root) | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Shared + targeted unit | `npx tsx --test` on new/changed `*.test.ts` (transparency, ZIP safety, limits, source union, wipe plan expansion, promotion idempotency) | yes |
| Portal build | `npm run build:portal` | yes (UI sub-phases) |
| Studio build | `npm run build:studio` (or tsc+vite without full installer when sufficient) | yes when Studio UI changes |
| Rules | Emulator rules tests if present; else manual checklist + documented gap | yes |

### Targeted automated coverage

File signatures/MIME mismatch; PNG/WebP transparency + opaque alpha; threshold edges; corrupt images; dimension/pixel limits; print-size math; upscale; aspect; large original preserve; SVG reject; ZIP traversal/bomb/ratio/size/count; nested ZIP reject; ownership; promotion idempotency; request-item union + legacy; show/export resolution; exclusion preserves request; wipe plan expansion; mapper defaults.

### Manual

Full Portal upload → request → queue to show → Studio intake → Send to AI Review → AI Review → catalog approve/reject; verify rejection keeps request art; exclude-from-catalog path; mobile upload UX; confirmation gating.

---

## Human Checkpoints Anticipated

- [x] **Park or sign off wipe** before this feature’s implementation starts
- [x] Final confirmation wording (product/legal)
- [x] Retention policy acknowledgment (v1 retain-while-request-exists)
- [x] SVG deferral acknowledgment
- [x] New Functions / Firestore rules / Storage rules / indexes deploy
- [x] Request-item schema additive deploy (no downtime expected; still approve)
- [x] Production Portal App Hosting (separate; still not deployed)
- [x] Manual UI/UX QA
- [x] Any weakening of customer isolation — stop
- [x] Automatic catalog publication — forbidden; stop if proposed

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dual implementation vs open wipe | High | Gate implement on wipe park/signoff; keep state goal single |
| `designId` assumptions break export/show/gang | High | Sub-phase D checklist: allocations, **GangSheetItem**, writers, loaders, export resolvers |
| Storage cost / abuse | High | File/batch caps; **daily per-UID create/finalize/ZIP caps**; concurrency 3; abandoned cleanup; auth required |
| Opacity false accepts | Medium | Pixel alpha threshold + tests; fail closed |
| ZIP bombs | High | Customer ZIP limits; nested reject; ratio/byte caps |
| Double promote / double AI | Medium | Transaction + `promotedDesignId` + enqueue guards |
| Studio import code reused unsafely in Portal | High | No Electron in Portal; Functions sharp only |
| Public URL leak of private art | High | No public tokens; staff/customer rules; ready-design derivative pattern must not apply to unapproved uploads |
| Wipe deletes request art incorrectly | Medium | Explicit wipe ordering + tests in sub-phase G |
| Callable timeout on large images | Medium | 25 MB cap; 512MiB+ memory; per-file finalize |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Undeploy/disable new callables; Storage rules deny new `customer-uploads` writes.
2. Portal feature flag / hide upload CTAs.
3. Existing catalog request items unaffected.
4. Orphan uploads removable via wipe target once shipped.
5. Do not delete production customer data without owner approval.

---

## Documentation Updates Required

- [x] `docs/architecture/DATA_MODEL.md` — entities, statuses, item source union
- [x] `docs/architecture/ARCHITECTURE.md` — upload boundary; `/customer-uploads/` layout
- [x] `docs/standards/SECURITY.md` — untrusted upload threat model; rules
- [x] `docs/architecture/BACKEND.md` / `FIREBASE.md` — callables, triggers
- [x] `docs/standards/TESTING.md` — new test commands/files
- [x] `docs/project/DECISIONS.md` — **ADR-FP-073** (entity split; item source union; staff promotion; processing boundary; **Phase 8 request artwork ≠ Phase 9 `customRequests` / Custom Request Q&A**)
- [x] `docs/project/ROADMAP.md` — Phase 8 fast-follow entry
- [x] `docs/project/RISK_REGISTER.md` — public upload risks
- [x] Wipe plan/docs + Studio wipe UI copy when G ships
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` — at feature signoff (not now)
- [ ] `.cursor/workflow/state.md` — only when this becomes the **active** managed goal

---

## Acceptance Criteria

(As specified in the phase request — all checklist items remain the definition of done for implementation/signoff. Planning treats them as requirements, not currently met.)

### Upload and validation / Quality / Confirmation / Request / Studio / Catalog / Security

See user request acceptance checklists — implement phases must tick each item with evidence in the test report.

---

## Open Questions

- [ ] **Owner:** Park wipe now to start implement after this revision, or finish wipe signoff first? *(implementation gate)*
- [ ] **Owner/legal:** Approve or edit confirmation wording (`customer-upload-terms-v1`)
- [ ] **Owner:** Confirm transparency 0.5% / 1% trim rule after seeing fixture results in Test phase (plan proposes; tests may tune slightly within fail-closed posture)
- [ ] None other — daily abuse caps, ZIP server extract, enum, print-size lock, Storage/rules split, attach invariants, and Phase 9 distinction are **locked in this revision** (not open questions)

### Review lock-down checklist (all nine explicit)

| # | Requirement | Plan location |
|---|-------------|----------------|
| 1 | Rules/indexes before Portal UI | Approach deploy gate; sub-phase B; decision 23–24 |
| 2 | Server ZIP extract; nested reject; folder = client multi-file | Approach; decisions 11–12; Steps 1–3 |
| 3 | GangSheetItem + writers/loaders/export | Decision 17; sub-phase D; migration impact |
| 4 | No `promoted_to_design`; use `sent_to_ai_review` + `promotedDesignId` | Decision 2 |
| 5 | `buildImportPrintSizeCreateFields` / shared target-DPI | Decision 15 |
| 6 | Per-UID daily create/finalize/ZIP caps + concurrency | Decision 10 |
| 7 | Storage rules = path/owner/size/type; lifecycle in finalize | Decision 23 |
| 8 | Attach callable invariants (8 bullets) | Approach attach section; Step 6 |
| 9 | ADR-FP-073 ≠ Phase 9 `customRequests` | Approach ADR section; Documentation Updates |

### Remaining `[NEEDS REPO CHECK]` → resolved

| Item | Resolution |
|------|------------|
| Studio imports paths | Confirmed under `apps/studio/src/renderer/src/features/imports/` + `electron/services/import/` |
| Portal request paths | Confirmed under `apps/portal/features/print-requests/` + `app/(app)/requests/` |
| Shared print/design paths | Confirmed `printRequest.types.ts`, `printSizeMath.ts`, `designStoragePaths.ts` |
| Source vs production today | Single normalized `originals/` for designs; customer uploads will **add** separate source |
| SVG pipeline | Absent → defer |
| Storage triggers | Absent → finalize callable primary |
| `customerUploads` | Absent → create |
| Wipe extension points | Confirmed in `operationalWipeTargets.ts` |
| Gang sheet types | Confirmed `packages/shared/src/types/gangSheet/gangSheet.types.ts` — included in decision 17 |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-11-portal-customer-artwork-upload-review.md`
- Verdict: **approved_with_changes** (2026-07-11)
- Plan revision: **2026-07-11** — all nine binding changes incorporated
- Status: still **planning/review only** — no implementation
- Implementation: blocked until wipe signoff or formal park + managed goal switch
- Workflow state: **do not change** active `admin-operational-test-data-wipe` goal from this revision

---

## Appendix A — Files expected to change (implementation)

### Create

- `packages/shared/src/types/customerUpload/*`
- `packages/shared/src/constants/customerUpload*.ts`
- `packages/shared/src/utils/customerUploadTransparency.ts` (+ tests)
- `packages/shared/src/constants/customerUploadStoragePaths.ts`
- `functions/src/createCustomerUploadBatch.ts` (names may vary)
- `functions/src/finalizeCustomerUpload.ts`
- `functions/src/finalizeCustomerUploadZip.ts`
- `functions/src/confirmCustomerUploadsAndAttachToRequest.ts`
- `functions/src/promoteCustomerUploadToAiReview.ts`
- `functions/src/excludeCustomerUploadFromCatalog.ts`
- `functions/src/lib/customerUpload*.ts` (validation, sharp pipeline, zip)
- `apps/portal/features/customer-uploads/**`
- Studio imports intake components under `features/imports/`

### Modify

- `printRequest.types.ts`, Portal/Studio print request services/services/UI
- `showAllocation.types.ts`, `gangSheet.types.ts`, queue callable, gang sheet service, export/gang hooks/loaders
- `onPrintRequestItemCreated.ts`
- `firestore.rules`, `storage.rules`, `firestore.indexes.json` (**sub-phase B**)
- `operationalWipeTargets.ts`, wipe types, Studio wipe options, `wipeOperationalTestData.ts` (**sub-phase G**)
- `ImportsPage.tsx`, permissions helpers
- Docs listed above

### Do not modify (this feature)

- AI enrichment prompt / `catalog-enrich-v21` text
- Monorepo layout
- Unrelated wipe bugfixes (unless owner parks wipe and scopes otherwise)

---

## Appendix B — Storage layout (canonical)

```text
/customer-uploads/{customerUid}/{uploadId}/source          # original image bytes (png|webp)
/customer-uploads/{customerUid}/{uploadId}/production.png
/customer-uploads/{customerUid}/{uploadId}/preview.webp
/customer-uploads/{customerUid}/{uploadId}/thumbnail.webp
/customer-uploads/{customerUid}/batches/{batchId}/archive.zip   # ZIP only; server extracts
```

Design promotion (existing):

```text
/originals/{designId}.png
/thumbnails/{designId}.webp
/previews/{designId}.webp
```
