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

* Fresh Prints Studio
* Fresh Prints Portal
* Future surfaces require a new ADR — no standalone mobile app

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

Catalog lifecycle only (Phase 3D Step 6). Production workflow (`queued`, `printed`) belongs on `showAllocations` (Phase 7) — not on design documents.

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
| `archived` | Soft-hidden from default browse; Design Library **Archived catalog** toggle shows archived-only view | No |
| `queued`, `printed` | **Deprecated on designs** — use queue items | No |

New writes to `queued` or `printed` on design documents are blocked in `designService`. Edit Design displays status read-only; status changes use workflow services only. Legacy Firestore documents may still be read and display as “(legacy)”.

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

  /**
   * Portal public-bidding acknowledgments (Admin writable only).
   * `signup` is educational onboarding; `lastQueueToShow` is the latest binding queue consent.
   */
  portalBiddingAcknowledgments?: {
    signup?: {
      acceptedAt: Timestamp;
      version: string;
      source: "signup";
    };
    lastQueueToShow?: {
      acceptedAt: Timestamp;
      version: string;
      source: "queue_to_show";
      printRequestId: string;
      upcomingShowId: string;
    };
  };

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

  /** Present when promoted from a Portal customer upload (Sub-phase E). */
  sourceCustomerUploadId?: string;

  /** @deprecated — use showAddCount (Phase 10) */
  queueCount: number;

  /** Popularity counters — lightweight discovery (Portal) + future Phase 10 analytics; do not change status */
  requestCount?: number;
  /** Customer favorites count for Most Liked discovery (Functions-maintained, ADR-FP-083). */
  favoriteCount?: number;
  showAddCount?: number;
  printCount?: number;
  lastRequestedAt?: Timestamp;
  lastAddedToShowAt?: Timestamp;
  lastPrintedAt?: Timestamp;

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
  /** Owner purge of large Storage assets (originals + previews). Thumbnail retained. */
  assetsPurgedAt?: Timestamp;
  assetsPurgedBy?: string;
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

These fields are cleared on restore. Legacy archived designs without `previousStatus` restore to `imported`.

No migration is required for existing archived records.

### Owner asset purge (archive-first)

After soft archive, the owner may delete large images via callable `purgeArchivedDesignAssets` (ADR-FP-084):

| Field | Type | Purpose |
| --- | --- | --- |
| `assetsPurgedAt` | `Timestamp` | When originals/previews were deleted |
| `assetsPurgedBy` | `string` | Owner user ID |

Rules: clients cannot write purge fields. Purged designs leave the Studio Archived list by default (`assetsPurgedAt` set) but remain readable by `designId` for history (**title + thumbnail** + images-deleted affordance). Originals/previews are deleted; thumbnails are kept (ADR-FP-084 / ADR-FP-086). Restore is blocked after purge.

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

* Staff-facing print size edits in Edit Design use text inputs with custom step controls; pixel dimensions remain read-only and appear as a compact **Source image** note (not primary form fields). Design Details separates **Source Image** (pixels) from **Print Settings** (inches and DPI). `effectiveDpi` is always derived from pixels ÷ print size — never manually entered. On save, `printSizeSource` becomes `"staff_edited"`. Pixel dimensions (`width`, `height`), legacy `dpi`, metadata DPI fields, and storage paths are not modified.

**Legacy display fallback:** Designs without print-size fields display `pixelWidth / 300` and `pixelHeight / 300` with `effectiveDpi` 300 until staff saves from Edit Design.

**Effective DPI quality tiers (informational — do not block save or import):**

| Tier | Label | Effective DPI | Catalog pill color |
| --- | --- | --- | --- |
| Optimal | Optimal | ≥ 300 | Green |
| Good | Good | 250–299 | Yellow |
| Bad | Bad | 200–249 | Red |
| Terrible | Terrible | 72–199 | Black |
| — | (rejected at import) | < 72 | — |

**Import floor (2026-06-24):** PNG import rejects only when `effectiveDpi` at import-normalized print size would be **< 72** (including when `min(pixelWidth, pixelHeight) < 72`). Assets below 3.5″ width at 300 DPI normalize at **72 DPI** instead so persisted `effectiveDpi` reflects true production quality. Embedded metadata DPI is audit-only — acceptance uses pixels ÷ normalized print inches.

**Storage:** Original PNG bytes in `/originals/` are not rewritten when print size fields change.

Shared math and constants:

```txt
packages/shared/src/constants/printSize.constants.ts
packages/shared/src/types/printSize/printSize.types.ts
packages/shared/src/utils/printSizeMath.ts
packages/shared/src/utils/imageQualitySizingPolicy.ts
```

**Image quality sizing (ADR-FP-080, policy `image-quality-v2`):** automated upscale targets **12″** width (one pass, ≤**6.0×**, height ceiling 16.5″, approved max width envelope 15″); never past the aspect-locked 12″ target; print-request default remains **10″**. Upscales **above 2×** are marked extended for staff visibility only. Never downsample production assets.

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

### AI suggestions and processing pipeline (Phase 5B)

AI enrichment writes versioned fields on `designs/{id}`:

| Field | Type | Writer | Purpose |
| --- | --- | --- | --- |
| `aiProcessingStage` | enum | Cloud Function | Live pipeline stage for Processing Status UI |
| `aiRequestedVisionModelId` | string | Cloud Function callable | Transient one-off AI re-run override while queued/in flight |
| `aiSuggestions` | object | Cloud Function | AI catalog suggestions (separate from approved fields) |
| `aiAnalysis` | object | Cloud Function | Rich analysis metadata for future features |

```ts
export type AiProcessingStage =
  | "queued"
  | "preparing_image"
  | "sending_to_ai"
  | "receiving_response"
  | "validating_response"
  | "ready_for_review"
  | "failed";

export interface DesignAiSuggestions {
  title?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  suggestedNewTags?: SuggestedNewTag[];
  confidence?: number;
  fieldConfidence?: { title?: number; description?: number; categoryId?: number; tags?: number };
  provider?: string;
  model?: string;
  promptVersion?: string;
  generatedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface DesignAiAnalysis {
  primarySubject?: string;
  secondarySubjects?: string[];
  theme?: string;
  style?: string;
  audience?: string;
  colorPalette?: string[];
  artworkContainsText?: boolean;
  visibleText?: string[];
  visibleTextColor?: "black" | "white" | "mixed" | "unknown";
  textOnlyArtwork?: boolean;
  textRecognitionConfidence?: number;
  overallConfidence?: number;
  estimatedPrintComplexity?: string;
  trademarkWarning?: string;
  // additional fields as needed
}
```

**Re-run AI Suggestions:** Needs Review or Rejected calls `resetAiEnrichmentForProcessing`. Design returns to `status: imported`, `aiReviewStatus: pending`; prior `aiSuggestions` and `aiAnalysis` are **deleted**. Staff starts the next AI run from the Processing tab (no suggestion versioning in Phase 5B).

**Reopen for review (rejected):** `status: imported`, `aiReviewStatus: needs_review`; preserves existing `aiSuggestions` / `aiAnalysis`; does not enqueue AI.

**One-off processing override (2026-06-29):** AI Processing may send `visionModelIdOverride` and `reasoningEffortOverride` on processing requests. The callable validates them against server allowlists, writes transient `aiRequestedVisionModelId` / `aiRequestedReasoningEffort`, the pipeline prefers those values for the current run, and success/failure cleanup deletes the fields. This does not mutate `settings/aiEnrichment`.

**Writes:** Cloud Function only for `aiSuggestions`, `aiAnalysis`, and `aiProcessingStage`. Client rules block mutations.

### AI suggestions (Phase 5 — planned)

AI enrichment writes a versioned `aiSuggestions` object on `designs/{id}`. **One provider response per processing run** — persisted once as `aiSuggestions` + `aiAnalysis`. The AI Processing UI reads `aiSuggestions` for the suggestions panel and seeds Final Catalog Information from the same object (`createAiReviewDraftFromDesign`). Staff edits live in local draft state only; live Firestore updates do not overwrite a dirty draft. No second AI call populates the form.

