# Data Model Essentials

## Core collections

| Collection | Purpose |
|------------|---------|
| `users` | Team profiles — role, isActive (client read-only writes) |
| `designs` | Design catalog metadata |
| `categories` | Catalog categories |
| `customers` | Customer records for Print Requests |
| `printRequests` | Named request lists for customers or internal use |
| `printRequestItems` | Request item records referencing approved catalog designs |
| `settings` | App settings (e.g. `aiEnrichment`) |
| `showQueues` / `showQueueItems` | Legacy names — Phase 7 migration planned |
| `customerRequests` | Legacy — Phase 9 migration planned |

## Design document — key fields

| Field | Purpose |
|-------|---------|
| `status` | Catalog lifecycle (see below) |
| `title`, `description`, `tags`, `categoryId` | Catalog metadata |
| `originalPath`, `thumbnailPath`, `previewPath` | Storage paths |
| `widthPx`, `heightPx`, `dpi` | Image metadata |
| `printWidthIn`, `printHeightIn` | Print size (Phase 3D) |
| `aiReviewStatus` | AI pipeline state |
| `aiSuggestions` | AI output blob (title, description, tags, category, version, model) |
| `archived` | Soft-hide from default browse |
| `createdAt`, `updatedAt`, `createdBy` | Audit |

Types: `shared/types/` and `apps/studio/src/renderer/src/features/designs/types/`

## Design status (catalog lifecycle)

| Status | Meaning | In Design Library? |
|--------|---------|---------------------|
| `imported` | Awaiting AI/staff review | No |
| `processing` | Transient (derivatives or AI job) | No |
| `ready` | Catalog-approved | **Yes (default view)** |
| `rejected` | Staff rejected | No (Rejected tab) |
| `archived` | Soft-hidden | Only with archived toggle |

**Deprecated on designs:** `queued`, `printed` — legacy read only. New writes blocked. Production status belongs on queue/request items.

Print Requests must not write `queued`, `printed`, `pending`, `done`, or any production/request lifecycle status to `designs.status`.

## AI review status

Tracks pipeline progress separately from catalog `status`. Used by AI Review inbox tabs:

- Processing tab: awaiting or running AI
- Needs Review: AI complete, awaiting staff
- Rejected: staff rejected from catalog

See `aiReview.types.ts` and `aiReviewInboxService.ts` for exact values and query logic.

## aiSuggestions structure (summary)

| Field | Notes |
|-------|-------|
| `promptVersion` | e.g. `catalog-enrich-openai-v16` |
| `provider` | `openai` or `development` |
| `model` | Resolved OpenAI model ID |
| `title`, `description`, `tags`, `categoryId` | Suggestions |
| `visibleText`, `visibleTextColor` | OCR-related |
| `textOnlyArtwork`, `artworkContainsText` | Classification |
| `confidence` | Per-field or aggregate |
| `generatedAt` | Timestamp |

## Category

Standard CRUD with name, optional description. AI suggests `categoryId` from allowed list.

## User

```ts
role: 'owner' | 'admin' | 'helper' | 'customer'
isActive: boolean
```

Customers use Portal only (Phase 8) — no Studio access.

## Customer

```ts
isGuest: boolean
userId?: string
totalPrintRequests: number
```

Customer records are staff-created with `isGuest: false` for the current Phase 6 flow. They do not create Firebase Auth accounts, do not create `users/{uid}` documents, and do not grant Studio access.

## Print Request

```ts
status: 'draft' | 'active' | 'completed' | 'archived'
isInternal: boolean
customerId?: string
itemCount: number
```

A Print Request is a named list, not an order. It has no payment, checkout, shipping, packing, or fulfillment fields.

## Print Request Item

```ts
status: 'pending' | 'queued' | 'in_progress' | 'printed' | 'done' | 'canceled'
designId: string
quantity: number
printWidthInches?: number
printHeightInches?: number
sizeLabel?: string
```

Production/request progress lives on request items, not design documents.

## Request reference counters

Phase 6 may increment `designs.requestCount` and `designs.lastRequestedAt` when a design is added to a request. ADR-FP-030 defines these as lightweight request reference metadata only. They do not imply printing, do not change design lifecycle status, and do not implement Phase 10 analytics dashboards.

## Storage path helpers

`shared/constants/design/designStoragePaths.ts`:
- `getOriginalStoragePath(designId)`
- `getThumbnailStoragePath(designId)`
- `getPreviewStoragePath(designId)`

## Data rules

1. Firestore = metadata only; Storage = files
2. Strong typing — no `any` on persisted models
3. Single source of truth per entity type
4. All primary docs: `id`, `createdAt`, `updatedAt`
5. Status transitions via workflow services — not arbitrary UI edits

## Approval services

- `catalogApprovalService.approveDesignForCatalog` → `status: ready`
- `catalogApprovalService.rejectDesignFromCatalog` → `status: rejected`

Edit Design modal: status is **read-only** — use workflow actions only.
