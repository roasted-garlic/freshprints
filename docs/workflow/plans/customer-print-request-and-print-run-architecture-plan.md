# Plan: Customer, Print Request, and Print Run Architecture

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | Roadmap Realignment — documentation only |
| Related | `docs/workflow/reviews/roadmap-realignment-review.md` |

---

## 1. Problem statement

Fresh Prints roadmap, workflow, and data model documentation were written under assumptions that partially conflated:

* **Ecommerce / orders / checkout** — Fresh Prints is not an order or payment system for catalog prints.
* **Shipping / fulfillment** — Print runs are show preparation and production planning, not parcel fulfillment.
* **Design documents as production queue** — `queued` / `printed` on designs mixed catalog lifecycle with operational workflow.
* **Design Library as review queue** — Imported and pending-AI designs appeared alongside approved catalog entries.
* **Customer Requests as orders** — Upload/description requests were framed with `fulfilled` order-like language rather than separating **Print Requests** (catalog selections) from **Custom Requests** (Q&A + Etsy referral + optional design fee).

Manual workflow review (2026-06-24) clarified the true business model. This plan captures the target architecture so implementation phases can proceed without rebuilding on outdated assumptions.

**This document is planning only.** No code, Firestore, rules, or UI changes are in scope.

---

## 2. Clarified business model

Fresh Prints is:

| Surface | Role |
|---------|------|
| **Fresh Prints Studio** | Internal staff tool: import, AI review, catalog management, print requests, print runs, production file export |
| **Fresh Prints Portal** (future) | Registered customers browse approved catalog, create print requests, track progress, submit custom requests |
| **Design catalog system** | Approved designs with metadata, search, categories, tags |
| **AI-assisted enrichment** | Title, description, category, tags; staff approval before catalog visibility |
| **Print request planning** | Named lists of catalog designs a customer (registered, guest, or internal) wants printed |
| **Show / print run planning** | Group multiple print requests for an upcoming live show or batch production run |

Fresh Prints is **not**:

* An ecommerce storefront with product checkout
* A shipping or parcel fulfillment system
* An order payment system for normal catalog prints
* A system where the design document itself becomes queued or printed

### Canonical operational flow

```txt
Import designs (PNG/ZIP)
    ↓
AI Review enriches title, description, category, tags
    ↓
Staff approves or rejects
    ↓
Approved designs appear in Design Library (catalog)
    ↓
Staff or customers create named Print Requests from approved designs
    ↓
Print Requests belong to registered customers, guest customers, or internal/self lists
    ↓
Multiple Print Requests may be grouped into an Upcoming Show / Print Run
    ↓
Print Request Items (or Print Run Items) are marked printed/done as completed
    ↓
Designs track popularity counters only — designs never become queued or printed
```

---

## 3. Entity model

### 3.1 Design (catalog record)

**Collection:** `designs/{designId}` (existing)

**Purpose:** Canonical catalog asset and metadata. Not a workflow queue item.

| Concern | Field / pattern |
|---------|-----------------|
| Catalog lifecycle | `status`: `imported`, `processing`, `ready`, `rejected`, `archived` |
| AI review | `aiReviewStatus`: `pending`, `approved`, `rejected`, `needs_review` |
| Popularity (analytics only) | `requestCount`, `showAddCount`, `printCount`, `lastRequestedAt`, `lastAddedToShowAt`, `lastPrintedAt` |
| Deprecated | `queued`, `printed` on design documents — read compatibility only; never written |

**Rules:**

* Designs in `ready` + `aiReviewStatus: approved` are customer-visible (future portal).
* Designs in `imported` / `pending` AI review belong in **AI Review**, not Design Library default browse.
* Popularity counters increment when referenced by print requests / print runs; they do **not** change `status`.

### 3.2 Customer (registered)

**Collection:** `customers/{customerId}` (existing; extend)

