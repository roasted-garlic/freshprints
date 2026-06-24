# Fresh Prints Data Model

## Purpose

This document defines the canonical data model for the Fresh Prints platform.

This document is the source of truth for:

* Firestore collections
* Document structures
* TypeScript interfaces
* Status values
* Relationships
* Required fields
* Future expansion

All applications must use these models.

Applications:

* Desktop App
* Customer Website
* Future Mobile App

must share the same data structures.

---

# Core Principles

## Single Source Of Truth

Every data model should exist in one place.

Do not duplicate model definitions.

Do not create slightly different versions of the same model.

---

## Strong Typing

Every Firestore document must have:

```ts id="vru1e8"
interface
type
```

definitions.

Avoid:

```ts id="wotz3r"
any
```

---

## Consistent Metadata

All primary documents should contain:

```ts id="m0e0lh"
id
createdAt
updatedAt
```

When applicable:

```ts id="v14s9d"
createdBy
updatedBy
```

---

# Global Status Types

## Design Status

Catalog lifecycle only (Phase 3D Step 6). Production workflow (`queued`, `printed`) belongs on `showQueueItems` — not on design documents.

```ts
/** Active catalog statuses */
export type CatalogDesignStatus =
  | "imported"
  | "processing"
  | "ready"
  | "rejected"
  | "archived";

/** @deprecated — legacy read compatibility only */
export type DeprecatedDesignStatus = "queued" | "printed";

export type DesignStatus = CatalogDesignStatus | DeprecatedDesignStatus;
```

| Status | Meaning | Customer-visible (future) |
| --- | --- | --- |
| `imported` | Awaiting AI/staff review | No |
| `processing` | Transient derivative or future AI job in flight | No |
| `ready` | Catalog-approved; may be referenced by production items | Yes |
| `rejected` | Catalog rejected; audit retention | No |
| `archived` | Soft-hidden from default browse | No |
| `queued`, `printed` | **Deprecated on designs** — use queue items | No |

New writes to `queued` or `printed` on design documents are blocked in `designService`. UI filters and Edit Design dropdowns exclude deprecated values. Legacy Firestore documents may still be read and display as “(legacy)”.

**Approval:** `catalogApprovalService.approveDesignForCatalog` sets `status: ready` with coordinated AI review fields. `rejectDesignFromCatalog` sets `status: rejected`.

### Phase 3C derivative lifecycle (import pipeline)

During desktop import derivative processing (Phase 3C):

| Status | Meaning |
| --- | --- |
| `imported` | Original uploaded; Firestore record created; may include derivative paths after Phase 3C import |
| `processing` | Short-lived state during derivative Storage uploads and Firestore path updates |
| `ready` | Post-AI-review catalog approval — **not** set by Phase 3C derivative completion |

Phase 3C import uses `designReadyService.markDesignDerivativesComplete` to populate `thumbnailPath` and `previewPath` while keeping `status: "imported"`. `markDesignReady` is reserved for a future post-AI-review phase.

Phase 7 AI may later re-enter `processing` from `ready` for enrichment. Phase 3C only owns the derivative stage.

Shared path helpers: `shared/constants/design/designStoragePaths.ts`

---

## Customer Request Status

```ts id="6f0rdi"
export type CustomerRequestStatus =
  | "submitted"
  | "reviewing"
  | "approved"
  | "rejected"
  | "fulfilled"
  | "archived";
```

---

## Queue Status

```ts id="t18ylz"
export type QueueStatus =
  | "draft"
  | "active"
  | "completed"
  | "archived";
```

---

## Queue Item Status

```ts id="s2h7rk"
export type QueueItemStatus =
  | "pending"
  | "ready"
  | "printed"
  | "removed";
```

---

# User Collection

Collection:

```txt id="n6kgnd"
users
```

Document:

```txt id="nrrt6w"
users/{userId}
```

---

## User Roles

```ts id="zt2uhv"
export type UserRole =
  | "owner"
  | "admin"
  | "helper"
  | "customer";
```

---

## User Interface

```ts id="59icj5"
export interface User {
  id: string;

  email: string;

  displayName: string;

  role: UserRole;

  isActive: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;

  createdBy?: string;
  updatedBy?: string;
}
```

`isActive` must remain synchronized with Firebase Authentication `disabled` when account status is changed through the `updateTeamUser` Cloud Function:

* `isActive: true` → Auth user enabled
* `isActive: false` → Auth user disabled

Clients cannot write `users/{uid}` directly.

---

# Design Collection

Collection:

```txt id="2a7jff"
designs
```

Document:

```txt id="ymn0tm"
designs/{designId}
```

---

## Design Interface

