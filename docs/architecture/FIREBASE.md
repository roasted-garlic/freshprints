# Fresh Prints Firebase Standards

## Purpose

This document defines how Firebase is used throughout the Fresh Prints platform.

This document is the source of truth for:

* Firebase Architecture
* Authentication
* Firestore
* Firebase Storage
* Security Rules Philosophy
* Collection Design
* Environment Configuration
* Firebase Service Patterns
* Local Development
* Production Deployment

All Firebase-related code must follow this document.

---

# Firebase Philosophy

Firebase is the central backend for Fresh Prints.

Firebase is responsible for:

* Authentication
* Authorization data
* Firestore documents
* File storage
* Shared application state

Firebase is the source of truth.

Do not create:

* Local databases
* Secondary databases
* Separate desktop databases
* Separate website databases

unless explicitly approved.

---

# Firebase Services Used

Fresh Prints uses:

## Firebase Authentication

Purpose:

* User login
* User identity
* Session management

---

## Firestore

Purpose:

* Metadata
* Business records
* Application state

Firestore stores:

* Users
* Designs
* Categories
* Requests
* Queues
* Settings
* Audit logs

Firestore does NOT store:

* Images
* ZIP files
* Binary assets

---

## Firebase Storage

Purpose:

* Original images
* Thumbnails
* Preview images
* Customer uploads

Storage stores files.

Firestore stores metadata.

---

# Firebase Project Strategy

Use a single Firebase project.

All applications use:

* Same Auth
* Same Firestore
* Same Storage

Applications:

```txt id="udgtw3"
Fresh Prints Studio
Fresh Prints Portal
```

Both share one Firebase backend. No separate mobile backend. See `docs/architecture/ADR-Application-Platform-Strategy.md`.

---

# Environment Strategy

Firebase configuration belongs in:

```txt id="d8vwe4"
src/renderer/src/config/firebase.ts
```

Environment values belong in:

```txt id="v7g1b7"
.env
.env.local
.env.production
```

Never hardcode Firebase credentials.

---

# Environment Variable Naming

Use:

```env id="8u3s1y"
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Only expose values required by Firebase client SDKs.

Never expose admin credentials.

---

# Firebase Initialization

Use a single Firebase initialization file.

Example:

```txt id="nsdh8s"
config/firebase.ts
```

The project should initialize:

* app
* auth
* firestore
* storage

Only once.

Never initialize Firebase in multiple places.

---

# Authentication Standards

Use Firebase Authentication.

Supported providers initially:

```txt id="o6dx1o"
Email / Password
```

Future providers may include:

```txt id="5cnuvl"
Google
Apple
```

Do not add providers without approval.

---

# Authentication Flow

Flow:

```txt id="s9cxgt"
Login
 ↓
Firebase Auth
 ↓
Get User
 ↓
Load Firestore User Record
 ↓
Load Roles
 ↓
Load Permissions
 ↓
Enter App
```

Authentication identifies the user.

Permissions authorize the user.

These are separate concerns.

---

# User Record Requirements

Every authenticated user must have:

```txt id="v5n4gz"
users/{userId}
```

document.

Auth users alone are insufficient.

The Firestore user record is required.

---

# User Loading Pattern

Do not rely solely on:

```ts id="72zhkq"
auth.currentUser
```

Always load:

```txt id="7vmh7n"
Firestore User Record
```

after authentication.

The Firestore record contains:

* Role
* Permissions
* Settings
* Metadata

---

# Firestore Philosophy

Firestore stores metadata.

Firestore stores business records.

Firestore does not store files.

Firestore should remain lightweight.

---

# Firestore Collections

Initial collections:

```txt id="spjlwm"
users
designs
categories
tags
customers
customerRequests
showQueues
showQueueItems
settings
auditLogs
```

Future collections require approval.

`tags` is the global approved tag library. Active staff may read it. Owner/admin may create,
edit, and archive individual tag records; owner-only bulk JSON import is a UI/service workflow.
Tag archive is soft (`status: "archived"`); deletes are blocked.

---

# Firestore Document Standards

Every document should contain:

```ts id="5y5h9w"
id
createdAt
updatedAt
```

When applicable:

```ts id="k4e2j5"
createdBy
updatedBy
```

Use server timestamps whenever possible.

---

# Firestore Service Pattern

Components should never call Firestore directly.

Bad:

```ts id="vgys3k"
getDocs(...)
```

inside components.

Good:

```ts id="zvljux"
designService.getDesigns()
```

Service:

```txt id="3xcp9n"
Service
 ↓
