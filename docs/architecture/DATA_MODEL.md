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

| Status | Meaning | Customer-visible |
| --- | --- | --- |
| `imported` | Awaiting AI/staff review | No |
| `processing` | Transient derivative or future AI job in flight | No |
| `ready` | Catalog-approved; may be referenced by production items | Yes — public Portal browse (#13); unauthenticated + customers may read full ready docs |
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

  /**
   * Optional mat / OG letterbox / AI analysis canvas background (`#rrggbb`, lowercase).
   * Missing or invalid → Portal/Studio artwork grey `#e5e7eb` for display and OG.
   * Missing or invalid → AI analysis canvas mid-grey `#808080` (auto-processing default).
   * When set, the same hex is used for Studio/Portal mats, OG letterbox, and AI analysis compositing.
   * Presets: grey (omit field), light black `#2c2d2d`, white `#ffffff`, or custom hex from Studio.
   */
  artworkBackgroundHex?: string;

  /**
   * Provenance for how `artworkBackgroundHex` was set (2026-08-25 import bg/halftone).
   * Display-only; never treat as halftone evidence.
   * `import_override` | `import_halftone_default` | `code_auto` | `staff_manual`.
   */
  artworkBackgroundSource?: "import_override" | "import_halftone_default" | "code_auto" | "staff_manual";

  /**
   * Optional staff-managed artwork garment placement (display label "Placement", 2026-08-10).
   * Missing → "Unspecified". Allowlisted values only (`front`, `back`, `front_back`, `pocket`,
   * `sleeve`); unknown/legacy strings map to undefined on read — no migration/backfill. Edited
   * via `designService.updateDesign` (Edit Design form and, per-member, the Companion Designs
   * panel) — never through the companion-link denorm path. Portal shows it as a presentation-
   * only badge (never a catalog filter/facet or Algolia attribute).
   */
  artworkPlacement?: ArtworkPlacement;

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

  /**
   * Direct pairwise companion neighbor IDs (catalog metadata only; non-transitive — see
   * "Companion Design Links" below). Denormalized by `companionSetService` from the canonical
   * `companionLinks/{minId_maxId}` edges; never alters catalog lifecycle status. Portal
   * discovers ready peers by batch-hydrating these IDs and keeping `status == "ready"`, and
   * never reads `companionLinks`.
   */
  companionDesignIds?: string[];

  /**
   * @deprecated Legacy transitive group pointer, replaced 2026-08-09 by `companionDesignIds`.
   * `companionSetService` heals (deletes) this field on any pairwise write it makes to a design.
   * No product code reads it.
   */
  companionSetId?: string;

  /**
   * Denormalized Needs Companion flag. **Unlinked-only**: `true` means staff is waiting to link
   * this design and it has no `companionDesignIds` neighbors. Cleared on link, never auto-raised
   * on unlink. A design with any `companionDesignIds` entry is always "Linked" regardless of
   * this flag. Staff-only discovery (Design Library filter). Not customer-facing.
   */
  companionSetIncomplete?: boolean;

  /**
   * Staff Explicit Content classification (human only). Missing/undefined/false ⇒ not explicit.
   * Portal presents as Censored Content by default. Not access control.
   */
  isExplicitContent?: boolean;
  /**
   * Staff words/phrases masked in Portal title/description while Censored mode is on and
   * `isExplicitContent` is true. Missing/empty = no text masking. Kept when Explicit is turned
   * off (inactive until Explicit is on again). Does not alter stored title/description.
   */
  censoredTerms?: string[];

  /** @deprecated — use showAddCount (Phase 10) */
  queueCount: number;

  /** Popularity counters — lightweight discovery (Portal) + future Phase 10 analytics; do not change status */
  requestCount?: number;
  /** Customer favorites count for Most Liked discovery (Functions-maintained, ADR-FP-083). */
  favoriteCount?: number;
  showAddCount?: number;
  printCount?: number;
  lastRequestedAt?: Timestamp;
  /** Set when a catalog design is allocated to a show (`onShowAllocationCreated`). Gate for Recently Requested (ADR-FP-107). */
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

AI review state is **separate** from operational `status`. A design is not catalog-ready until AI review is approved **and** `status` is `ready`.

**Default path:** Staff approve via `catalogApprovalService.approveDesignForCatalog`.

**ADR-FP-144 exception (Slice 4+):** When Catalog Processing Mode is `autonomous` **and** `catalogAutonomousLiveEnabled` is true, the enrichment pipeline may set `status: ready` + `aiReviewStatus: approved` with `aiReviewedBy: system:catalog-autonomy` for designs that pass the evidence-based automation policy. Live Autonomous remains owner-gated per environment and is **not** enabled by implementing Slice 4.

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
| `aiAnalysis` | object | Cloud Function | Rich analysis metadata (includes optional shadow halftone assessment) |
| `smartProfile` | object | Cloud Function + owner/admin callable | Versioned Smart Profile / search intelligence (`smart-profile-v1`); shadow automation in Slice 2; **Slice 3** indexes public-safe dimensions into Algolia (search + Smart Filters). Provenance includes automation fields and **Slice 6 corrective** staff edit metadata (`staffEditedDimensionKeys`, `staffEditedAt`, `staffEditedBy`). |
| `smartProfileAiSnapshot` | object | Cloud Function only | Last raw AI-generated dimension lists before staff merge; used for per-dimension Reset to AI. Staff/client cannot write. |

**Catalog search permanence (Slice 3):** `title` and `description` are permanent core catalog search inputs (title is a top Algolia searchable attribute; description is included in flattened `searchText`). They are **not** “legacy.” Legacy migration refers to approved-tag / `tagFacetKeys` / tag-derived corpus only — future tag retirement must not remove or de-prioritize title/description search.
| `importBatchId` | string | Studio import | Optional batch job id (folder/ZIP/multi-PNG) |
| `importSourceFileName` | string | Studio import | Original source filename at import |
| `importRelativePath` | string | Studio import | Optional relative path within batch manifest |

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

**Re-run AI Suggestions:** Needs Review or Rejected calls `resetAiEnrichmentForProcessing`. Design returns to `status: imported`, `aiReviewStatus: pending`; prior `aiSuggestions`, `aiAnalysis`, and `smartProfile` are **deleted**. Studio keeps staff on the current Needs Review or Rejected tab and reconciles the source list immediately; staff open the Processing tab manually to run the next AI pass (no suggestion versioning in Phase 5B).

**Reopen for review (rejected):** `status: imported`, `aiReviewStatus: needs_review`; preserves existing `aiSuggestions` / `aiAnalysis`; does not enqueue AI.

**One-off processing override (2026-06-29):** AI Processing may send `visionModelIdOverride` and `reasoningEffortOverride` on processing requests. The callable validates them against server allowlists, writes transient `aiRequestedVisionModelId` / `aiRequestedReasoningEffort`, the pipeline prefers those values for the current run, and success/failure cleanup deletes the fields. This does not mutate `settings/aiEnrichment`.

**Writes:** Cloud Function only for `aiSuggestions`, `aiAnalysis`, `smartProfile`, and `aiProcessingStage`. Client rules block mutations.

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
* Maximum 20 tags per design (design-level catalog max; unchanged by AI D8-A)

**AI enrichment (ADR-FP-123 / D8-A):** `SIMPLE_ENRICHMENT_MAX_TAGS = 8` means up to **8 additional** AI-resolved suggestions. Existing human/catalog `designs.tags` do **not** consume that allowance and are never removed merely to satisfy the AI ceiling. Pipeline writes `aiSuggestions` only — it does not mutate `designs.tags` on success. AI Review Final Catalog seeds with a human-first union of existing tags + new AI suggestions.
* Maximum 40 characters per tag

**AI suggestions (2026-06-29):** Cloud Function `normalizeAiTags` persists **single-word** tags only — filtered against merged tag exclusions and generic production/meta tags. Titles: `Black Text` / `White Text` suffix only when `aiAnalysis.textOnlyArtwork === true`. Provider prompt `catalog-enrich-openai-v16` reinforces observed-image-first extraction and stricter anti-invention OCR rules (deploy required for production). Staff may edit tags in Needs Review before approve.

As of 2026-06-30, approved tag definitions live in a global `tags` collection. Design documents still store selected design tags as `designs.tags: string[]`; there is no category-owned tag model and no design tag migration/backfill in this phase.

---

## Companion Design Links (pairwise, 2026-08-09 corrective — supersedes the transitive set model)

Companions are **explicit pairwise (non-transitive) many-to-many edges**, not clique/group
membership: linking B↔D when D is already linked to A must never make A and B "match". A
design's matches are only its direct `companionDesignIds` neighbors.

Canonical edge collection: `companionLinks/{linkId}` (staff-only; never customer/public
readable). `linkId = ${min(a,b)}_${max(a,b)}`, so the doc ID is always derivable from either
design ID and a duplicate edge can never be created.

```ts
export interface CompanionLink {
  id: string;
  designIds: [string, string]; // exactly two IDs, sorted ascending — same as linkId halves
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Denorm on designs (symmetric — written to both sides of an edge in the same transaction):

| Field | Meaning |
|-------|---------|
| `companionDesignIds?` | Direct neighbor design IDs only — no transitive closure. Bounded to 50 entries (Rules). |
| `companionSetIncomplete?` | Staff **Needs Companion** working-queue flag. **Unlinked-only**: `true` only when the design has **no** `companionDesignIds` entries. A design with any neighbor is always "Linked" regardless of this flag. |

Rules (owned exclusively by `companionSetService`):
- **Needs Companion does not create a link** — queue flag only until staff explicitly links two designs.
- `linkDesign(a, b)`: rejects `a === b`; if the edge already exists, idempotent no-op; otherwise creates the edge and symmetrically adds each ID to the other's `companionDesignIds`, clearing `companionSetIncomplete` on both.
- `unlinkPair(a, b)`: idempotent delete of the edge (no-op if absent) and symmetric removal from both `companionDesignIds` arrays. **Never** auto-raises Needs Companion on either side — staff must explicitly mark it again.
- `markNeedsCompanion` / `clearNeedsCompanionUnlinked` reject outright once a design has any `companionDesignIds` entry — unlink first.
- Catalog metadata only — never changes design `status` / print-request / production state.
- Any pairwise write to a design also heals (deletes) a stale legacy `companionSetId` pointer in the same transaction, so staff UI can never see mixed old/new signals.
- Portal discovers ready companions by batch-hydrating a design's own `companionDesignIds` and keeping `status == "ready"` only — never reads `companionLinks` or the queue flag, and never walks beyond direct neighbors.

**Placement (2026-08-10) is independent of companion links** — `artworkPlacement` (see Design
Interface above) is plain design metadata, not part of the `companionLinks` edge or the
`companionDesignIds` denorm. Studio's `CompanionSetPanel` shows a Placement badge and lets staff
edit it per member card (the anchor design and each neighbor) purely as a convenience while
browsing companions — the edit calls `designService.updateDesign(caller, memberId, {
artworkPlacement })` on that member's own document and never touches `companionDesignIds`,
`companionSetIncomplete`, or `status`.

**Legacy `companionSets/{companionSetId}` (transitive groups) is retired for product behavior.**
No product code creates, joins, or reads it; no migration converts old set membership into
pairwise edges (intent is unknowable from clique membership alone). Old DEV `companionSets`
docs and any stale `companionSetId` on designs are left in place for manual staff cleanup —
see `CompanionSet` (`@deprecated`) in `companionSet.types.ts`.

See plan `2026-08-09-pairwise-companion-links-and-censored-label-plan.md`, prior amendment plan
`2026-08-09-companion-waiting-queue-vs-link-membership-amendment-plan.md`, final corrective plan
`2026-08-09-final-prelaunch-ux-companion-censor-amendment-plan.md`, and ADR-FP-132 (superseded
by the pairwise model for product behavior).

```ts
export type CatalogTagStatus = "approved" | "archived";

export interface CatalogTag {
  id: string;
  name: string;
  aliases: string[];
  preferredWhen: string;
  status: CatalogTagStatus;
  /** Portal tag-modal featured pill; absent/false = normal. */
  isFeatured?: boolean;
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

# Taxonomy Materialization Collection (derived)

> Read-optimized compact corpus. **Not** authoritative — rebuild from `tags` + `categories`.
> See ADR-FP-128.

```txt
taxonomyMaterialization/meta
taxonomyMaterialization/chunk-{n}
```

| Doc | Purpose |
|-----|---------|
| `meta` | `revision`, `schemaVersion`, `chunkCount`, `tagCount`, `categoryCount`, `contentHash`, `updatedAtMs`, `updatedBy`, `ready` |
| `chunk-{n}` | Deterministic partitions; chunk 0 holds all active categories + first tag slice |

**Inclusion:** approved tags only; active categories only. Archived taxonomy stays on normal management queries.

**Permissions:** staff read (`isStaff()`); all client writes denied. Admin SDK / Functions only write via `rebuildTaxonomyMaterialization`.

**Publication fence:** write all chunks for `newRevision` first, then `meta` last. Readers require `meta.ready`, matching chunk revisions/hashes, and verified `contentHash`.

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

  /**
   * Product tombstone (ADR-FP-115). Account cannot sign in or create new activity;
   * historical print requests remain. Canonical username unchanged.
   */
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  deletedBy?: string;
  deletionSource?: "studio_owner" | "portal_request";

  /**
   * Reversible owner disable (ADR-FP-150). Distinct from tombstone. History and
   * username reservation preserved; Auth disabled until restore.
   */
  isDisabled?: boolean;
  disabledAt?: Timestamp;
  disabledBy?: string;
  disabledReason?: string;

  /** Short-lived lock during destructive identity operations (Admin SDK only). */
  identityOperationLock?: {
    kind: "hard_delete" | "disable" | "merge" | "username_transfer";
    lockedAt: Timestamp;
    lockedBy: string;
    previewChecksum?: string;
  };

  /** WS3 merge tombstone fields (ADR-FP-154). */
  isMerged?: boolean;
  mergedIntoCustomerId?: string;
  mergedAt?: Timestamp;
  mergedBy?: string;
  /** Survivor-only: source customer IDs merged into this account (WS4 alias queries). */
  mergedSourceCustomerIds?: string[];

  usernameUpdatedAt?: Timestamp;
  /** Support/audit only — append-only, max 10 entries (Admin SDK). Not exposed in Portal UI. */
  usernameHistory?: Array<{ username: string; changedAt: Timestamp }>;
  /** Resumable identity snapshot propagation state (Admin SDK only). */
  identitySnapshotPropagation?: {
    status: "idle" | "in_progress" | "completed" | "failed";
    targetUsername: string;
    targetDisplayName: string;
    stage?: "printRequests" | "designIssueReports";
    printRequestCursor?: string | null;
    designIssueReportCursor?: string | null;
    printRequestsUpdated: number;
    designIssueReportsUpdated: number;
    startedAt: Timestamp;
    updatedAt: Timestamp;
    lastError?: string;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Account deletion requests (Portal #9 / owner fulfill)

```txt
accountDeletionRequests/{userId}
```

Customer-initiated **request** docs (`status: pending | cancelled | fulfilled`). Client writes denied; customers may read own doc. Studio owners fulfill via `tombstoneCustomerAccount` (Auth **disable**, retain `customers` / `users` / `customerUsernames`, keep all print requests). Destructive cascade `ownerDeleteUser` remains a quarantined internal callable only — not exposed in Studio UI (ADR-FP-115).

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
start and end with a letter or number. Reserved operational usernames are blocked. **Product tombstone never deletes the reservation** — the username stays permanently unavailable. Present deleted customers as `username (Deleted)` in UI only (`formatCustomerUsernameForDisplay`).

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
| Design popularity | `requestCount` / `lastRequestedAt` = Working-cart print-request item creates (Popular). `showAddCount` / `lastAddedToShowAt` = `showAllocations` create for catalog designs (Recently Requested; ADR-FP-107). `favoriteCount` = customer favorites (Most Liked; ADR-FP-083). |
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
  /** Write-once username at first identity propagation after profile change (ADR-FP-148). */
  customerUsernameAtCreationSnapshot?: string;
  /** Write-once display name at first identity propagation after profile change (ADR-FP-148). */
  customerDisplayNameAtCreationSnapshot?: string;
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
  /** Terminal closure when staff converts a customer request to internal (callable-only writes). */
  closureKind?: "converted_to_internal";
  convertedToInternalRequestId?: string;
  convertedFromCustomerRequestId?: string;
  convertedAt?: Timestamp;
  convertedBy?: string;
  /**
   * Continuable parking (ADR-FP-071 amend 2026-09-02). Admin SDK / trusted callables only.
   * Parked draft: parkedByEditingRequestId + parkedAt. Editing PR: parksDraftPrintRequestId.
   */
  parkedByEditingRequestId?: string;
  parkedAt?: Timestamp;
  parksDraftPrintRequestId?: string;
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

**Customer → Internal conversion (2026-08-22):** Staff callable `convertCustomerPrintRequestToInternal` archives the customer request (`status: archived`, `closureKind: converted_to_internal`) and creates a new internal request with copied items. Linkage fields `convertedToInternalRequestId` / `convertedFromCustomerRequestId` preserve audit trail. Portal lists converted customer requests under the **Printed** tab with label **Converted to Internal Request · Closed** (not ordinary printed copy). Closure fields are Admin SDK / callable only — Firestore Rules block client mutation.

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
  /** Optional preset key from Standard Print Sizes settings (target width only). */
  standardSizePresetKey?: string;
  sortOrder?: number;
  notes?: string;
  status: PrintRequestItemStatus;
  addedBy: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /**
   * Server-only Wave C idempotency marker written by `onPrintRequestItemCreated` after
   * incrementing `designs.requestCount` for catalog items. Clients must not set or clear it.
   * Absent on upload-backed items and on catalog items until the create trigger completes.
   * Not production status.
   */
  requestCountApplied?: boolean;
}
```

**Proposed (2026-08-30 amendment — not implemented):** Interactive upscale toggle per item:

- `artworkEnhanceMode?: 'baseline' | 'enhanced'` — absent ≡ baseline OFF
- `preEnhancePrintWidthInches?`, `preEnhancePrintHeightInches?` — captured on first successful ON; restored on OFF

**Proposed (2026-08-30 — configurable default width):** On `settings/standardPrintSizes` (`StandardPrintSizesSettings`):

- `defaultPrintRequestWidthInches?: number` — global operational default for **new** item init only; fallback 11″ when absent; owner-writable via `updateStandardPrintSizesSettings`; signed-in read (Portal presets + default).

Asset documents (`designs`, `customerUploads`) gain additive interactive-derivative path + provenance fields; see plan amendment. Callable-only writes for toggle mode. No migration — legacy items default OFF.

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
* Saves below 200 DPI are blocked.
* 200-299 DPI saves are allowed with a warning.
* 300+ DPI saves are allowed without warning.
* ADR-FP-080 approved-max envelopes clamp initial/default size and processing; they do not hard-block later manual sizes that stay ≥200 DPI and ≤22″.
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

Customer-provided artwork for **print requests** and **catalog donations** (ADR-FP-073, ADR-FP-078). Independent of catalog `designs` until staff promotes. **Not** Phase 9 `customRequests`. Optional audit fields `assistedCreationRequestId` / `assistedProofId` mark uploads server-copied from an Assisted approved proof (ADR-FP-094). After Add to Request consent, those uploads use the **same Studio custom-design intake fields** as print-upload attach / donate (`catalogUseAcknowledged`, ownership/terms via `buildCatalogIntakeConfirmationPatch`) — not a parallel consent model. **Intake timing (Workstream E):** print-request attach / assisted confirm reaffirm `catalogReviewStatus: not_eligible` (Studio Pending waits until the Print Request is **successfully added to a show** — Portal `queuePortalPrintRequestToShow` TX and/or `onShowAllocationCreated` for Studio allocate). **Donate confirm** still sets `pending_staff_review` immediately. De-allocation does **not** rewind review status. Studio intake surfaces a **Custom** badge (Portal-aligned purple) when `assistedCreationRequestId` is set so staff can distinguish assisted designs from ordinary uploads.

**Purpose:** `print_request` | `catalog_donation` (missing on legacy docs ≡ `print_request`). Donations never set `printRequestId` or create `printRequestItems`.

**Studio intake / sidebar badges (Workstream H):** Uploaded Designs and Donated Designs list queries are server-scoped by `purpose` + `catalogReviewStatus` (+ `createdAt` desc, page size 50). Sidebar badges count **Pending only** (`pending_staff_review`) per purpose — not `not_eligible`, not Excluded. Legacy docs missing `purpose` are still treated as print-request via a metadata-only status companion filtered before enrichment (Firestore equality cannot return missing fields).

**Uploader attribution (#13 Addendum A):**
- Registered Portal customers: `uploaderType: "customer"` (or omitted on legacy), `customerId` = real `customers/{id}`, `createdBy` = Auth UID, `customerUid` = Auth UID.
- **Guest catalog donations:** Firebase Anonymous Auth session. Sentinel fields: `uploaderType: "guest"`, `customerId: "guest"`, `createdBy: "guest"` (string sentinel — **not** a `customers` document and **not** Studio staff `customers.isGuest`). `customerUid` remains the anonymous Auth UID for Storage path ownership (`/customer-uploads/{uid}/…`), rate limits, and leases. Guests may donate images only (ZIP blocked). Guest donation finalize-image daily cap is `CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION_GUEST` (default 20 / Central day per anon UID), stricter than registered donation settings.

**Technical status:** `awaiting_upload` → `uploading` → `validating` → `processing` → `ready` | `failed`

**Technical progress stage (optional, live during finalize):** `reading_upload` | `checking_format` | `checking_transparency` | `preparing_artwork` | `checking_print_size` | `creating_previews` | `saving` — written by finalize/retry callables; cleared (`null`) when `ready` or `failed`. Portal maps these to customer-facing labels via `getCustomerUploadProgressLabel`.

**Catalog review status:** `not_eligible` | `pending_staff_review` | `sent_to_ai_review` | `excluded_from_catalog`  
(Promotion link: `promotedDesignId` — no `promoted_to_design` status.) Print-request artwork enters `pending_staff_review` on **successful show allocation** (not on attach). Donate enters on donate confirm.

When staff promotes via `promoteCustomerUploadToAiReview`, a `designs` document is created with `status: imported`, `sourceCustomerUploadId`, and assets copied to canonical design storage paths. The upload moves to `sent_to_ai_review` with `promotedDesignId` set. Catalog exclusion does **not** remove request items or delete production Storage objects.

After AI Review **approve** or **reject**, the upload document remains `catalogReviewStatus: sent_to_ai_review` (outcome lives on `designs.status` / `aiReviewStatus`). Rejection must not unlink `printRequestItems` or delete upload production assets.

Staff intake callables (Admin SDK writes only): `promoteCustomerUploadToAiReview`, `excludeCustomerUploadFromCatalog`, `restoreCustomerUploadCatalogEligibility`, `retryCustomerUploadProcessing`.

**Request-upload full-size retention (ADR-FP-086 §3):** Owner/admin callable `purgeIdleCustomerUploadFullSize` deletes `source` + `production` Storage when the upload is eligible (no active allocations; not on a working print request; either linked shows are completed/canceled/archived, or never-queued + idle 14 days). Sets `fullSizePurgedAt` / `fullSizePurgedBy` and nulls source/production paths. **Keeps** thumbnail and preview.

**Promoted donation cool-off (ADR-FP-086 §4):** Promote sets `promotedAt`. Callable `purgePromotedDonationFullSize` purges donation source+production ≥ 14 days after promote (`catalogReviewStatus: sent_to_ai_review`). Catalog assets remain on the design Storage paths.

**Rejected design cool-off (ADR-FP-086 §2):** Owner/admin callable `archiveStaleRejectedDesigns` soft-archives `status: rejected` designs with clock (`aiReviewedAt`, else `updatedAt`) older than 7 days → `status: archived`, `previousStatus: rejected`. Owner image purge remains separate (`purgeArchivedDesignAssets`).

### Operational collections (Admin SDK only)

| Collection | Purpose |
|------------|---------|
| `customerUploadRateLimits/{uid}_{yyyyMMdd}` | America/Chicago (CST/CDT) daily caps **by purpose**: print-request (`createBatchCount` / `finalizeImageCount` / `finalizeZipCount`) and catalog-donation (`*Donation` fields). Separate buckets so donate and print-request do not share quota. Limits come from `settings/customerUploadQuotas` (ADR-FP-095) with code defaults when unset. Portal Upload Designs no longer charges day buckets; Donate still charges images/day (midnight Central). **F3 / 2026-08-11 QA:** donation `finalizeImageCountDonation` is charged only when finalize reaches **ready** (`quotaChargedFinalize`). Failed finalizes do not charge. Successful hard delete of a charged `catalog_donation` decrements today’s counter by 1 (Portal Remove / abandon-unconfirmed / Account gallery). Cap L unchanged. Field `utcDay` on docs remains the label name for compatibility. |
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
| `halftoneStaffDecision` | Explicit staff boolean (`true`/`false`), including overrides; copied to `designs` on promote; authoritative for AI Review toggle and tag sync on approve. Import batch “All halftones” writes this at create time (staff authority; ADR-FP-080). |
| `halftoneDecisionSource` | Optional provenance: `import_batch` \| `ai_review` \| `intake` \| `customer`. |
| `halftoneDetection` | **Deprecated / historical only.** May exist on older docs; do not write new detector metadata; UI and processing ignore it. |

Portal always offers an optional “This artwork is a halftone design.” control (default off). Studio **batch** import may set staff halftone via session “All halftones” (not inferred from dark background). Intake and AI Review use the green Halftone toggle (staff → customer yes → off). Approve with toggle on adds canonical `"halftone"` tag; off removes it.

**Artwork background vs halftone:** `artworkBackgroundHex` / `artworkBackgroundSource` are display mats only. Dark mat (`#2c2d2d`) does **not** imply or set halftone. Import precedence: explicit background override → all-halftone dark default → code-auto detector → default light (omit field).

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

Phase 9A Etsy recommendations are **link-first + Open API listings** (ADR-FP-087l): Portal builds website search URLs from questionnaire answers; in-app listing cards come from `searchEtsyRecommendations` (Open API). Website scrape remains removed (ADR-FP-087j). The **last** Open API result set is persisted on the request as `lastApiSearch` (ADR-FP-087o) so Studio can show staff what the API returned; older docs may omit the field until the next Portal search or staff fetch.

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
  /**
   * Last Open API listing search (Portal `searchEtsyRecommendations` or Studio
   * `staffSearchEtsyRecommendationApiResults`). Admin SDK write only. Max 12 listings.
   */
  lastApiSearch?: {
    searchedAt: Timestamp;
    status: "ok" | "empty" | "unavailable";
    listings: Array<{
      listingId: number;
      title: string;
      listingUrl: string;
      imageUrl: string | null;
      shopName: string | null;
      priceAmount: string | null;
      currencyCode: string | null;
    }>;
    apiKeywordsUsed?: string;
    keywordStrategy?: "focused" | "fallback";
  };
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
assisted-creation/{customerUid}/{requestId}/references/{fileId}
assisted-creation/{customerUid}/{requestId}/proofs/{fileId}
assisted-creation/{customerUid}/{requestId}/final/{fileId}
```

Portal clients upload reference images to `pending/`. Callables `submitAssistedCreationRequest` and `customerUpdateAssistedCreationRequest` **promote** those objects into `{requestId}/references/{fileId}` (Admin copy + delete pending) and persist the durable `storagePath` on `referenceImages[]`. Legacy docs may still point at `pending/`; Studio/Portal can read both (staff or owning customer).
Proof objects are the **raw staff upload** (JPEG/PNG/WebP). There is no separate grey-background derivative — Portal/Studio grey is CSS only. Final HR artwork lives under `final/` (ADR-FP-110), separate from `proofs[]`.

**Fulfillment mode (ADR-FP-108 / #12):** optional `fulfillmentMode: "proof_image" | "catalog_share"` (omit ≡ `proof_image`). When staff suggest a ready catalog design instead of uploading a proof: `suggestedCatalogDesign` (`designId`, snapshot `title`, optional `previewImageUrl` storage path, `suggestedAt`, `suggestedByUid`), status `proof_ready`. The same suggest write also appends a `proofs[]` row with `kind: "catalog_share"` (`catalogDesignId`, `catalogDesignTitle`, optional `catalogPreviewImageUrl`, empty `storagePath`) so Studio/Portal Proofs lists show a clearly labeled **Design Library** line (preview + title), not a custom proof PNG. Customer approve sets `approvedCatalogDesignId` + `approvedAt` and does **not** set `approvedProofId`. Switching proof ↔ catalog clears the opposite fulfillment fields; Resume after revision clears `suggestedCatalogDesign` (historical catalog_share proof rows remain). Proof download / proof-copy Add to Request are gated off for catalog_share; Portal Add to Request uses the catalog attach callable. Terminal/expiry purge never deletes catalog derivatives (`kind: catalog_share` + empty `storagePath`).

**Statuses (ADR-FP-110):** open = `submitted` | `in_progress` | `proof_ready` | `revision_requested` | `final_source_needed`. Terminal = `approved` | `rejected` | `cancelled`. Proof-image customer approve → `final_source_needed` (not completed); staff upload final artwork → `approved`. Catalog-share approve still goes directly to `approved` (ADR-FP-108).

**Proof object basename (ADR-FP-110):** new Studio uploads use an opaque UUID Storage object id (**no extension**); `proof.fileName` stores the same opaque id; content type is set on the object. Legacy objects may still use:

```txt
proof-{n}-{mmddyyyy}-{HHmm}.{ext}
```

Portal/Studio proof **previews** load via authenticated `getBytes` → object URL (not a durable signed URL in `img src`). Explicit customer download of final artwork uses a friendly basename (`Fresh-Prints-Final-Artwork.{ext}`) only after `approved` with `finalSource`.

**Final source (ADR-FP-110):** optional `finalSource` (`id`, `storagePath`, friendly `fileName`, `contentType`, `sizeBytes`, `uploadedByUid`, `uploadedAt`). Staff callable `staffAddAssistedCreationFinalSource` attaches metadata and transitions `final_source_needed` → `approved` atomically. Force-complete without final source is forbidden.

**Full-res retention (ADR-FP-093):** on customer **approve** (proof_image → `final_source_needed`), set `approvedProofId` + `approvedAt` and **physically delete** other proofs’ Storage objects (set per-proof `fullSizePurgedAt`). On terminal **without** an approved downloadable proof (`rejected` / `cancelled`), delete **all** proof full-res objects. After staff completes with `finalSource`, Portal Download / Add to Request prefer the final artwork. The approved proof full-res remains within the **14-day** window (`ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS`), then `purgeExpiredAssistedCreationProofs` / scheduled job deletes it and sets `fullSizePurgedAt`. Legacy `approved` docs without `approvedProofId`/`approvedAt` fail closed (no download) unless `finalSource` is present. Portal Download is on the Overview **Approved design** card (via Admin-streamed file callable). The Proofs list and modal title label the approved proof with an **Approved** badge.

**Add to Request (ADR-FP-094 / ADR-FP-110):** Portal callable `customerAddAssistedApprovedProofToPrintRequest` server-copies the **final source when present**, else the approved proof, into `customer-uploads/...` (source + production + preview + thumbnail), creates a `customerUploads` doc (`purpose: print_request`, audit fields `assistedCreationRequestId` / `assistedProofId`), and attaches a `printRequestItems` row (`sourceType: customer_upload`, qty 1, size from pixels) to the working Current Request (lazy-create). Skips customer-upload transparency / quality rejection gates (staff-provided art). **Library listing consent (residual):** before add, Portal modal Allow / Don’t allow maps to `catalogUseAcknowledged: true | false` — the same field as print-upload attach and donate. Server applies shared `buildCatalogIntakeConfirmationPatch` with `submitForStaffReview: false` so both choices reaffirm `catalogReviewStatus: not_eligible` (Studio Pending only after successful Add to Show), plus `ownershipConfirmed`, `termsVersion`, `confirmedAt`. Allow → staff may promote later after show allocation; Don’t allow → after show submit, intake still sees the row with Design Library permission **Declined** (no auto-publish either way). Skip modal when already in working request. Denormalizes `printRequestIngest` (optional `catalogUseAcknowledged`) on the assisted request for idempotency and “Already in request” UX. Assisted 14-day proof purge does **not** delete the copied upload assets.

One **open** request per customer (`submitted` | `in_progress` | `proof_ready` | `revision_requested` | `final_source_needed`). Status machine supports staff proofing, customer approve → Final Source Needed, staff final upload → `approved`, and revision-with-notes (also `rejected` / `cancelled`). **Staff reject** is allowed only from **`submitted`** (New tab / before Start Work); after Start Work, staff must **cancel** instead (shared `assertAssistedCreationTransition` + `staffUpdateAssistedCreationStatus` fail closed). Staff cancel remains available from open statuses; customer cancel and owner restore are unchanged. While status is **`submitted`** only, the customer may update `answers` and `referenceImages` (callable `customerUpdateAssistedCreationRequest`); content updates are locked once staff marks `in_progress`. Customer cancel (`cancelAssistedCreationRequest`) requires a non-empty `reason` (max revision-note length); the server persists `customerCancelReason` and appends a status history note. Staff cancel/reject/restore still require a reason in history only (no `customerCancelReason`). Separately, `customerSendAssistedCreationMessage` and `staffSendAssistedCreationMessage` append text-only chat notes **only while the request is open** (`canSendAssistedCreationMessage`); terminal statuses (`approved` | `rejected` | `cancelled`) reject new sends with `failed-precondition` (“Messaging is closed for completed requests.”). Entries are same-status and never reopen or transition the request. Messages are trimmed, required, capped at 2,000 characters, and limited to one per actor role per request per 10 seconds. Customer update history notes use `Request updated` (optional staff-visible detail after an em dash). Chat rows use structural `kind: "customer_message"` or `kind: "staff_message"`; `AssistedCreationRevisionEntry.kind` is optional for legacy records and also supports `status`, `request_update`, and `proof_email_sent`. When a proof-ready email delivery job completes successfully, the worker appends a system history entry `Proof-ready email sent` (with optional `emailDeliveryJobId` for idempotency). On approve, customer may optionally set `customerRating` (1–5) and `customerApprovalNote` (short text), plus `approvedProofId` / `approvedAt`. Client Firestore writes denied; callables only. Helper may read; owner/admin mutate status, attach proofs / final artwork, and send staff Messages on open requests (ADR-FP-088, ADR-FP-092, ADR-FP-093, ADR-FP-094, ADR-FP-110). Owner wipe on `fresh-prints-dev` uses Test Data Reset target `assistedCreationRequests` (`wipeOperationalTestData`) and clears Storage under `assisted-creation/` (including `final/`).

Per-staff unread customer-update markers live in `assistedCreationUpdateAcks/{userId__requestId}` with `readThroughAt` (legacy submitted updates plus `kind: "customer_message"` in any status when `at > readThroughAt`). Studio header **Messages** inbox (alerts-style) lists unread previews and deep-links to Custom Designs → Assisted → Messages; opening a row advances `readThroughAt` for that entry. Stage-tab and list-card unread chips were removed in favor of the inbox. Studio detail tabs: **Overview** (brief + **Request details** listing every non-empty `AssistedCreationAnswers` field via shared `buildAssistedCreationAnswerDisplayRows` — including subject extras, exact-wording notes/checkboxes when applicable, and reference usage — plus references with unavailable placeholders when Storage URLs fail + **Internal staff notes** with Save notes + primary Staff actions when Start work / Resume apply + Reject (submitted/New only)/Cancel/Restore in status-row ⋯ + **AI Context** copy-only modal; when status is `cancelled` and `customerCancelReason` is set, show **Customer cancel reason** under the status header) + **Proofs** (list + proof upload when `in_progress` + **Upload Final Artwork** when `final_source_needed`), **Messages** (capped thread + Send a message compose only). Studio stage tabs: New → In progress → Revisions → Proof ready → **Final Source Needed** → Completed. Start Work / Resume follow-navigate to the In progress tab with the same request selected. In **Messages**, each unread customer row shows a **Read** control; clicking it advances `readThroughAt` to that entry’s `at` (monotonic). The Messages header keeps a count badge only. **Requires deployed Firestore rules** for this collection on the target project (`firebase deploy --only firestore:rules --project fresh-prints-dev`); until then Studio shows a toast on mark-read permission failures.

Customer-facing in-app alerts live in `customerNotifications/{id}` (Admin SDK writes on proof attach, catalog-share suggest, and staff Messages; customer may set `readAt` only). Kinds include `assisted_proof_ready`, `assisted_catalog_share_ready`, and `assisted_staff_message`. Optional browser push tokens live in `customers/{customerId}/webPushSubscriptions/{id}` (callable `registerWebPushSubscription`). Preference `assistedBrowserPushOptIn` (default on) is separate from `assistedProofEmailOptIn`. Final-ready push/email is **out of scope** for ADR-FP-110 (Portal list refresh is sufficient).

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
export type UpcomingShowSource = "whatnot" | "staff_gang_sheet" | "dev_fixture";

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

/**
 * Upcoming vs Past is display grouping from scheduledStartAt vs now (getShowScheduleTab).
 * Equality is Past. A Whatnot show that is Past while productionStatus is still printing
 * (including paused) must Finish through markShowPrintingFinished — automatic on Show Queue
 * load/tick, plus manual Mark Complete. Past is not a production status.
 */

export interface UpcomingShow {
  id: string;
  source: UpcomingShowSource;
  /**
   * Required when `source === "whatnot"`.
   * Omitted when `source === "staff_gang_sheet"` or `source === "dev_fixture"` (never fabricate Whatnot IDs).
   */
  whatnotShowId?: string;
  whatnotUrl?: string;
  /** Present when `source === "dev_fixture"`; literal `DEV-OVERRIDE` sentinel — not a Whatnot identity. */
  devFixtureSentinel?: "DEV-OVERRIDE";
  title?: string;
  scheduledStartAt?: Timestamp;
  status: UpcomingShowStatus;
  syncStatus: UpcomingShowSyncStatus;
  syncError?: string;
  lastSyncedAt?: Timestamp;
  lastSeenAt?: Timestamp;
  notes?: string;
  isArchived: boolean;

  /** A Whatnot show / Staff Gang Sheet is the print run — this is the only production entity. */
  productionStatus: ShowProductionStatus;
  /**
   * Staff-set capacity. Whatnot: undefined means no cap until set.
   * Internal Gang Sheets default to 200 (`DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY`).
   */
  maxTotalQuantity?: number;
  /** True when staff used the danger override to exceed `maxTotalQuantity`. Portal customers may never set this. */
  maxQuantityOverridden: boolean;
  /** Sum of `allocatedQuantity` across all non-canceled `showAllocations` for this show. Denormalized for list/detail display. */
  allocatedQuantity: number;

  /** Legacy DEV-only optional assignee from the superseded assigned-lane model (ignored). */
  assignedStaffUserId?: string;
  /** Staff Gang Sheet only: 1-based cycle number ("Internal Gang Sheet #N"). */
  staffGangSheetCycleNumber?: number;
  /**
   * Optional: set when staff successfully generates gang sheet PNG(s).
   * Not required to Mark Complete (Internal) or Mark finished (Whatnot).
   */
  gangSheetGeneratedAt?: Timestamp;
  gangSheetGeneratedBy?: string;

  /** Show Queue production timer (Option B — staff Start/Pause/Resume/Mark finished; export does not start the timer). */
  accumulatedPrintMs: number;
  activePrintStartedAt?: Timestamp;
  printStartedAt?: Timestamp;
  printPausedAt?: Timestamp;
  printFinishedAt?: Timestamp;
  printFinishedBy?: string;

  /** Past-show remediation audit (ADR-FP-149). Optional; backward compatible. */
  productionResolutionKind?: "empty_closure" | "fulfilled_confirmed" | "unfulfilled_release" | "owner_override";
  productionResolvedAt?: Timestamp;
  productionResolvedBy?: string;
  /** Owner Force Completed reason; max 500 characters, trimmed, no control chars. */
  productionOverrideReason?: string;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

> **Studio 1.0.6 — Staff Gang Sheets (shared):** `source` may be `staff_gang_sheet`. Those sheets reuse `upcomingShows` + `showAllocations`, omit `whatnotShowId`, default `maxTotalQuantity` to **200** (editable), require `staffGangSheetCycleNumber`, and do **not** require `assignedStaffUserId` (shared by Studio staff). Exactly one active shared sheet (`open`/`full`/`printing`) is allowed. Eligibility is `requestOrigin === "studio_internal"` or legacy `isInternal === true` (customer origins denied). Deny Portal allocation; skip Recently Requested popularity bumps. Any active Studio staff may create when **no** active sheet exists (cycle = max(existing)+1); while one is open, **Mark Complete** opens the next cycle. Add-to-Internal can pick among multiple actives if they exist (legacy/recovery). Studio Print Requests use separate **Add to Show** / **Add to Internal Gangsheet** actions; Internal Sheets live on their own nav route.

> **DEV fixture shows (`fresh-prints-dev` only):** `source === "dev_fixture"` records are created/updated only through the trusted callable `upsertDevFixtureShow` (Admin SDK). Client Firestore rules deny client **create** of `dev_fixture`. They persist `devFixtureSentinel: "DEV-OVERRIDE"` and **never** persist `whatnotShowId` or `whatnotUrl`. Studio Show Queue treats them like other queue-surface shows for allocation lifecycle; Whatnot assisted import matching excludes them (`source === "whatnot"` filter only).

Upsert rule: match existing **Whatnot** records by `source + whatnotShowId`; update mutable upstream fields
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

> **Portal print limits (ADR-FP-102, amended 2026-07-31; uniqueness superseded by ADR-FP-122):** Working-request max = `maxQuantityPerPrintRequest`; per-customer-per-show cap = `maxQuantityPerShowPerCustomer` (linked by default). `queuePortalPrintRequestToShow` allocates the **entire** Continuable request to exactly one show atomically, or cleanly rejects (no `selections`, no remainder request). A customer may submit **multiple separate print requests** to the same show, accumulating toward the customer-show cap (ADR-FP-122). Studio staff split across shows remains separate.

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
  /** Did Not Print recovery lineage only (ADR-FP-156). */
  requeuedFromAllocationId?: string;
  /** Normal Show Queue MOVE lineage (ADR-FP-157). */
  movedFromAllocationId?: string;
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
or removed. `upcomingShowService.recalculateShowAllocatedQuantity()` is the single client
implementation of this; trusted Functions move/recovery paths recompute inside their transactions.

### Normal Show Queue MOVE (ADR-FP-157)

Staff **Move to Another Show** / **Move All Requests** (Whatnot → Whatnot only):

- Movable statuses: `pending` \| `queued` only (all-or-nothing if any scoped row is non-movable).
- Source rows: **canceled** (retained). Destination: **new** docs with `movedFromAllocationId`.
- Never sets `requeuedFromAllocationId`, Did Not Print resolution, or `needsStaffRequeue*`.
- Combine: multi-doc **sum** of non-canceled quantities (no single-doc merge).
- Destination excludes `printing` and later/terminal (move-specific helper; Add-to-Show unchanged).
- Callables: `previewShowQueueMove` / `applyShowQueueMove`; idempotency `showQueueMoveApplications/{checksum}`; max 150 source allocations per TX.
- Distinct from **Remove from Show** (delete), **Did Not Print requeue** (ADR-FP-156), and past/locked **copy**.

`printRequests.status` gains automatic transitions driven by `upcomingShowService`, so its persisted
status never misleadingly contradicts the request's actual queue state:

- `draft` → `active` on the request's first show allocation (whether it was previously `draft` or
  `editing`) — see `allocatePrintRequestItem()`.
- `active` → `editing` once a request that had at least one active allocation loses all of them (i.e.
  it is removed from every show it was queued to, with no allocations remaining anywhere) — see
  `markPrintRequestEditingIfNoActiveAllocations()`, called from both `removeShowAllocation()` and
  `removeShowAllocationsForRequest()`. `editing` means "was queued, now back with staff for revision,"
  distinct from `draft` ("never queued yet"). Studio Print Requests list tabs treat `status: "editing"`
  as the **Editing** lifecycle tab via `derivePrintRequestListTab` → persisted mirror `queueTab: "editing"`
  (mutually exclusive from Working). Portal `/requests` uses the same derive and also shows an
  **Editing** tab. Continuable create/edit still allows at most one `draft`/`editing` request (ADR-FP-071).
- Portal customers may have **at most one** `draft` or `editing` request at a time (`createPortalPrintRequest`
  enforces this; see ADR-FP-071). Queuing to a show (`active`) frees the customer to start another.
- `active`/`editing` → `completed` once every unit of the request's requested quantity has been
  allocated and printed (`markPrintRequestCompletedIfFullyPrinted()`).

`archived` hides a request from Studio operational list tabs. Portal **Clear request**
(`clearPortalWorkingPrintRequest`) deletes items and sets `itemCount: 0` but **keeps** the request
open as `draft`/`editing` so the next Add reuses the same id (ADR-FP-071). Owner/admin **empty
stale archive** (`archiveStaleWorkingPrintRequests`, 14-day empty working carts) sets `archived`.
It is never a synonym for printed. Studio Working triage defaults to **Active** carts (has items,
updated within 48 hours); **Idle** (2–7 days) / **Stale** (7+ days) / Empty / All chips + rail
search cover the rest (ADR-FP-079).
Empty working carts may be owner/admin auto-archived after 14 days of no updates.
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
| `visionModelId` | string | One of server allowlist (see BACKEND) |
| `promptTemplate` | string | Owner/admin-editable AI Processing prompt template |
| `tagRerankPromptTemplate` | string | Optional tag rerank prompt |
| `additionalTagExclusions` | string[] | Optional owner/admin tags merged with base exclusions |
| `tagRerankMode` / `suggestionAuthorMode` / `suggestedNewTagsPolicy` | string | Pipeline policy knobs |
| `catalogWorkflowMode` | `manual` \| `shadow` \| `autonomous` | Slice 4 Catalog Processing Mode; absent/invalid → **manual** |
| `catalogAutonomousLiveEnabled` | boolean | Slice 4 live publication gate; default **false** |
| `catalogAutonomousLiveEnabledAt` / `By` | Timestamp / string | Audit when live gate enabled |
| `updatedAt` | Timestamp | Last change |
| `updatedBy` | string | UID of last updater |

**Permissions:** Staff may read (AI Processing label). Model/prompt/tag fields: callable `updateAiEnrichmentSettings` (owner/admin). Catalog Processing Mode + live Autonomous: callable `updateCatalogWorkflowMode` (**owner-only**). No API keys in this document.

### `settings/catalogAutomationHealth` (Slice 4)

Lightweight Automation Health counters (`analyzed`, `wouldAutoApprove`, `actuallyAutoApproved`, verifier metrics, `routedNeedsReview`, `categoryGap`, etc.). Staff read; Admin SDK write only.

### `catalogReprocessJobs` (Slice 4 control plane; Slice 5 AI Review execution)

Durable Catalog Reprocessing jobs. Client write denied; **owner** read for progress. Started via owner callables with typed confirmation. Soft pause; one active job per `(projectId, targetType)`.

**Slice 5 (`ai_review_queue`):** Start enabled when `CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED`. Server Start requires Catalog Processing Mode **shadow** and `catalogAutonomousLiveEnabled === false`. Eligibility: `status == imported` AND `aiReviewStatus == needs_review`. Worker clears AI blobs (including `smartProfile` / `aiReviewNotes`) with reset-equivalent semantics, preserves B/D human fields (title, tags, artwork background, halftone, companions, etc.), runs the live enrichment pipeline (`catalog-enrich-v30` + `smart-profile-normalizer-v4`) in **queue** mode, and records per-design outcomes under `catalogReprocessJobs/{jobId}/outcomes/{designId}`. Shadow success must remain `imported` + `needs_review`; lifecycle anomalies soft-pause the job.

**Slice 6 (`ready_catalog`) — implemented; Start gate still `CATALOG_REPROCESS_READY_CATALOG_ENABLED = false` until owner unlock after DEV deploy:** Eligibility: `status == ready` AND `aiReviewStatus == approved`. Worker uses **Ready-safe staging** (`buildReadyCatalogReprocessAiStageUpdate`) — never writes `imported`, `pending`, or `needs_review`; preserves `aiReviewed*`, `readyAt`, root title/description/categoryId/tags, and `aiReviewNotes`; does **not** delete `smartProfile` before enrich (atomic replace on success). Pipeline runs in **`ready_backfill`** mode: success sets `aiProcessingStage: ready_for_review` while keeping `status: ready` and `aiReviewStatus: approved`; failure sets `aiProcessingStage: failed` without demoting lifecycle. Catalog Processing Mode records Shadow automation provenance only — **no** `publishReady` / Autonomous lifecycle mutation. Outcomes track `remainedReady`, `preservationViolations` (on `ready_lifecycle_violation`), and optional bounded `canaryDesignIds` → job `boundedDesignIds`. Algolia: Smart Profile index-field changes on `status: ready` upsert via existing sync; any non-ready write deletes index object (P0 violation). Terminal success stage: **`ready_for_review`** (same as queue pipeline success stage; does not change operational `status`).

**Per-design audit:** `designs.aiSuggestions.model` records the resolved model used for each enrichment run, including one-off AI Processing overrides. `aiSuggestions.tags` are filtered server-side against base + additional exclusions and resolved against approved tag names/aliases.

**Prompt taxonomy context (2026-06-30):** Cloud Functions replace `{{approved_categories}}` with active category names plus descriptions, `{{approved_tags}}` with approved tag names plus aliases and preferred-when guidance, and `{{excluded_tags}}` with the effective exclusion list. AI should choose one approved category and approved tag names first, inspect the full image for readable text, include exact readable text in the description when present, and return `suggestedNewTags` only when no approved name or alias is relevant enough. Each suggestion must include `name`, `aliases`, `preferredWhen`, and `reason` for owner/admin review.

**Needs Review / Rejected re-run:** `resetAiEnrichmentForProcessing` clears suggestions and sends the design back to Processing. No AI call runs on the review tab. Studio stays on the source tab after a successful reset; Processing is opened manually.

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
  /** Max prints contained in one working print request. */
  maxQuantityPerPrintRequest: number;
  /** Max prints one customer may place into one show (sum across their requests). */
  maxQuantityPerShowPerCustomer: number;
  /**
   * When true (default / absent), both numeric limits stay equal (sole-`L` compat).
   * Studio may unlink for independent caps.
   */
  linkPrintRequestAndCustomerShowLimits: boolean;
  /**
   * Legacy Cap A field. Mirrored from request limit on owner save for one-release rollback.
   * Not read or enforced (ADR-FP-102).
   */
  dailyDesignsAddedToRequestsLimit: number;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Portal print limits (ADR-FP-102, amended 2026-07-31). Count = sum of `printRequestItems.quantity`.
Working-request adds clamp/reject at `maxQuantityPerPrintRequest`; queue requires entire request ≤
request limit and full fit on the chosen show (show capacity + this customer's cumulative allocated
quantity on that show against `maxQuantityPerShowPerCustomer`, which may span multiple separate
requests — ADR-FP-122). Missing fields resolve via `resolvePrintRequestLimitSettings` (default **20**;
request limit falls back to customer-show when absent).
Signed-in users may read; writes use `updatePrintRequestLimitSettings` (mirrors request limit into legacy Cap A).
Bounds: integers 1–10000.

Optional **customer-specific temporary override** on `customers/{customerId}.printRequestQuotaOverride`
(owner-only Admin callable `updateCustomerPrintRequestQuotaOverride`; ADR-FP-159). Independently nullable
`maxQuantityPerPrintRequest` / `maxQuantityPerShowPerCustomer`, optional `expiresAt`, plus `updatedAt` /
`updatedBy`. Effective limits = active override dimension ?? current global
(`resolveEffectivePrintRequestLimits`). Expired overrides are inactive without a scheduler. Studio
editing may **link** both dimensions in the UI while still storing independent fields. Does not
mutate existing requests/allocations. Cap A / `printRequestDesignDailyLimits` remain retired.

### `settings/portalHelp`

```ts
interface PortalHelpTextFaq {
  id: string; // 1–64 chars, [\w.-]+
  question: string; // 1–200 chars
  answer: string; // 1–4000 chars, plain text (newlines OK; no HTML)
  order: number; // dense 0..n-1 after save
}

interface PortalHelpVideoItem {
  id: string;
  title: string; // 1–160 chars
  description?: string; // ≤500 chars
  videoUrl: string; // HTTPS YouTube or Vimeo only (required on save)
  order: number;
}

interface PortalHelpSettings {
  faqs: PortalHelpTextFaq[]; // max 50
  videos: PortalHelpVideoItem[]; // max 20
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Owner/admin-editable Portal FAQ and How To content. Studio **Settings → FAQ and How To**.
Writes via `updatePortalHelpSettings` (callable; client writes denied). Firestore:
**public read**. Missing doc **or empty saved `faqs`** → Portal uses bundled
`portalHelpContent.ts` FAQ defaults. Empty / missing `videos` → Coming soon UI (no dummy
video slots). Path remains `/help`;
page H1/SEO title **FAQ and How To**; sidebar nav label **Help** (ADR-FP-118).
On **`fresh-prints-dev`**, initial FAQ list may be seeded with
`npx tsx functions/scripts/seed-portal-help-faqs.ts` (`videos: []`) so Studio shows
editable saved items matching bundled defaults (ADR-FP-118).

### `settings/portalSocialMeta`

```ts
interface PortalStaticOgImageSnapshot {
  kind: "upload" | "design";
  storagePath: string | null; // upload: portal-social-meta/static-og/{uuid}.{ext}; design: preview/thumbnail path
  downloadUrl: string | null; // HTTPS snapshot authored at Save
  sourceDesignId: string | null; // provenance only when kind === "design"
}

interface PortalSocialMetaSettings {
  ogTitle: string; // 1–120 chars
  ogDescription: string; // 1–300 chars
  /** Letterbox designs onto 1200×630 for Facebook wide previews (default true). */
  letterboxOgImages: boolean;
  /** Non-design URLs: library rotation, brand logo, or fixed static image (default "library"). */
  globalOgImageSource: "library" | "logo" | "static";
  /**
   * UTC-aligned library OG rotation cadence (default "hourly").
   * Values: "daily" | "hourly" | "5min" | "1min" | "30s".
   * Not “every share” — Facebook/WhatsApp/Messenger cache OG by page URL.
   */
  libraryOgRotationInterval: "daily" | "hourly" | "5min" | "1min" | "30s";
  /**
   * Shifts the library pick (default 0). Studio “Pick next library preview” bumps this
   * so testing can change the image without waiting for the next interval bucket.
   */
  libraryOgRotationSalt: number; // 0–1_000_000
  /**
   * Resolved static OG asset snapshot (upload or Design Library pick).
   * Retained when temporarily switching to library/logo. Missing/invalid static mode
   * fail-safes to brand logo / Portal bundled defaults at read time.
   */
  staticOgImage: PortalStaticOgImageSnapshot | null;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Owner-editable global Open Graph for Portal non-design URLs (home, catalog, login, etc.).
Studio **Settings → Social sharing**. Writes via `updatePortalSocialMetaSettings` (owner-only
callable). Client reads: owners only. Portal prefers public Function `getPortalGlobalOpenGraph`
for crawler meta (title/description/image); Admin settings-only is a fallback. Missing doc
resolves to brand defaults (`letterboxOgImages: true`, `globalOgImageSource: "library"`,
`libraryOgRotationInterval: "hourly"`, `libraryOgRotationSalt: 0`,
title/description Whatnot wording). Library image index is
stable for the selected UTC interval bucket (`pickLibraryOgRotatedIndex` + salt) — Facebook
Scrape Again alone does not change it until the bucket advances.
When letterbox is on, design and library `og:image` URLs point at public Function
`getPortalOgShareImage` (composed JPEG using the design’s `artworkBackgroundHex`, fallback
`#e5e7eb`) with query `fit=contain&bg=<hex>` (`bg` is a Facebook/CDN cache-bust; Function
paints from the design document, not the query). When off, signed Storage preview/thumbnail
URLs are used for **library** mode only. **Static Image mode always letterboxes** via
`getPortalOgShareImage` (`designId` for Design Library picks; validated `staticPath` under
`portal-social-meta/static-og/` for uploads). The `letterboxOgImages` toggle does **not**
disable Static letterboxing. Missing/invalid Static sources fail-safe to brand logo / Portal
bundled defaults — never raw snapshot URLs.

### `settings/brandLogos`

```ts
interface BrandLogoSlot {
  storagePath: string; // brand/{studio|portal}/{full|collapsed}/{uuid}.png
  downloadUrl: string; // HTTPS Firebase download URL (server-authored)
  contentType: "image/png";
  byteSize: number;
  aspectRatio?: number; // width/height from upload (display linking)
  updatedAt: Timestamp;
  updatedBy: string;
}

interface BrandLogoDisplayBox {
  widthPx: number; // 16–400
  heightPx: number; // 16–400
}

interface BrandLogoSettings {
  studioFull?: BrandLogoSlot | null;
  studioCollapsed?: BrandLogoSlot | null;
  portalFull?: BrandLogoSlot | null;
  portalCollapsed?: BrandLogoSlot | null;
  portalHeader: BrandLogoDisplayBox;
  portalSidebar: BrandLogoDisplayBox; // expanded sidebar; defaults match portalHeader
  portalSidebarCollapsed: BrandLogoDisplayBox;
  portalAuth: BrandLogoDisplayBox;
  studioSidebar: BrandLogoDisplayBox;
  studioSidebarCollapsed: BrandLogoDisplayBox;
  studioLogin: BrandLogoDisplayBox;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Owner-editable Studio + Portal brand logos (full + collapsed). Studio **Settings → Brand logos**.
Client uploads PNG to Storage `brand/…` (owner create); `finalizeBrandLogoSlot` (owner-only
callable) verifies the object via Admin metadata, writes `contentType` / `byteSize` /
`downloadUrl` from Storage (does not trust client file metadata), optionally stores validated
`aspectRatio`, and deletes the prior object on replace/clear. Display boxes
(`widthPx` × `heightPx`, aspect ratio locked in Studio UI) are owner-editable via
`updateBrandLogoDisplaySizes`. Portal **header** (`portalHeader`) and **expanded
sidebar** (`portalSidebar`) are separate owner controls that default to the same
box (height 52). Collapsed sidebar remains `portalSidebarCollapsed`. Firestore:
**public read**, client writes denied. Missing
slots → apps use bundled/`public/brand` static fallbacks. When
`portalSocialMeta.globalOgImageSource === "logo"`, `getPortalGlobalOpenGraph` prefers
`portalFull.downloadUrl` when set.

### `emailDeliveryJobs`

Server-only durable outbox for Assisted Creation proof-ready notices. The deterministic document ID
is a fixed-length SHA-256 identity derived from `{requestId, proofId}` so client-controlled IDs
cannot introduce Firestore path separators.

| Field | Purpose |
|-------|---------|
| `id`, `kind` | Stable identity; kind is `assisted_proof_ready` or `assisted_catalog_share_ready` |
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

# Customer Activity Events (identity audit evidence)

Append-only audit trail for customer identity operations. **Not** lifecycle source-of-truth — canonical state remains on `customers`, `printRequests`, and other domain entities.

```txt
customerActivityEvents/{eventId}
```

```ts
export interface CustomerActivityEvent {
  customerId: string;
  eventType:
    | "account.username_changed"
    | "account.username_transferred"
    | "account.duplicate_resolution_previewed"
    | "account.disabled"
    | "account.restored"
    | "account.hard_delete_previewed"
    | "account.hard_delete_applied";
  occurredAt: Timestamp;
  actorUid: string;
  actorRole: "owner" | "admin" | "system";
  derivation: "live" | "reconstructed";
  result?: "success" | "blocked" | "already_done" | "failed";
  metadata?: Record<string, unknown>; // no secrets; may include previewChecksum
}
```

Writes: Admin SDK / trusted callables only. Staff read.

Short-lived `customerIdentityOperationPreviews/{previewId}` docs support single-use identity Apply validation (operations: `hard_delete`, `duplicate_resolution`; no client access). WS2 duplicate resolution stores source/survivor ids, desired username, verification mode, checksum, and 15-minute expiry.

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
printRequests.queueTab + updatedAt + __name__
printRequests.isInternal + queueTab + updatedAt + __name__
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
printRequests.queueTab + updatedAt + __name__
printRequests.isInternal + queueTab + updatedAt + __name__
printRequestItems.printRequestId + updatedAt
printRequestItems.printRequestId + status + updatedAt
customers.isGuest + displayName
```

Username reservations and request counters use document IDs and direct document reads/writes; no
additional composite indexes are required for those paths.

The unfiltered request list is ordered by `updatedAt` descending. Studio Print Requests list pages
filter by `isInternal` + `queueTab` with `updatedAt`/`__name__` pagination (ADR-FP-140). Request item details and card
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

```ts
status: "archived"
```

instead of permanent deletion.

Applies to:

* Designs (archive + optional owner asset purge; no hard delete in current phase)
* Print requests with production history (archive; eligible unused working requests may hard-delete via callable)
* Shows with production/past history (archive/cancel; empty upcoming shows may hard-delete via callable)
* Categories / tags (soft archive; blocked while designs reference them)
* Customer accounts (**tombstone**: `isDeleted` + Auth disable; never cascade-delete history)

Hard delete is policy-based, server-authoritative, and never a silent cascade (ADR-FP-115).

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
