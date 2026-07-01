# Roadmap and Phases

> Align all work with the current phase. Do not jump ahead.

## Current status

**Phase 6 — Customers and Print Requests** is signed off as **PASS** for the current scope.

Phase 6 foundation includes:

- Staff-only `/print-requests` workspace
- Internal print requests
- Customer print requests
- Request items referencing approved catalog designs
- Design Library request-selection mode
- Quantity selection and persistence
- Item edit/remove
- Design lifecycle status kept clean

Phase 6 notes:

- Print Request indexes and dedicated unit tests remain hardening follow-ups.

---

## Completed phases

### Phase 1 — Foundation

Firebase project, Auth, Firestore, Storage, roles, permissions, app shell, dashboard, shared types/services.

### Phase 2 — Design Library

Design CRUD, categories, grid, details panel, search foundation.

### Phase 3 — Import System

- 3A–3C: ZIP import, validation, thumbnail/preview generation, upload workflow
- 3D: Print size math, import validation/persistence, Edit Design print size controls

### Phase 4 — Catalog Search & Organization

- Design Library defaults to `status: ready` approved catalog
- Removed status/AI review filters from Library
- Tag filter modal, archived toggle, URL params
- Import completion routes to AI Review

### Phase 5 — AI Processing and Catalog Approval

- AI Review workspace
- Processing / Needs Review / Rejected tabs
- Staff-controlled AI queue and re-run flows
- OpenAI catalog enrichment baseline through Phase 0 deploy gate
- v15 prompt/validation hardening baseline

### Phase 6 — Customers and Print Requests

Status: **PASS**

- Internal and customer request workflows pass authenticated Studio QA.
- Customer records can be created and edited from `/users` without creating Firebase Auth accounts or `users/{uid}` documents.
- Approved catalog designs can be selected from Design Library and saved to requests.
- Request items persist and can be edited/removed.
- Design records remain catalog-only and stay `status: ready`.

---

## Planned phases

### Phase 7 — Print Runs / Upcoming Shows

Print Run CRUD, attach requests, production status, Pensacola file export.

### Phase 8 — Fresh Prints Portal

Customer web app: registration, catalog browse, print requests, progress tracking. Mobile-first responsive.

### Phase 9 — Custom Request Q&A

Separate from print requests. Etsy referral, in-house custom art, optional $5-$10 design fee.

### Phase 10 — Analytics

`requestCount`, `showAddCount`, `printCount` on designs — analytics only, not lifecycle status.

---

## Decision framework

Before any feature, ask:

1. Does it belong in the current phase or active managed bug?
2. Does it align with the roadmap?
3. Does it depend on unfinished work?
4. Does it increase technical debt?
5. Does it support the long-term vision?

If not, postpone it.

---

## Out of scope

Ecommerce checkout, shipping, order payment, marketplace, native mobile apps, customer access to Studio, multi-tenant, custom REST API for core ops.