Firestore
```

Component:

```txt id="ltm6b9"
Component
 ↓
Hook
 ↓
Service
 ↓
Firestore
```

---

# Firestore Query Standards

Keep queries simple.

Prefer:

```txt id="efzjpn"
Indexed Queries
```

Avoid:

```txt id="4x25mw"
Large Collection Scans
```

Design Firestore around query patterns.

Do not design queries around document structure.

---

# Firestore Pagination

Large collections must support pagination.

Examples:

```txt id="u13h6t"
Designs
Customer Requests
Audit Logs
```

Avoid loading thousands of records at once.

---

# Firestore Search Strategy

Firestore supports metadata searching.

Future search may include:

```txt id="bslk6v"
Title
Tags
Category
Status
```

Do not store unnecessary duplicated search fields.

---

# Firestore Transactions

Use transactions when:

* Updating counters
* Updating queue ordering
* Updating related documents

Avoid race conditions.

---

# Firestore Batch Writes

Use batch writes when:

* Importing designs
* Updating multiple records
* Processing queue operations

Reduce network overhead.

---

# Firebase Storage Philosophy

Storage stores files.

Firestore stores metadata.

Never reverse these responsibilities.

---

# Storage Structure

Use:

```txt id="v7c0qx"
/originals/
/thumbnails/
/previews/
/customer-uploads/
```

---

# Originals

Location:

```txt id="qu5yzx"
/originals/{designId}.png
```

Purpose:

* Production assets
* Gang sheet assets

Originals should remain high quality.

---

# Thumbnails

Location:

```txt id="pmr08n"
/thumbnails/{designId}.webp
```

Purpose:

* Design grids
* Search
* Customer browsing

Phase 3C constraints:

* Canonical path: `/thumbnails/{designId}.webp`
* Format: WebP only (`image/webp`)
* Max object size: **10 MB** (`MAX_DERIVATIVE_FILE_SIZE_BYTES`)
* Path helpers: `shared/constants/design/designStoragePaths.ts`

---

# Preview Images

Location:

```txt id="77f3zv"
/previews/{designId}.webp
```

Purpose:

* Medium resolution previews

Phase 3C constraints:

* Canonical path: `/previews/{designId}.webp`
* Format: WebP only (`image/webp`)
* Max object size: **10 MB** (`MAX_DERIVATIVE_FILE_SIZE_BYTES`)
* Path helpers: `shared/constants/design/designStoragePaths.ts`

---

# Customer Uploads

Location:

```txt id="5gw7j6"
/customer-uploads/{requestId}/
```

Purpose:

* Customer submitted images

---

# Upload Workflow

Uploads should follow:

```txt id="m2w8mx"
Validate
 ↓
Generate designId
 ↓
Upload Original
 ↓
Create Firestore Record
 ↓
Generate Thumbnail (Phase 3C)
 ↓
Upload Thumbnail (Phase 3C)
```

Never create Firestore records before the original file exists in Storage.

Files should exist before metadata references them.

## Phase 3A Single PNG Upload (implemented)

Desktop import flow (Phase 3A-3 + 3A-4):

```txt
Main: select + validate PNG
 ↓
Renderer: designService.generateDesignId()
 ↓
Main: readSelectedPngFileBytes (session-validated path)
 ↓
Renderer: importUploadService.uploadOriginalPng → /originals/{designId}.png
 ↓
Renderer: designService.createDesign (status: imported, print-size fields from import normalization)
```

On Firestore create failure after upload, `importUploadService.deleteOriginalPng(designId)` removes the orphan original when possible.

## Phase 3C Single PNG Derivative Pipeline (implemented — Step 7)

Single-file import extends the Phase 3A flow via `importValidatedPngFile` (no `jobId`):

```txt
Main: readSelectedPngFileBytes({ filePath, includeDerivatives: true })
 ↓