`generatedAt` is stored as an ISO string; clients tolerate ISO strings or resolved Firestore `Timestamp` values when mapping nested AI fields.

```ts
export interface DesignAiSuggestions {
  title?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  suggestedNewTags?: SuggestedNewTag[];
  provider?: string;             // e.g. "openai"
  model?: string;                // e.g. "gpt-5-nano-2025-08-07"
  promptVersion?: string;        // e.g. "catalog-enrich-openai-v17"
  generatedAt?: Timestamp;
  errorCode?: string;
}
```

**Version tracking from day one:** `provider`, `model`, `promptVersion`, and `generatedAt` enable regression analysis when prompts change. `promptVersion` is required for comparing approval rates and edit distance across prompt iterations.

**Review policy:** Successful AI completion moves to `needs_review`; failed AI remains in Processing for retry. Staff approval is always required for catalog publish. The live v17+template contract no longer writes AI confidence.

**Approved tag normalization (2026-06-30):** Cloud Functions normalize AI tag output against the global `tags` collection. Exact approved tag name or alias matches are persisted to `aiSuggestions.tags`; unmatched AI tokens are stored as `aiSuggestions.suggestedNewTags` for owner/admin review. AI never creates approved tag documents automatically.

**Writes:** Cloud Function only for `aiSuggestions`, `aiAnalysis`, and processing state; client services must not fabricate AI output.

**Catalog title vs upload name:** `aiSuggestions.title` is a shopper-facing catalog title generated from artwork (prompt v2 — must not echo upload filename). `design.title` at import is a filename placeholder; `originalPath` / storage paths are never overwritten by AI. Staff approval copies the reviewed title into catalog `title`.

**Future enhancement:** Hidden `searchTitle` (or equivalent normalized search field) on `aiSuggestions` for extra keywords — not in Phase 5B scope.

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

**AI suggestions (2026-06-29):** Cloud Function `normalizeAiTags` persists **single-word** tags only — filtered against merged tag exclusions and generic production/meta tags. Titles: `Black Text` / `White Text` suffix only when `aiAnalysis.textOnlyArtwork === true`. Provider prompt `catalog-enrich-openai-v16` reinforces observed-image-first extraction and stricter anti-invention OCR rules (deploy required for production). Staff may edit tags in Needs Review before approve.

As of 2026-06-30, approved tag definitions live in a global `tags` collection. Design documents still store selected design tags as `designs.tags: string[]`; there is no category-owned tag model and no design tag migration/backfill in this phase.

```ts
export type CatalogTagStatus = "approved" | "archived";

export interface CatalogTag {
  id: string;
  name: string;
  aliases: string[];
  preferredWhen: string;
  status: CatalogTagStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SuggestedNewTag {
  name: string;
  aliases: string[];
  preferredWhen: string;
  reason?: string;
  source?: "ai";
}
```

---

## TypeScript Implementation (Phase 2A)

Feature-local types:

```txt
apps/studio/src/renderer/src/features/designs/types/design.types.ts
apps/studio/src/renderer/src/features/designs/types/designStatus.types.ts
apps/studio/src/renderer/src/features/designs/types/designMetadata.types.ts
apps/studio/src/renderer/src/features/designs/types/category.types.ts
apps/studio/src/renderer/src/features/designs/types/designQuery.types.ts
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
apps/studio/src/renderer/src/features/designs/types/designForm.types.ts
```

### Edit form fields

| Field | Editable | Notes |
|-------|----------|-------|
| `title` | Yes | Trimmed, max 200 characters |
| `description`, `categoryId`, `tags` | Yes | Tags normalized on save |
| `width`, `height` | No | Pixel dimensions; read-only after import (post–3C QA) |
| `status` | Read-only in Edit Design UI | Workflow services only (`archiveDesign`, `restoreDesign`, `catalogApprovalService`, import pipeline) |
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

**Roadmap realignment (2026-06-24):** Customers may be registered (`isGuest: false`, optional `userId` for portal Auth) or guest (`isGuest: true`, staff-created, no Auth). Guest and registered customers are targets for Print Requests (Phase 6).

---

## Customer Interface

```ts id="m4b6l7"
export interface Customer {
  id: string;

  userId?: string;

  displayName: string;

  username?: string;

  email?: string;

  notes?: string;

  isGuest: boolean;

  totalPrintRequests: number;

  nextPrintRequestSequence?: number;

  /** @deprecated — use totalPrintRequests */
  totalRequests?: number;

  /** @deprecated — custom requests only (Phase 9) */
  totalApprovedRequests?: number;

  /**
   * When false, skip Assisted Creation proof-ready email notices.
   * Missing / undefined means opted in.
   */
  assistedProofEmailOptIn?: boolean;
  assistedProofEmailOptInUpdatedAt?: Timestamp;

  /** Mirrored from accountDeletionRequests for Portal UX (Admin SDK). */
  accountDeletionRequest?: {
    status: "pending" | "cancelled" | "fulfilled";
    requestedAt: Timestamp;
    updatedAt: Timestamp;
  };

  usernameUpdatedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Account deletion requests (Portal #9 / owner #10)

```txt
accountDeletionRequests/{userId}
```

Customer-initiated **request** docs (`status: pending | cancelled | fulfilled`). Client writes denied; customers may read own doc. Owner hard-delete via Test Data `ownerDeleteUser` removes Auth + cascades associated records (ADR-FP-104).

Customer usernames are required for new customer create/edit saves in Studio. Existing dev/test
records without usernames may remain readable, but customer Print Request creation is blocked until
a username is added. Username uniqueness is enforced through reservation documents:

```txt
customerUsernames/{username}
  customerId: string
  createdAt: Timestamp
  updatedAt: Timestamp
```

Usernames are normalized lowercase, 3-32 characters, use only `a-z`, `0-9`, `_`, and `-`, and must
start and end with a letter or number. Reserved operational usernames are blocked.

---

## Customer Favorites (Portal liked designs)

Subcollection:

```txt
customers/{customerId}/favorites/{designId}
```

Document id **must equal** `designId` (idempotent add/remove). UI label is **Favorites**.

```ts
export interface CustomerFavorite {
  designId: string;
  customerId: string;
  createdAt: Timestamp;
  createdBy: string; // auth uid
}
```

| Concern | Rule |
|---------|------|
| Who writes | Owning Portal customer only (create/delete); no client updates |
| Who reads | Owning customer; staff may read for support |
| Design popularity | `requestCount` = print-request adds; `favoriteCount` = customer favorites (ADR-FP-083). Most Liked rail uses `favoriteCount`. |
| Archived designs | Favorite doc may remain; Portal Liked page shows “No longer available” |

No migration — additive empty subcollection.

---

# Print Requests Collection (Phase 6 — in progress)

Collection:

```txt
printRequests
```

Document:

```txt
printRequests/{printRequestId}
```

A Print Request is a **named list of catalog designs** for a customer, guest, or internal staff use. It is **not an order** — no payment, checkout, or shipping fields.

```ts
export type PrintRequestStatus =
  | "draft"
  | "active"
  | "editing"
  | "completed"
  | "archived";

export type PrintRequestOrigin =
  | "studio_internal"
  | "studio_customer"
  | "portal_customer";

