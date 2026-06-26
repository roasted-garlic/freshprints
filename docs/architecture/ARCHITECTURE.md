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
* Production file export for gang sheets (Pensacola)
* Team and application administration

Users: Owner, Admin, Helper

Fresh Prints Studio is **never customer-facing**. Users with `role: customer` do not access Studio.

### Studio workspaces (official)

Fresh Prints Studio is organized into **three independent workspaces**:

| Workspace | Route | Responsibility |
|-----------|-------|----------------|
| **Imports** | `/imports` | Receive, validate, create designs, derivatives, automatic AI enqueue |
| **AI Review** | `/ai-review` | Operational Inbox — every import until approved or rejected |
| **Design Library** | `/designs` | Approved catalog only — not a work queue |

```txt
Imports → AI Review (Inbox) → Design Library
```

No workspace overlap: Design Library never shows imported or rejected designs; AI Review never replaces import validation; Imports never approves catalog entries.

See `docs/WORKFLOWS.md` and ADR-FP-009.

---

## Fresh Prints Portal (Phase 8+)

The mobile-first responsive web application for customers.

Users: Customers (`role: customer` only)

Responsible for:

* Browse approved design catalog
* Search, categories, tags
* Create and track Print Requests
* Submit Custom Requests (Phase 9)
* Manage customer account
* Favorites (backlog)

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

* Customer uploads
* Request assets (Fresh Prints Portal — Phase 9)

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

# Electron Architecture

The project uses **Vite + vite-plugin-electron** with main process code under `electron/` (not `src/main/`). `[INFERRED]` from repository layout.

```txt
electron/           # Main process, IPC, import services
electron/preload.ts # Preload bridge
src/renderer/       # React renderer (Vite)
shared/             # Cross-layer types and utilities
```

---

# Main Process Layer

Location:

```txt
electron/
electron/ipc/
electron/services/
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
electron/preload.ts
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
src/renderer/src/
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

# Pensacola Production File Export

The Pensacola PC is the production machine for gang sheet building.

Workflow:

```txt
Staff builds Print Run
         ↓
Print Run Items reference catalog designs
         ↓
Pensacola downloads originals from Firebase Storage
         ↓
Gang Sheet Software
```

This is **file export for production** — not shipping, packing, or order fulfillment.

Remote helpers never need access to the Pensacola filesystem.

The shared connection point is Firebase Storage.

---

# Scalability Rules

Every new feature must support both applications where applicable:

* Fresh Prints Studio (staff workflows)
* Fresh Prints Portal (customer workflows)

unless explicitly approved as Studio-only or Portal-only.

Avoid Studio-only business logic in shared services used by Portal.

Avoid duplicating business rules between Studio and Portal — favor `shared/` types and services.

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