Renderer: uploadOriginalPng → /originals/{designId}.png
 ↓
Renderer: designService.createDesign (status: imported, print-size fields from import normalization)
 ↓
Renderer: importDerivativeService.runImportDerivativePipeline
      markDesignProcessing → upload thumbnail → upload preview → markDesignDerivativesComplete
 ↓
Firestore status: imported (paths populated on pipeline success)
```

Import vs pipeline success tiers:

| Tier | Meaning |
| --- | --- |
| Import success | Original uploaded; Firestore record created |
| Pipeline success | Derivatives uploaded; `thumbnailPath` / `previewPath` set; `status` remains `imported` until AI review |

On derivative failure after create: original and design record retained; `status` reverts to `imported`; derivative Storage objects deleted (best-effort). Single-file and batch imports share this policy.

## Phase 3B/3C Batch Upload (implemented — Step 8)

After batch discovery, `importBatchOrchestrationService.runBatchUpload()` reuses `importValidatedPngFile` per validated manifest entry with batch session-gated read (`includeDerivatives: true`):

```txt
batch-discovery-complete manifest
 ↓
importBatchOrchestrationService (UPLOAD_CONCURRENCY = 2)
 ↓
Per file: read bytes + derivatives (batch IPC) → upload original → createDesign (imported)
      → derivative pipeline → markDesignDerivativesComplete (status stays imported)
 ↓
finishBatchJob (session cleanup + ZIP temp dir delete)
```

* Each successful import creates one Firestore `designs` document with `status: "imported"` and normalized print-size metadata (`printWidthInches`, `printHeightInches`, `effectiveDpi`, `metadataDpiX`/`metadataDpiY`, `printAspectRatioLocked: true`, `printSizeSource: "import_normalized"`).
* Pipeline success populates `thumbnailPath` / `previewPath` without setting `status: ready`.
* Per-file import vs pipeline success tiers match single PNG import.
* One file failure does not stop the batch.
* Failed Firestore create after upload triggers original Storage rollback per file.

* Upload uses Firebase Storage SDK in the renderer with authenticated staff credentials.
* Catalog records use `designService.createDesign()` — audit fields (`createdBy`, `updatedBy`, `createdAt`, `updatedAt`) are set in the service layer.
* File bytes are read in the Electron main process only.
* `contentType` is `image/png`.
* Storage rules live in `storage.rules` at the project root.

Deploy Storage rules:

```bash
firebase deploy --only storage
```

---

# Download Workflow

Downloads should:

```txt id="mb1o2i"
Read Firestore Metadata
 ↓
Get Storage Path
 ↓
