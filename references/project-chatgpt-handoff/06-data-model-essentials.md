# Data Model Essentials

## Core collections

| Collection | Purpose |
|------------|---------|
| `users` | Team + customer Auth profiles (`role`, `isActive`) — client cannot write roles |
| `designs` | Staff catalog metadata |
| `categories` / catalog tags | Organization |
| `customers` | Customer business records (Portal linked); optional `printRequestQuotaOverride` (ADR-FP-159) |
| `printRequests` | Named request lists (working / queued derived) |
| `printRequestItems` | Line items: catalog design **or** customer upload |
| `customerUploads` | Customer artwork for requests (ADR-FP-073) |
| `customerUploadBatches` | Upload sessions / ZIP batches |
| `customerUploadRateLimits` / leases / idempotency | Abuse controls |
| `upcomingShows` / `showAllocations` / print runs | Show Queue |
| `staffInboxAcks` | Per-staff Done state for inbox |
| `assistedCreationRequests` | Customer Assisted Creation brief, references, proofs, and revision history |
| `settings` | AI enrichment, show queue, etc. |

## Design status (catalog lifecycle)

| Status | In Design Library? |
|--------|---------------------|
| `imported` / `processing` | No |
| `ready` | **Yes (default)** |
| `rejected` | No |
| `archived` | Only with archived toggle |

**Never** write `queued` / `printed` on designs. Production lives on request items / allocations.

## Print Request quotas (ADR-FP-159 — DEV)

- Global: `settings/printRequestLimits` (`maxQuantityPerPrintRequest`, `maxQuantityPerShowPerCustomer`; defaults 20/20).
- Optional customer override: `customers/{id}.printRequestQuotaOverride` — independently nullable PR/Show ints, optional `expiresAt`, `updatedAt`/`updatedBy`.
- Effective = active override dimension ?? **current** global; no scheduler; Clear removes map.
- Owner-only callable mutate; clients cannot direct-write override.

## Print Request

- Named list, not an order (no payment/shipping fields).
- Portal: **one working** request per customer until queued to a show (ADR-FP-071).
- Studio `/print-requests` splits **Customer** (`isInternal == false`) vs **Internal** (`isInternal == true`) before Working / Queued / Printing / Printed (ADR-FP-140).
- Tabs (Working / Queued / Printing / Printed) are largely **derived** from allocations + production timer.
- **Conversion (ADR-FP-141):** Customer → Internal creates a **new** IR request; original archives with `closureKind: converted_to_internal` + linkage fields (`convertedToInternalRequestId`, `convertedFromCustomerRequestId`, `convertedAt`, `convertedBy`). Portal Printed tab shows **Converted to Internal Request · Closed**. Closure fields are Admin/callable-only (Rules block client spoofing).

## Print Request Item (dual source)

| Field | Notes |
|-------|-------|
| `sourceType` | `catalog_design` (default/legacy) \| `customer_upload` |
| `designId` | Required for catalog items; **absent** for upload-backed items |
| `customerUploadId` | Set for upload-backed items |
| `quantity` | ≥ 1 |
| `printWidthInches` / `printHeightInches` | Aspect-locked; standard cap 22″ |
| `sizeLabel` | Display string |
| `artworkEnhanceMode` | Optional: absent/`baseline` \| `enhanced` — selects production asset variant (DEV — ADR-FP-080 2026-08-31) |
| `preEnhancePrintWidthInches` / `preEnhancePrintHeightInches` | Snapshot for Reset to Default when enhanced |

**Save floor:** effective DPI must be **≥ 200** (`MIN_PRINT_REQUEST_EFFECTIVE_DPI`). Soft warn 200–299; optimal ≥ 300. ADR-FP-075.

Do **not** increment `designs.requestCount` for customer-upload-only items.

## Customer Uploads

