# Project Brief — Fresh Prints

## One line

Design catalog and print planning platform for DTF operations — **Fresh Prints Studio** (staff desktop) and **Fresh Prints Portal** (customer web).

## Problem

DTF design operations are scattered across folders, spreadsheets, messages, and manual ZIP workflows. Teams need one system for catalog management, AI-assisted enrichment, print request planning, customer artwork for requests, and show preparation.

## Target users

| Persona | App | Needs |
|---------|-----|-------|
| Owner / Admin / Helper | Fresh Prints Studio | Import, AI review, catalog, print requests, show queue, customer-upload intake |
| Customer | Fresh Prints Portal | Browse Design Library, create/continue print requests, upload own artwork, add request to a show |
| Production (Pensacola) | Studio | Download / export originals and gang sheets for production |

## Business workflow

```
Staff: Import Designs → AI Review → Approved Design Library
Customers: Browse Library +/or Upload Artwork → Print Request → Choose Show → Print Run / Export
Staff ops: Show Queue production → zip / gang sheet export
```

**Critical rule:** Designs never become "queued" or "printed." Those statuses belong on Print Request Items / Show Allocations only.

## Primary goals

1. Centralize approved DTF design catalog (staff)
2. Route imports through AI Review before catalog visibility
3. Support print request and print run planning (not ecommerce/shipping)
4. AI-assisted catalog enrichment (title, description, category, tags)
5. Customer experience via mobile-first Portal (live in **dev**)
6. Let customers attach **their own transparent artwork** to requests without auto-publishing to the shared library

## Non-goals (do not build without explicit approval)

- Ecommerce storefront or checkout for catalog prints
- Shipping, packing, parcel fulfillment
- Order payment for normal print requests
- Customer access to Fresh Prints Studio
- Standalone native mobile apps (iOS/Android/React Native)
- Payment processing except optional custom design fee (Phase 9 Custom Requests)
- Treating customer uploads as Phase 9 custom-request Q&A (different feature — ADR-FP-073)

## Platform (two apps only)

| App | Technology | Users | Local dev |
|-----|------------|-------|-----------|
| Fresh Prints Studio | Electron desktop | owner, admin, helper | `npm run dev:studio` |
| Fresh Prints Portal | Next.js responsive web | customer (`role: customer`) | `npm run dev:portal` → **http://localhost:3100** |

Both share Firebase Auth, Firestore, and Storage.

Official naming: ADR-FP-008.
