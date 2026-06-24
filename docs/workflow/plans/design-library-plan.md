# Design Library Foundation Plan

## Goal

Establish the **Design Library** as the searchable catalog where approved, processed DTF designs live after import, validation, and future AI enrichment.

Phase 2 builds the **catalog foundation only** — data model, security rules, services, and desktop UI for browsing, searching, and manually managing design records during development.

Phase 2 does **not** build the import pipeline, file processing, AI vision, or show queue features.

---

## Platform Context

Fresh Prints will eventually follow this end-to-end workflow:

```txt
1. Import source files
      ZIP files
      folders
      individual images
           ↓
2. Processing pipeline
      unzip / scan
      find PNG files
      validate file type
      validate DPI
      reject low-quality images
           ↓
3. AI enrichment
      vision inspection
      subject/content detection
      visible text reading
      clean file name
      system title
      description
      one category
      many tags
           ↓
4. Design Library / Catalog   ← Phase 2 foundation
      store processed designs
      searchable
      editable
      usable for future show queues
```

**Phase 2 owns step 4’s foundation.** Steps 1–3 are explicitly deferred.

---

## What Belongs in Phase 2

| Area | Phase 2 scope |
| --- | --- |
| `designs` Firestore collection | Schema, types, indexes, security rules |
| `categories` Firestore collection | Schema, types, CRUD for staff, filtering |
| Tag fields on designs | Store, normalize, search (no AI tag generation) |
| Storage path fields | Document path conventions; no upload pipeline |
| Design status field | Support catalog-relevant statuses; display full lifecycle enum |
| Design services + hooks | Firestore access layer; no component-level Firebase calls |
| Permission integration | Extend `permissionService` usage; Firestore rules enforce staff access |
| Design Library page | Grid shell, search, filters, empty/loading/error states |
| Design detail view | Panel or modal for metadata inspection |
| Manual design CRUD | **Testing only** — staff create/edit records without import/AI |
| Search foundation | Title, tags, category, status (per `docs/ROADMAP.md` exit criteria) |
| Sidebar navigation | Design Library nav item for authorized staff |
| Documentation | Update `DATA_MODEL.md` / `SECURITY.md` / `FIREBASE.md` only when implementation diverges |

---

## What Is Explicitly Deferred

Do **not** implement in Phase 2:

| Deferred capability | Target phase |
| --- | --- |
| ZIP importing | Phase 3 — Import System |
| Folder scanning | Phase 3 |
| Individual image picker / batch import UI | Phase 3 |
| DPI validation | Phase 3 |
| File type / dimension validation pipeline | Phase 3 |
| Thumbnail generation | Phase 3 |
| Preview image generation | Phase 3 |
| Storage upload workflow from desktop | Phase 3 |
| Electron main-process file extraction | Phase 3 |
| AI vision processing | Phase 7 — AI Features |
| Automatic renaming | Phase 7 |
| AI title / description / category / tag suggestions | Phase 7 |
| `AiMetadata` write pipeline | Phase 7 |
| Duplicate detection | Phase 7 |
| Advanced search (customer, date ranges, relevance ranking) | Phase 4 — Search And Organization |
| Show queue creation / queue items | Phase 6 — Show Queue System |
| Customer website browsing | Future customer website milestone |
| Customer-facing thumbnail access rules | Future customer website milestone |
| Audit log writes for design changes | Early follow-up (recommended before production catalog use) |
| Cloud Functions for design mutations | Phase 2 uses Firestore rules + client services; revisit if privileged workflows require Functions |

---

## Relationship to Roadmap Phases

```txt
Phase 1  Foundation                    ✅ Complete
Phase 2  Design Library Foundation      ← This plan (catalog only)
Phase 3  Import System                  → Creates records + uploads assets
Phase 4  Search And Organization        → Advanced filters beyond Phase 2 foundation
Phase 5  Customer Requests
Phase 6  Show Queue System              → References designs by ID
Phase 7  AI Features                    → Enriches existing design records
```

Phase 2 exit criteria (from `docs/ROADMAP.md`):

* Designs can be created
* Designs can be edited
* Categories work
* Search works

No ZIP importing yet.

---

# Data Model

## Firestore `designs` Collection

```txt
designs/{designId}
```

Document ID:

* Use Firestore auto-ID or UUID generated client-side before first write.
* Document ID must match storage path tokens (`{designId}`) when assets exist.

### Design Document Fields

Aligned with `docs/DATA_MODEL.md`. Phase 2 implementation groups fields by responsibility.

#### Core catalog fields (Phase 2 required)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Same as document ID |
| `title` | `string` | Human-facing catalog title; required |
| `description` | `string?` | Optional marketing/ops description |
| `categoryId` | `string?` | Reference to `categories/{categoryId}` |
| `tags` | `string[]` | Normalized tag list; default `[]` |
| `status` | `DesignStatus` | See lifecycle section |
| `originalPath` | `string` | Storage path reference; required for catalog-ready records |
| `uploadedBy` | `string` | `users/{uid}` of creator |
| `createdAt` | `Timestamp` | Server timestamp on create |
| `updatedAt` | `Timestamp` | Server timestamp on update |

#### Asset path fields (Phase 2 stored; population deferred to Phase 3)

| Field | Type | Phase 2 behavior |
| --- | --- | --- |
| `thumbnailPath` | `string` | Required in model; may be empty string or placeholder until Phase 3 generates assets |
| `previewPath` | `string?` | Optional; empty until Phase 3 |

#### Technical metadata (Phase 2 optional; populated by import pipeline later)

| Field | Type | Notes |
| --- | --- | --- |
| `width` | `number?` | Pixel width |
| `height` | `number?` | Pixel height |
| `dpi` | `number?` | Print DPI |

#### Relationship / pipeline flags (Phase 2 read/write for testing; real values from later phases)

| Field | Type | Notes |
| --- | --- | --- |
| `requestedByCustomerId` | `string?` | Future customer request link |
| `queueCount` | `number` | Denormalized count; default `0`; updated by show queue phase |
| `aiProcessed` | `boolean` | Default `false` |
| `aiReviewed` | `boolean` | Default `false` |

#### Future AI metadata (Phase 2: type only; do not write from UI)

Store separately when Phase 7 begins. Do not overwrite human-edited `title`, `description`, `categoryId`, or `tags` automatically.

```ts
export interface AiMetadata {
  generatedTitle?: string;
  generatedDescription?: string;
  generatedTags?: string[];
  generatedCategoryId?: string;
  confidence?: number;
  reviewed: boolean;
}
```

**Phase 2 decision:** Do not add `aiMetadata` sub-object to Firestore documents yet unless needed for typing placeholders. Keep `aiProcessed` / `aiReviewed` booleans only.

### TypeScript Location

```txt
src/renderer/src/features/designs/types/design.types.ts
src/renderer/src/features/designs/types/designStatus.types.ts
shared/types/   (only if website + desktop must share later)
```

Prefer feature-local types in Phase 2. Promote to `shared/` when customer website implementation begins.

---

## Category Model

### Firestore `categories` Collection

```txt
categories/{categoryId}
```

### Category Document Fields

Per `docs/DATA_MODEL.md`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Same as document ID |
| `name` | `string` | Display name; unique among active categories |
| `description` | `string?` | Optional admin description |
| `sortOrder` | `number` | Manual ordering in filters/admin UI |
| `isActive` | `boolean` | Inactive categories hidden from assignment/filter defaults |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |

### Category Rules

* One **primary category per design** via `design.categoryId` (matches future AI “assign one category”).
* Categories are managed by **owner and admin** in Phase 2.
* Helpers may assign existing categories to designs but not create/delete categories (configurable; default to owner/admin manage).
* Soft-disable via `isActive: false` instead of hard delete when designs reference a category.

### TypeScript Location

```txt
src/renderer/src/features/designs/types/category.types.ts
```

---

## Tag Strategy

### Storage model

* Tags live on the **design document** as `tags: string[]`.
* No separate `tags` collection in Phase 2.

### Normalization rules (enforced in service layer)

* Trim whitespace.
* Lowercase for storage and search consistency.
* Dedupe before write.
* Reject empty strings.
* Maximum **20 tags per design** (under Firestore `array-contains` practical limits).
* Maximum tag length **40 characters**.

### Search implications

* Phase 2 search uses client-side filtering and/or Firestore `array-contains` for **single-tag** filter queries.
* Multi-tag AND queries may require composite indexes or client-side intersection — start simple in Phase 2A/2B.

### Future AI integration