| Concern | Field / note |
|---------|----------------|
| Technical pipeline | `technicalStatus`: awaiting_upload → uploading → validating → processing → ready \| failed |
| Progress stages | reading, format, transparency, converting, trimming, upscaling, DPI, previews, saving |
| Oversized-canvas normalization | Trim-then-normalize: an oversized source is trimmed first; if still over the technical pixel ceiling, a downscale-only `production` derivative is generated (`wasNormalizedForDimensions`, independent of `wasUpscaled`) instead of permanently rejecting. Original source untouched. Bounded stage watchdog (`processing_timed_out`, retryable) prevents indefinite `processing` (ADR-FP-125). |
| Catalog eligibility | `catalogReviewStatus`: not_eligible / pending_staff_review / sent_to_ai_review / excluded… |
| Permissions | `ownershipAcknowledged` required to attach; `catalogUseAcknowledged` optional (ADR-FP-074) |
| Formats | PNG / static WebP with meaningful transparency |
| Storage | `/customer-uploads/{uid}/…` source + production + preview/thumbnail |
| Intake metadata | Optional authoritative staff metadata before promotion: `halftoneStaffDecision`; `artworkBackgroundHex`; `artworkBackgroundSource` (`staff_manual` for explicit Light/Dark, omit/clear for Auto) |

After staff promote → creates/links a `designs` doc and existing AI enqueue; request items keep working.

## Smart Profile import presets (DEV)

- `designs.smartProfileImportPresets` stores the durable import-time preset seed for owner-approved editable Smart Profile dimensions only.
- Preset provenance tracks which dimensions came from import presets so AI merge and later staff edits can preserve human-entered values correctly.
- Firestore Rules allow the field only as an optional map on reviewed design writes; client ownership of `smartProfile` does not broaden.
- Reset/reprocess keeps the seed so AI refreshes do not erase import presets; later staff edits/removals synchronize the seed so removed values do not resurrect.

## Show allocations

Link `printRequest` / `printRequestItem` quantities to an `upcomingShow`. Source-aware resolvers support catalog originals **and** customer-upload production paths for export/gang sheets. **`artworkEnhanceMode`** on each item selects baseline vs interactive enhanced derivative at export time (gang sheets, ZIP, manual builder).

| Field | Notes |
|-------|-------|
| `requeuedFromAllocationId` | **Lineage only** — points to canceled source allocation after Did Not Print move; not current allocation authority |
| `status` | Includes `canceled` for historical missed-show allocations |

### Print Request staff re-queue markers (release-only path)

| Field | Notes |
|-------|-------|
| `needsStaffRequeueAt` | Set when staff Release-only from Did Not Print |
| `needsStaffRequeueSourceShowId` | Source missed show |
| `needsStaffRequeueSourceShowTitleSnapshot` | Display snapshot |
| `needsStaffRequeueReleasedQuantity` | Quantity released for staff triage |

Clears on successful Add to Show / move recovery.

### DEV fixture shows (DEV-only)

| Field | Notes |
|-------|-------|
| `source` | `"dev_fixture"` for DEV-OVERRIDE shows |
| `devFixtureSentinel` | Marks synthetic external identity; **not** Whatnot |

### Customer merge (WS3)

| Field | Notes |
|-------|-------|
| `mergedSourceCustomerIds` | Survivor customer doc — source customer ids absorbed by merge |
| Tombstone fields | Source accounts closed; history query uses logical customer ids |

### Public show browse DTOs (ADR-FP-142)

`listPortalPublicShows` / `listPortalShowCatalogDesigns` return catalog-only summaries (no `printRequestId`, `customerId`, or private upload identifiers).

## Assisted Creation

- Open statuses: `submitted`, `in_progress`, `proof_ready`, `revision_requested`.
- Terminal statuses: `approved`, `rejected`, `cancelled`.
- Customer may update answers/references only while `submitted`.
- `proof_ready` requires a proof asset; revision requests require notes.
- `proofs[]` and `revisionHistory[]` retain the proof/audit trail.
- Planned email phase may add idempotent delivery metadata and `settings/emailProviders`; exact fields require plan review before implementation.

## Data rules

1. Firestore = metadata; Storage = files  
2. Strong typing — no `any` on persisted models  
3. Status transitions via workflow services  
4. Primary docs: `id`, `createdAt`, `updatedAt`  
5. When handoff and `docs/architecture/DATA_MODEL.md` disagree, **repo doc wins**