```ts
export interface Customer {
  id: string;
  userId?: string;           // Firebase Auth UID when registered on web portal
  displayName: string;
  email?: string;
  notes?: string;
  isGuest: false;
  totalPrintRequests: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Rules:**

* `role: customer` Auth users access **Fresh Prints Portal only** — never Fresh Prints Studio.
* Staff may create print requests on behalf of registered customers from the desktop app.

### 3.3 Guest customer

**Collection:** `customers/{customerId}` with `isGuest: true` **or** separate `guestCustomers/{id}` — **open decision** (see §12).

```ts
export interface GuestCustomer {
  id: string;
  displayName: string;       // e.g. "Whatnot buyer — Jane"
  contactHint?: string;      // optional phone/handle; not Auth-linked
  notes?: string;
  isGuest: true;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Rules:**

* No Firebase Auth account.
* Staff creates guest records when building print requests for walk-in or show buyers.
* Guest customers cannot log into any app.

### 3.4 Print Request

**Collection:** `printRequests/{printRequestId}` (new — replaces conflated "customer request" for catalog selections)

```ts
export type PrintRequestStatus =
  | "draft"
  | "active"
  | "completed"
  | "archived";

export interface PrintRequest {
  id: string;
  name: string;                    // e.g. "Sarah's birthday shirts"
  customerId?: string;             // registered customer
  guestCustomerId?: string;        // guest customer (mutually exclusive with customerId)
  isInternal: boolean;             // staff self-list when no customer

  status: PrintRequestStatus;
  itemCount: number;

  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Rules:**

* A Print Request is **not an order**. No payment, shipping, or checkout fields.
* Only `status: ready` catalog designs may be added as items.
* Staff can create on behalf of registered, guest, or internal lists.

### 3.5 Print Request Item

**Collection:** `printRequestItems/{itemId}` (new)

```ts
export type PrintRequestItemStatus =
  | "pending"
  | "queued"        // added to a print run
  | "in_progress"
  | "printed"
  | "done"
  | "canceled";

export interface PrintRequestItem {
  id: string;
  printRequestId: string;
  designId: string;

  quantity: number;
  printWidthInches?: number;       // snapshot at add time
  printHeightInches?: number;
  sizeLabel?: string;
  notes?: string;

  status: PrintRequestItemStatus;

  addedBy: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Rules:**

* **Queued / printed / done** lives here — not on `designs`.
* Snapshot production-relevant fields when item is created.
* Increment design `requestCount` / `lastRequestedAt` on add (analytics).

### 3.6 Print Run (Upcoming Show)

**Collection:** `printRuns/{printRunId}` (new — supersedes `showQueues` naming)

```ts
export type PrintRunStatus =
  | "draft"
  | "active"
  | "completed"
  | "archived";

export interface PrintRun {
  id: string;
  name: string;                    // e.g. "Tuesday Night Whatnot Show"
  description?: string;
  scheduledDate?: Timestamp;
  status: PrintRunStatus;
  printRequestCount: number;
  itemCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Rules:**

* A Print Run is **not shipping or fulfillment**. It is batch/show production planning.
* Multiple Print Requests can be attached to one Print Run.

### 3.7 Print Run Item

**Collection:** `printRunItems/{itemId}` (new — supersedes `showQueueItems` naming)

```ts
export type PrintRunItemStatus =
  | "queued"
  | "in_progress"
  | "printed"
  | "done"
  | "canceled";

export interface PrintRunItem {
  id: string;
  printRunId: string;
  printRequestItemId: string;      // source item
  printRequestId: string;          // denormalized for queries
  designId: string;              // denormalized for queries

  position: number;
  status: PrintRunItemStatus;