Download File
```

Never rely on hardcoded paths.

---

# Storage URL Standards

Do not store download URLs permanently when avoidable.

Prefer storing:

```txt id="rr93q0"
Storage Path
```

Example:

```txt id="25dplu"
/originals/abc123.png
```

URLs can change.

Paths remain stable.

---

# Security Rules Philosophy

Security belongs in:

```txt id="ql0h7s"
Firebase Rules
```

not only UI.

Never trust frontend permissions.

Always validate permissions through Firebase security rules.

---

# Role Based Access

Supported roles:

```txt id="rlb8gz"
owner
admin
helper
customer
```

Permissions derive from roles.

Do not duplicate permission logic unnecessarily.

---

# Service Architecture

Firebase access belongs in services.

Examples:

```txt id="5tvk4k"
authService.ts
userService.ts
designService.ts
queueService.ts
```

Firebase access should not exist in components.

---

# Caching Strategy

Use:

```txt id="c4kgp5"
TanStack Query
```

for caching.

Avoid manually caching Firestore responses.

---

# Offline Support

Offline support is not a priority initially.

Build online-first.

Future offline workflows may be added later.

---

# Local Development

Use Firebase production project initially unless a dedicated development project is created.

If a development project is introduced:

```txt id="11uyki"
fresh-prints-dev
fresh-prints-prod
```

must remain clearly separated.

Never mix environments accidentally.

---

# Production Data Protection

Never:

* Delete collections casually
* Delete storage folders casually
* Run destructive scripts without approval

Prefer soft deletion.

---

# Soft Delete Strategy

Prefer:

```ts id="v9dxg7"
status: "archived"
```

instead of permanent deletion.

This applies to:

* Designs
* Requests
* Queues

whenever practical.

---

# Audit Logging

Important actions should create audit logs.

Examples:

* Design imports
* Queue changes
* User role changes
* Customer request approvals

Audit logs should be immutable.

---

# Monitoring Philosophy

When errors occur:

Capture:

* User
* Operation
* Timestamp
* Error Message

Avoid silent failures.

---

# Phase 1 Cloud Functions

Phase 1 user management uses callable Cloud Functions:

* `createTeamUser` — secure team user creation and invitation email delivery
* `updateTeamUser` — edit team user role and status with Auth/Firestore sync

The renderer must call these functions instead of writing protected user records directly.

---

# Phase 5B Cloud Functions — AI Processing

Staff-controlled AI enrichment after import:

* `enqueueAiEnrichment` — callable; validates staff access, applies Settings defaults or Processing-tab model/reasoning overrides, and runs the AI enrichment pipeline directly for one imported design.
* `resetAiEnrichmentForProcessing` — callable; resets Needs Review or Rejected designs back to Processing for a staff-started re-run and clears prior `aiSuggestions` / `aiAnalysis`.
* `onDesignAiEnrichmentQueued` — legacy Firestore `designs/{designId}` update trigger kept for compatibility; the live Processing flow should not depend on trigger round trips.

**Deploy (required for AI pipeline):**

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

Prefer a full `functions` deploy after export/entrypoint changes so all exports stay aligned. Filtered deploy is optional afterward:

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing
```

**Prerequisite:** `GEMINI_API_KEY` must exist in **Firebase Secret Manager** before deploy (functions bind the secret at deploy time). See **AI provider secrets** below — never store this key in Firestore or the desktop app.

**Build entrypoint:** `functions/package.json` → `main: lib/functions/src/index.js` (see `docs/workflow/setup/firebase-functions-setup.md`).

## AI provider secrets (Phase 5B)

As of ADR-FP-040, Google (Gemini) is the only AI provider; OpenAI was removed and `OPENAI_API_KEY` is no longer referenced by Cloud Function code.

| Rule | Detail |
|------|--------|
| Storage | **Firebase Secret Manager only** (`GEMINI_API_KEY`) |
| Firestore | **Not allowed** — no provider API keys in `settings` or any collection |
| Desktop renderer | **Must not** read, write, display, or configure Gemini keys |
| Settings UI | **No** API-key entry on the desktop Settings page |
| Cloud Functions | May read secrets via `defineSecret` / `secrets` binding |
| Development | Heuristic provider runs when secret is unset or empty at **runtime** (after deploy) |
| Production Gemini | Requires a real `GEMINI_API_KEY` in Secret Manager (human approval) |

Set secret (human, outside repo):

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

**Do not** store `GEMINI_API_KEY` in Firestore `settings` or any document. The desktop renderer must never read provider secrets.

### Build artifact caution

Never commit compiled `shared/**/*.js` from `functions` `tsc`. Vite resolves `.js` before `.ts` and a stale CJS file can cause a white screen at startup (see TD-012).

---

# Phase 2A Design Library Services

Phase 2A adds typed Firestore services for the design catalog foundation.

## Collection Constants

```txt
src/renderer/src/features/firebase/constants/firestoreCollections.ts
```

Collections:

* `designs`
* `categories`

Access through `firestoreCollectionService.getDesignsCollection()` and `getCategoriesCollection()`.

## Renderer Services

```txt
src/renderer/src/features/designs/services/designService.ts
src/renderer/src/features/designs/services/categoryService.ts
```

`designService` methods:

* `listDesigns`
* `getDesignById`
* `createDesign`
* `updateDesign`
* `archiveDesign`
* `restoreDesign`

`categoryService` methods:

