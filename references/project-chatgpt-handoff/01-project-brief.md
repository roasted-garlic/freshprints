# Project Brief — Fresh Prints

## One line

Design catalog and print planning platform for DTF operations — **Fresh Prints Studio** (staff desktop) and **Fresh Prints Portal** (customer web, Phase 8).

## Problem

DTF design operations are scattered across folders, spreadsheets, messages, and manual ZIP workflows. Teams lack one system for catalog management, AI-assisted enrichment, print request planning, and show preparation.

## Target users

| Persona | App | Needs |
|---------|-----|-------|
| Owner / Admin / Helper | Fresh Prints Studio | Import, AI review, catalog, print plans |
| Customer | Fresh Prints Portal (planned) | Browse catalog, create print requests |
| Production (Pensacola) | Studio | Download originals from print runs for gang sheets |

## Business workflow

```
Import Designs → AI Review → Approved Design Library → Print Requests → Print Runs → Analytics
```

**Critical rule:** Designs never become "queued" or "printed." Those statuses belong on Print Request Items / Print Run Items only.

## Primary goals

1. Centralize approved DTF design catalog (staff)
2. Route imports through AI Review before catalog visibility
3. Support print request and print run planning (not ecommerce/shipping)
4. AI-assisted catalog enrichment (title, description, category, tags)
5. Customer experience via mobile-first Portal (future)

## Non-goals (do not build without explicit approval)

- Ecommerce storefront or checkout for catalog prints
- Shipping, packing, parcel fulfillment
- Order payment for normal print requests
- Customer access to Fresh Prints Studio
- Standalone native mobile apps (iOS/Android/React Native)
- Payment processing except optional custom design fee (Phase 9)

## Platform (two apps only)

| App | Technology | Users |
|-----|------------|-------|
| Fresh Prints Studio | Electron desktop | owner, admin, helper |
| Fresh Prints Portal | Responsive web | customer (`role: customer`) |

Both share Firebase Auth, Firestore, and Storage.

Official naming: ADR-FP-008 in `docs/architecture/ADR-Application-Platform-Strategy.md`.
