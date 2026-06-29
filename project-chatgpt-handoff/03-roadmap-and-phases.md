# Roadmap and Phases

> Align all work with the current phase. Do not jump ahead.

## Current phase

**Phase 5 — AI Processing and Catalog Approval** (in progress)

Sub-phases:

| Sub | Focus | Status |
|-----|-------|--------|
| 5A | Processing station UI (tabs, workspace, queue) | ✅ Largely complete |
| 5B | Automatic AI pipeline (Cloud Functions) | ✅ Implemented locally |
| 5C | Approval workflow polish | ✅ Largely in 5A |
| 5D | Promotion & audit (re-open rejected, duplicate title warning) | Partial |
| 5E | Polish & metrics (confidence badges, re-run AI) | Partial |

Active managed goal: **AI catalog enrichment v15** (see `CURRENT-STATE.md`).

---

## Completed phases

### Phase 1 — Foundation ✅
Firebase project, Auth, Firestore, Storage, roles, permissions, app shell, dashboard, shared types/services.

### Phase 2 — Design Library ✅
Design CRUD, categories, grid, details panel, search foundation.

### Phase 3 — Import System ✅
- 3A–3C: ZIP import, validation (DPI, dimensions), thumbnail/preview generation, upload workflow
- 3D: Print size math, import validation/persistence, Edit Design print size controls

### Phase 4 — Catalog Search & Organization ✅
- Design Library defaults to `status: ready` (approved catalog)
- Removed status/AI review filters from Library (moved to AI Review)
- Tag filter modal, pagination, archived toggle, URL params
- Import completion routes to AI Review

---

## Planned phases

### Phase 6 — Customers & Print Requests
Customer/guest records, Print Request CRUD, item-level production status (`pending`, `printed`, `done`). **Not** payment or shipping.

### Phase 7 — Print Runs / Upcoming Shows
Print Run CRUD, attach requests, production status, Pensacola file export.

### Phase 8 — Fresh Prints Portal
Customer web app: registration, catalog browse, print requests, progress tracking. Mobile-first responsive.

### Phase 9 — Custom Request Q&A
Separate from print requests. Etsy referral, in-house custom art, optional $5–$10 design fee.

### Phase 10 — Analytics
`requestCount`, `showAddCount`, `printCount` on designs — analytics only, not lifecycle status.

---

## Decision framework

Before any feature, ask:

1. Does it belong in the current phase?
2. Does it align with the roadmap?
3. Does it depend on unfinished work?
4. Does it increase technical debt?
5. Does it support the long-term vision?

If not → postpone.

---

## Out of scope (entire product)

Ecommerce checkout, shipping, order payment, marketplace, native mobile apps, customer access to Studio, multi-tenant, custom REST API for core ops.
