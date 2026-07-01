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

  /** @deprecated — use showAddCount (Phase 10) */
  queueCount: number;

  /** Popularity counters — analytics only; do not change status (Phase 10) */
  requestCount?: number;
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

  email?: string;

  notes?: string;

  isGuest: boolean;

  totalPrintRequests: number;

  /** @deprecated — use totalPrintRequests */
  totalRequests?: number;

  /** @deprecated — custom requests only (Phase 9) */
  totalApprovedRequests?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

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
  | "completed"
  | "archived";

export interface PrintRequest {
  id: string;
  name: string;
  customerId?: string;
  guestCustomerId?: string;
  isInternal: boolean;
  status: PrintRequestStatus;
  itemCount: number;
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# Print Request Items Collection (Phase 6 — in progress)

Collection:

```txt
printRequestItems
```

**Production status** (`pending`, `queued`, `in_progress`, `printed`, `done`, `canceled`) lives here — not on `designs`.

```ts
export interface PrintRequestItem {
  id: string;
  printRequestId: string;
  designId: string;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
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

---

# Custom Requests Collection (Phase 9 — planned)

Collection:

```txt
customRequests
```

Separate from Print Requests. Q&A intake, Etsy referral, optional in-house design fee ($5–$10). Only payment workflow in Fresh Prints.

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

> **Superseded 2026-06-24.** The conflated `customerRequests` model mixed custom design intake with catalog planning. Target replacement: `customRequests` (Phase 9). Do not implement new features against this schema without migration plan.

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

# Show Queues Collection (legacy — maps to Print Runs)

> **Superseded 2026-06-24.** Target collection name: `printRuns`. A Print Run is upcoming show / batch planning — **not shipping or fulfillment**.

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
User (staff)
 │
 ├── Designs (catalog)
 ├── Print Requests (Phase 6)
 ├── Print Runs (Phase 7)
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
 └── Print Run Items (via print request items)

Print Request
 │
 └── Print Request Items

Print Run
 │
 └── Print Run Items → Print Request Items → Designs
```

**Legacy diagram (pre-realignment):** `showQueues` / `showQueueItems` / `customerRequests` — see migration notes in `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md`.

---

# Indexing Considerations

Expected indexes:

```txt id="2gld5z"
designs.status + updatedAt (desc) + __name__ (desc)
designs.categoryId + status + updatedAt (desc) + __name__ (desc)
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

showQueueItems.queueId

showQueues.status
```

Composite indexes are defined in `firestore.indexes.json`.

Phase 6 Print Request indexes are not yet defined because the foundation implementation currently reads `printRequests`, `printRequestItems`, and `customers` broadly and applies request-specific filtering/sorting in the service layer. Add server-side indexes before large request volume or when query patterns move to `where` / `orderBy` combinations such as:

```txt
printRequests.status + updatedAt
printRequests.customerId + updatedAt
printRequests.guestCustomerId + updatedAt
printRequests.isInternal + updatedAt
printRequestItems.printRequestId + updatedAt
printRequestItems.printRequestId + status + updatedAt
customers.isGuest + displayName
```

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