Phase 7 AI may propose `generatedTags`. Human review merges approved tags into `design.tags`. AI must not silently replace human tags.

### Future tag autocomplete

Phase 4 may add distinct-tag aggregation (Cloud Function or cached settings doc). Not required for Phase 2.

---

## Storage Path Strategy

Per `docs/DATA_MODEL.md` and `docs/FIREBASE.md`:

| Asset | Path pattern | Purpose |
| --- | --- | --- |
| Original | `/originals/{designId}.png` | Production-quality source |
| Thumbnail | `/thumbnails/{designId}.webp` | Grid cards, quick browse |
| Preview | `/previews/{designId}.webp` | Medium-resolution detail view |

### Rules

* Firestore stores **paths**, not download URLs.
* Path extension conventions are canonical (`.png` original, `.webp` derivatives).
* `{designId}` in paths must equal `designs/{designId}` document ID.
* Never store raw file bytes in Firestore.

### Phase 2 behavior

* Manual test records store path strings following the convention.
* Files may be uploaded manually via Firebase Console or a one-off dev script for local testing.
* Phase 2 UI does **not** upload files, generate thumbnails, or resolve signed URLs in production workflows.
* Optional read-only URL resolution helper may be added in services for displaying existing test assets.

### Original Image Path

* Field: `design.originalPath`
* Example: `/originals/abc123def456.png`
* Restricted to staff (`owner`, `admin`, `helper`) per `docs/SECURITY.md`.

### Future Thumbnail / Preview Paths

* Fields: `design.thumbnailPath`, `design.previewPath`
* Populated by Phase 3 upload pipeline after image processing.
* Design Library grid uses `thumbnailPath` when present; fallback placeholder UI when empty in Phase 2.

---

## Status Lifecycle

Canonical enum from `docs/DATA_MODEL.md`:

```ts
export type DesignStatus =
  | "imported"
  | "processing"
  | "ready"
  | "rejected"
  | "queued"
  | "printed"
  | "archived";
```

### Lifecycle diagram

```txt
imported → processing → ready → queued → printed → archived
                    ↘ rejected
```

### Phase 2 supported statuses

| Status | Phase 2 usage |
| --- | --- |
| `ready` | **Default** for manual catalog test records visible in library |
| `archived` | Soft-hide from default library filters |
| `imported` | Allowed on manual records to simulate pre-ready state; hidden from default catalog filter |
| `processing` | Display-only / manual test; hidden from default catalog filter |
| `rejected` | Display-only / manual test; hidden from default catalog filter |
| `queued` | Read/display only; set manually for UI testing; real transitions come from Phase 6 |
| `printed` | Read/display only; manual test |

### Default library filter (Phase 2B)

Show designs where `status == "ready"` unless user expands filter to include other statuses.

### Future transitions

| Transition | Owner |
| --- | --- |
| `imported` → `processing` | Phase 3 import pipeline |
| `processing` → `ready` / `rejected` | Phase 3 validation pipeline |
| `ready` → `queued` | Phase 6 show queue |
| `queued` → `printed` | Phase 6 production tracking |
| Any → `archived` | Staff manual action (Phase 2C) |

---

## Search Strategy

### Phase 2 search scope

Per roadmap exit criteria and `docs/WORKFLOWS.md` search foundation:

| Input | Method |
| --- | --- |
| Title | Case-insensitive substring match |
| Tags | Single-tag Firestore `array-contains` filter **or** client-side match |
| Category | `categoryId` equality filter |
| Status | `status` equality filter |

### Query architecture

```txt
Design Library page
      ↓
useDesignLibraryFilters (hook)
      ↓
designService.listDesigns(query)
      ↓
Firestore indexed query + client refinement
```

### Phase 2 approach

1. **Primary:** Firestore query with `status`, optional `categoryId`, optional single `tags` array-contains.
2. **Secondary:** Client-side title substring filter on the loaded page batch.
3. **Pagination:** Cursor-based (`startAfter`) when collection grows; required before large libraries.

### Required composite indexes (Phase 2A)

Document in `firestore.indexes.json` when queries are finalized. Expected starters:

```txt
designs: status + updatedAt (desc)
designs: categoryId + status + updatedAt (desc)
designs: tags (array-contains) + status
```

### Deferred search capabilities