```ts id="c9lswv"
export interface Design {
  id: string;

  title: string;

  description?: string;

  categoryId?: string;

  tags: string[];

  status: DesignStatus;

  originalPath: string;

  thumbnailPath: string;

  previewPath?: string;

  width?: number;
  height?: number;

  /**
   * Legacy import metadata DPI. Retained for backward compatibility.
   * Prefer `effectiveDpi` for production resolution.
   */
  dpi?: number;

  printWidthInches?: number;
  printHeightInches?: number;
  printAspectRatioLocked?: boolean;
  metadataDpiX?: number;
  metadataDpiY?: number;
  effectiveDpi?: number;
  printSizeSource?: PrintSizeSource;

  uploadedBy: string;

  requestedByCustomerId?: string;

  queueCount: number;

  aiProcessed: boolean;

  aiReviewed: boolean;

  aiReviewStatus?: AiReviewStatus;

  aiReviewedAt?: Timestamp;

  aiReviewedBy?: string;

  aiReviewVersion?: string;

  aiReviewNotes?: string;

  aiReviewConfidence?: number;

  createdBy: string;
  updatedBy: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;

  previousStatus?: DesignStatus;
  archivedAt?: Timestamp;
  archivedBy?: string;
}
```

Audit fields:

* `createdBy` — staff user ID who created the record; immutable after create
* `updatedBy` — staff user ID who last modified the record (edit, archive, restore)
* `createdAt` — set on create only
* `updatedAt` — changes on every edit, archive, or restore

`uploadedBy` remains the import/upload attribution field and is separate from audit metadata.

### Archive metadata (Phase 3D Step 1)

When a design is archived, the service captures:

| Field | Type | Purpose |
| --- | --- | --- |
| `previousStatus` | `DesignStatus` | Operational status before archive; used on restore |
| `archivedAt` | `Timestamp` | When the design was archived |
| `archivedBy` | `string` | Staff user ID who archived the design |

These fields are cleared on restore. Legacy archived designs without `previousStatus` restore using a documented fallback (`imported`, or `ready` when `aiReviewed` is true).

No migration is required for existing archived records.

### Print size and DPI foundation (Phase 3D Step 2)

Pixel dimensions (`width`, `height`) remain immutable facts from the source PNG.

| Field | Type | Purpose |
| --- | --- | --- |
| `printWidthInches` | `number` | Staff production intent — width in inches |
| `printHeightInches` | `number` | Staff production intent — height in inches |
| `printAspectRatioLocked` | `boolean` | When true, editing one inch dimension recalculates the other |
| `metadataDpiX` | `number` | Embedded PNG `pHYs` X-axis DPI at import (audit only) |
| `metadataDpiY` | `number` | Embedded PNG `pHYs` Y-axis DPI at import (audit only) |
| `effectiveDpi` | `number` | Production-facing DPI derived from pixels ÷ inches |
| `printSizeSource` | enum | `"import_normalized"` \| `"staff_edited"` \| `"metadata_inferred"` |

**Legacy `dpi` field:** The import pipeline writes `dpi` as metadata-derived DPI (`min(dpiX, dpiY)`) for backward compatibility. It is **not** the production DPI source — use `effectiveDpi`.

**Import persistence (Phase 3D Step 3):** New imports populate print-size fields via `designService.createDesign` during orchestration. `printSizeSource` is `"import_normalized"`. Original PNG bytes are not rewritten.

**Edit Design persistence (Phase 3D Step 4):** Staff may edit `printWidthInches`, `printHeightInches`, and `printAspectRatioLocked` from the Edit Design modal. `effectiveDpi` is always derived from pixels ÷ print size — never manually entered. On save, `printSizeSource` becomes `"staff_edited"`. Pixel dimensions (`width`, `height`), legacy `dpi`, metadata DPI fields, and storage paths are not modified.

**Legacy display fallback:** Designs without print-size fields display `pixelWidth / 300` and `pixelHeight / 300` with `effectiveDpi` 300 until staff saves from Edit Design.

**Effective DPI quality tiers (informational in Edit Design — do not block save):**

| Tier | Effective DPI |
| --- | --- |
| Preferred | ≥ 300 |
| Standard | 250–299 |
| Small-format | 200–249 |
| Low-resolution | < 200 |

**Storage:** Original PNG bytes in `/originals/` are not rewritten when print size fields change.

Shared math and constants:

```txt
shared/constants/printSize.constants.ts
shared/types/printSize/printSize.types.ts
shared/utils/printSizeMath.ts
```

Acceptance thresholds (enforced at import validation; updated Phase 3D Step 3 correction):

| Tier | Width at 300 DPI | Outcome |
| --- | --- | --- |
| Preferred apparel | ≥ 10″ | Accept |
| Standard apparel | ≥ 8″ and < 10″ | Accept with warning |
| Small-format | ≥ 3.5″ and < 8″ | Accept with small-format warning |
| Below minimum | < 3.5″ | Reject before upload |