* `listCategories`
* `getCategoryById`
* `createCategory`
* `updateCategory`
* `archiveCategory`
* `restoreCategory`

Components and hooks must call these services. Do not call Firestore directly from UI code.

## Storage Path Helpers

```txt
src/renderer/src/features/designs/constants/designStoragePaths.ts
```

Helpers:

* `getOriginalStoragePath(designId)`
* `getThumbnailStoragePath(designId)`
* `getPreviewStoragePath(designId)`

Canonical path definitions live in `shared/constants/design/designStoragePaths.ts` and are re-exported from the renderer constants module.

## Upload Services

| Service | Paths | Phase |
| --- | --- | --- |
| `features/imports/services/importUploadService.ts` | `/originals/{designId}.png` | 3A-3 |
| `features/designs/services/designDerivativeStorageService.ts` | `/thumbnails/{designId}.webp`, `/previews/{designId}.webp` | 3C Step 5 |

Derivative uploads set `contentType: image/webp`, validate WebP magic bytes client-side, enforce `MAX_DERIVATIVE_FILE_SIZE_BYTES` (10 MB), and return catalog path strings. Delete helpers are best-effort and typed.

## Derivative URL Resolution (Phase 3C Step 9)

`features/designs/services/designDerivativeUrlService.ts` resolves canonical catalog paths to Firebase Storage download URLs via `getDownloadURL`. URLs are **not** persisted in Firestore.

| Method | Input | Result |
| --- | --- | --- |
| `getThumbnailUrl(design)` | `design.thumbnailPath` | Download URL or `null` |
| `getPreviewUrl(design)` | `design.previewPath` | Download URL or `null` |
| `getDownloadUrlForCatalogPath(path)` | Catalog path string | Download URL or `null` |

Caching: in-memory `path → URL` map for the renderer session; in-flight request deduplication per path. Missing paths, missing objects (`storage/object-not-found`), and other Firebase errors return `null` without throwing to the UI.

Hook: `features/designs/hooks/useDesignDerivativeUrl.ts` — exposes `loading` / `resolved` / `unavailable` for components.

Staff must be authenticated; Storage rules from Step 5 govern access. No additional deploy required for URL resolution.

### Rendering polish (Phase 3C Step 10)

`DesignThumbnailPanel` handles loading, resolved, unavailable, and broken-image (`onError`) states. Images use `decoding="async"`. Library card thumbnails use `object-fit: cover`; detail previews use `object-fit: contain`. Decorative card images do not duplicate accessible names inside design card buttons.

## Design Lifecycle Service (Phase 3C Step 6)

`features/designs/services/designReadyService.ts` manages Firestore status transitions for the derivative pipeline:

| Method | Transition | Firestore fields updated |
| --- | --- | --- |
| `markDesignProcessing(caller, designId)` | `imported` → `processing` | `status`, `updatedAt`, `updatedBy` |
| `markDesignDerivativesComplete(caller, designId, paths)` | After derivative upload — sets paths; keeps `status: imported` |
| `markDesignReady(caller, designId, paths)` | **Future** post-AI-review transition to `status: ready` — not used in Phase 3C import |

`paths` must include canonical `originalPath`, `thumbnailPath`, and `previewPath` for the design ID. `originalPath` is validated against the existing design record and is not overwritten on ready.

`createdAt`, `createdBy`, and `uploadedBy` are preserved. Updates delegate to `designService.updateDesign`.

## Storage Rules

Staff-only rules for design assets are defined in:

```txt
storage.rules
```

| Path | Format | Size cap | Access |
| --- | --- | --- | --- |
| `/originals/{designId}.png` | PNG | 150 MB | Active staff only |
| `/thumbnails/{designId}.webp` | WebP | 10 MB | Active staff only (Phase 3C) |
| `/previews/{designId}.webp` | WebP | 10 MB | Active staff only (Phase 3C) |

Customer access to derivatives remains denied in Phase 3C. All other paths default deny.

Wired in `firebase.json` for deployment with `firebase deploy --only storage`. Rules are not live until deployed.

## Firestore Indexes

Composite indexes for catalog queries live in:

```txt
firestore.indexes.json
```

Deploy with:

```bash
firebase deploy --only firestore:indexes
```

Expected query patterns:

* `designs` filtered by catalog `status: ready` (default) or `status: archived` (archived catalog toggle), ordered by `updatedAt` desc
* `designs` filtered by `categoryId` + catalog `status`, ordered by `updatedAt` desc
* `designs` filtered by single `tags` array-contains + catalog `status` (query field order: `categoryId` → `tags` → `status`)
* `designs` filtered by `categoryId` + `tags` + catalog `status` (Design Library category + tag filters)
* Additional `status` + `tags` and `categoryId` + `status` + `tags` composite indexes cover tag filters in both approved and archived views
* Tag queries use a single `status` equality (`ready` or `archived`) — no combined ready+archived queries
* If a tag index is still building, the app falls back to client-side tag filtering on a larger catalog fetch
* `designs` filtered by `aiReviewStatus` + `status` — **reserved for AI Review (Phase 5)**; indexes retained in `firestore.indexes.json`
* `categories` filtered by `isActive`, ordered by `sortOrder` asc

Phase 4 catalog cleanup removed Design Library status and AI review filters. Library queries default to approved catalog (`status: ready`). The archived catalog toggle queries `status: archived` only. **Do not delete** `aiReviewStatus` composite indexes before Phase 5 AI Review ships.

## Firestore Rules

Design and category rules live in `firestore.rules`.

Phase 3D Step 3 adds optional validators for print-size fields on `designs` (`printWidthInches`, `printHeightInches`, `printAspectRatioLocked`, `metadataDpiX`, `metadataDpiY`, `effectiveDpi`, `printSizeSource`). Deploy rules after pulling this change.

Deploy with:

```bash
firebase deploy --only firestore:rules
```

---

# Phase 2C Manual Design Library UI

Phase 2C wired the Phase 2A services into desktop modals and hooks. No new Firestore collections, indexes, rules, or Cloud Functions are required.

**Post–Phase 3C update:** Manual **Add design** UI was removed from the Design Library. New records are created by the import pipeline (`designService.createDesign` in orchestration). Edit, archive, restore, and category management modals remain.

## UI Entry Points

* Design Library header — **Categories** (opens category management)
* Design details modal — **Edit** and **Archive** (staff)

Route: `/designs` (`viewDesigns` permission).

## Renderer Hooks

```txt
src/renderer/src/features/designs/hooks/useUpdateDesign.ts
src/renderer/src/features/designs/hooks/useArchiveDesign.ts
src/renderer/src/features/designs/hooks/useCreateCategory.ts
src/renderer/src/features/designs/hooks/useUpdateCategory.ts
src/renderer/src/features/designs/hooks/useArchiveCategory.ts
```

Components call hooks; hooks call `designService` / `categoryService`. Do not call Firestore from components.

## Design ID Generation

Manual create uses `designService.generateDesignId()` for the Firestore document ID. Storage paths are not auto-generated in Phase 2C.

## Archived Catalog Views

* Archived designs: filter the Design Library with **Status → Archived**.
* Archived categories: category management modal **Archived** / **Back** toggle.
* Restore uses service methods; no permanent delete.

## Refresh Behavior

After create, edit, or archive:

* `useDesigns().reloadDesigns()` refreshes the current filtered list
* `useCategories().reloadCategories()` refreshes category pickers and the category management modal
* Search and filter state on the Design Library page is preserved

## Firebase Deploy

Phase 2C is renderer-only. **No `firebase deploy` is required** unless Phase 2A rules or indexes were not yet deployed.

---

# Future Expansion

Future Firebase features may include:

* Cloud Functions
* Scheduled Jobs
* Notifications
* Analytics

Do not build dependencies on these features until approved.

The architecture should function without Cloud Functions initially.

---

# Firebase Checklist

Before implementing Firebase features:

* Correct collection identified
* Correct service layer used
* Firestore metadata only
* Storage files only
* Security rules considered
* Types updated
* Error handling added
* Audit logging considered
* No direct Firebase access in components

Every Firebase change should follow this checklist.
