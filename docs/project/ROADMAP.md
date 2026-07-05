# Fresh Prints Roadmap

## Purpose

This document defines the official roadmap for the Fresh Prints platform.

This document is the source of truth for:

* Development priorities
* Current phase
* Future phases
* Feature sequencing
* Project milestones
* Technical priorities

The roadmap exists to prevent random feature development.

All work should align with the current roadmap phase.

---

# Vision

Fresh Prints is a centralized **design catalog and print planning platform** for DTF operations.

The platform will support:

* **Fresh Prints Studio** (Electron — staff only)
* **Fresh Prints Portal** (mobile-first responsive web — customers only)
* Approved Design Catalog browsing and search
* AI-assisted catalog enrichment and staff review
* Print Request planning (registered customers, guests, internal lists)
* Print Run / Upcoming Show planning
* Production file export for gang sheets (Pensacola workflow)

Fresh Prints consists of **two applications only**. Official names: **Fresh Prints Studio** and **Fresh Prints Portal** (`docs/architecture/ADR-Application-Platform-Strategy.md`). There is no standalone native mobile app. Fresh Prints Portal serves phones, tablets, and desktop browsers.

Fresh Prints is **not** ecommerce, shipping, fulfillment, or order payment software for catalog prints. The only future payment workflow is an optional custom design fee ($5–$10) for in-house Custom Requests.

The goal is to eliminate scattered folders, spreadsheets, messages, ZIP files, and manual workflows.

---

# Guiding Principles

## Build The Foundation First

Do not build advanced features before foundational systems exist.

Bad:

```txt
AI Categorization
```

before:

```txt
Authentication
```

Good:

```txt
Authentication
Roles
Permissions
Dashboard
```

before advanced features.

---

## One Phase At A Time

Complete the current phase before beginning the next phase.

Avoid jumping ahead.

Avoid partially built systems.

---

## Build Reusable Systems

Build systems that can support:

* Fresh Prints Studio
* Fresh Prints Portal (mobile-first responsive web)

Avoid one-off solutions. Do not plan for a separate native mobile application.

---

# Current Project Status

Current Phase:

```txt
Phase 6
Customers And Print Requests (foundation PASS WITH NOTES)
```

Current Goal:

Phase 6 Print Request item sizing and username naming is complete and signed off PASS WITH FOLLOW-UP
NOTES. The `print-request-detail-autosave-and-name-locking` follow-up is complete and signed off
PASS: item autosave, stable item ordering, Request Detail manual save/name locks, and revised
`CR`/`IR` request names are implemented and verified. The `print-request-origin-tracking` follow-up
is complete and signed off PASS: explicit request-origin metadata and Studio badges are implemented,
dev Firestore rules were deployed, and manual QA passed. The
`print-request-oversized-selection-unblock` follow-up is complete and signed off PASS WITH
FOLLOW-UP NOTES: standard requested-size initialization now lets oversized approved catalog designs
be added from Design Library request-selection mode without mutating catalog dimensions or image
files. The `print-request-item-preview-and-dpi-polish` follow-up is complete and signed off PASS:
Print Request item thumbnails now use contained fit in the existing card footprint, thumbnails open
in a lightbox preview, oversized requested dimensions still show accurate DPI while remaining
blocked above 22 inches, and blank width/height edits no longer coerce to `0` during autosave
editing.

AI Processing local fixes through `ai-tag-alias-reconciliation` are implemented and signed off. The
AI Processing deploy/smoke checkpoint passed per user report on 2026-07-01, so it is no longer the
current blocker. Phase 6 Print Requests foundation remains PASS WITH NOTES. The
`print-request-query-index-hardening` follow-up is complete: request, item, summary, and customer
reads now use indexed query paths, the required index definitions are recorded, and dev indexes were
deployed for QA. The `print-request-item-sizing-and-username-naming` follow-up is also complete:
customer usernames, transaction-safe request naming, standard item sizing/DPI validation, duplicate
request items, and dev Firestore rules are in place. The detail autosave/name-locking follow-up keeps
the work in Phase 6 and does not add Print Runs, Portal behavior, or Custom Requests. The origin
tracking implementation remains Phase 6 foundation work with Phase 8 preparation only; it does not
add Portal request creation. The oversized-selection unblock implementation remained Studio Print
Request behavior only and did not change catalog design dimensions, image files, Portal behavior,
Print Runs, or Custom Requests.

