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
* Future scalability

All development must follow this architecture.

---

# System Overview

Fresh Prints is a multi-application platform.

The platform consists of:

1. Desktop Admin Application
2. Customer Website
3. Future Mobile Application

All applications share the same backend infrastructure.

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
┌────────────────────┐
│ Desktop Admin App  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Firebase Backend   │
│                    │
│ Auth               │
│ Firestore          │
│ Storage            │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Customer Website   │
└────────────────────┘
```

Future:

```txt
┌────────────────────┐
│ Desktop App        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Firebase Backend   │
└─────────┬──────────┘
          │
     ┌────┴────┐
     ▼         ▼
Website    Mobile App
```

---

# Application Responsibilities

## Desktop Admin Application

The Electron application is responsible for:

* Design imports
* ZIP extraction
* File processing
* File validation
* DPI validation
* Dimension validation
* Thumbnail generation
* AI processing
* Design management
* Queue management
* Customer management
* Admin workflows
* Downloading originals
* Gang sheet preparation

Desktop users include:

* Owner
* Admins
* Helpers

The desktop app is the operational center of the business.

---

## Customer Website

The customer website is responsible for:

* Customer authentication
* Design browsing
* Search
* Filtering
* Favorites
* Customer requests
* Upload requests
* Show requests
* Request tracking

The website never requires Electron.

The website never accesses local files.

---

## Future Mobile App

Future mobile support may include:

* Customer browsing
* Favorites
* Request tracking
* Notifications

The mobile app should reuse:

* Firebase
* Shared types
* Shared services
* Shared validation rules

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

# Desktop And Website Relationship

The desktop app and website are peers.

Neither application is subordinate to the other.

Both consume the same backend.

Example:

```txt
Desktop uploads design
       ↓
Firebase Storage
       ↓
Customer website displays thumbnail
```

Example:

```txt
Customer submits request
       ↓
Firestore
       ↓
Desktop admin reviews request
```

---

# Shared Backend Rule

Use a single Firebase project.

Do not create:

* Separate desktop databases
* Separate website databases
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

* Desktop app
* Website
* Future mobile app

without modification.

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

* Design grids
* Search
* Customer website

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

* Customer submitted files
* Request assets

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
* Requests
* Queues
* Settings
* Audit logs

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

* Desktop
* Website
* Mobile

---

# Future Monorepo Architecture

Current project may remain a single Electron project.

Future target:

```txt
fresh-prints/
├── apps/
│   ├── desktop/
│   └── web/
│
├── packages/
│   ├── shared-types/
│   ├── shared-utils/
│   ├── shared-firebase/
│   └── shared-ui/
│
└── docs/
```

Do not migrate to this structure without approval.

However, write code today that can be moved there later.

---

# Pensacola Production Workflow

The Pensacola PC is the production machine.

Workflow:

```txt
Helper Uploads Design
         ↓
Firebase Storage
         ↓
Firestore Metadata
         ↓
Queue Assignment
         ↓
Pensacola Downloads Originals
         ↓
Gang Sheet Software
```

Remote helpers never need access to the Pensacola filesystem.

The shared connection point is Firebase Storage.

---

# Scalability Rules

Every new feature must support:

* Desktop
* Website
* Future Mobile

unless explicitly approved otherwise.

Avoid Electron-only business logic.

Avoid website-only business logic.

Favor reusable services.

Favor shared types.

Favor centralized rules.

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
