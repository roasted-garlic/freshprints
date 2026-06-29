# Architecture Overview

## System shape

```
Fresh Prints Studio (Electron)
         ↓
Firebase (Auth · Firestore · Storage · Functions)
         ↓
Fresh Prints Portal (web, Phase 8)
```

Both apps are **peers** consuming the same Firebase backend. Neither owns data — Firebase is the source of truth.

## Fresh Prints Studio — three workspaces

No overlap between workspaces:

| Workspace | Route | Responsibility |
|-----------|-------|----------------|
| **Imports** | `/imports` | Receive ZIP/folder, validate PNG, derivatives, auto AI enqueue |
| **AI Review** | `/ai-review` | Operational inbox until approved or rejected |
| **Design Library** | `/designs` | Approved catalog only — not a work queue |

```
Imports → AI Review → Design Library
```

## Layer architecture (Studio)

```
Component → Hook → Service → Firebase SDK
Component → Hook → Electron API → IPC → Main process (files only)
```

**Forbidden:**
- Component → Firebase directly
- Component → filesystem directly
- Business logic in UI components

## Electron layout

```
electron/           Main process — ZIP, sharp, IPC, file dialogs
electron/preload.ts Secure bridge (contextIsolation)
src/renderer/       React UI (Vite)
shared/             Cross-layer types and utilities
functions/          Firebase Cloud Functions
```

## Authentication & authorization

- **Auth:** Firebase Auth (email/password for team)
- **Roles:** `owner`, `admin`, `helper`, `customer`
- **Authorization:** `permissionService.ts` — never scatter `if (role === ...)` in components
- **Profile:** Firestore `users/{uid}` holds `role` and `isActive`

## Storage paths

| Path | Content |
|------|---------|
| `/originals/{designId}.png` | Production assets |
| `/thumbnails/{designId}.webp` | Grid thumbnails |
| `/previews/{designId}.webp` | Medium previews |
| `/customer-uploads/` | Future Portal uploads |

Firestore stores **metadata and paths only** — never binary files.

## Key services (patterns)

| Service | Role |
|---------|------|
| `authService.ts` | Login, logout, session |
| `designService.ts` | Design CRUD with permission checks |
| `catalogApprovalService.ts` | Approve/reject for catalog |
| `permissionService.ts` | Role → capability mapping |
| `aiReviewInboxService.ts` | AI Review queue queries |

## Scalability rule

New features should support both Studio and Portal where applicable — unless explicitly Studio-only or Portal-only.

## Pensacola production export

Print Run items reference catalog designs → staff downloads originals from Firebase Storage → gang sheet software. Remote helpers never need Pensacola filesystem access.