**Completed milestones (per signoffs):** Phase 1 foundation, Phase 2 design library (2A–2C), Phase 3 import pipeline (3A–3C), Phase 3D print size and catalog status separation, **Phase 4 catalog cleanup**, Phase 5 AI Review / AI enrichment baseline and AI Processing smoke checkpoint.

**Phase 6 source plan:** `docs/workflow/plans/2026-06-28-phase-6-print-requests-foundation-plan.md`.

**Last realignment:** 2026-07-04 — Phase 6 `print-request-item-preview-and-dpi-polish` signed off PASS in `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-signoff.md`; plan: `docs/workflow/plans/2026-07-04-print-request-item-preview-and-dpi-polish-plan.md`; test report: `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-test-report.md`. Phase 6 `print-request-oversized-selection-unblock` signed off PASS WITH FOLLOW-UP NOTES in `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`; plan: `docs/workflow/plans/2026-07-04-print-request-oversized-selection-unblock-plan.md`; test report: `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-test-report.md`. Phase 6 `print-request-origin-tracking` signed off PASS in `docs/workflow/reviews/2026-07-04-print-request-origin-tracking-signoff.md`; dev Firestore rules were deployed and manual QA passed. Plan: `docs/workflow/plans/2026-07-04-print-request-origin-tracking-plan.md`; test report: `docs/workflow/reviews/2026-07-04-print-request-origin-tracking-test-report.md`. Phase 6 `print-request-detail-autosave-and-name-locking` signed off PASS in `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-signoff.md`. Phase 6 `print-request-item-sizing-and-username-naming` signed off PASS WITH FOLLOW-UP NOTES in `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`. Phase 6 `print-request-query-index-hardening` signed off in `docs/workflow/reviews/2026-07-03-print-request-query-index-hardening-signoff.md`. Phase 6 Print Requests foundation signed off PASS WITH NOTES in `docs/workflow/reviews/2026-06-29-phase-6-print-requests-catch-up-test-report.md`; customer creation/provisioning follow-up passed in `docs/workflow/reviews/2026-06-29-customer-creation-provisioning-bug-test-report.md`.

**Current implementation follow-up:** None active. The latest Phase 6 follow-up,
`print-request-item-preview-and-dpi-polish`, is signed off PASS.

---

# Phase 1

## Foundation

Status:

```txt
Complete
```

Goal:

Establish the platform foundation.

---

## Objectives

Create:

* Firebase Project
* Firebase Authentication
* Firestore
* Firebase Storage
* Role System
* Permission System
* Application Shell
* Navigation
* Dashboard
* Shared Types
* Shared Services

---

## Deliverables

### Firebase Setup

Complete:

* Firebase Project
* Authentication
* Firestore
* Storage

---

### Authentication

Complete:

* Login Page
* Logout
* Session Handling
* Protected Routes

---

### User Roles

Implement:

```txt
owner
admin
helper
customer
```

---

### Permissions

Create:

```txt
permissionService.ts
```

---

### Application Shell

Create:

* Sidebar
* Header
* Page Layout
* Theme System

---

### Dashboard

Create:

* Dashboard Layout
* Placeholder Statistics
* Navigation Links

---

### Shared Foundations

Create:

* Types
* Services
* Error Handling
* Query Infrastructure

---

## Exit Criteria

Phase 1 is complete when:

* Login works
* Roles work
* Permissions work
* Dashboard exists
* Firestore connects successfully
* Storage connects successfully

No image functionality is required.

---

# Phase 2

## Design Library Foundation

Status:

```txt
Complete
```

Goal:

Create the design management system.

---

## Objectives

Build:

* Design Collection
* Design CRUD
* Category System
* Design Grid
* Design Details View

---

## Deliverables

### Design Library

Create:

* Design Grid
* Design Cards
* Design Details Panel

---

### Categories

Create:

* Category CRUD
* Category Filtering

---

### Search Foundation

Support:

* Title
* Tags
* Category

---

## Exit Criteria

Phase 2 complete when:

* Designs can be created
* Designs can be edited
* Categories work
* Search works

No ZIP importing yet.

---

# Phase 3

## Import System

Status:

```txt
Complete (3A–3C)
Active (3D)
```

Goal:

Automate design importing and production-ready metadata.

---

## Objectives

Build:

* ZIP Import
* File Validation
* DPI Validation
* Thumbnail Generation

---

## Deliverables

### ZIP Import

Support:

```txt
ZIP
 ↓
PNG Extraction
```

---

### Validation

Validate:

* File Type
* Dimensions
* DPI

---

### Thumbnail Generation

Generate:

* Thumbnail
* Preview

---

### Upload Workflow

Upload:

* Original
* Thumbnail
* Preview

---

## Exit Criteria

Phase 3 complete when:

* ZIP imports work
* Validation works
* Uploads work
* Records are created

### Phase 3D progress (Fresh Prints Studio)

**Status:** Implementation complete — **signed off** `docs/workflow/reviews/phase-3d-print-size-signoff.md` (2026-06-24, manual QA PASS WITH NOTES).

* **3D Steps 2–4, 6–7:** Print size math, import validation/persistence, Edit Design controls, Design Details display — **complete**
* **3D Step 5 (partial):** Import assessment UI — **complete**; staff confirm modal — **deferred**
* **3D Step 8:** Optional backfill — **deferred**
* **Follow-up UX (non-blocking):** Show equivalent print sizes at 300 / 150 / 72 DPI during import validation to reconcile with other software — deferred
* **Next:** Manual QA for Phase 4A; deploy Firestore indexes before production use

---

## Phase 4A — Search & Filter Enhancement (2026-06-24)

**Delivered:**

* Tag filter (server `array-contains`)
* AI review status filter (server for non-pending; client fallback for `pending` / legacy records) — **relocate to AI Review in Phase 4 cleanup**
* Pagination — load more (100 per page)
* Search includes description
* URL query params: `status`, `category`, `tag`, `aiReview`
* Clear filters control
* Composite Firestore indexes in `firestore.indexes.json` (deploy required)

**Cleanup (post-realignment):** Remove status and AI review filters from Design Library; default to approved catalog (`ready`); archived visibility toggle; simplify URL params.

**Deferred:** Date range filters (4B backlog)

---

## Phase 4 — Catalog Cleanup (2026-06-24)

**Delivered:**

* Design Library defaults to approved catalog (`status: ready`)
* Removed status and AI review filters from Design Library
* Archived visibility toggle (`archived=true` URL param)
* Searchable multi-select tag filter modal
* URL params: `search`, `category`, `tags`, `archived`
* Imports completion messaging and links point to AI Review
* Legacy `status=imported` library URLs redirect to AI Review

**Addendum (2026-06-24):** Show archived control is a toggle switch; **Design Library** is the default authenticated landing page (`/designs`).

**Addendum (2026-06-29):** Dev Dashboard page removed; **Dev Tools** sidebar button opens Electron DevTools in development builds (staff only).

**QA fix (2026-06-24):** Tag filter composite indexes extended; Edit Design status read-only; uniform design cards; archived metadata save preserves `archived`.

---

# Phase 4

## Catalog Search And Organization

Status:

```txt
Complete — signoff 2026-06-24 (docs/workflow/reviews/phase-4-signoff.md)
```

Goal:

Make the **approved design catalog** easy to search and browse. Design Library is not a workflow queue.

---

## Objectives

Build:

* Catalog search (title, description, tags)
* Category and tag filters
* Pagination
* Archived visibility toggle
* URL persistence for catalog filters
* AI Review navigation (sidebar, import redirects)
* Design Library limited to approved catalog (`ready`) by default

---

## Design Library scope

**In scope:**

* Search, category, tags, pagination, archived toggle
* Staff metadata editing

**Out of scope (moved to other phases):**

* AI review queue filters → Phase 5 AI Review page
* Import / operational status filters → Phase 5 AI Review page
* Print request or production queues → Phases 6–7

---

## Exit Criteria

Staff can efficiently browse and search the approved catalog. Non-catalog workflow filters removed from Design Library. Imports route to AI Review. Documentation reflects Fresh Prints Studio and Fresh Prints Portal as the only applications.

---

# Phase 5

## AI Processing And Catalog Approval

Status:

```txt
Complete through Phase 0 deploy gate; monitor and polish as needed
```

Goal:

Every imported design lands in **AI Processing** (`/ai-review`). Staff start AI enrichment from the Processing tab, one design at a time. Staff review and approve before designs appear in Design Library.

Architecture plan: `docs/workflow/plans/phase-5-ai-review-architecture-plan.md`  
Architecture review: `docs/workflow/reviews/phase-5-ai-review-architecture-review.md`

### Sub-phases (recommended)