8 inches is **not** a universal reject threshold. Larger apparel prints may require future upscaling (planned separately; not implemented).

### AI review foundation (Phase 3D Step 5)

AI review state is **separate** from operational `status`. A design is not catalog-ready until AI review approves it and a future workflow promotes `status` to `ready`.

| Field | Type | Purpose |
| --- | --- | --- |
| `aiReviewStatus` | enum | `pending` \| `approved` \| `rejected` \| `needs_review` |
| `aiReviewed` | `boolean` | Legacy compatibility flag; `true` when `aiReviewStatus === "approved"` |
| `aiProcessed` | `boolean` | Whether an AI review pipeline has run |
| `aiReviewedAt` | `Timestamp` | When the current review outcome was recorded |
| `aiReviewedBy` | `string` | Staff user ID who recorded the outcome |
| `aiReviewVersion` | `string` | Provider or ruleset version |
| `aiReviewNotes` | `string` | Staff- or AI-authored notes |
| `aiReviewConfidence` | `number` | Normalized confidence between 0 and 1 |

**Workflow mapping (foundation only — no automatic transitions in Step 5):**

| `aiReviewStatus` | Meaning | `status` impact |
| --- | --- | --- |
| `pending` | Awaiting AI review | Stays `imported` / `processing` |
| `approved` | Eligible for future `ready` promotion | No auto-change in Step 5 |
| `rejected` | AI or staff rejected | No auto-change in Step 5 |
| `needs_review` | Requires manual staff review | No auto-change in Step 5 |

**Display fallback:** Imported designs without `aiReviewStatus` display as `pending` in Design Details until persisted.

**Service ownership:** `designAiReviewService` owns review mutations. Catalog edit forms must not write AI review fields.

## Design Notes

Store storage paths.

Store:

```txt id="w8bczv"
/originals/design123.png
```

Do not store permanent download URLs.

---

## Tag Normalization (Phase 2A)

Tags are stored on the design document as `tags: string[]`.

Service-layer normalization rules:

* Trim whitespace
* Lowercase for storage and search
* Dedupe before write
* Reject empty strings
* Maximum 20 tags per design
* Maximum 40 characters per tag

There is no separate `tags` collection in Phase 2.

---

## TypeScript Implementation (Phase 2A)

Feature-local types:

```txt
src/renderer/src/features/designs/types/design.types.ts
src/renderer/src/features/designs/types/designStatus.types.ts
src/renderer/src/features/designs/types/designMetadata.types.ts
src/renderer/src/features/designs/types/category.types.ts
src/renderer/src/features/designs/types/designQuery.types.ts
shared/types/printSize/printSize.types.ts
shared/constants/printSize.constants.ts
shared/utils/printSizeMath.ts
```

`AiMetadata` is typed for Phase 7 but is not written to Firestore during Phase 2.

---

## Manual Catalog Forms (Phase 2C)

Phase 2C added desktop modal forms for design and category management during development testing. The **create-design** modal was removed after Phase 3C; **edit** forms remain for catalog maintenance.

Form types:

```txt
src/renderer/src/features/designs/types/designForm.types.ts
```

### Edit form fields

| Field | Editable | Notes |
|-------|----------|-------|
| `title` | Yes | Trimmed, max 200 characters |
| `description`, `categoryId`, `tags` | Yes | Tags normalized on save |
| `width`, `height` | No | Pixel dimensions; read-only after import (post–3C QA) |
| `status` | Owner/admin only | Helpers see read-only status |
| `designId` | No | Display only in edit form |
| `originalPath`, `thumbnailPath`, `previewPath` | No | Set by import pipeline; view in Design Details |
| `dpi` | No | Read-only legacy metadata DPI from import; production DPI will use `effectiveDpi` (Phase 3D+) |

`uploadedBy`, `queueCount`, `aiProcessed`, `aiReviewed`, and all `aiReview*` fields are system-controlled and not editable in catalog forms. Use `designAiReviewService` for review mutations.

New designs are created by the Phase 3 import pipeline, not manual forms.

---

# Categories Collection

Collection:

```txt id="u3sh1g"
categories
```

Document:

```txt id="zhrik8"
categories/{categoryId}
```

---

## Category Interface

```ts id="cydp8u"
export interface Category {
  id: string;

  name: string;

  description?: string;

  sortOrder: number;

  isActive: boolean;

  createdBy: string;
  updatedBy: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Audit fields follow the same rules as designs: `createdBy` / `createdAt` on create only; `updatedBy` / `updatedAt` on every category edit, archive, or restore.

---

# Customers Collection

Collection:

```txt id="sdmmd4"
customers
```

Document:

```txt id="lmxmjh"
customers/{customerId}
```

---

## Customer Interface

```ts id="m4b6l7"
export interface Customer {
  id: string;

