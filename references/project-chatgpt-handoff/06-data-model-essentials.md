# Data Model Essentials

## Core collections

| Collection | Purpose |
|------------|---------|
| `users` | Team + customer Auth profiles (`role`, `isActive`) — client cannot write roles |
| `designs` | Staff catalog metadata |
| `categories` / catalog tags | Organization |
| `customers` | Customer business records (Portal linked) |
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

## Print Request

- Named list, not an order (no payment/shipping fields).
- Portal: **one working** request per customer until queued to a show (ADR-FP-071).
- Tabs (Working / Queued / Printing / Printed) are largely **derived** from allocations + production timer.

## Print Request Item (dual source)

| Field | Notes |
|-------|-------|
| `sourceType` | `catalog_design` (default/legacy) \| `customer_upload` |
| `designId` | Required for catalog items; **absent** for upload-backed items |
| `customerUploadId` | Set for upload-backed items |
| `quantity` | ≥ 1 |
| `printWidthInches` / `printHeightInches` | Aspect-locked; standard cap 22″ |
| `sizeLabel` | Display string |

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

After staff promote → creates/links a `designs` doc and existing AI enqueue; request items keep working.

## Show allocations

Link `printRequest` / `printRequestItem` quantities to an `upcomingShow`. Source-aware resolvers support catalog originals **and** customer-upload production paths for export/gang sheets.

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