| Sub-phase | Focus |
|-----------|--------|
| **5A** | Processing station — tabs, queue stats, workflow workspace (preview → pipeline → suggestions → catalog form); oldest-first queue; **no search/filter/sort** |
| **5B** | Staff-controlled AI pipeline (Processing tab starts direct Cloud Function execution; `aiSuggestions` + version fields) |
| **5C** | Approval workflow polish (already largely in 5A workspace) |
| **5D** | Promotion & audit (`catalogApprovalService` UI, re-open rejected, duplicate title warning) |
| **5E** | Polish & metrics (confidence badges, soft lock, re-run AI, sessionStorage optional) |

**5B** may run parallel with **5A**. Human checkpoint required before production AI provider setup.

---

## Objectives

Build:

* AI Processing station (`/ai-review`) — Processing, Needs Review, Rejected tabs; oldest-first queue
* Staff-controlled AI Processing after import (Phase 5B maintenance — no OpenAI call during import)
* AI title, description, category, tag suggestions with version tracking (Phase 5B)
* Staff review workspace (Approve & Next, Reject & Next, Skip, auto-advance)
* `catalogApprovalService` UI wiring
* Import completion routes to AI Processing (not Design Library)
* **Search and catalog filters remain in Design Library only**

---

## Deliverables

### AI Processing Queue

Support:

* **Processing** tab (awaiting AI) and **Needs review** tab (ready for staff)
* **Rejected** tab for audit and re-open
* Oldest-first queue order — no search, category filter, or sort dropdown
* Honest AI output placeholder until Phase 5B (no fabricated suggestions)
* Temporary form state in review workspace (no Firestore review drafts)
* Approve → `status: ready` (Design Library)
* Reject → `status: rejected`

### AI Enrichment

Generate:

* Titles
* Descriptions
* Tags
* Category suggestions

---

## Exit Criteria

New imports appear in AI Processing. Staff start AI processing from `/ai-review`; successful output moves to Needs Review. Staff approve in the processing workspace. Approved designs appear in Design Library only. Search/filter belongs in Design Library. No automatic catalog publish without staff action.

---

# Phase 6

## Customers And Print Requests

Status:

```txt
PASS WITH NOTES
```

Goal:

Staff create named print request lists from approved catalog designs for registered customers, guest customers, or internal use.

---

## Objectives

Build:

* Customer and guest customer records
* Print Request CRUD
* Print Request Items (design selections)
* Item-level production status (`pending`, `printed`, `done`)

---

## Deliverables

### Print Requests

Support:

* Create named request list
* Add designs from approved catalog
* Assign registered customer, guest customer, or internal list
* Track item status

### Implementation/signoff progress (2026-06-29)

Delivered and manually QA'd in Fresh Prints Studio:

* `/print-requests` staff route
* Print request list/detail workspace
* Internal, registered customer, and guest customer create modes
* Request item edit/remove controls
* Username-based transaction-safe customer request names (`sarahsmith-CR001`) and internal request names (`whatnot-IR001`)
* Standard request item quantity, requested-size, DPI feedback, duplicate, and confirm-remove controls
* Design Library request-selection mode with quantity selection
* Owner/admin customer-record creation path from Users for registered customer Print Requests
* Firestore rules for `customers`, `customerUsernames`, `counters`, `printRequests`, and `printRequestItems`
* Shared `PrintRequest`, `PrintRequestItem`, and `Customer` types
* Sticky Design Library filter dock for long catalog browsing

Notes:

* Registered customer request testing has a corrected implementation path through owner/admin-created customer records in Users; authenticated QA passed in `docs/workflow/reviews/2026-06-29-customer-creation-provisioning-bug-test-report.md`.
* Customer records created in Phase 6 do not create Firebase Auth accounts, Portal login, or Studio access.
* Print Request query/index hardening is signed off in `docs/workflow/reviews/2026-07-03-print-request-query-index-hardening-signoff.md`.
* Print Request item sizing and username naming is signed off PASS WITH FOLLOW-UP NOTES in `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`; follow-ups TD-016, TD-017, and TD-018 are addressed and signed off by `print-request-detail-autosave-and-name-locking` in `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-signoff.md`.
* Print Request oversized selection unblock is signed off PASS WITH FOLLOW-UP NOTES in `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`; follow-ups TD-019, TD-020, and TD-021 are implemented and signed off by `print-request-item-preview-and-dpi-polish` for item thumbnail fit, item thumbnail lightbox, and accurate DPI display when requested dimensions are oversized.

**Not in scope:** Payment, checkout, shipping, order fulfillment.

---

## Exit Criteria

Staff can build and manage print requests without mutating design catalog status.

