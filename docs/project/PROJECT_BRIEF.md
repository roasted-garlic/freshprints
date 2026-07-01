# Project Brief

> **Fresh Prints** — product source of truth for *what* and *why*.

---

## App Name

Fresh Prints

## One-Line Description

Design catalog and print planning platform for DTF operations — **Fresh Prints Studio** for staff, **Fresh Prints Portal** for customers.

---

## Platform Architecture

Fresh Prints consists of **two applications only:**

| Official name | Users | Technology |
|---------------|-------|------------|
| **Fresh Prints Studio** | owner, admin, helper | Electron desktop application |
| **Fresh Prints Portal** | customer | Mobile-first responsive web (phones, tablets, desktop browsers) |

There is **no** standalone native mobile application (no iOS, Android, React Native, Flutter, Xamarin, or MAUI). **Fresh Prints Portal** is the permanent customer and mobile solution. Optional PWA install-to-home-screen may be added later; it remains the Portal, not a separate app.

Both applications share Firebase Auth, Firestore, and Storage.

Official naming and platform strategy: `docs/architecture/ADR-Application-Platform-Strategy.md` (ADR-FP-008).

---

## Problem Statement

DTF design operations are scattered across folders, spreadsheets, messages, and manual ZIP workflows. Teams lack a single system for design catalog management, AI-assisted enrichment, print request planning, and show preparation.

---

## Target Users

| Persona | Description | Primary needs | Application |
|---------|-------------|---------------|-------------|
| Admin / staff | Studio operators | Import, AI review, catalog, print requests, print runs | Fresh Prints Studio |
| Helper | Remote staff | Import, tag, build print plans | Fresh Prints Studio |
| Customer | Portal users | Browse catalog, create print requests, custom requests | Fresh Prints Portal |
| Production (Pensacola) | Gang sheet workstation | Download originals from print runs | Fresh Prints Studio |

---

## Business Workflow

```txt
Import Designs → AI Review → Approved Design Library → Print Requests → Print Runs → Analytics
```

Designs never become queued or printed. Queued and printed belong only to Print Request Items / Print Run Items.

---

## Goals

### Primary Goals

1. Centralize approved DTF design catalog with secure staff access in Fresh Prints Studio
2. Route imports through AI Review before catalog visibility
3. Support print request and print run planning (not orders or shipping)
4. Enable AI-assisted catalog enrichment (title, description, category, tags)
5. Deliver customer experience via mobile-first **Fresh Prints Portal**

### Success Criteria

- Staff manage imports, catalog, and print plans from Fresh Prints Studio
- Design Library shows approved catalog only; AI Review handles imports
- Designs never become queued or printed — production status on request/run items
- Customer accounts use Fresh Prints Portal only (`role: customer`)
- Fresh Prints Portal works excellently on mobile browsers
- Security and data model remain consistent across both applications

---

## Non-Goals

- Ecommerce storefront or checkout for catalog prints
- Shipping, packing, or parcel fulfillment
- Order payment for normal print requests
- Customer access to Fresh Prints Studio
- Standalone native mobile applications
- Payment processing except optional custom design fee (Phase 9)
- Features explicitly deferred in `ROADMAP.md`

---

## Platforms

| Application | Status |
|-------------|--------|
| Fresh Prints Studio | **Active** — Phases 1–4 complete; **Phase 5** architecture approved |
| Fresh Prints Portal | Planned (Phase 8) |

---

## Current Focus (2026-06-29)

**Phase 6 — Customers and Print Requests** — foundation signed off with notes; AI Processing maintenance signed off locally and awaits deploy/smoke approval.

Plan: `docs/workflow/plans/phase-5-ai-review-architecture-plan.md`  
Review: `docs/workflow/reviews/phase-5-ai-review-architecture-review.md`

Fresh Prints Studio workspaces:

1. **Imports** — receive, validate, derivatives, AI Processing intake
2. **AI Processing** — operational Inbox; staff-controlled AI processing and Approval Mode
3. **Design Library** — approved catalog only

Phase 4 catalog cleanup is complete. Phase 5 AI Processing is staff-controlled; imports do not call OpenAI automatically.

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| `ROADMAP.md` | Phases and priorities |
| `docs/architecture/ADR-Application-Platform-Strategy.md` | Official application names and platform strategy |
| `docs/workflow/plans/phase-5-ai-review-architecture-plan.md` | Phase 5 AI Review implementation scope |
| `docs/workflow/reviews/phase-5-ai-review-architecture-review.md` | Phase 5 architecture review (approved with conditions) |
| `docs/architecture/ARCHITECTURE.md` | System structure |
| `docs/AI_RULES.md` | Agent entry point |

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-24 | ADR-FP-008: Fresh Prints Studio + Fresh Prints Portal official names |
| 2026-06-24 | Two-application platform locked; Phase 4 cleanup plan |
| 2026-06-24 | Roadmap realignment — catalog vs print planning |
| 2026-06-24 | Initial brief |