| Capability | Phase |
| --- | --- |
| Customer name / request search | Phase 5 |
| Date range filters | Phase 4 |
| Full-text / relevance ranking | Phase 4+ |
| AI semantic search | Phase 7+ |

---

## Permissions

### Permission keys (existing)

From `permissionService`:

| Key | Staff access | Phase 2 use |
| --- | --- | --- |
| `manageDesigns` | `owner`, `admin`, `helper` | View library, edit design metadata |
| `importDesigns` | `owner`, `admin`, `helper` | Nav placeholder only; no import UI in Phase 2 |

### Recommended Phase 2 permission extensions

Add to `permission.types.ts` / `permissionService` as needed:

| Method | Owner | Admin | Helper |
| --- | --- | --- | --- |
| `canViewDesignLibrary` | Yes | Yes | Yes |
| `canCreateDesign` | Yes | Yes | Yes (manual test) |
| `canEditDesign` | Yes | Yes | Yes |
| `canArchiveDesign` | Yes | Yes | Yes |
| `canManageCategories` | Yes | Yes | No |

UI uses `permissionService`. **Firestore rules are authoritative.**

### Firestore rules (Phase 2A)

Current `firestore.rules` deny all non-`users` collections. Phase 2A must add:

```txt
designs/{designId}
  read:  active staff (owner/admin/helper)
  write: active staff with field validation

categories/{categoryId}
  read:  active staff
  write: active owner/admin only
```

Customers do not receive design read access in Phase 2 desktop rules. Customer-visible catalog rules are a future website milestone.

### Storage rules (Phase 2A follow-up)

Storage rules file does not exist in repo yet. Phase 2A should add `storage.rules` scaffold:

* `/originals/**` — staff read/write (upload deferred to Phase 3)
* `/thumbnails/**` — staff read; customer read deferred
* `/previews/**` — staff read

Phase 2 does not require in-app uploads, but rules should be drafted before Phase 3.

---

## UI Pages

All UI in `src/renderer/src/features/designs/` following `docs/STYLE_GUIDE.md` (light + dark).

### Design Library page

```txt
features/designs/pages/DesignLibraryPage.tsx
```

Layout (aligned with Users page shell pattern):

```txt
AppHeader (title, search, optional filters)
Filter row (category, status, tag)
Design grid
Empty / loading / error states
```

### Design detail

```txt
features/designs/components/DesignDetailPanel.tsx   (or modal)
```

Shows:

* Title, description, status badge
* Category name
* Tag chips
* Storage paths (staff-only metadata section)
* Technical fields (width, height, dpi) when present
* Placeholder preview area (image when thumbnail path resolves)

### Category management

```txt
features/designs/pages/CategoryManagementPage.tsx
   — or —
features/designs/components/CategoryAdminModal.tsx
```

Owner/admin only. Not required for first 2B slice if categories are seeded manually; required before Phase 2 exit.

### Navigation

* Add **Designs** (or **Design Library**) to `Sidebar` for staff with `manageDesigns`.
* Route: `#/designs` behind `ProtectedRoute permission="manageDesigns"`.

### Explicitly not built in Phase 2 UI

* Import wizard
* ZIP drop zone
* AI review queue
* Show queue screens
* Customer browse views

---

## Service Layer

### Feature structure

```txt
features/designs/
├── components/
│   ├── DesignCard.tsx
│   ├── DesignDetailPanel.tsx
│   ├── DesignGrid.tsx
│   ├── DesignFilters.tsx
│   ├── DesignForm.tsx
│   ├── DesignStatusBadge.tsx
│   └── CategorySelect.tsx
├── hooks/
│   ├── useDesigns.ts
│   ├── useDesign.ts
│   ├── useCreateDesign.ts
│   ├── useUpdateDesign.ts
│   └── useCategories.ts
├── pages/
│   ├── DesignLibraryPage.tsx
│   └── CategoryManagementPage.tsx   (or modal-based)
├── services/
│   ├── designService.ts
│   ├── categoryService.ts
│   └── designSearchService.ts       (query builder only)
├── types/
│   ├── design.types.ts
│   ├── category.types.ts
│   └── designQuery.types.ts
└── utils/
    ├── designTagNormalizer.ts
    └── designStatusDisplay.ts
```

### Service responsibilities