---

# Phase 7

## Print Runs / Upcoming Shows

Status:

```txt
Planned
```

Goal:

Group multiple print requests into upcoming shows or batch print runs. Export production files for Pensacola gang-sheet workflow.

---

## Objectives

Build:

* Print Run CRUD
* Attach print requests to runs
* Print Run Items with production status
* Download originals / batch export for gang sheets

---

## Deliverables

### Print Run Management

Support:

* Create / edit / complete print run
* Add print request items to run
* Mark items printed / done
* Pensacola file export (originals to local folder)

**Not in scope:** Shipping, packing, parcel tracking.

---

## Exit Criteria

Show preparation and production file export occur within Fresh Prints. Production status lives on print run items, not designs.

---

# Phase 8

## Fresh Prints Portal

Status:

```txt
Planned
```

Goal:

Registered customers browse the approved catalog and manage print requests on **Fresh Prints Portal** — a mobile-first responsive web application (phones, tablets, desktop browsers).

---

## Objectives

Build:

* Customer registration and login (`role: customer` only)
* Catalog browse, search, filter
* Customer-created print requests
* Print request progress tracking

---

## Deliverables

### Customer Portal

Support:

* Browse approved designs
* Create print requests
* Track request status

**Security:** Customer accounts use Fresh Prints Portal only. They do not access Fresh Prints Studio.

---

## Exit Criteria

Customers self-serve catalog browse and print request creation on the web portal.

---

# Phase 9

## Custom Request Q&A And Etsy Referral

Status:

```txt
Planned
```

Goal:

Separate custom design workflow from print requests. Optional design fee for in-house custom art.

---

## Objectives

Build:

* Q&A intake form
* Etsy search URL generation
* Customer path: found on Etsy vs needs in-house design
* Optional $5–$10 design fee (only payment workflow in Fresh Prints)

---

## Deliverables

### Custom Requests

Support:

* Questionnaire submission
* Etsy referral link
* In-house custom request queue (staff review)
* Optional design fee tracking

**Not in scope:** Checkout for normal print requests; product payment; shipping.

---

## Exit Criteria

Custom requests are distinct from print requests. Etsy referral and in-house paths documented and functional.

---

# Phase 10

## Analytics And Popularity Tracking

Status:

```txt
Planned
```

Goal:

Track design popularity without changing catalog lifecycle.

---

## Objectives

Support:

* `requestCount`, `showAddCount`, `printCount` counters on designs
* `lastRequestedAt`, `lastAddedToShowAt`, `lastPrintedAt` timestamps
* Trend and popularity views

---

## Exit Criteria

Popularity metrics increment from print request and print run events. Counters are analytics only — designs never become queued or printed.

---

# Backlog

Potential future features:

* Saved Searches
* Collections
* Design Versioning
* Team Activity Feed
* Duplicate detection (AI)
* Automated print run suggestions
* Cloud Functions
* Web push notifications (Fresh Prints Portal PWA — optional)
* Public Design Sharing
* Date range filters (Phase 4B)
* Multi-select tag filter modal (Phase 4B)

Backlog items require approval before development.

---

# Out Of Scope

Do not build these without explicit approval:

* Ecommerce storefront / product checkout for catalog prints
* Shipping or parcel fulfillment
* Order payment for normal print requests
* Marketplace
* General payment processing (except optional custom design fee in Phase 9)
* Customer billing for catalog items
* Social Features
* Messaging System
* Custom Backend APIs
* Multi-Tenant Support
* Customer role access to Fresh Prints Studio
* Standalone native mobile applications (iOS, Android, React Native, Flutter, Xamarin, MAUI)

---

# Decision Framework

Before implementing a feature:

Ask:

1. Does it belong in the current phase?
2. Does it align with the roadmap?
3. Does it depend on unfinished work?
4. Does it increase technical debt?
5. Does it support the long-term vision?

If not, postpone it.

---

# Success Criteria

Fresh Prints succeeds when:

* The approved design catalog is effortless to search and maintain.
* Imported designs flow through AI Review before catalog visibility.
* Print requests and print runs replace spreadsheets and messages for show prep.
* Remote helpers can import, review, and build print plans without Pensacola filesystem access.
* Pensacola production file export is faster.
* AI reduces repetitive catalog enrichment.
* Customer portal (Fresh Prints Portal) separates cleanly from Fresh Prints Studio.
* The platform remains maintainable for years.

Every feature should move the project toward these goals.