export interface PrintRequest {
  id: string;
  name: string;
  customerId?: string;
  isInternal: boolean;
  requestOrigin?: PrintRequestOrigin;
  status: PrintRequestStatus;
  itemCount: number;
  requestSequenceNumber?: number;
  customerUsernameSnapshot?: string;
  customerDisplayNameSnapshot?: string;
  internalBaseName?: string;
  nameFormatVersion?: "legacy-v1" | "cr-ir-v1";
  notes?: string;
  /**
   * Binding public-bidding acknowledgment when a Portal customer queued this request
   * to a show (`queuePortalPrintRequestToShow`). Written by Admin SDK only.
   */
  showQueueBiddingAcknowledgment?: {
    accepted: true;
    acceptedAt: Timestamp;
    acceptedByUid: string;
    version: string;
    upcomingShowId: string;
  };
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Portal customers must acknowledge public bidding understanding before signup account create and again before each Add to Show. Signup ack lives on `users/{uid}.portalBiddingAcknowledgments.signup`; queue ack is stored on the print request (above) and mirrored to `users/{uid}.portalBiddingAcknowledgments.lastQueueToShow`. Version constant: `portal-bidding-ack-v3`.

New Phase 6 request names are generated by service-owned Firestore transactions:

* Customer requests: `{customerUsername}-CR{sequence}` such as `sarahsmith-CR001`
* Internal requests: `{internalBaseName}-IR{sequence}` such as `whatnot-IR001`

Customer sequences live on `customers/{customerId}.nextPrintRequestSequence`. The global internal
counter lives at `counters/printRequests.nextInternalRequestSequence`. Request naming must not scan
loaded request lists.

`requestSequenceNumber` is the locked integer sequence. Customer request names are not editable
after creation. Internal request base names may be edited on the Print Request detail page only
when the request has a usable locked sequence; the persisted `name` is then re-derived from
`internalBaseName` and `requestSequenceNumber`. Existing legacy names such as `sarahsmith-0001`
and `internal-0001` remain readable. No migration or backfill is required for legacy request names.
The standard Print Request detail page does not edit request status.

`requestOrigin` stores how the request was created. New Studio internal requests write
`studio_internal`; new staff-created Studio customer requests write `studio_customer`;
`portal_customer` is reserved for future Portal-created customer requests. Existing requests
without `requestOrigin` remain readable with no migration or backfill. Studio display falls back to
`Internal` for missing-origin internal requests, `Staff Created` for missing-origin requests with a
`customerId`, and `Legacy` only when neither compatibility rule applies. Origin display must not be
inferred from the request name. Origin filters and origin indexes are not part of Phase 6.

Current runtime types and services use `customerId` for both registered and guest customer records.
Earlier planning notes mentioned a separate `guestCustomerId`, but it is not part of the current
shared `PrintRequest` type or renderer write path. Do not add `guestCustomerId` queries or indexes
without a separate schema decision and migration/backfill plan.

---

# Print Request Items Collection (Phase 6 — in progress)

Collection:

```txt
printRequestItems
```

**Production status** (`pending`, `queued`, `in_progress`, `printed`, `done`, `canceled`) lives here — not on `designs`.
The standard Print Request item UI hides production status and notes, but these persisted fields
remain for compatibility and future production workflows.

```ts
export interface PrintRequestItem {
  id: string;
  printRequestId: string;
  /**
   * Required for catalog_design (or legacy missing sourceType).
   * Omitted (never empty string) when sourceType is customer_upload.
   */
  designId?: string;
  /** Defaults to catalog_design when absent (legacy). See ADR-FP-073. */
  sourceType?: "catalog_design" | "customer_upload";
  customerUploadId?: string;
  titleSnapshot?: string;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  sortOrder?: number;
  notes?: string;
  status: PrintRequestItemStatus;
  addedBy: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Source model (ADR-FP-073):** Catalog-backed items remain the default. Sub-phase C attaches upload-backed items via Admin callable (`confirmCustomerUploadsAndAttachToRequest`) with `sourceType: customer_upload`, non-empty `customerUploadId`, and **no `designId` field**. Client create of print request items remains catalog/`designId`+ready only. Sub-phase D makes show/gang/export resolvers source-aware. Do not increment `designs.requestCount` for customer-upload-only items. Until D, `queuePortalPrintRequestToShow` fail-closes if any item is upload-backed.

Standard Print Request item sizing rules:

* Requested width and height are stored in inches on `printWidthInches` and `printHeightInches`.
* Aspect ratio remains locked by the UI.
* New items initialized from Design Library request-selection use requested-size metadata separate
  from catalog/default design dimensions. Designs with default width over 10 inches initialize to a
  10-inch requested width when possible; designs already below 10 inches keep the smaller width;
  height is calculated from pixel aspect ratio. Extreme aspect ratios are capped so neither
  initialized requested side exceeds 22 inches.
* Adding or resizing Print Request items never mutates catalog design dimensions and never rewrites
  original images, thumbnails, or previews.
* Standard Print Requests allow up to 22 inches on either axis; oversize work belongs to Phase 9 Custom Requests.
* Effective DPI is derived from design pixel dimensions and requested size; it is not persisted on the item.
* Effective DPI is calculated before applying the 22-inch standard-size save block when dimensions
  are otherwise valid, so oversized requested sizes can still show accurate DPI feedback while
  remaining unsaved.
* Saves below 72 DPI are blocked.
* 72-299 DPI saves are allowed with a warning.
* 300+ DPI saves are allowed without warning.
* Standard Print Request item cards show contained thumbnails in the existing card footprint and
  can open an enlarged preview from `previewPath`, falling back to `thumbnailPath`. Preview behavior
  does not mutate catalog dimensions, request dimensions, image files, thumbnails, previews, or
  derivatives.

Standard Print Request item detail edits autosave for quantity and requested size. New items may
store `sortOrder` for stable display ordering, but existing items without `sortOrder` remain
visible. Runtime reads stay request-scoped by `printRequestId` and sort client-side by `sortOrder`
when present, then `createdAt`, then document ID. **Studio** uses ascending order. **Portal**
Current Request detail and cart use newest-first (`sortPrintRequestItemsNewestFirst`) so last-added
appears first; persisted `sortOrder` values still append on create. Portal **Duplicate** inserts
visually to the **right** of the source under newest-first via `resolveDuplicateInsertBeforeSortOrder`
(lower fractional `sortOrder`); Studio duplicate uses insert-after with ascending display.
Resize/qty/size edits must not change `sortOrder` or `createdAt`. Do not add a Firestore
`sortOrder` index unless a future implementation moves ordering server-side.

---

# Customer Uploads (Phase 8 fast-follow — ADR-FP-073)

Collections:

```txt
customerUploads
customerUploadBatches
customerUploadRateLimits
customerUploadFinalizeLeases
customerUploadIdempotency
```

Customer-provided artwork for **print requests** and **catalog donations** (ADR-FP-073, ADR-FP-078). Independent of catalog `designs` until staff promotes. **Not** Phase 9 `customRequests`. Optional audit fields `assistedCreationRequestId` / `assistedProofId` mark uploads server-copied from an Assisted approved proof (ADR-FP-094). After Add to Request consent, those uploads use the **same Studio custom-design intake fields** as print-upload attach / donate (`catalogUseAcknowledged`, `catalogReviewStatus: pending_staff_review` via `buildCatalogIntakeConfirmationPatch`) — not a parallel consent model. Studio intake surfaces a **Custom** badge (Portal-aligned purple) when `assistedCreationRequestId` is set so staff can distinguish assisted designs from ordinary uploads.

**Purpose:** `print_request` | `catalog_donation` (missing on legacy docs ≡ `print_request`). Donations never set `printRequestId` or create `printRequestItems`.

**Technical status:** `awaiting_upload` → `uploading` → `validating` → `processing` → `ready` | `failed`

**Technical progress stage (optional, live during finalize):** `reading_upload` | `checking_format` | `checking_transparency` | `preparing_artwork` | `checking_print_size` | `creating_previews` | `saving` — written by finalize/retry callables; cleared (`null`) when `ready` or `failed`. Portal maps these to customer-facing labels via `getCustomerUploadProgressLabel`.

**Catalog review status:** `not_eligible` | `pending_staff_review` | `sent_to_ai_review` | `excluded_from_catalog`  
(Promotion link: `promotedDesignId` — no `promoted_to_design` status.)

When staff promotes via `promoteCustomerUploadToAiReview`, a `designs` document is created with `status: imported`, `sourceCustomerUploadId`, and assets copied to canonical design storage paths. The upload moves to `sent_to_ai_review` with `promotedDesignId` set. Catalog exclusion does **not** remove request items or delete production Storage objects.

After AI Review **approve** or **reject**, the upload document remains `catalogReviewStatus: sent_to_ai_review` (outcome lives on `designs.status` / `aiReviewStatus`). Rejection must not unlink `printRequestItems` or delete upload production assets.

Staff intake callables (Admin SDK writes only): `promoteCustomerUploadToAiReview`, `excludeCustomerUploadFromCatalog`, `restoreCustomerUploadCatalogEligibility`, `retryCustomerUploadProcessing`.

**Request-upload full-size retention (ADR-FP-086 §3):** Owner/admin callable `purgeIdleCustomerUploadFullSize` deletes `source` + `production` Storage when the upload is eligible (no active allocations; not on a working print request; either linked shows are completed/canceled/archived, or never-queued + idle 14 days). Sets `fullSizePurgedAt` / `fullSizePurgedBy` and nulls source/production paths. **Keeps** thumbnail and preview.

**Promoted donation cool-off (ADR-FP-086 §4):** Promote sets `promotedAt`. Callable `purgePromotedDonationFullSize` purges donation source+production ≥ 14 days after promote (`catalogReviewStatus: sent_to_ai_review`). Catalog assets remain on the design Storage paths.

**Rejected design cool-off (ADR-FP-086 §2):** Owner/admin callable `archiveStaleRejectedDesigns` soft-archives `status: rejected` designs with clock (`aiReviewedAt`, else `updatedAt`) older than 7 days → `status: archived`, `previousStatus: rejected`. Owner image purge remains separate (`purgeArchivedDesignAssets`).

### Operational collections (Admin SDK only)

| Collection | Purpose |
|------------|---------|
| `customerUploadRateLimits/{uid}_{yyyyMMdd}` | America/Chicago (CST/CDT) daily caps **by purpose**: print-request (`createBatchCount` / `finalizeImageCount` / `finalizeZipCount`) and catalog-donation (`*Donation` fields). Separate buckets so donate and print-request do not share quota. Limits come from `settings/customerUploadQuotas` (ADR-FP-095) with code defaults when unset. Portal Upload Designs no longer charges day buckets; Donate still charges images/day (midnight Central). Field `utcDay` on docs remains the label name for compatibility. |
| `printRequestDesignDailyLimits/{uid}_{yyyyMMdd}` | **Legacy Cap A counters (ADR-FP-096).** No longer written or enforced (ADR-FP-102). Optional wipe target on `fresh-prints-dev` for cleanup. |
| `customerUploadFinalizeLeases/{leaseId}` | Concurrent finalize leases (max 8; 4-minute TTL; shared across purposes) |
| `customerUploadIdempotency/{uid}_{clientRequestId}` | Create-batch idempotency |

Shared types live in `packages/shared/src/types/customerUpload/`.

### Image quality sizing and human halftone confirmation (ADR-FP-080)

Finalize and Studio import persist sizing fields (policy `image-quality-v2`): `upscaleFactor`, `upscalePassCount`, `approvedMaxPrintWidthInches`, `approvedMaxPrintHeightInches`, `sizingPolicyVersion`, optional `sizingWarningCode` (`EXTENDED_UPSCALE` when factor > 2×; `TARGET_NOT_REACHED_UPSCALE_CAPPED` when 6× still cannot reach the 12″ target). Automated upscale targets **12″** width (≤**6×**, one pass); request default remains **10″**.

**Halftone (human only — automatic detection removed):**

| Field | Purpose |
|-------|---------|
| `halftoneSubmitterResponse` | Customer optional Yes/No evidence (`value`, `respondedAt`, `respondedBy`). Does not add catalog tags. |
| `halftoneStaffDecision` | Explicit staff boolean (`true`/`false`), including overrides; copied to `designs` on promote; authoritative for AI Review toggle and tag sync on approve. |
| `halftoneDetection` | **Deprecated / historical only.** May exist on older docs; do not write new detector metadata; UI and processing ignore it. |

Portal always offers an optional “This artwork is a halftone design.” control (default off). Studio import does not interrupt for halftone. Intake and AI Review use the green Halftone toggle (staff → customer yes → off). Approve with toggle on adds canonical `"halftone"` tag; off removes it.

---

# Etsy Recommendation Requests (Phase 9A — shipped in progress)

Collection:

```txt
etsyRecommendationRequests
```

Server-only rate limits:

```txt
etsyRecommendationRateLimits
```

Phase 9A Etsy recommendations are **link-first + Open API listings** (ADR-FP-087l): Portal builds website search URLs from questionnaire answers; in-app listing cards come from `searchEtsyRecommendations` (Open API). Website scrape remains removed (ADR-FP-087j). Listing DTOs are ephemeral on the callable response (not stored on the request doc).

```ts
export interface EtsyRecommendationRequest {
  id: string;
  schemaVersion: 1;
  customerId: string;
  customerUid: string;
  route: "etsy_recommendations";
  status: "active" | "completed" | "cancelled";
  answers: {
    /** Free-text subject (1–80 chars). Primary for new Portal submits. */
    subjectText?: string;
    /** Legacy curated subject ids (still accepted when rebuilding from old docs). */
    subjects?: string[];
    /** Optional free-text tone/style tokens (0–2; new UI sends one free-text entry). */
    styles?: string[];
    /** Legacy occasion ids (optional; holidays also live in suggest dictionary). */
    occasions?: string[];
    /** Optional exact saying / slogan (short; max 80 chars). */
    wording?: string;
  };
  canonicalQuery: string;
  etsySearchUrl: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Legacy docs may still contain unused `apiKeywords` / `apiKeywordsFallback` fields — ignore on read; Open API keywords are rebuilt from `answers` at search time (not written on submit).

**Server-only collections:**

| Collection | Purpose |
|------------|---------|
| `etsyRecommendationRateLimits` | Per-customer and per-request UTC daily Open API search quotas (Admin SDK) |
| `etsyRecommendationConfig` | Legacy kill-switch docs (unused for Open API this phase) |
| `etsyWebsiteSearchCache` | Former scrape cache — inert after ADR-FP-087j |

**Admin-managed suggestion overlays (ADR-FP-087k):**

```txt
etsyRecommendationSuggestions/{suggestionId}
```

```ts
export type EtsyRecommendationSuggestionKind = "subject" | "style";

export interface EtsyRecommendationSuggestion {
  id: string;
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  apiToken: string;
  aliases?: string[];
  active: boolean;
  /** Lowercase normalized label for dedupe. */
  labelKey: string;
  /** Present when created via approve of an `etsySuggestionRequests` row; absent for staff-added overlays. */
  sourceSuggestionRequestId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

Static subject/style seed lists remain in shared code. Firestore stores **admin additions only**. Effective Portal autocomplete = static seed ∪ active overlays. Soft-deactivate sets `active: false` (admin docs only). Subject free-text parser still uses the static phrase index in this phase (admin overlays affect autocomplete first).

**Customer suggestion requests (Studio Customer Requests):**

```txt
etsySuggestionRequests/{requestId}
```

```ts
export type EtsySuggestionRequestStatus = "pending" | "approved" | "rejected";

export interface EtsySuggestionRequest {
  id: string;
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  apiToken: string;
  labelKey: string;
  status: EtsySuggestionRequestStatus;
  customerUid: string;
  customerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resultingSuggestionId?: string;
  rejectReason?: string;
}
```

Portal customers submit via `submitEtsySuggestionRequest` (pending only; daily per-customer cap; dedupe pending by customer+kind+labelKey). Owner/admin approve/reject via callables; approve creates (or links) an active `etsyRecommendationSuggestions` overlay and sets `sourceSuggestionRequestId` on newly created overlays. Staff-added overlays (via `addEtsyRecommendationSuggestion`) omit that field. Studio live-list UI badges approved-from-suggestion rows; awaiting-review rows stay in the Pending suggestions queue.

**Rules:** customers may read own `etsyRecommendationRequests` (`customerUid == auth.uid`); active staff (`owner` / `admin` / `helper`) may read all for Studio Custom Designs → Etsy search (ADR-FP-087n). Request writes via Admin SDK callables only. `etsyRecommendationSuggestions`: signed-in read; client writes denied; add/deactivate via owner/admin callables. `etsySuggestionRequests`: staff read; client writes denied. Legacy config/cache/rate-limit collections remain deny-all.

**Deferred:** Create with AI, design-fee `customRequests` staff queue.

---

# Assisted Creation Requests (Phase 9C)

Collection:

```txt
assistedCreationRequests
```

Storage:

```txt
assisted-creation/{customerUid}/pending/{fileId}
assisted-creation/{customerUid}/{requestId}/proofs/{fileId}
```

Proof objects are the **raw staff upload** (JPEG/PNG/WebP). There is no separate grey-background derivative — Portal/Studio grey is CSS only.

**Proof object basename (ADR-FP-093 residual):** on Studio upload, `{fileId}` / `proof.fileName` is renamed to:

```txt
proof-{n}-{mmddyyyy}-{HHmm}.{ext}
```

Example: `proof-6-10172026-2204.png` — `{n}` is chronological proof number (1-based), stamp is local wall-clock at upload (no seconds), `{ext}` is `png` | `jpg` | `webp`. Firestore `proof.id` remains a UUID. Portal customers never see the original creative filename; download uses the stored basename (or `proof-{n}.{ext}` for legacy proofs).

**Full-res retention (ADR-FP-093):** on customer **approve**, set `approvedProofId` + `approvedAt` and **physically delete** other proofs’ Storage objects (set per-proof `fullSizePurgedAt`). On terminal **without** an approved downloadable proof (`rejected` / `cancelled`), delete **all** proof full-res objects. The approved proof full-res remains downloadable for **14 days** (`ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS`), then `purgeExpiredAssistedCreationProofs` / scheduled job deletes it and sets `fullSizePurgedAt`. Legacy `approved` docs without `approvedProofId`/`approvedAt` fail closed (no download). Portal Download is on the Overview **Approved design** card (via Admin-streamed file callable). The Proofs list and modal title label the approved proof with an **Approved** badge.

**Add to Request (ADR-FP-094):** Portal callable `customerAddAssistedApprovedProofToPrintRequest` server-copies the approved proof into `customer-uploads/...` (source + production + preview + thumbnail), creates a `customerUploads` doc (`purpose: print_request`, audit fields `assistedCreationRequestId` / `assistedProofId`), and attaches a `printRequestItems` row (`sourceType: customer_upload`, qty 1, size from pixels) to the working Current Request (lazy-create). Skips customer-upload transparency / quality rejection gates (staff-provided art). **Library listing consent (residual):** before add, Portal modal Allow / Don’t allow maps to `catalogUseAcknowledged: true | false` — the same field as print-upload attach and donate. Server applies shared `buildCatalogIntakeConfirmationPatch` so both choices set `catalogReviewStatus: pending_staff_review` (Studio Customer Uploads intake), plus `ownershipConfirmed`, `termsVersion`, `confirmedAt`. Allow → staff may promote later; Don’t allow → intake still sees the row with Design Library permission **Declined** (no auto-publish either way). Skip modal when already in working request. Denormalizes `printRequestIngest` (optional `catalogUseAcknowledged`) on the assisted request for idempotency and “Already in request” UX. Assisted 14-day proof purge does **not** delete the copied upload assets.

One **open** request per customer (`submitted` | `in_progress` | `proof_ready` | `revision_requested`). Status machine supports staff proofing and customer approve / revision-with-notes until `approved` (also `rejected` / `cancelled`). While status is **`submitted`** only, the customer may update `answers` and `referenceImages` (callable `customerUpdateAssistedCreationRequest`); content updates are locked once staff marks `in_progress`. Customer cancel (`cancelAssistedCreationRequest`) requires a non-empty `reason` (max revision-note length); the server persists `customerCancelReason` and appends a status history note. Staff cancel/reject/restore still require a reason in history only (no `customerCancelReason`). Separately, `customerSendAssistedCreationMessage` and `staffSendAssistedCreationMessage` append text-only chat notes **only while the request is open** (`canSendAssistedCreationMessage`); terminal statuses (`approved` | `rejected` | `cancelled`) reject new sends with `failed-precondition` (“Messaging is closed for completed requests.”). Entries are same-status and never reopen or transition the request. Messages are trimmed, required, capped at 2,000 characters, and limited to one per actor role per request per 10 seconds. Customer update history notes use `Request updated` (optional staff-visible detail after an em dash). Chat rows use structural `kind: "customer_message"` or `kind: "staff_message"`; `AssistedCreationRevisionEntry.kind` is optional for legacy records and also supports `status`, `request_update`, and `proof_email_sent`. When a proof-ready email delivery job completes successfully, the worker appends a system history entry `Proof-ready email sent` (with optional `emailDeliveryJobId` for idempotency). On approve, customer may optionally set `customerRating` (1–5) and `customerApprovalNote` (short text), plus `approvedProofId` / `approvedAt`. Client Firestore writes denied; callables only. Helper may read; owner/admin mutate status, attach proofs, and send staff Messages on open requests (ADR-FP-088, ADR-FP-092, ADR-FP-093, ADR-FP-094). Owner wipe on `fresh-prints-dev` uses Test Data Reset target `assistedCreationRequests` (`wipeOperationalTestData`) and clears Storage under `assisted-creation/`.

Per-staff unread customer-update markers live in `assistedCreationUpdateAcks/{userId__requestId}` with `readThroughAt` (legacy submitted updates plus `kind: "customer_message"` in any status when `at > readThroughAt`). Studio header **Messages** inbox (alerts-style) lists unread previews and deep-links to Custom Designs → Assisted → Messages; opening a row advances `readThroughAt` for that entry. Stage-tab and list-card unread chips were removed in favor of the inbox. Studio detail tabs: **Overview** (brief + references + **Internal staff notes** with Save notes + primary Staff actions when Start work / Resume apply + Reject/Cancel/Restore in status-row ⋯; when status is `cancelled` and `customerCancelReason` is set, show **Customer cancel reason** under the status header) + **Proofs** (list + proof upload when `in_progress`), **Messages** (capped thread + Send a message compose only). In **Messages**, each unread customer row shows a **Read** control; clicking it advances `readThroughAt` to that entry’s `at` (monotonic). The Messages header keeps a count badge only. **Requires deployed Firestore rules** for this collection on the target project (`firebase deploy --only firestore:rules --project fresh-prints-dev`); until then Studio shows a toast on mark-read permission failures.

Customer-facing in-app alerts live in `customerNotifications/{id}` (Admin SDK writes on proof attach and staff Messages; customer may set `readAt` only). Optional browser push tokens live in `customers/{customerId}/webPushSubscriptions/{id}` (callable `registerWebPushSubscription`). Preference `assistedBrowserPushOptIn` (default on) is separate from `assistedProofEmailOptIn`.

---

# Custom Requests Collection (broader Phase 9 — deferred)

> Superseded for Phase 9A by `etsyRecommendationRequests`. The historical fee/staff-queue sketch below remains deferred until a future managed phase.

Collection:

```txt
customRequests
```

Separate from Print Requests. Future: optional in-house design fee ($5–$10). Only payment workflow in Fresh Prints.

```ts
export interface CustomRequest {
  id: string;
  customerId: string;
  questionnaireAnswers: Record<string, string>;
  etsySearchUrl?: string;
  customerFoundOnEtsy?: boolean;
  designFeeAmount?: number;
  designFeeStatus?: "none" | "pending" | "paid";
  status: CustomRequestStatus;
  approvedDesignId?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# Customer Requests Collection (legacy — superseded)

> **Superseded 2026-06-24.** The conflated `customerRequests` model mixed custom design intake with catalog planning. Phase 9A uses `etsyRecommendationRequests`. Do not implement new features against this schema without migration plan.

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

# Show Queues Collection (legacy — removed 2026-07-04)

> **Superseded 2026-06-24, removed 2026-07-04.** The `showQueues`/`showQueueItems` collections and the
> disabled `/show-queue` placeholder route were never implemented with real data. They were replaced
> 2026-07-04 by a split `upcomingShows` (schedule tracking) / `printRuns`/`printRunItems` (production
> planning) model, which itself failed manual QA and was replaced 2026-07-05 by a single combined
> `upcomingShows` entity plus `showAllocations` — see the section below and ADR-FP-049. `/show-queue`
> is now the live **Show Queue** route.

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

# Queue Items Collection (legacy — maps to Print Run Items)

> **Superseded 2026-06-24.** Target collection name: `printRunItems`. Production status on items — not on `designs`.

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

# Upcoming Shows Collection (Phase 7 — combined show/print-run entity)

> **Superseded 2026-07-05.** An earlier revision of this phase split scheduling (`upcomingShows`) from
> production planning (`printRuns`/`printRunItems`) as two separate collections and two separate UI
> workflows. Manual QA on 2026-07-05 failed and the business rule was corrected: **a Whatnot show is
> the print run.** There will never be more than one print run per show, so `upcomingShows` is now the
> single combined entity for both schedule tracking and production planning. `printRuns`/`printRunItems`
> were removed; production allocation now lives on `showAllocations` (below). See
> `docs/project/DECISIONS.md` ADR-FP-049.

Whatnot is the external source of truth for show dates/times. This collection is Studio's local show
record, matched and updated by stable `whatnotShowId` — **never by date/time**, since show dates and
times can move. Live Whatnot fetch/sync is not implemented yet; records are created/updated manually by
staff pasting a Whatnot show URL, parsed and upserted through `upcomingShowService.upsertUpcomingShow()`.

Collection:

```txt
upcomingShows
```

Document:

```txt
upcomingShows/{upcomingShowId}
```

## Upcoming Show Interface

```ts
export type UpcomingShowSource = "whatnot";

/** Whatnot schedule/source status — never mixed with production completion. */
export type UpcomingShowStatus =
  | "scheduled"
  | "rescheduled"
  | "live"
  | "completed"
  | "canceled"
  | "missing_upstream"
  | "archived";

export type UpcomingShowSyncStatus = "idle" | "syncing" | "succeeded" | "failed";

/** Production/print status for the show acting as its own print run. */
export type ShowProductionStatus =
  | "open"
  | "full"
  | "printing"
  | "fully_printed"
  | "completed"
  | "archived"
  | "canceled";

export interface UpcomingShow {
  id: string;
  source: UpcomingShowSource;
  whatnotShowId: string;
  whatnotUrl?: string;
  title?: string;
  scheduledStartAt?: Timestamp;
  status: UpcomingShowStatus;
  syncStatus: UpcomingShowSyncStatus;
  syncError?: string;
  lastSyncedAt?: Timestamp;
  lastSeenAt?: Timestamp;
  notes?: string;
  isArchived: boolean;

  /** A Whatnot show is the print run — this is the only production entity for Phase 7. */
  productionStatus: ShowProductionStatus;
  /** Staff-set capacity. Undefined means no cap is enforced. */
  maxTotalQuantity?: number;
  /** True when staff used the danger override to exceed `maxTotalQuantity`. Portal customers may never set this. */
  maxQuantityOverridden: boolean;
  /** Sum of `allocatedQuantity` across all non-canceled `showAllocations` for this show. Denormalized for list/detail display. */
  allocatedQuantity: number;

  /** Show Queue production timer (Option B — staff Start/Pause/Resume/Mark finished; export does not start the timer). */
  accumulatedPrintMs: number;
  activePrintStartedAt?: Timestamp;
  printStartedAt?: Timestamp;
  printPausedAt?: Timestamp;
  printFinishedAt?: Timestamp;
  printFinishedBy?: string;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Upsert rule: match existing records by `source + whatnotShowId`; update mutable upstream fields
(`title`, `whatnotUrl`, `scheduledStartAt`, `lastSeenAt`) on a match instead of creating a duplicate.
Local-only fields (`status`, `syncStatus`, `notes`, `isArchived`, `productionStatus`, capacity fields)
are never overwritten by an upsert. Records are never auto-deleted; a show that disappears upstream
should be marked `missing_upstream` rather than removed, preserving local planning history and any
attached allocations.

`status` (Whatnot schedule/source health) and `productionStatus` (print production progress) are
intentionally separate fields — a sync failure must never be confused with, or block, production
completion, and vice versa.

List query note: shows are read unfiltered and sorted **client-side** by `scheduledStartAt` ascending
(missing schedules sorted last), not with a Firestore `orderBy("scheduledStartAt")` query. A prior bug
used `orderBy`, which silently excludes documents missing that field — every manually added show
without a schedule was excluded from the list entirely. The manual-add form now requires a scheduled
date/time, but the client-side sort remains the defensive fix so a future missing-field record still
appears in the list.

---

# Show Allocations Collection (Phase 7)

> **Portal one request per show (ADR-FP-102):** Sole limit `L` = `settings/printRequestLimits.maxQuantityPerShowPerCustomer` (max Current Request prints = max per customer per show). `queuePortalPrintRequestToShow` allocates the **entire** Continuable request to exactly one show atomically, or cleanly rejects (no `selections`, no remainder request). One Portal request per customer per show. Studio staff split across shows remains separate.

Allocates some or all of a Print Request item's quantity to a show. A Print Request may be split across
multiple shows when it exceeds a single show's remaining capacity — the same `printRequestItemId` can
have multiple `showAllocations` records across different shows. Each allocation is a
snapshot-plus-reference created via `upcomingShowService.allocatePrintRequestItem()` — it never mutates
the source `printRequestItems`, `printRequests`, or `designs` documents. Production status
(`pending` → `queued` → `in_progress` → `printed`/`done`/`canceled`) lives only on `showAllocations`;
**`designs.status` must never receive a production write.**

Collection:

```txt
showAllocations
```

Document:

```txt
showAllocations/{showAllocationId}
```

## Show Allocation Interface

```ts
export type ShowAllocationStatus =
  | "pending"
  | "queued"
  | "in_progress"
  | "printed"
  | "done"
  | "canceled";

export interface ShowAllocation {
  id: string;
  upcomingShowId: string;
  printRequestId: string;
  printRequestItemId: string;
  designId: string;
  customerId?: string;
  requestNameSnapshot: string;
  requestOriginSnapshot?: PrintRequestOrigin;
  designTitleSnapshot?: string;
  /** Quantity allocated to this show from the source item — may be less than the full item quantity when split. */
  allocatedQuantity: number;
  /** Full source item quantity at allocation time, for display/reconciliation only. */
  sourceItemQuantitySnapshot: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  notes?: string;
  status: ShowAllocationStatus;
  addedBy: string;
  updatedBy: string;
  queuedAt?: Timestamp;
  queuedBy?: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;
  completedBy?: string;
  canceledAt?: Timestamp;
  canceledBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Capacity rule: a show's `maxTotalQuantity` is optional (undefined = no cap). Allocating a quantity that
would exceed the show's remaining capacity (`maxTotalQuantity - allocatedQuantity`) is blocked unless
staff confirm a danger override (`overrideCapacity: true`), which also sets
`upcomingShows.maxQuantityOverridden`. Portal customers never call allocation methods, so there is no
separate customer-facing override path to guard.

Print Request queue/print state is **derived from allocations, not persisted** on `printRequests`. See
`shared/utils/printRequestQueueState.ts`'s `derivePrintRequestQueueState()`: it compares a request's
total item quantity against the sum of its non-canceled allocation quantities (`not_queued` /
`partially_queued` / `queued`) and the sum of `printed`/`done` allocation quantities
(`partially_printed` / `printed`). **Printing** tab/state applies when any allocation quantity is
`in_progress` (staff clicked **Start printing** on Show Queue detail). This was a deliberate decision to avoid a second status field that
every allocation mutation would need to keep in sync — see ADR-FP-049. The Print Requests page's
Working/Queued/Printed list tabs are derived the same way, via
`shared/utils/printRequestListGrouping.ts`'s `derivePrintRequestListTab()` — see ADR-FP-051.

`upcomingShows.allocatedQuantity` is a denormalized total that must always be **recomputed from the
show's non-canceled `showAllocations`, never incrementally adjusted**, whenever an allocation is added
or removed. `upcomingShowService.recalculateShowAllocatedQuantity()` is the single implementation of
this; `removeShowAllocation()` and `removeShowAllocationsForRequest()` both call it after deleting
allocation records, so the show's capacity display can never drift from its actual allocation records
— see ADR-FP-051. Removing an allocation (individually or for a whole request) is blocked once the
show's `productionStatus` is `printing`, `fully_printed`, `completed`, or `archived` — see
`shared/utils/showQueueEditability.ts`'s `canRemoveRequestFromShow()`.

`printRequests.status` gains automatic transitions driven by `upcomingShowService`, so its persisted
status never misleadingly contradicts the request's actual queue state:

- `draft` → `active` on the request's first show allocation (whether it was previously `draft` or
  `editing`) — see `allocatePrintRequestItem()`.
- `active` → `editing` once a request that had at least one active allocation loses all of them (i.e.
  it is removed from every show it was queued to, with no allocations remaining anywhere) — see
  `markPrintRequestEditingIfNoActiveAllocations()`, called from both `removeShowAllocation()` and
  `removeShowAllocationsForRequest()`. `editing` means "was queued, now back with staff for revision,"
  distinct from `draft` ("never queued yet"); the Print Requests page treats a request in `editing`
  as fully editable again, same as `draft`.
- Portal customers may have **at most one** `draft` or `editing` request at a time (`createPortalPrintRequest`
  enforces this; see ADR-FP-071). Queuing to a show (`active`) frees the customer to start another.
- `active`/`editing` → `completed` once every unit of the request's requested quantity has been
  allocated and printed (`markPrintRequestCompletedIfFullyPrinted()`).

`archived` hides a request from Studio operational list tabs. Portal **Clear request**
(`clearPortalWorkingPrintRequest`) deletes items and sets `itemCount: 0` but **keeps** the request
open as `draft`/`editing` so the next Add reuses the same id (ADR-FP-071). Owner/admin **empty
stale archive** (`archiveStaleWorkingPrintRequests`, 14-day empty working carts) sets `archived`.
It is never a synonym for printed. Studio Working triage defaults to **Active** carts (has items,
updated within 14 days); Stale / Empty / All chips + rail search cover the rest (ADR-FP-079).
None of these transitions touch `designs.status`.

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

### `settings/aiEnrichment` (AI enrichment team settings)

| Field | Type | Notes |
|-------|------|-------|
| `visionModelId` | string | One of server allowlist: `gpt-5.4-nano-2026-03-17` (default), `gpt-5-nano-2025-08-07`, `gpt-5.4-mini-2026-03-17` |
| `reasoningEffort` | string | One of `none`, `minimal`, `low`, `medium`, `high`; default `medium`; server may retry with `low` for request-path compatibility only |
| `promptTemplate` | string | Owner/admin-editable AI Processing prompt template. Must contain `{{approved_categories}}`, `{{approved_tags}}`, and `{{excluded_tags}}`; default asks for `description`, one approved `category`, `title`, up to 8 approved tag names, strict visible-text extraction in the description, and complete `suggestedNewTags` objects when approved tags are not relevant enough |
| `additionalTagExclusions` | string[] | Optional owner/admin tags merged with `BASE_AI_TAG_EXCLUSIONS` (lowercase single words, max 50) |
| `updatedAt` | Timestamp | Last change |
| `updatedBy` | string | UID of owner/admin who saved |

**Permissions:** Staff may read (AI Processing label). Writes only via callable `updateAiEnrichmentSettings` (owner/admin). No API keys in this document.

**Per-design audit:** `designs.aiSuggestions.model` records the resolved model used for each enrichment run, including one-off AI Processing overrides. `aiSuggestions.tags` are filtered server-side against base + additional exclusions and resolved against approved tag names/aliases.

**Prompt taxonomy context (2026-06-30):** Cloud Functions replace `{{approved_categories}}` with active category names plus descriptions, `{{approved_tags}}` with approved tag names plus aliases and preferred-when guidance, and `{{excluded_tags}}` with the effective exclusion list. AI should choose one approved category and approved tag names first, inspect the full image for readable text, include exact readable text in the description when present, and return `suggestedNewTags` only when no approved name or alias is relevant enough. Each suggestion must include `name`, `aliases`, `preferredWhen`, and `reason` for owner/admin review.

**Needs Review / Rejected re-run:** `resetAiEnrichmentForProcessing` clears suggestions and sends the design back to Processing. No AI call runs on the review tab.

**Settings AI playground:** No playground prompt text, image payload, or response output is persisted in Firestore for this slice. Playground requests are transient callable invocations only.

### `settings/emailProviders`

```ts
interface EmailProviderSettings {
  inviteProvider: "resend" | "brevo";
  proofNoticeProvider: "resend" | "brevo";
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Missing settings resolve to Resend. Active owners may read the document; writes use the
owner-authorized `updateEmailProviderSettings` callable. Accepted persisted values are `resend`
and `brevo`.

### `settings/customerUploadQuotas`

```ts
interface CustomerUploadQuotaSettings {
  printRequestCreateBatchLimit: number;
  printRequestFinalizeImageLimit: number;
  printRequestFinalizeZipLimit: number;
  donationCreateBatchLimit: number;
  donationFinalizeImageLimit: number;
  donationFinalizeZipLimit: number;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

UTC daily per-customer caps for Portal print-request vs catalog-donation uploads (ADR-FP-095).
Missing or invalid fields resolve to code defaults (request 10/20/2; donation 400/1000/40).
Active owners may read; writes use owner-authorized `updateCustomerUploadQuotaSettings`.
Bounds: integers 1–10000 (ZIP fields max 500). Counter docs remain `customerUploadRateLimits`.

### `settings/showQueue`

```ts
interface ShowQueueSettings {
  defaultMaxTotalQuantity?: number;
  whatnotShowBaseUrl?: string;
  /**
   * Hours before `upcomingShows.scheduledStartAt` when Portal Add-to-Show closes.
   * Default **5** when unset (ADR-FP-103). Range 1–72. Portal-only enforcement;
   * Studio staff allocation is unchanged.
   */
  portalQueueCutoffHoursBeforeStart?: number;
  gangSheetWidthInches?: number;
  gangSheetSideMarginInches?: number;
  gangSheetTopBottomMarginInches?: number;
  gangSheetGutterInches?: number;
  gangSheetMaxLengthInches?: number;
  gangSheetLabelFontSizePx?: number;
  // … Whatnot assisted-import audit fields …
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Cutoff math uses absolute Timestamps (`cutoffAt = scheduledStartAt − N hours`). Display labels use the browser locale; America/Chicago applies to other day-bucket features, not this offset. Staff configure via Show Queue settings modal. Clients may not bypass — `listPortalAllocatableShows` / `queuePortalPrintRequestToShow` enforce.

### `settings/printRequestLimits`

```ts
interface PrintRequestLimitSettings {
  /** Sole enforced limit L (max Current Request = max per customer per show). */
  maxQuantityPerShowPerCustomer: number;
  /**
   * Legacy Cap A field. Mirrored = L on owner save for one-release rollback.
   * Not read or enforced (ADR-FP-102).
   */
  dailyDesignsAddedToRequestsLimit: number;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Portal sole print limit `L` (ADR-FP-102). Count = sum of `printRequestItems.quantity`.
Working-request adds clamp/reject at `L`; queue requires entire request ≤ `L` and full fit on the
chosen show (capacity + one request per customer per show). Missing `L` resolves to default **20**.
Signed-in users may read; writes use `updatePrintRequestLimitSettings` (mirrors `L` into legacy Cap A).
Bounds: integers 1–10000.

### `settings/portalSocialMeta`

```ts
interface PortalSocialMetaSettings {
  ogTitle: string; // 1–120 chars
  ogDescription: string; // 1–300 chars
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Owner-editable global Open Graph title/description for Portal non-design URLs (home, login,
register, etc.). Studio **Settings → Social sharing**. Writes via `updatePortalSocialMetaSettings`
(owner-only callable). Client reads: owners only; Portal App Hosting uses Admin for meta
generation. Missing doc resolves to brand defaults. Preview image is **not** stored here — Portal
picks a daily-rotated ready-library design image (fallback brand logo).

### `emailDeliveryJobs`

Server-only durable outbox for Assisted Creation proof-ready notices. The deterministic document ID
is a fixed-length SHA-256 identity derived from `{requestId, proofId}` so client-controlled IDs
cannot introduce Firestore path separators.

| Field | Purpose |
|-------|---------|
| `id`, `kind` | Stable identity; kind is `assisted_proof_ready` |
| `requestId`, `proofId` | Source proof identity |
| `customerId`, `customerUid` | Trusted recipient linkage; no recipient email copy |
| `provider` | Provider snapshot (`resend` \| `brevo`) |
| `status` | `pending` → `sending` → `sent` or `failed` |
| `attemptCount`, `maxAttempts`, `leaseExpiresAt` | Bounded retry/claim state |
| `providerMessageId`, `lastErrorCode` | Provider audit ID and sanitized diagnostics |
| `createdBy`, `createdAt`, `updatedAt`, `sentAt` | Audit timestamps |

All client reads and writes are denied. No backfill, destructive migration, or composite index is
required.

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

Customer Uploads (Phase 8 fast-follow — customer request artwork; ADR-FP-073):

```txt
/customer-uploads/{customerUid}/{uploadId}/source
/customer-uploads/{customerUid}/{uploadId}/production.png
/customer-uploads/{customerUid}/{uploadId}/preview.webp
/customer-uploads/{customerUid}/{uploadId}/thumbnail.webp
/customer-uploads/{customerUid}/batches/{batchId}/archive.zip
```

Firestore collections (planned runtime in later sub-phases): `customerUploads`, `customerUploadBatches`.

This path namespace is **not** Phase 9 `customRequests` / Custom Request Q&A.

Store these paths in Firestore.

Do not store raw file data.

---

# Relationship Diagram

```txt id="6cd6v7"
User (staff)
 │
 ├── Designs (catalog)
 ├── Print Requests (Phase 6)
 ├── Upcoming Shows (Phase 7, combined Whatnot show + print run)
 └── Audit Logs

Customer (registered, portal only)
 │
 ├── Print Requests
 └── Custom Requests (Phase 9)

Guest Customer (staff-mediated)
 │
 └── Print Requests

Design
 │
 ├── Category
 ├── Print Request Items
 └── Show Allocations (via print request items)

Print Request
 │
 ├── Print Request Items
 └── Show Allocations (a request may be split across multiple shows)

Upcoming Show
 │
 └── Show Allocations → Print Request Items → Designs
```

A Whatnot show is the print run — there is at most one production run per show, so `upcomingShows` is
the single combined entity for schedule tracking and production planning. A Print Request's items may
be split across multiple shows via separate `showAllocations` records when a single show's capacity
isn't enough.

**Legacy diagram (pre-realignment):** `showQueues` / `showQueueItems` / `customerRequests` — removed
2026-07-04. An intermediate split `upcomingShows` / `printRuns` / `printRunItems` model (2026-07-04)
failed manual QA and was replaced 2026-07-05 by the combined model above. See migration notes in
`docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md` and ADR-FP-049.

---

# Staff Inbox Acks Collection

Per-staff-user **Done** history for the Studio operations inbox. Open inbox items are derived from
live `printRequests` / `showAllocations` / `upcomingShows`; acks only hide items the signed-in staff
user has marked Done (synced across that user’s devices).

Collection:

```txt
staffInboxAcks
```

Document:

```txt
staffInboxAcks/{userId}__{itemIdWithColonsAsUnderscores}
```

## Staff Inbox Ack Interface

```ts
export type StaffInboxItemKind = "portal_queued" | "show_queue_full";

export interface StaffInboxAckDocument {
  userId: string;
  itemId: string;
  kind: StaffInboxItemKind;
  title: string;
  subtitle: string;
  printRequestId?: string;
  upcomingShowId?: string;
  printRequestTab?: "working" | "queued" | "printing" | "printed";
  occurredAtMillis: number;
  acknowledgedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Permissions

* Active staff may read/create/delete **own** ack docs (`userId == auth.uid`)
* No client updates (delete + recreate if needed)
* Customers: deny
* Operational wipe deletes this collection when wiping print requests, show-queue attachments, or upcoming shows

---

# Indexing Considerations

Expected indexes:

```txt id="2gld5z"
designs.status + updatedAt (desc) + __name__ (desc) — index fallback / Studio catalog
designs.status + createdAt (desc) + __name__ (desc) — Portal default library / New This Week
designs.categoryId + status + updatedAt (desc) + __name__ (desc)
designs.categoryId + status + createdAt (desc) + __name__ (desc) — Portal category browse (Studio-newest)
designs.tags (array-contains) + status + updatedAt (desc) + __name__ (desc)
designs.status + tags (array-contains) + updatedAt (desc) + __name__ (desc)
designs.aiReviewStatus + status + updatedAt (desc) + __name__ (desc)
designs.tags (array-contains) + aiReviewStatus + status + updatedAt (desc) + __name__ (desc)
designs.categoryId + tags (array-contains) + status + updatedAt (desc) + __name__ (desc)
designs.categoryId + status + tags (array-contains) + updatedAt (desc) + __name__ (desc)
designs.categoryId
designs.uploadedBy
categories.isActive + sortOrder
categories.isActive + name

customerRequests.status

printRequests.status + updatedAt
printRequests.customerId + updatedAt
printRequests.isInternal + updatedAt
printRequestItems.printRequestId
printRequestItems.printRequestId + status
customers.isGuest + displayName

upcomingShows (read unfiltered, sorted client-side; see below)
showAllocations.upcomingShowId (single-field, auto-indexed)
showAllocations.printRequestId (single-field, auto-indexed)
showAllocations.upcomingShowId + status + updatedAt
showAllocations.printRequestId + status + updatedAt

staffInboxAcks.userId (single-field; per-staff Done history)
```

Composite indexes are defined in `firestore.indexes.json`.

Phase 6 Print Request query hardening defines the currently supported server-side paths:

```txt
printRequests.status + updatedAt
printRequests.customerId + updatedAt
printRequests.isInternal + updatedAt
printRequestItems.printRequestId + updatedAt
printRequestItems.printRequestId + status + updatedAt
customers.isGuest + displayName
```

Username reservations and request counters use document IDs and direct document reads/writes; no
additional composite indexes are required for those paths.

The unfiltered request list is ordered by `updatedAt` descending. Request item details and card
summaries query `printRequestItems` by `printRequestId`; item display ordering is handled
client-side for `sortOrder` compatibility, and summaries are loaded only for the request IDs
currently displayed. Customer reads are ordered by `displayName` and may filter by `isGuest`.
Additional indexes should be created based on actual query patterns.

Phase 7 query paths: `upcomingShows` is read unfiltered (the full collection) and sorted **client-side**
by `scheduledStartAt` ascending with missing-schedule shows sorted last — deliberately not a Firestore
`orderBy` query, since `orderBy` would silently exclude documents missing that field (the root cause of
a prior bug where manually added shows never appeared in the list). `showAllocations` is read scoped by
`upcomingShowId` or by `printRequestId`, each a single-field equality filter needing no composite index
today. The composite `upcomingShowId + status + updatedAt` and `printRequestId + status + updatedAt`
indexes are defined in `firestore.indexes.json` ahead of the filtered list views these reads will grow
into, but are not required by the current unfiltered/single-field queries.

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
notifications
savedSearches
customerCollections
designVersions
```

Customer favorites (`customers/{customerId}/favorites`) shipped 2026-07-14 — see Customer Favorites above.

Do not create remaining collections until approved.

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
