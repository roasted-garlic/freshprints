# Project Brief

> **Fresh Prints** — product source of truth for *what* and *why*.

---

## App Name

Fresh Prints

## One-Line Description

Centralized DTF design management platform for team operations, customer requests, live show preparation, and production workflows.

---

## Problem Statement

DTF design operations are scattered across folders, spreadsheets, messages, and manual ZIP workflows. Teams lack a single system for design organization, permissions, customer requests, and show preparation.

---

## Target Users

| Persona | Description | Primary needs |
|---------|-------------|---------------|
| Admin / staff | Desktop operators managing designs and production | Upload, organize, permissions, queue management |
| Customer | Future website users browsing and requesting designs | Browse, request, track status |
| Production | Team preparing prints for shows and orders | Status visibility, production readiness |

---

## Goals

### Primary Goals

1. Centralize DTF design library with secure team access
2. Support customer requests and show queue workflows
3. Enable AI-assisted categorization and search (future phases)

### Success Criteria

- Staff can manage designs, users, and workflows from the desktop admin app
- Architecture supports future customer website and mobile surfaces
- Security and data model remain consistent across surfaces

---

## Non-Goals (Current Phase)

- Full customer-facing website (future)
- Mobile app (future)
- Features explicitly deferred in `ROADMAP.md` until foundation is complete

---

## Platforms

| Surface | Status |
|---------|--------|
| Desktop Admin (Electron) | **Active** — Phases 1–3C complete; Phase 3D in progress |
| Customer Website | Planned (Phase 5+) |
| Mobile App | Future |

## Current Focus (2026-06-24)

Phase 3D: catalog/AI review foundation and print size/DPI normalization. See `docs/project/ROADMAP.md` and `docs/workflow/plans/print-size-dpi-normalization-plan.md`.

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| `ROADMAP.md` | Phases and priorities |
| `docs/architecture/ARCHITECTURE.md` | System structure |
| `docs/architecture/FIREBASE.md` | Firebase configuration |
| `docs/AI_RULES.md` | Agent entry point |

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-24 | Initial brief from existing project context |