  addedBy: string;
  printedAt?: Timestamp;
  printedBy?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Rules:**

* Links print request items into a show/run without mutating the design document.
* Increment design `showAddCount` / `lastAddedToShowAt` on add; `printCount` / `lastPrintedAt` on print complete.
* Pensacola gang-sheet export reads from Print Run Items (future phase).

### 3.8 Custom Request (future — separate from Print Request)

**Collection:** `customRequests/{requestId}` (new — supersedes conflated `customerRequests` for Q&A workflow)

```ts
export type CustomRequestStatus =
  | "submitted"
  | "reviewing"
  | "etsy_referred"      // customer sent to Etsy search
  | "in_house_pending"   // needs custom design
  | "in_house_progress"
  | "completed"
  | "rejected"
  | "archived";

export interface CustomRequest {
  id: string;
  customerId: string;              // registered customer only (portal phase)

  questionnaireAnswers: Record<string, string>;
  etsySearchUrl?: string;
  customerFoundOnEtsy?: boolean;

  designFeeAmount?: number;        // optional $5–$10
  designFeeStatus?: "none" | "pending" | "paid";

  status: CustomRequestStatus;
  approvedDesignId?: string;       // if in-house design created

  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Rules:**

* **Only possible payment workflow** in Fresh Prints — optional design fee for in-house custom art.
* No checkout for normal Print Requests.
* Q&A form → Etsy search URL → customer finds external DTF PNG **or** submits in-house request.
* Future customer portal phase only.

---

## 4. Relationships

```txt
User (staff: owner/admin/helper)
 ├── designs (import, edit, approve)
 ├── printRequests (create on behalf of customers)
 ├── printRuns (create, manage)
 └── auditLogs

Customer (registered, role: customer)
 ├── printRequests (via web portal — future)
 └── customRequests (via web portal — future)

GuestCustomer
 └── printRequests (staff-created only)

Design
 ├── category
 ├── printRequestItems (many)
 └── printRunItems (many, via print request items)

PrintRequest
 ├── customer | guestCustomer | internal
 └── printRequestItems

PrintRun
 └── printRunItems → printRequestItems → designs
```

**Legacy mapping (migration planning):**

| Legacy (DATA_MODEL) | Target |
|---------------------|--------|
| `showQueues` | `printRuns` |
| `showQueueItems` | `printRunItems` |
| `customerRequests` (upload/description) | `customRequests` (Q&A + Etsy) |
| N/A | `printRequests` + `printRequestItems` (new) |

---

## 5. Design Library purpose (simplified)

### Design Library **is**

* Approved catalog browsing (`status: ready`, `aiReviewStatus: approved`)
* Search (title, description, tags)
* Category filter
* Tag filter (multi-select modal)
* Archived visibility toggle (include/exclude `archived`)
* Staff metadata editing (title, description, category, tags, print size)
* Pagination and URL persistence for catalog filters

### Design Library **is not**

* AI review queue
* Import review queue
* Production queue
* Print request queue
* Customer custom request queue

**Default query:** `status == ready` (approved catalog). Optional toggle to include archived.

**Filters to remove from Design Library (future cleanup):**

* Operational status filter (`imported`, `processing`, `rejected`) — belongs in AI Review
* AI review status filter — belongs in AI Review page

---

## 6. AI Review purpose

### AI Review **is**

* Work queue for newly imported designs (`status: imported`, `aiReviewStatus: pending` / `needs_review`)
* AI-generated title, description, category, tags (Phase 5+)
* Staff approval, edit-before-approve, rejection
* Gateway to catalog: approved → `status: ready` via `catalogApprovalService`

### AI Review workflow

```txt
Import completes (status: imported, aiReviewStatus: pending)
    ↓
AI pipeline generates suggestions (title, description, category, tags)
    ↓
Staff reviews in AI Review page
    ↓
Approve → catalogApprovalService → status: ready, aiReviewStatus: approved
    ↓
Design appears in Design Library
```

or

```txt
Staff rejects → status: rejected, aiReviewStatus: rejected
```

**Imported designs should primarily flow into AI Review**, not Design Library default view.

---

## 7. Popularity tracking

Design documents may store **analytics counters only**:

| Field | Increment when |
|-------|----------------|
| `requestCount` | Print request item added |
| `showAddCount` | Print run item added |
| `printCount` | Print run item marked printed/done |
| `lastRequestedAt` | Latest print request item add |
| `lastAddedToShowAt` | Latest print run item add |
| `lastPrintedAt` | Latest print completion |

**These counters do not change design lifecycle status.**

Existing `queueCount` field should be renamed or repurposed to `showAddCount` during implementation — **open decision**.

---

## 8. Customer-facing portal scope (future)

**Phase 8** — not before Print Request / Print Run staff workflows exist.

| Capability | Fresh Prints Portal | Fresh Prints Studio |
|------------|--------|---------------|
| Customer registration | Yes | No |
| Catalog browse (approved designs) | Yes | Yes (staff) |
| Create print requests | Yes | Yes (on behalf of customer) |
| Track print request progress | Yes | Yes |
| Submit custom requests | Yes (Phase 9) | Review only |
| Import designs | No | Yes |
| AI review | No | Yes |
| Print run management | No | Yes |

**Security:** `role: customer` users must not access Fresh Prints Studio routes or staff permissions.

---

## 9. Custom Request scope (future)

**Phase 9** — after customer portal foundation.

1. Customer completes Q&A form
2. System generates Etsy search URL from answers
3. Customer finds downloadable DTF PNG on Etsy **or** submits in-house custom request
4. Optional $5–$10 design fee for in-house work (only payment workflow)
5. Staff reviews in-house requests; may produce design that enters import → AI Review → catalog pipeline

**No checkout for Print Requests. No product payment. No shipping.**

---

## 10. Security model

| Resource | Staff read | Staff write | Customer read | Customer write |
|----------|------------|-------------|---------------|----------------|
| `designs` (ready) | Yes | Yes | Yes (portal) | No |
| `designs` (non-ready) | Yes | Yes | No | No |
| `printRequests` | Yes | Yes | Own only (portal) | Own only (portal) |
| `printRequestItems` | Yes | Yes | Own request only | Own request only |
| `printRuns` | Yes | Yes | No | No |
| `printRunItems` | Yes | Yes | No | No |
| `customRequests` | Yes | Yes | Own only | Create own (portal) |
| `customers` / guests | Yes | Yes | Own profile | Limited self-edit |

**Principles:**

* Default deny for customers on staff collections.
* Firestore rules enforce `status == ready` for customer design reads.
* Production status mutations require staff roles.
* Guest customers have no Auth identity — staff mediates all actions.

---

## 11. Roadmap sequencing

| Phase | Name | Focus |
|-------|------|-------|
| **4** | Catalog Search and Organization cleanup | Simplify Design Library filters; keep search/category/tags/pagination; defer status/AI filters to AI Review page |
| **5** | AI Review and Catalog Approval | AI Review page, enrichment pipeline, approval UI, import → AI Review routing |
| **6** | Customers and Print Requests | Customer/guest model, print requests, print request items |
| **7** | Print Runs / Upcoming Shows | Print runs, print run items, show grouping |
| **8** | Customer-Facing Web Portal | Registration, catalog browse, print requests, progress tracking |
| **9** | Custom Request Q&A and Etsy Referral | Q&A form, Etsy URL, optional design fee |
| **10** | Analytics and Popularity Tracking | Counter increments, dashboards, trend views |

**Supporting work (cross-cutting):**

* Pensacola file export / gang-sheet download — attach to Phase 7 or sub-phase of Print Runs (not shipping).
* Rename legacy `showQueues` / `customerRequests` collections during Phase 6–7 implementation with migration notes.

**Phase 4A signoff:** May proceed with notes; cleanup tasks tracked in realignment review.

---

## 12. Open decisions

| ID | Topic | Options | Recommendation |
|----|-------|---------|----------------|
| OD-1 | Guest customer storage | Single `customers` collection with `isGuest` vs `guestCustomers` | Single collection with `isGuest: boolean` |
| OD-2 | Print run item vs print request item status | Single status on request item only vs dual tracking | Request item owns lifecycle; run item mirrors for batch context |
| OD-3 | `queueCount` rename | Keep vs rename to `showAddCount` | Rename during popularity phase; deprecate `queueCount` |
| OD-4 | Legacy collection migration | Big-bang rename vs parallel write | Introduce new collections in Phase 6; migrate `showQueues` in Phase 7 |
| OD-5 | Design Library default filter | Hard-filter `ready` only vs staff toggle for all statuses | Default `ready` only; archived toggle; remove operational status filter |
| OD-6 | AI Review page nav | New sidebar item vs sub-route of Imports | Dedicated **AI Review** sidebar item |
| OD-7 | Phase 4A index deploy | Deploy all indexes vs prune AI-review indexes from library | Deploy needed indexes; remove unused composites later |
| OD-8 | Custom request payment | Stripe Checkout vs manual record | Defer to Phase 9 planning; manual record acceptable for MVP |

---

## 13. Documentation updates required (this realignment)

- [x] `docs/project/ROADMAP.md` — phase renumbering and descriptions
- [x] `docs/WORKFLOWS.md` — design lifecycle, AI Review, print request, print run, custom request
- [x] `docs/architecture/DATA_MODEL.md` — new entities, popularity fields, legacy notes
- [x] `docs/architecture/ARCHITECTURE.md` — application responsibilities
- [x] `docs/project/PROJECT_BRIEF.md` — vision and non-goals
- [x] `docs/workflow/reviews/roadmap-realignment-review.md` — change summary
- [ ] `docs/project/DECISIONS.md` — ADR for business model clarification (pending signoff)

---

## 14. Approval

- Review doc: `docs/workflow/reviews/roadmap-realignment-review.md`
- Verdict: pending human review
- **No implementation** until review approved and Phase 5+ plans written per new sequence