| Service | Responsibility |
| --- | --- |
| `designService` | CRUD, list with filters, map Firestore documents to `Design` |
| `categoryService` | Category CRUD, list active categories |
| `designSearchService` | Build Firestore query constraints from filter state |

### Hook responsibilities

| Hook | Responsibility |
| --- | --- |
| `useDesigns` | Load/filter designs; expose reload |
| `useDesign` | Single design by ID |
| `useCreateDesign` / `useUpdateDesign` | Form submit state, errors |
| `useCategories` | Category list for filters and forms |

### Layer rules

```txt
Component → Hook → Service → Firestore
```

* No Firestore imports in components.
* No business logic in `App.tsx`.
* Validation in services (required fields, tag normalization, status guards).

### Firebase collection access

Reuse `firestoreCollectionService` pattern from Phase 1 or extend with `getDesignsCollection()` / `getCategoriesCollection()`.

---

## Future Import Pipeline Integration

Phase 3 will call the same catalog primitives Phase 2 establishes.

### Contract for Phase 3

```txt
Import pipeline (Electron main + renderer coordination)
      ↓
Validate file (type, DPI, dimensions)
      ↓
Generate designId
      ↓
Upload /originals/{designId}.png
      ↓
Generate thumbnail + preview → upload paths
      ↓
designService.createDesign({
  id: designId,
  title: filename fallback,
  status: "imported" | "processing",
  originalPath,
  thumbnailPath,
  previewPath,
  width, height, dpi,
  tags: [],
  aiProcessed: false,
  aiReviewed: false,
  ...
})
      ↓
Queue AI job (Phase 7)
```

### Phase 2 preparation requirements

* `designService.createDesign()` accepts full `Design` shape.
* `designId` is assignable before storage upload.
* Status transitions are service methods (`designService.updateStatus()`), not ad-hoc field patches in UI.
* Import pipeline never writes Firestore directly from main process — renderer or Cloud Function coordinates writes (decision in Phase 3 plan).

---

## Future AI Enrichment Integration

Phase 7 enriches **existing** design records.

### Contract for Phase 7

```txt
Design record exists (status: imported | processing)
      ↓
AI vision job reads originalPath asset
      ↓
AI proposes: title, description, categoryId, tags, file rename
      ↓
Write AiMetadata + set aiProcessed: true
      ↓
Staff review UI approves/overrides
      ↓
Merge approved values into catalog fields
      ↓
Set aiReviewed: true, status → ready (when validation passed)
```

### Phase 2 preparation requirements

* Catalog fields (`title`, `description`, `categoryId`, `tags`) are human-editable in Phase 2C.
* `aiProcessed` / `aiReviewed` flags exist and default to `false`.
* Services do not assume AI fields are populated.
* Do not couple Phase 2 forms to AI providers.

---

## Future Show Queue Integration

Phase 6 references designs by **`designId`** only.

### Contract for Phase 6

```txt
Show queue item
  designId → designs/{designId}
  denormalized title/thumbnailPath snapshot optional for performance
      ↓
On queue add: increment design.queueCount (transaction or function)
On queue remove: decrement design.queueCount
      ↓
Status may transition ready → queued → printed
```

### Phase 2 preparation requirements

* `queueCount` field exists on design documents (default `0`).
* Design Library links to detail view by stable `designId`.
* Archiving a design (`status: archived`) should be blocked or warned if `queueCount > 0` (enforce in service when queue phase exists).

---

# Recommended Implementation Phases

## Phase 2A — Data Model, Services, Rules

**Goal:** Secure, typed backend foundation without UI.

### Tasks

1. Add TypeScript types (`Design`, `DesignStatus`, `Category`, query types).
2. Extend `firestoreCollectionService` for `designs` and `categories`.
3. Implement `designService` (create, update, getById, list with filters).
4. Implement `categoryService` (CRUD, list active).
5. Implement `designTagNormalizer` and validation helpers.
6. Add Firestore security rules for `designs` and `categories`.
7. Add `firestore.indexes.json` for planned queries.
8. Draft `storage.rules` scaffold (no upload UI yet).
9. Extend `permissionService` with design/category helpers.
10. Seed script or documented manual steps for test categories.
11. Update docs if field decisions differ from `DATA_MODEL.md`.

### Verification

* Staff user can read/write designs via service in dev tools or minimal test harness.
* Helper cannot write categories (if rule chosen).
* Customer / unauthenticated access denied.
* Tag normalization unit behavior documented.

