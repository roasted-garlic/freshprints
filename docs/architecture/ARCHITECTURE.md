# Fresh Prints Architecture

## Purpose

This document defines the architecture of the Fresh Prints platform.

This is the source of truth for:

* System architecture
* Application architecture
* Layer responsibilities
* Electron architecture
* Firebase architecture
* Desktop and web interaction
* Data ownership
* Shared services
* Application platform and official naming (`docs/architecture/ADR-Application-Platform-Strategy.md`)

All development must follow this architecture.

---

# System Overview

Fresh Prints is a **two-application platform**.

The platform consists of:

1. **Fresh Prints Studio** — Electron desktop application; internal staff only
2. **Fresh Prints Portal** — mobile-first responsive web application; customers only

There is no third application. No standalone native mobile app is planned or permitted without explicit architectural revision.

Official naming and platform strategy: `docs/architecture/ADR-Application-Platform-Strategy.md`.

All applications share the same Firebase backend infrastructure.

---

# Core Philosophy

## Single Source of Truth

The source of truth is:

* Firebase Authentication
* Firestore
* Firebase Storage

Applications do not own data.

Applications consume data.

Firebase owns data.

---

# High Level Architecture

```txt
┌─────────────────────────────┐
│ Fresh Prints Studio         │
│ Electron · owner/admin/helper│
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Firebase Backend            │
│ Auth · Firestore · Storage  │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Fresh Prints Portal         │
│ mobile-first responsive web │
│ customer role only          │
└─────────────────────────────┘
```

Both applications are peers consuming the same backend. Fresh Prints Portal is designed mobile-first and must work excellently on phones, tablets, and desktop browsers.

---

# Application Responsibilities

## Fresh Prints Studio

The Electron desktop application for internal staff.

Responsible for:

* Design imports
* ZIP extraction
* File processing
* File validation
* DPI validation
* Dimension validation
* Thumbnail generation
* AI review and catalog approval (Phase 5+)
* Approved design catalog management (Design Library)
* Categories
* Customer management (registered and guest records)
* Print Requests and Print Runs (Phases 6–7)
* Analytics
* Exporting to gangsheet
* Team and application administration

Users: Owner, Admin, Helper

Fresh Prints Studio is **never customer-facing**. Users with `role: customer` do not access Studio.

### Studio default landing (2026-07-23; ADR-FP-119)

Authenticated Studio home is **Staff Inbox** (`/inbox`): root `/`, unknown routes, post-login redirect, and the sidebar brand link all navigate there. Design Library (`/designs`) remains a normal sidebar destination and is unchanged as a workspace.

### Studio workspaces (official)

Fresh Prints Studio is organized into **three independent design-lifecycle workspaces**:

| Workspace | Route | Responsibility |
|-----------|-------|----------------|
| **Imports** | `/imports` | Receive, validate, create designs, derivatives, AI Processing intake |
| **AI Review** | `/ai-review` | Operational Inbox — every import until approved or rejected |
| **Design Library** | `/designs` | Approved catalog only — not a work queue |

```txt
Imports → AI Review (Inbox) → Design Library
```

No workspace overlap: Design Library never shows imported or rejected designs; AI Review never replaces import validation; Imports never approves catalog entries.

**Operational queue (not a fourth design-lifecycle workspace):** **Customer Uploads** (`/customer-uploads`) reviews Portal request artwork for catalog eligibility. Promote hands off to AI Processing; it does not replace Imports. See ADR-FP-009 clarification and ADR-FP-073.

**Image quality / halftone (ADR-FP-080):** Shared sizing policy in `packages/shared` is used by Studio Electron import and Functions finalize. Halftone is human-confirmed only (Portal optional checkbox + Studio/AI Review staff toggle). Automatic pixel detection was removed by owner decision — do not reintroduce detector processing.

See `docs/WORKFLOWS.md` and ADR-FP-009.

---

## Fresh Prints Portal (Phase 8+)

The mobile-first responsive web application for customers.

Users: Customers (`role: customer` only)

Responsible for:

* Browse approved design catalog (**guests and signed-in customers** — #13 / ADR-FP-106)
* Search, categories, tags
* Create and track Print Requests (**auth required**)
* Submit Custom Requests (Phase 9) (**auth required**)
* Manage customer account (**auth required**)
* Favorites (`customers/{customerId}/favorites` — Portal only; no design `favoriteCount`) (**auth required**)

**Auth boundary (2026-07-20, #13; `/help` 2026-07-23):** Portal `(app)` shell softens AuthGate for public browse paths (`/`, `/catalog/**`, `/help`, `/share/design/**`). Mutation-primary routes redirect guests to login. Firestore/Storage rules allow unauthenticated read of ready catalog docs and thumbnail/preview derivatives; callables and writes remain auth-gated. Studio unchanged.

**FAQ and How To (2026-07-23; Studio CMS ADR-FP-118):** Public Portal route `/help` under the app shell (nav label **Help**; H1/SEO **FAQ and How To**). Live content from Firestore `settings/portalHelp` (Studio **Settings → FAQ and How To**, owner/admin via `updatePortalHelpSettings`). Missing doc **or empty saved FAQs** → bundled FAQ defaults in `portalHelpContent.ts`. Empty / missing videos → **Coming soon** (no dummy video slots). Video embeds allowlisted to HTTPS YouTube/Vimeo only. SEO uses ADR-FP-116 fail-closed indexing; `/help` is in robots allow + sitemap static URLs.
**Catalog loading (2026-07-14):** Library shows a fast first page (**40** designs) then **hydrates the full matching catalog** in the background so search and multi-tag filters cover every ready design. The header count is the real matching total (Firestore aggregate while browsing; exact filtered length after hydrate). Load more only windows the already-matched results. Discover home still uses a **bounded** pool, not a full-catalog download.

**Catalog image URL cache (2026-07-14):** Portal caches Storage download URLs in memory keyed by `path@updatedAtMs`. Failed lookups are not sticky. After catalog load, entries for paths no longer in the ready set are pruned. Membership always comes from live Firestore — never a persisted design list or image blob cache across visits.

**Discover rails:** New This Week (`createdAt`), Popular (`requestCount` / Working-cart print-request adds), **Most Liked** (`favoriteCount` / customer favorites), Recently Requested (`lastAddedToShowAt` / show allocation created — not Working-cart adds alone; ADR-FP-107).

**Default library / non-metric browse (2026-07-18):** Browse-all, category/tag/search filters, and Discover category rail *cards* sort by `createdAt` descending (most recently added from Studio first). Request/favorite counters bump `updatedAt` / metrics — those must not reshuffle the default grid. Only Popular, Most Liked, and Recently Requested (and similar metric collections) sort by their metrics.

Must work excellently on phones, tablets, and desktop browsers.

Fresh Prints Portal never requires Electron and never accesses local files.

**Out of scope:** Native iOS, Android, React Native, Flutter, Xamarin, MAUI, or any standalone mobile application. Optional PWA home-screen install remains Fresh Prints Portal — not a separate app.

---

# Data Ownership

Applications do not own data.

All shared business data belongs in Firebase.

Bad:

```txt
Desktop App Database
Website Database
```

Good:

```txt
Firebase
```

Applications should be stateless whenever possible.

---

# Studio And Portal Relationship

Fresh Prints Studio and Fresh Prints Portal are peers.

Neither application is subordinate to the other.

Both consume the same backend.

Example:

```txt
Staff imports design (Studio)
       ↓
Firebase Storage
       ↓
AI Review → approved catalog
       ↓
Fresh Prints Portal displays thumbnail (Phase 8)
```

Example:

```txt
Customer creates print request (Portal)
       ↓
Firestore
       ↓
Staff manages print run (Studio)
```

---

# Shared Backend Rule

Use a single Firebase project.

Do not create:

* Separate Studio databases
* Separate Portal databases
* Separate Firestore projects

Unless explicitly approved.

---

# Backend Architecture

Fresh Prints uses:

* Firebase Auth
* Firestore
* Firebase Storage

## Transactional email delivery

Cloud Functions are the only email-sending boundary. Invitation and proof-ready workflows compose
provider-neutral messages and route them through an allowlisted provider adapter. Assisted Creation
proof submission writes a deterministic `emailDeliveryJobs` outbox record in the same Firestore
transaction as the proof/status update; a retry-enabled server trigger claims the job with a bounded
lease and sends outside the transaction. Firestore job state is the durable logical dedupe source of
truth; provider idempotency is an additional bounded safeguard. Studio only reads/updates provider
IDs through an owner-only service/callable and never receives credentials.

No custom backend is planned initially.

The Firebase backend should support:

* Fresh Prints Studio
* Fresh Prints Portal

without modification. No separate mobile backend or database.

---

# Authentication Architecture

Authentication uses Firebase Auth.

All applications use the same auth provider.

Supported roles:

```txt
owner
admin
helper
customer
```

Authentication handles identity.

Authorization handles permissions.

Do not confuse the two.

---

# Authorization Architecture

Permissions are role based.

Use centralized permission handling.

Example:

```txt
permissionService.ts
```

Do not hardcode role checks throughout components.

Bad:

```ts
if (user.role === "admin")
```

Repeated across dozens of files.

Good:

```ts
permissionService.canManageDesigns(user)
```

---

# Storage Architecture

Storage uses Firebase Storage.

Files never belong in Firestore.

---

## Original Images

Stored in:

```txt
/originals/
```

Examples:

```txt
/originals/{designId}.png
```

Purpose:

* Production assets
* Gang sheet preparation
* Admin workflows

---

## Thumbnails

Stored in:

```txt
/thumbnails/
```

Examples:

```txt
/thumbnails/{designId}.webp
```

Purpose:

* Design grids (Studio and Portal)
* Search
* Fresh Prints Portal catalog browse

---

## Preview Images

Stored in:

```txt
/previews/
```

Purpose:

* Optimized display
* Medium resolution previews

---

## Customer Uploads

Stored in:

```txt
/customer-uploads/
```

Purpose:

* Customer-provided **request artwork** (Phase 8 fast-follow — ADR-FP-073)
* Separate from catalog `designs` until staff promotes to AI Review
* **Not** Phase 9 `customRequests` / Custom Request Q&A

Canonical object layout:

```txt
/customer-uploads/{customerUid}/{uploadId}/source
/customer-uploads/{customerUid}/{uploadId}/production.png
/customer-uploads/{customerUid}/{uploadId}/preview.webp
/customer-uploads/{customerUid}/{uploadId}/thumbnail.webp
/customer-uploads/{customerUid}/batches/{batchId}/archive.zip
```

Trusted processing: Portal uploads source (or ZIP archive) to Storage; Cloud Functions finalize validation/normalization. Rules enforce path/owner/size/type; lifecycle checks belong in finalize callables.

---

# Firestore Architecture

Firestore stores metadata only.

Firestore should never store:

* PNG files
* ZIP files
* Binary assets

Firestore stores:

* Users
* Designs
* Categories
* Print requests and items (Phase 6)
* Print runs and items (Phase 7)
* Custom requests (Phase 9)
* Customers (registered and guest)
* Settings
* Audit logs

Legacy collection names (`showQueues`, `showQueueItems`, `customerRequests`) remain documented for migration planning — see `DATA_MODEL.md`.

---

# Repository Layout (Symmetric Apps Monorepo)

The repo is a **symmetric apps monorepo** — Studio and Portal are both workspace packages under `apps/*`, alongside shared workspace packages under `packages/*`. Studio moved from the repo root to `apps/studio/` in the symmetric apps monorepo phase (2026-07-08), completing the incremental monorepo Phase 8 started.

**Phase 8 Portal MVP** (auth, catalog, print requests, progress tabs, customer show selection) is **complete in dev** as of 2026-07-08.

```txt
fresh-prints/
├── apps/
│   ├── portal/                # @fresh-prints/portal — Next.js App Router — Firebase App Hosting rootDir
│   └── studio/                # @fresh-prints/studio — Electron + Vite
│       ├── electron/          # Studio main process
│       ├── src/renderer/      # Studio React UI
│       ├── vite.config.ts
│       ├── electron-builder.json5
│       └── tsconfig.json
├── packages/shared/src/       # @fresh-prints/shared — cross-app types and pure utils
├── functions/                 # Cloud Functions (relative imports to packages/shared/src)
├── firebase.json              # includes apphosting block for apps/portal
└── package.json               # npm workspaces: apps/*, packages/*
```

**Import conventions**

| Consumer | Shared code import |
|----------|-------------------|
| Studio renderer, Electron main | `@fresh-prints/shared/...` (tsconfig + Vite alias, resolved via `apps/studio/tsconfig.json` and `apps/studio/vite.config.ts`) |
| Cloud Functions | Relative path `../../packages/shared/src/...` (deploy uploads `functions/` only) |
| Portal (`apps/portal`) | `@fresh-prints/shared/...` (workspace package) |

**Do not confuse** `packages/shared/src/` (cross-app domain types/utils) with `apps/studio/src/renderer/src/shared/` (Studio-only UI components and hooks).

Studio build/package output (`dist/`, `dist-electron/`, `release/`) lives under `apps/studio/`, not the repo root.

Root scripts: `dev:studio`, `dev:portal`, `build:studio`, `build:portal`.

---

# Electron Architecture

## Development-only Firebase Debug window

Studio's Firebase Debug UI is a separate Electron `BrowserWindow`, available only in an unpackaged
development runtime against project `fresh-prints-dev`. The main Studio renderer owns the trace
session. Its service-layer tracer publishes sanitized snapshots through an allowlisted preload IPC
surface to Electron main, which brokers the latest snapshot to the singleton debug renderer. Reset
and tracing enable/disable commands return through main to the authoritative main renderer.

Electron main validates the retained main window as the snapshot/open sender, owns singleton
focus/restore/close/reopen behavior, and closes the debug window with the main app. The debug renderer
does not mount normal Studio routes and therefore cannot replace main-window route/action context.
Only safe trace metadata crosses IPC; Firebase payloads, document contents, signed URLs, raw errors,
tokens, secrets, and customer data are forbidden.

Portal uses the same ownership rule with browser-native transport. The normal Portal tab owns and
starts the eligible development trace session; a named `/firebase-debug` popup is display/control
only. Sanitized snapshots and fixed Reset/enable/disable commands cross a same-origin
`BroadcastChannel` after an opaque owner-token handshake. Direct debug-route access, stale owner
sessions, production builds, and projects other than `fresh-prints-dev` fail closed. The debug route
bypasses Portal auth/data providers so it cannot create a second set of Firebase activity.

The project uses **Vite + vite-plugin-electron** with main process code under `apps/studio/electron/` (not `src/main/`). `[INFERRED]` from repository layout.

```txt
apps/studio/electron/                 # Main process, IPC, import services
apps/studio/electron/preload.ts       # Preload bridge
apps/studio/src/renderer/             # React renderer (Vite)
packages/shared/src/                  # @fresh-prints/shared — cross-app types and utilities
```

---

# Main Process Layer

Location:

```txt
apps/studio/electron/
apps/studio/electron/ipc/
apps/studio/electron/services/
```

Responsibilities:

* Filesystem access
* ZIP extraction
* PNG validation and parsing
* Derivative generation (`sharp`)
* Native dialogs
* IPC handlers

Forbidden:

* React rendering
* Firebase UI
* Business workflows

---

# Preload Layer

Location:

```txt
apps/studio/electron/preload.ts
```

Purpose:

Secure bridge between Electron and React.

Expose safe APIs only.

Example:

```ts
window.freshPrints.files.selectZip()
```

Never expose raw Node access.

Always use:

```ts
contextIsolation: true
```

---

# Renderer Layer

Location:

```txt
apps/studio/src/renderer/src/
```

Responsibilities:

* UI
* Routing
* Authentication state
* Queries
* Forms
* Tables
* Dashboards

Forbidden:

* Direct filesystem access
* Native OS access

---

# Layer Communication Rules

Allowed:

```txt
Component
  ↓
Hook
  ↓
Service
  ↓
Firebase
```

Allowed:

```txt
Component
  ↓
Hook
  ↓
Electron API
  ↓
IPC
```

Avoid:

```txt
Component
  ↓
Firebase
```

Avoid:

```txt
Component
  ↓
Filesystem
```

---

# Service Architecture

Business logic belongs in services.

Examples:

```txt
authService.ts
designService.ts
queueService.ts
customerService.ts
```

Services should be reusable.

Services should not depend on UI.

---

# Shared Types Architecture

Every major model should have a shared type.

Examples:

```txt
User
Design
Category
CustomerRequest
Queue
QueueItem
```

Types should be reusable across:

* Fresh Prints Studio
* Fresh Prints Portal

---

# Future Monorepo Architecture

Current project may remain a single Electron project.

Future target:

```txt
fresh-prints/
├── apps/
│   ├── desktop/          # Fresh Prints Studio
│   └── web/              # Fresh Prints Portal (mobile-first)
│
├── packages/
│   ├── shared-types/
│   ├── shared-utils/
│   ├── shared-firebase/
│   └── shared-ui/
│
└── docs/
```

Do not migrate to this structure without approval. Do not add `apps/mobile/` or native mobile targets.

---

# Gangsheet Export

The production machine is used for gangsheet building.

Workflow:

```txt
Staff builds a show queue / print plan
         ↓
Show allocations reference print request items and catalog designs
         ↓
Staff generates gang sheets in Studio (download originals → nest → composite)
         ↓
Sheets are cached locally on the production PC (Electron userData)
         ↓
Staff previews lengths, downloads individual sheets, or exports all to a folder
```

Generated gang sheet PNGs are **not** stored in Firebase Storage or Firestore — they can be hundreds of megabytes per show. Cache is fingerprint-keyed and cleared when the show is past or regenerated.

This is **file export for production** — not shipping, packing, or order fulfillment.

Remote helpers never need access to local production folders.

The shared connection point for **design originals** remains Firebase Storage.

---

# Scalability Rules

Every new feature must support both applications where applicable:

* Fresh Prints Studio (staff workflows)
* Fresh Prints Portal (customer workflows)

unless explicitly approved as Studio-only or Portal-only.

Avoid Studio-only business logic in shared services used by Portal.

Avoid duplicating business rules between Studio and Portal — favor `@fresh-prints/shared` types and pure utilities in `packages/shared/src/`.

Do not introduce native mobile application code paths.

---

# Architecture Decision Rules

Before introducing a new pattern:

Ask:

1. Does this fit existing architecture?
2. Can an existing service solve this?
3. Can this be shared later?
4. Does this create duplicate logic?
5. Does this increase maintenance burden?

If the answer is yes, redesign before implementing.

---

# Architecture Goals

Fresh Prints should be:

* Modular
* Scalable
* Maintainable
* Testable
* Secure
* Reusable
* Easy to onboard new developers
* Easy for AI agents to understand

Every architectural decision should move the project closer to those goals.

## Generated catalog read models

Firestore is the write authority. `functions/src/catalogSnapshots/` publishes versioned JSON under
`generated/catalog-reference/**` and `generated/portal-catalog/**`; manifests are the only mutable
pointers and are written last with Storage generation preconditions. The immediately prior content
version remains addressable.

AI Functions read the private taxonomy projection through Admin Storage. Portal services—not React
components—read public-safe taxonomy, Discover, search/tag/category IDs, and bounded card buckets.
Normal Portal browsing remains Firestore cursor pagination. Coordination lives only in
`snapshotPublicationState/catalog-reference` and `snapshotPublicationState/portal-catalog`, both
denied to clients. See ADR-FP-120.

When `requestedGeneration` exceeds `publishedGeneration` after a failed or lease-busy full publish
(e.g. transient Storage `FetchError`), the publisher runs a bounded catch-up loop with Storage I/O
retries rather than abandoning the dirty watermark. Owner/admin may also invoke
`retryPortalCatalogPublication` to drain an existing failed coordination state without bumping the
requested generation. Tag and category field changes remain full index/filter republishes.

Card-only design edits use an additive immutable override asset referenced by the Portal manifest.
The trigger maps the Firestore event payload directly, merges it with the prior override asset, and
uses a Storage generation-preconditioned manifest swap; it does not query ready designs or
taxonomy. Studio additionally keeps a memory-only, authenticated-session override so its card stays
authoritatively updated during the manifest's documented 30-second cache window and across route
unmounts. Full index/filter changes still rebuild the full catalog; operational-only metadata does
not publish. Consumers overlay overrides in services, never React components.