  userId?: string;

  displayName: string;

  email?: string;

  notes?: string;

  totalRequests: number;

  totalApprovedRequests: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# Customer Requests Collection

Collection:

```txt id="5c4tvi"
customerRequests
```

Document:

```txt id="mjlwm9"
customerRequests/{requestId}
```

---

## Customer Request Interface

```ts id="f4x7mt"
export interface CustomerRequest {
  id: string;

  customerId: string;

  title?: string;

  description?: string;

  uploadedImagePath?: string;

  status: CustomerRequestStatus;

  reviewedBy?: string;

  reviewNotes?: string;

  approvedDesignId?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# Show Queues Collection

Collection:

```txt id="53es5s"
showQueues
```

Document:

```txt id="exe6l6"
showQueues/{queueId}
```

---

## Queue Interface

```ts id="4u2c1h"
export interface ShowQueue {
  id: string;

  name: string;

  description?: string;

  status: QueueStatus;

  scheduledDate?: Timestamp;

  itemCount: number;

  createdBy: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# Queue Items Collection

Collection:

```txt id="mtnb32"
showQueueItems
```

Document:

```txt id="dj00j2"
showQueueItems/{queueItemId}
```

---

## Queue Item Interface

```ts id="v70y8v"
export interface ShowQueueItem {
  id: string;

  queueId: string;

  designId: string;

  customerId?: string;

  requestedByName?: string;

  status: QueueItemStatus;

  position: number;

  addedBy: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# Settings Collection

Collection:

```txt id="y0xv6l"
settings
```

Document:

```txt id="7opysw"
settings/{settingId}
```

---

## Settings Interface

```ts id="tr4wm0"
export interface AppSettings {
  id: string;

  key: string;

  value: unknown;

  updatedAt: Timestamp;
  updatedBy?: string;
}
```

---

# Audit Logs Collection

Collection:

```txt id="mcsxq0"
auditLogs
```

Document:

```txt id="6x1fux"
auditLogs/{logId}
```

---

## Audit Log Interface

```ts id="r9r8kt"
export interface AuditLog {
  id: string;

  userId: string;

  action: string;

  entityType: string;

  entityId: string;

  metadata?: Record<string, unknown>;

  createdAt: Timestamp;
}
```

---

# Future AI Metadata

Future AI processing should not overwrite human data.

Use a separate object.

Example:

```ts id="0ov8u7"
export interface AiMetadata {
  generatedTitle?: string;

  generatedDescription?: string;

  generatedTags?: string[];

  generatedCategoryId?: string;

  confidence?: number;

  reviewed: boolean;
}
```

---

# Storage Path Standards

Originals:

```txt id="pqekkv"
/originals/{designId}.png
```

Thumbnails:

```txt id="6rfupq"
/thumbnails/{designId}.webp
```

Previews:

```txt id="g6ulku"
/previews/{designId}.webp
```

Customer Uploads:

```txt id="4v2zsh"
/customer-uploads/{requestId}/original.png
```

Store these paths in Firestore.

Do not store raw file data.

---

# Relationship Diagram

```txt id="6cd6v7"
User
 │
 ├── Designs
 │
 ├── Queues
 │
 └── Audit Logs

Customer
 │
 ├── Customer Requests
 │
 └── Queue Items

Design
 │
 ├── Category
 │
 └── Queue Items

Queue
 │
 └── Queue Items
```

---

# Indexing Considerations

Expected indexes:

```txt id="2gld5z"
designs.status + updatedAt (desc)
designs.categoryId + status + updatedAt (desc)
designs.tags (array-contains) + status
designs.categoryId
designs.uploadedBy
categories.isActive + sortOrder
categories.isActive + name

customerRequests.status

showQueueItems.queueId

showQueues.status
```

Composite indexes are defined in `firestore.indexes.json`.

Additional indexes should be created based on actual query patterns.

---

# Soft Delete Philosophy

Prefer:

```ts id="m9zpn7"
status: "archived"
```

instead of permanent deletion.

Applies to:

* Designs
* Requests
* Queues

whenever practical.

---

# Future Expansion

Potential future models:

```txt id="bvdt86"
favorites
notifications
savedSearches
customerCollections
designVersions
```

Do not create these collections until approved.

---

# Data Model Checklist

Before creating a new document type:

* Has a TypeScript interface
* Has createdAt
* Has updatedAt
* Uses existing status types
* Supports future expansion
* Avoids duplicate data
* Stores metadata only
* Keeps files in Storage

All applications must follow this document exactly.
