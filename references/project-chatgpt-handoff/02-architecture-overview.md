# Architecture Overview

## System shape

```
Fresh Prints Studio (Electron)     Fresh Prints Portal (Next.js :3100)
              \                         /
               \                       /
                ▼                     ▼
         Firebase (Auth · Firestore · Storage · Functions)
```

Both apps are **peers** consuming the same Firebase backend. Neither owns data — Firebase is the source of truth.

## Monorepo layout

```
apps/studio/          @fresh-prints/studio — Electron + Vite renderer
apps/portal/          @fresh-prints/portal — Next.js App Router
packages/shared/      @fresh-prints/shared — types, utils, constants
packages/show-picker/ @fresh-prints/show-picker — shared calendar UI
functions/            Cloud Functions (imports shared via relative paths)
```

## Fresh Prints Studio — design workspaces

| Workspace | Route | Responsibility |
|-----------|-------|----------------|
| **Imports** | `/imports` | Receive ZIP/folder, validate PNG, derivatives, AI enqueue |
| **AI Review** | `/ai-review` | Operational inbox until approved or rejected |
| **Design Library** | `/designs` | Approved catalog only — not a work queue |

Also: Print Requests, Show Queue, **Customer Uploads** intake, Users, Settings.

```
Imports → AI Review → Design Library
Customer Uploads → (optional) Send to AI Review → Design Library
```

## Fresh Prints Portal — customer surfaces

| Area | Responsibility |
|------|----------------|
| Auth / register | Customer Firebase Auth + linked `customers/{id}` |
| Catalog / Discover / Design Library | Browse approved `ready` designs |
| Print requests | One **working** request at a time; edit sizes/qty; progress tabs |
| Upload artwork | PNG/WebP (or ZIP) → trusted Cloud Functions finalize → attach to request |
| Add to show | Callable queue to allocatable upcoming show |

## Layer architecture

```
Component → Hook → Service → Firebase SDK / Callable
Studio only: Component → Hook → Electron API → IPC → Main (files/sharp)
```

**Forbidden:** Component → Firebase directly; Component → filesystem; business logic in UI.

## Storage paths (canonical)

| Path | Content |
|------|---------|
| `/originals/{designId}.png` | Catalog production assets |
| `/thumbnails/{designId}.webp` | Grid thumbnails |
| `/previews/{designId}.webp` | Medium previews |
| `/customer-uploads/{uid}/…` | Customer **source** + **production** + derivatives (ADR-FP-073) |

Firestore stores **metadata and paths only** — never binary files.

## Auth & authorization

- **Auth:** Firebase Auth
- **Roles:** `owner`, `admin`, `helper`, `customer`
- **Studio:** staff roles only via `permissionService`
- **Portal:** `role: customer` only; customers never access Studio

## Scalability rule

New features should support Studio and Portal where applicable — unless explicitly Studio-only or Portal-only.