---

## Phase 2B — Design Library UI Shell

**Goal:** Operational catalog browsing experience without full edit forms.

### Tasks

1. Add `#/designs` route + sidebar nav item.
2. Register shell header config on `DesignLibraryPage`.
3. Build `DesignGrid` + `DesignCard` with placeholder thumbnails.
4. Build `DesignFilters` (status, category, tag).
5. Wire `useDesigns` + search/filter state.
6. Build `DesignDetailPanel` (read-only).
7. Loading, empty, and error states per `STYLE_GUIDE.md`.
8. Status and category badges (reuse `Badge` component patterns).

### Verification

* Staff can browse seeded/manual Firestore designs.
* Filters update grid results.
* Detail panel shows metadata and paths.
* Shell navigation stable (no auth loader flash).
* Light and dark theme verified.

---

## Phase 2C — Manual Design Record Creation / Editing (Testing Only)

**Goal:** Enable staff to create and edit catalog records for development QA without import or AI.

### Tasks

1. Build `DesignForm` (title, description, category, tags, status, paths).
2. Add “Add design” and “Edit design” actions (modal pattern like user management).
3. Implement `useCreateDesign` / `useUpdateDesign`.
4. Archive action (`status: archived`).
5. Category management UI for owner/admin.
6. Inline validation and error messages.
7. Document dev workflow for attaching storage files manually.

### Verification

* Owner/admin/helper can create a `ready` design record.
* Search finds new record by title and tag.
* Edit updates `updatedAt`.
* Category CRUD works for owner/admin.
* No ZIP, DPI, AI, or upload UI present.

---

## Exit Criteria (Phase 2 Complete)

- [ ] `designs` and `categories` collections implemented with types and rules
- [ ] Staff can open Design Library from sidebar
- [ ] Design grid displays catalog records with filters
- [ ] Search works by title, tag, category, and status
- [ ] Manual create/edit/archive works for testing
- [ ] Categories can be managed (owner/admin)
- [ ] Storage path conventions documented on records
- [ ] No import, DPI, thumbnail, AI, or show queue features shipped
- [ ] Architecture: services own Firestore; components render only
- [ ] `App.tsx` unchanged except route registration
- [ ] Light/dark theme supported on all new UI

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Firestore rules too permissive | Mirror `permissionService`; test helper vs admin category writes |
| Tag query index explosion | Limit tags per design; single-tag server filter in Phase 2 |
| Empty thumbnails in grid | Placeholder component; clear “awaiting processing” state |
| Manual path entry typos | Validate path format in service; show warning in UI |
| Scope creep into import | Reject ZIP/DPI/upload tasks in Phase 2 PRs |
| Broad Electron preload | Narrow IPC before Phase 3 filesystem work |
| `queueCount` drift | Accept stale `0` until Phase 6; document transaction plan |

---

## Documentation Updates (During Implementation)

Update when implementation locks decisions:

| Document | When |
| --- | --- |
| `docs/DATA_MODEL.md` | If fields or status rules change |
| `docs/SECURITY.md` | When Firestore/storage rules land |
| `docs/FIREBASE.md` | Collection queries and indexes |
| `docs/WORKFLOWS.md` | Catalog browse/edit workflow section |
| `docs/setup/firestore-setup.md` | Index deployment steps |
| `docs/setup/firebase-storage-setup.md` | Storage rules deployment |

---

## Completion Checklist (Before Phase 3)

- [ ] Phase 2A services and rules deployed to dev Firebase project
- [ ] Phase 2B UI reviewed in light and dark mode
- [ ] Phase 2C manual CRUD tested by owner, admin, and helper roles
- [ ] `docs/reviews/` signoff or PR review recorded
- [ ] Import pipeline plan (`docs/plans/zip-import-plan.md` or equivalent) references this catalog contract
- [ ] No Phase 3 code merged into Phase 2 branches

---

## Summary

Phase 2 delivers the **Design Library catalog layer** — the system of record for processed DTF designs — without building how designs arrive there. Import (Phase 3), AI enrichment (Phase 7), and show queues (Phase 6) will plug into the services, paths, and status model defined here.

Implement in order: **2A → 2B → 2C**. Do not begin ZIP import, DPI validation, or AI vision work under the Phase 2 milestone.
