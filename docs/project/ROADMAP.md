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
* Exporting to gangsheet

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
Phase 8 — Fresh Prints Portal (MVP complete in dev)
Phase 9 — Custom Requests (next)
```

Phase 7 Studio MVP and Phase 8 Portal MVP are complete in the dev environment.

Current Goal:

Phase 9 Custom Requests planning, or production Portal deploy / production Google enablement.

Phase 7 Show Queue is complete for Studio MVP: foundation, staff-assisted Whatnot import,
production-file export (zip, multiply-by-qty, auto-nested gang sheet PNG) signed off 2026-07-07,
and production timer + shared calendar picker signed off 2026-07-08.

**User direction (2026-07-07):**
- **Gang Sheet Builder** (manual canvas) is a post-MVP *want*, not a Studio MVP blocker — defer until
  after Portal and other priorities.
- **Live Whatnot scheduled sync** is **not planned** for Studio (Electron is not 24/7). Revisit only if
  a future always-on hosted service (e.g. Portal/backend) needs it — not a Phase 8 default.
- **Next step:** Phase 9 Custom Requests planning, or production Portal App Hosting deploy / production Google enablement.

See `docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`,
`docs/workflow/reviews/2026-07-08-show-queue-timer-and-calendar-picker-signoff.md`, and
`docs/workflow/reviews/2026-07-08-portal-customer-show-selection-signoff.md`.

**Portal customer show-selection:** signed off 2026-07-08 — customers add requests to a show's print run via callables + shared calendar picker.

**Completed milestones (per signoffs):** Phase 1 foundation, Phase 2 design library (2A–2C), Phase 3 import pipeline (3A–3C), Phase 3D print size and catalog status separation, **Phase 4 catalog cleanup**, Phase 5 AI Review / AI enrichment baseline and AI Processing smoke checkpoint, **Phase 6 Customers And Print Requests**.

**Phase 6 source plan:** `docs/workflow/plans/2026-06-28-phase-6-print-requests-foundation-plan.md`.

**Last realignment:** 2026-07-06 — Phase 6 was closed out as complete per user confirmation. The prior Phase 6 signoffs remain the source records: `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-signoff.md`, `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`, `docs/workflow/reviews/2026-07-04-print-request-origin-tracking-signoff.md`, `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-signoff.md`, `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`, `docs/workflow/reviews/2026-07-03-print-request-query-index-hardening-signoff.md`, `docs/workflow/reviews/2026-06-29-phase-6-print-requests-catch-up-test-report.md`, and `docs/workflow/reviews/2026-06-29-customer-creation-provisioning-bug-test-report.md`.

**Symmetric apps monorepo** (`studio-apps-folder-monorepo-normalization`) — **complete** (2026-07-08 signoff). Studio lives under `apps/studio/` alongside `apps/portal`. Signoff: `docs/workflow/reviews/2026-07-08-symmetric-apps-monorepo-signoff.md`.

**Current implementation follow-up:** Phase 9 planning, production Portal deploy / production Google enablement, image load caching, or Firebase account linking — pick explicitly.

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

Every imported design lands in **AI Processing** (`/ai-review`). Successful imports auto-start AI enrichment in the background (sequential). Staff review and approve before designs appear in Design Library.

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

New imports appear in AI Processing and auto-start AI in the background. Successful output moves to Needs Review. Staff approve in the processing workspace. Approved designs appear in Design Library only. Search/filter belongs in Design Library. No automatic catalog publish without staff action.

---

# Phase 6

## Customers And Print Requests

Status:

```txt
Complete — signed off and closed out 2026-07-06
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

### Implementation/signoff progress

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

Closeout notes:

* Registered customer request testing has a corrected implementation path through owner/admin-created customer records in Users; authenticated QA passed in `docs/workflow/reviews/2026-06-29-customer-creation-provisioning-bug-test-report.md`.
* Customer records created in Phase 6 do not create Firebase Auth accounts, Portal login, or Studio access.
* Print Request query/index hardening is signed off in `docs/workflow/reviews/2026-07-03-print-request-query-index-hardening-signoff.md`.
* Print Request item sizing and username naming is signed off PASS WITH FOLLOW-UP NOTES in `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`; follow-ups TD-016, TD-017, and TD-018 are addressed and signed off by `print-request-detail-autosave-and-name-locking` in `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-signoff.md`.
* Print Request oversized selection unblock is signed off PASS WITH FOLLOW-UP NOTES in `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`; follow-ups TD-019, TD-020, and TD-021 are implemented and signed off by `print-request-item-preview-and-dpi-polish` for item thumbnail fit, item thumbnail lightbox, and accurate DPI display when requested dimensions are oversized.
* The user confirmed on 2026-07-06 that all Phase 6 work is done and should be closed out.
* The user confirmed on 2026-07-06 that the Firestore rules checkpoint has already been deployed.

**Not in scope:** Payment, checkout, shipping, order fulfillment.

---

## Exit Criteria

Staff can build and manage print requests without mutating design catalog status.

---

# Phase 7

## Show Queue (combined Whatnot show + print run)

Status:

```txt
Combined model implemented (2026-07-05) after an initial split Upcoming Shows / Print Runs model
failed manual QA on 2026-07-05. A Whatnot show is now the print run — one combined workflow.
UI/flow polish (dark-theme readability, date-grouped show picker, whole-request attach, two-step
confirm removal, default capacity setting, same-monitor external links) implemented 2026-07-05
after a second manual QA pass. A third correction (real design/quantity split allocation flow,
allocated-quantity recalculation on removal, Working/Queued/Printed request tabs, Upcoming/Past show
tabs, queued-request edit lock) implemented 2026-07-05 after a third manual QA pass. A fourth
correction (Add to Show wording only mentions "remaining" once a split is underway, tab/detail
selection sync fix, new `editing` status for de-queued requests) implemented 2026-07-05 after a fourth
manual QA pass. A fifth correction (visual thumbnail-based split picker with live totals, wider
Add to Show modal, compact list-row show options, simplified split warning copy) implemented
2026-07-05 after a fifth manual QA pass. A sixth correction (split picker totals relabeled for
clarity, design card wording clarified, quantity inputs restyled to match the app, production-status
pill confirmed independent of selection) implemented 2026-07-05 after a sixth manual QA pass. A
seventh correction (split picker quantity inputs start blank instead of pre-filled) implemented
2026-07-05 after a seventh manual QA pass. An eighth correction (staged split allocation labels show
show date and time, not time only) implemented 2026-07-05 after an eighth manual QA pass. A ninth
correction (split warning explains both the split and pick-a-different-show paths; the split decision
area is now one bordered callout with a full-width action button) implemented 2026-07-05 after a ninth
manual QA pass. A tenth correction (split picker design cards drop the ambiguous "available to place"
line) implemented 2026-07-05 after a tenth manual QA pass. An eleventh correction (`Add to Show` is
hidden, not disabled, while the selected request is queue-locked) implemented 2026-07-05 after an
eleventh manual QA pass. A twelfth correction (green/yellow/red capacity progress bars, a derived
Open/Full/Over Max status pill computed live with no migration, and whole-card full/over-capacity
visual states) implemented 2026-07-05 after a twelfth manual QA pass. A thirteenth correction (a full
show skips the split-decision/picker path entirely — only staff override can add to it) implemented
2026-07-05 after a thirteenth manual QA pass. A final polish pass (queue-state badge label renamed to
"Working," Add to Show / queue-state pill flash fixes, internal-card notes display, and show-queue
link pills with a multi-show-aware removal flow) followed. **Signed off PASS on 2026-07-05** after
full authenticated manual QA passed — see
`docs/workflow/reviews/2026-07-05-print-runs-foundation-signoff.md`. Dev Firestore rules deploy
(`firebase deploy --only firestore:rules --project fresh-prints-dev`) was later completed by the
user, per confirmation on 2026-07-06. **Production-file export signed off 2026-07-07** — per-show
zip export, multiply-by-quantity zip export, and auto-nested gang sheet PNG export are implemented in
Studio; see `docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`.
**Phase 7 Studio MVP is complete.** Live Whatnot scheduled sync is **not planned** (user 2026-07-07:
Studio is not 24/7; revisit only for a future always-on hosted service if needed). Gang Sheet Builder
manual canvas is **post-MVP backlog** (want, not need).
```

Goal:

Track each Whatnot show as its own production run: schedule (Whatnot is the source of truth, matched
by stable show ID), print capacity, and attached Print Requests, all on one record. Export to
gangsheet in a later slice.

---

## Objectives

Implemented 2026-07-05:

* Single combined `upcomingShows` collection: each Whatnot show is its own production run
* Manual add flow parses the Whatnot show ID from a pasted URL (read-only, never typed) and requires
  a scheduled date/time
* `/show-queue` list/detail UI, sorted client-side (fixes a bug where shows without a schedule never
  appeared under a Firestore `orderBy` query)
* Staff-set optional `maxTotalQuantity` capacity per show, with a danger-confirmed override
* `showAllocations` collection: snapshot-plus-reference allocation of Print Request item quantities to
  a show, supporting a request being split across multiple shows when capacity requires it
* `Add to Show` primary action on the Print Request page; secondary `+ Add Print Request` on the show
  detail page
* Print Request queue/print badges (`not_queued`/`partially_queued`/`queued`/`partially_printed`/
  `printed`) derived live from allocations — no persisted status field to keep in sync
* Production status (`pending`/`queued`/`in_progress`/`printed`/`done`/`canceled`) lives only on
  `showAllocations`, never on `designs.status`
* Separate show-level `status` (Whatnot schedule/source health) and `productionStatus` (print
  production progress) fields — sync health is never mixed with production completion

UI/flow polish, implemented 2026-07-05 after a second manual QA pass:

* `Add to Show` and `+ Add Print Request` pickers use dark-theme-readable option cards and a compact
  date-grouped (calendar-style) show selector emphasizing date/time and capacity over show title
* `+ Add Print Request` attaches an entire Print Request in one action instead of one item at a time
* Removing a Print Request from a show requires a two-step confirm, matching the existing Print
  Request item removal pattern
* A Show Queue settings cog exposes a staff-configurable default max quantity for new shows
  (`settings/showQueue`, direct client read/write), applied only at show-creation time
* Intro/"How it works" copy removed from Print Requests and Show Queue for a more compact workspace;
  `Add to Show` moved to a prominent upper action area and disabled until the request has items
* Show Detail status pills align horizontally; Request Detail uses a bottom-right `Edit` button
  instead of a chevron toggle
* External links (the Whatnot show URL) open in an in-app window positioned on the same display as
  the app, since Electron cannot control the OS default browser's window placement

Split allocation, capacity accuracy, and lifecycle polish, implemented 2026-07-05 after a third
manual QA pass:

* Real split allocation flow: staff choose exactly which designs/quantities go to the first show,
  the app computes the remainder, and staff choose another show (or repeat) until the request is
  fully allocated or they cancel; a danger override can still force the full request onto one show
* Removing a Print Request from a show deletes every allocation for that request on that show in one
  operation and recomputes the show's `allocatedQuantity` from the remaining allocations, instead of
  incrementally subtracting — this also clears an over-capacity state caused by the removed request
* Removing a request from a show, and removing individual allocations, is blocked once the show's
  `productionStatus` is `printing`, `fully_printed`, `completed`, or `archived` (admin correction
  required beyond that point)
* A Print Request transitions `draft` → `active` on its first show allocation (so queued requests
  never misleadingly show `DRAFT`), and to `completed` once every unit has been allocated and printed
* Print Requests page has `Working` / `Queued` / `Printed` tabs, derived from show allocation totals
  (no new persisted queue-status field); Show Queue page has `Upcoming` / `Past` tabs derived from
  `scheduledStartAt` vs. now (display grouping only, never changes `productionStatus`)
* A queued request's items and detail become read-only until removed from its show(s)
* Show date/time displays (cards, detail, Add to Show) never show seconds; the parsed-URL field is
  labeled `Show ID`; the Show Queue settings cog sits left of `Add Show`; `Add to Show` spans the full
  action-row width; the Add to Show summary reads "Request has N designs with a total qty of M prints"

Add to Show wording, tab/detail selection, and status polish, implemented 2026-07-05 after a fourth
manual QA pass:

* The Add to Show modal only uses "remaining"/"still need a show" wording once staff have actually
  committed at least one show leg in the current session; a request that fully fits its first selected
  show shows only the plain summary and commits via the normal footer `Add to show` button
* The Print Requests detail panel stays in sync with the active `Working`/`Queued`/`Printed` tab: a
  request that moves to a different tab (e.g. just queued) no longer keeps showing in a tab it no
  longer belongs to; switching tabs, or a request moving tabs, resolves the selection to that tab's
  first request or clears to an empty state
* New `editing` `PrintRequestStatus` value: a request that was queued and then fully removed from
  every show now displays `Editing` (not a misleading `Active`), is fully editable again, and appears
  in `Working`; re-queuing it transitions it to `active` (shown with the derived `Queued` badge), never
  back to `draft`. Queue/tab grouping is still fully derived from `showAllocations` — no new
  `printQueueStatus` field was added

Visual split picker and modal layout polish, implemented 2026-07-05 after a fifth manual QA pass:

* The split-quantity picker (opened via "Choose designs for this show") is now a dedicated
  `SplitDesignPickerModal` showing each remaining design as a card with a full, uncropped thumbnail
  (contained fit, not cropped), title, requested/remaining quantity, and a quantity input
* A live totals strip shows "Selected for this show," "Show capacity," "Remaining after this show,"
  and "Request total," updating on every keystroke; per-design quantity is clamped to that design's
  remaining amount, and exceeding the show's overall capacity shows a warning and disables confirm
* The Add to Show modal and the split picker both widen to `modal-panel-lg` (42rem, already defined
  for Design Library — no new width tier or dependency) so several show options, capacity info, and
  the split flow fit comfortably without excessive scrolling
* Show options in the date-grouped picker render as compact horizontal list rows (date/time, capacity,
  status badge) instead of tall square cards, with an obvious selected state
* The split-needed warning simplified to "Only N of M prints can be added to this show. The remainder
  will need to be added to another show. Choose the prints to be added to this show." — no longer
  repeats the override explanation already given by the override checkbox
* Canceling the visual picker never commits anything; its selections are local component state until
  staff click its confirm button, and the full-fit/multi-show split/override flows are unchanged

Split picker wording and styling polish, implemented 2026-07-05 after a sixth manual QA pass:

* Split picker totals strip relabeled and reduced to three values: "Selected for this show,"
  "Available on this show" (live: show capacity minus the current selection, not the pre-picker
  capacity), and "Remaining for another show" — "Request total" was dropped as redundant with the
  plain-language summary shown one step earlier
* Design cards no longer say "Requested 25, 25 remaining"; they show "{quantity} requested,"
  "{alreadyAssigned} already assigned" (only when non-zero), and "{remaining} available to place"
* The picker's quantity inputs reuse the app's existing `.print-requests-number-input` styling (no
  native spinner arrows, dark-theme box/border/focus state matching the Print Request item card's
  quantity stepper) instead of unstyled browser number inputs
* Confirmed (no code change needed): the `OPEN`/etc. production-status pill color comes only from
  `show.productionStatus` via `getShowProductionStatusBadgeVariant()`; over-capacity coloring is a
  separate `.is-over-capacity` modifier driven by a different, capacity-only boolean — the two were
  already architecturally independent

Split picker blank-input correction, implemented 2026-07-05 after a seventh manual QA pass:

* The split picker's `Add to this show` quantity inputs now start blank (placeholder `0`) instead of
  being pre-filled up to the show's remaining capacity, so staff choose every quantity themselves
  rather than the app appearing to have already decided the split
* Blank inputs are treated as `0` for all totals/validation and cannot create allocations; the totals
  strip and capacity/remaining figures correctly start at their true pre-selection values (`0`
  selected, full show capacity available, full unallocated request quantity remaining)
* The assign button remains disabled until at least one quantity greater than `0` is entered; all
  existing per-design and show-capacity quantity validation is unchanged

Staged allocation label correction, implemented 2026-07-05 after an eighth manual QA pass:

* Staged split allocation summaries in the Add to Show modal (e.g. "8:00 PM: 25 prints") now show the
  show's date as well as its time (e.g. "Jul 5, 2026, 8:00 PM: 25 prints"), reusing the existing
  `formatShowDateTimeLabel()` already used for Show Queue/Show Detail displays instead of the
  time-only formatter — no seconds are shown, matching the existing formatter's behavior

Split warning copy and decision-area layout polish, implemented 2026-07-05 after a ninth manual QA pass:

* The split-needed warning now explains both available paths: "Only N of M prints can be added to
  this show. You can choose which prints to add here and place the rest on another show, or select a
  different show for the full request." — staff are no longer left thinking a split is the only option
* The warning, "Choose designs for this show" button, and staff override checkbox now sit inside one
  bordered callout (matching the split picker's totals-strip card treatment) instead of three loosely
  stacked elements; the action button spans the callout's full width, and the override row gets a
  top border/padding to visually separate it from the button above

Split picker design card copy correction, implemented 2026-07-05 after a tenth manual QA pass:

* Design cards in the split picker no longer show `{remaining} available to place`, which staff
  misread as show-capacity-relative rather than request-relative; cards now show only
  `{quantity} requested` plus `{alreadyAssigned} already assigned` once a prior split leg has touched
  that item — the totals strip above the card list already covers capacity and remaining-for-another-
  show information

`Add to Show` visibility correction, implemented 2026-07-05 after an eleventh manual QA pass:

* The Print Requests page's `Add to Show` action row is now hidden entirely (not shown disabled) while
  the selected request is queue-locked (`totalAllocatedQuantity > 0`) — most visibly on the `Queued`
  tab, where every request is locked by definition and the button previously served no purpose; the
  button still reappears once a request is fully removed from its show(s) and becomes `editing`

Capacity progress and status correction, implemented 2026-07-05 after a twelfth manual QA pass:

* Show Detail's Capacity card and every Add to Show / split-picker show option card now render a
  green (under 70% used) / yellow (70–89%) / red (90%+ or over capacity) progress bar via new
  `shared/utils/showCapacityDisplay.ts`, plus clear "N of M used" / "N spots left" text replacing the
  old "N remaining of M" / "N / M left" wording
* The status pill is now derived (`getDerivedShowStatusDisplay()`): production lifecycle states
  (`PRINTING`, `FULLY PRINTED`, `COMPLETED`, `ARCHIVED`, `CANCELED`) always take priority; otherwise
  `FULL`/`OVER MAX`/`OPEN` is computed live from `allocatedQuantity` vs. `maxTotalQuantity` — a show
  is never persisted as `full`, so every existing show displays correctly after a refresh with no
  migration, backfill, or delete/re-add
* Full and over-capacity shows get a whole-card warning/danger-tinted background and border (sidebar
  show card, Show Detail capacity card, and Add to Show option card), not just a red progress bar, so
  staff don't have to read numbers carefully to notice
* No Firestore rules or index changes were needed — this is a pure UI-derived display feature

Full-show decision-path correction, implemented 2026-07-05 after a thirteenth manual QA pass:

* When the selected show has zero remaining capacity (already full or over capacity), Add to Show no
  longer shows the split warning or a "Choose designs for this show" button — there is nothing to
  split into, so offering a picker was misleading; staff now see plain copy explaining the show is
  full and that they can either select a different show or use the staff override checkbox to force
  the whole remainder onto it anyway
* A show that still has *some* room continues to use the normal split-decision path (warning + choose
  designs + override) unchanged

Final polish pass, implemented 2026-07-05, signed off with the phase:

* The queue-state badge shown as "Not queued" is renamed to "Working" to match the tab name
* Fixed the Add to Show button and the detail-panel queue-state pill both flashing/disappearing when
  switching tabs or clicking between cards, by deriving both from the already-loaded, stable
  allocation-totals map instead of a per-selection value that briefly reset on every selection change
* Allocating/removing from a show now also reloads the print request itself and the list, so the
  detail panel and sidebar badge no longer show a stale status object (e.g. `editing` instead of the
  correct `active`) after a re-add
* Internal request card subtitles on the Print Requests page show notes (or "No notes") instead of a
  redundant "Internal" word already covered by a pill
* The Queued tab's detail panel shows a compact pill per show the request is queued to (quantity, show
  date/time, external-link icon, full show name on hover), linking to that show in `/show-queue`, plus
  a two-step-confirm "Remove from show queue" action (wording adapts when the request spans multiple
  shows) that removes every allocation and returns the request to the Working tab

**Signed off PASS on 2026-07-05** — see `docs/workflow/reviews/2026-07-05-print-runs-foundation-signoff.md`.

Still planned:

* Mark items printed / done via a dedicated production UI (service method exists; UI is minimal)

**Not planned (user 2026-07-07):** Live Whatnot scheduled/hourly sync for Studio — Electron is not
always-on; staff-assisted import remains the workflow. Revisit only if a future hosted backend needs
show-list sync for Portal.

**Post-MVP backlog (not blocking Phase 8):** Gang Sheet Builder manual canvas / standalone route —
nice-to-have after Portal; auto-nested export already covers production file needs.

**Signed off 2026-07-07** — production-file export (zip + gang sheet PNG):
`docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`

---

## Deliverables

### Show Queue (implemented 2026-07-05)

* Manual create/update of local show records, matched by `source + whatnotShowId`, never by date/time
* Show metadata: title, Whatnot URL/ID, scheduled start, schedule status, sync status/error, capacity,
  allocated quantity, production status, notes
* Missing/canceled shows are marked, never auto-deleted
* Capacity tracked as `maxTotalQuantity` vs. denormalized `allocatedQuantity`, with a staff danger
  override to exceed the max
* Print Requests attach via allocation records, supporting split-across-shows when needed

Still planned:

* Mark items printed / done via a dedicated production UI (service method exists; UI is minimal)

**Post-MVP backlog:** Gang Sheet Builder manual canvas (auto-nested export covers production needs).

**Signed off 2026-07-07** — zip export, multiply-by-qty export, and auto-nested gang sheet PNG export.
See `docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`.

**Not in scope:** Shipping, packing, parcel tracking.

---

## Exit Criteria

Show preparation and production file export occur within Fresh Prints. Production status lives on
show allocations, not designs. Phase 7 Studio MVP met 2026-07-07 (foundation, assisted Whatnot import,
production-file export). **Phase 8 Portal MVP complete in dev** (2026-07-08 closeout). **Phase 9 is next.**

---

# Phase 8

## Fresh Prints Portal

Status:

```txt
Complete (MVP — dev environment)
```

Signed off: `docs/workflow/reviews/2026-07-08-phase-8-portal-closeout-signoff.md`

Production App Hosting deploy to a live customer URL is a **separate** human checkpoint — not required for Phase 8 documentation closeout.

### Phase 8 fast-follow

**Customer-Provided Request Artwork** — **complete** on `fresh-prints-dev` (2026-07-12 parent signoff). Portal customers upload transparent PNG/WebP for their one working print request; Studio Customer Uploads intake may promote to AI Review. Separate from catalog until staff action. **Not** Phase 9 Custom Request Q&A (`customRequests`). Plan: `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` (ADR-FP-073). Parent signoff: `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-parent-signoff.md`.

**Portal Persistent Current Request** — **complete** (2026-07-13 signoff). Cart-style Current Request (lazy virtual empty), header basket + Upload Designs, drawer, catalog direct-add, `/requests/artwork`, Review Request (ADR-FP-076). Signoff: `docs/workflow/reviews/2026-07-12-portal-persistent-current-request-signoff.md`.

**Catalog Donate Designs** — **complete** (2026-07-13 signoff). Portal `/donate` + Studio **Donated Designs** reuse the same upload pipeline with `purpose: catalog_donation` (ADR-FP-078). Does not attach to Current Request; listing consent required. Signoff: `docs/workflow/reviews/2026-07-13-portal-donate-designs-signoff.md`.

**Print request Working triage / clear** — **complete** (2026-07-13 signoff). Studio Working Active/Stale/Empty triage + search; Portal Clear request; empty stale archive callable (ADR-FP-079). Signoff: `docs/workflow/reviews/2026-07-13-print-request-working-triage-search-signoff.md`.

**Image quality sizing and halftone safeguards** — **complete** (2026-07-13 signoff, PASS WITH NOTES). ADR-FP-080: pixel-based sizing (`image-quality-v2`, 12″ one-pass upscale ≤6×, 10″ request default, 15″×16.5″ envelopes); human-only halftone (detector removed); extended-upscale staff visibility above 2×. Signoff: `docs/workflow/reviews/2026-07-13-image-quality-sizing-and-halftone-safeguards-signoff.md`.

**Portal Current Request empty-state + Your Stash polish** — **complete** (2026-07-13 signoff). Lazy virtual Current Request copy/CTAs; Your Stash drawer empty layout; Clear only in drawer; Close = X; catalog pixel seed fix for false attention. Signoff: `docs/workflow/reviews/2026-07-13-portal-current-request-empty-state-drawer-polish-signoff.md`.

- Sub-phases A–G + remediations r2–r7 — **complete** (owner PASS on r7)
- ADRs: FP-073 (uploads), FP-074 (library permission), FP-075 (200 DPI save floor), FP-076 (persistent Current Request), FP-078 (donate), FP-079 (working triage), FP-080 (image quality / human-only halftone)

**UX polish (cursor / categories / upload modal)** — **complete** (2026-07-13 signoff). Portal zoom-in lightbox cursor; wider category filter menus (Studio + Portal); artwork-quality modal width + 24h snooze. Signoff: `docs/workflow/reviews/2026-07-13-portal-studio-ux-polish-cursor-categories-upload-modal-signoff.md`.

**Add-to-show stay on detail + Portal polish batch** — **complete** (2026-07-13 signoff, PASS). Portal/Studio stay on request detail after queue/add; ShowPicker calendar stays mounted; Queued wait copy; optimistic first catalog add; discover `/` + library `/catalog`; sidebar edge-tab + account designs gallery. Signoff: `docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-signoff.md`.

**Studio import auto-start AI processing** — **complete** (2026-07-13 signoff, PASS). Auto advance default ON; stay on Imports; background sequential AI enqueue (no concurrent storm). Signoff: `docs/workflow/reviews/2026-07-13-studio-import-auto-start-ai-processing-signoff.md`.

**Portal Halftone filter toggle** — **complete** (2026-07-14 signoff, PASS). Standalone Halftone switch on catalog filter bar (canonical tag); Tags modal hides `halftone`; mobile tag sheet + Portal chrome polish in same PASS. Signoff: `docs/workflow/reviews/2026-07-14-portal-catalog-halftone-filter-toggle-signoff.md`.

**Portal Google auth (customers only)** — **complete** (2026-07-14 signoff, PASS). Email/password or Google on Portal; first Google login → `/complete-profile` username; Studio email-only; ADR-FP-081. Signoff: `docs/workflow/reviews/2026-07-14-portal-google-auth-customer-login-register-signoff.md`.

**Portal auth logos + condensed login/register** — **complete** (2026-07-14 signoff, PASS). Studio login toggle clearance; Portal logos; Google-first + email expand. Signoff: `docs/workflow/reviews/2026-07-14-portal-auth-logo-studio-login-overlap-signoff.md`.

**Portal auth busy overlay (login/register)** — **complete** (2026-07-14 signoff, PASS). Full-viewport signing-in / creating-account overlay while Google or email auth is busy. Signoff: `docs/workflow/reviews/2026-07-14-portal-auth-busy-overlay-signoff.md`.

**Portal catalog pagination** — **complete** (2026-07-14 signoff, PASS). Fast first page (40) + background hydrate for full search/filter; exact counts; Load more; bounded Discover home; index-build fallback. Signoff: `docs/workflow/reviews/2026-07-14-portal-catalog-pagination-signoff.md`.

**Portal design favorites** — **complete** (2026-07-14 signoff, PASS). Customer `favorites` subcollection; heart on cards/details; **My Favorites** nav + `/favorites`. Signoff: `docs/workflow/reviews/2026-07-14-portal-design-likes-favorites-signoff.md`. Amended by Most Liked / ADR-FP-083 (`favoriteCount` for ranking).

**Symmetric apps monorepo** — **complete** (2026-07-08). Already shipped; do not list as an open next task.

**Portal catalog image load caching** — **complete** (2026-07-14 signoff, PASS). Versioned download-URL cache + prune; favorites archived auto-prune banner. Signoff: `docs/workflow/reviews/2026-07-14-portal-catalog-image-load-caching-signoff.md`.

**Portal home Most Liked carousel** — **complete** (2026-07-14 signoff, PASS). Discover **Most Liked** via `favoriteCount` (Functions sync); Popular stays `requestCount`. ADR-FP-083. Signoff: `docs/workflow/reviews/2026-07-14-portal-home-most-liked-carousel-signoff.md`.

**Helper permission restrictions** — **complete** (2026-07-14 signoff, PASS). Helpers cannot Import Shows, open Dev Tools, or restore designs; keep archive + show manage. Dev Tools owner-only. ADR-FP-085. Signoff: `docs/workflow/reviews/2026-07-14-helper-permission-restrictions-signoff.md`.

**Owner Studio design asset purge** — **complete** (2026-07-14 signoff, PASS). Archive-first; owner single/bulk Delete images (keep thumbnail); purged hidden from Archived browse. ADR-FP-084. Signoff: `docs/workflow/reviews/2026-07-14-owner-studio-design-asset-purge-signoff.md`.

**Reject auto-archive + request-upload full-size cleanup** — **complete** (2026-07-14 signoff, PASS). Callables + Studio Retention maintenance UI; donation exclude purges full-size immediately. ADR-FP-086 §2–§4 (exclude path). Signoff: `docs/workflow/reviews/2026-07-14-reject-auto-archive-customer-upload-cleanup-signoff.md`.

**ADR-FP-086 promote purge + Portal account artwork** — **complete** (2026-07-14). Promote cool-off purge shipped; account UX revised: single gallery + Reusable modal tab; Favorites in Quick links; past-request Add / no longer in catalog. Signoff: `docs/workflow/reviews/2026-07-14-adr086-promote-purge-portal-account-artwork-signoff.md`. UX revision plan: `docs/workflow/plans/2026-07-14-portal-account-artwork-ux-revision-plan.md`.

**Studio/Portal perf + show-queue gates** — **complete** (2026-07-14 signoff, PASS). Promote AI returns without awaiting pipeline; Portal prefetch removed (on-demand URL memo); calendar query + session cache; coalesced inbox alert; hard block full/done/past adds; inbox Done-by + rules; Stash clears after queue-to-show. Signoff: `docs/workflow/reviews/2026-07-14-studio-portal-perf-queue-gates-signoff.md`.

**Portal halftone checkbox optimistic UI** — **complete** (2026-07-14 signoff, PASS). Instant toggle; background save. Signoff: `docs/workflow/reviews/2026-07-14-portal-halftone-checkbox-optimistic-signoff.md`.

**Suggested new tags policy settings** — **complete** (2026-07-14 signoff, PASS). Settings control `suggestedNewTagsPolicy` (Balanced default); Suggested-tag writing rename. Signoff: `docs/workflow/reviews/2026-07-14-suggested-new-tags-policy-settings-signoff.md`.

**Suggested-tag writing quality** — **complete** (2026-07-14 signoff, PASS). Author prompt v2 (richer aliases/preferredWhen); strip colliding catalog terms; AI Processing settings gear owner/admin only. Signoff: `docs/workflow/reviews/2026-07-14-suggested-tag-author-quality-signoff.md`.

**Import AI process-as-imported** — **complete** (2026-07-14 signoff, PASS). Bulk import enqueues each ready design for sequential AI while upload continues. Signoff: `docs/workflow/reviews/2026-07-14-import-ai-process-as-imported-signoff.md`.

**Next fast-follow:** Firebase account linking, Phase 9 planning, or production Portal deploy — pick explicitly. **Queued (ADR-FP-086):** optional Cloud Scheduler for retention callables.

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
* **Discover landing + Design Library** (signed off 2026-07-11) — `/catalog` curated rails; `/catalog/library` search/filter; ADR-FP-072
* Create print requests
* Track request status
* **Show selection:** signed off 2026-07-08 — `@fresh-prints/show-picker` in Portal; `listPortalAllocatableShows` + `queuePortalPrintRequestToShow` callables (see `packages/show-picker/README.md`)

**Security:** Customer accounts use Fresh Prints Portal only. They do not access Fresh Prints Studio.

---

## Exit Criteria

Customers self-serve catalog browse, print request creation, progress tracking, and adding requests to a show's print run on the web portal.

**Met in dev** (2026-07-08) — see `docs/workflow/reviews/2026-07-08-portal-customer-show-selection-signoff.md` and Phase 8 closeout signoff.

---

# Phase 9

## Custom Designs — Etsy Recommendations First (Phase 9A)

Status:

```txt
Complete on fresh-prints-dev — Open API listings + link-first (ADR-FP-087l); scrape removed (ADR-FP-087j)
```

Goal:

Clean Portal Etsy recommendations foundation from master (archived prior Phase 9 work is not the starting point). Three-card route page; only **Help Me Find a Design** works; AI and Assisted Creation are coming-soon cards.

### Phase 9A deliverables

* Custom Designs nav + route selection cards
* Short Etsy questionnaire → hybrid subject text + suggest dictionary → website search queries + Open API keywords
* **Link-first results:** Primary + Broader search link cards above Open API listing grid (ADR-FP-087l)
* Admin-managed Subject/Tone suggestion overlays (ADR-FP-087k)
* Minimal `etsyRecommendationRequests` lifecycle (submit / Done / Cancel)
* Signoff: `docs/workflow/reviews/2026-07-15-phase-9a-etsy-website-first-api-rip-signoff.md`

### Deferred to later Phase 9 slices

* Create My Design with AI
* Fresh Prints Assisted Creation
* Staff design queue / design fee / Studio inbox
* ~~In-app listing scrape from Etsy website search~~ — **removed** (ADR-FP-087j; owner rejected scrape quality)

**Not in scope:** Checkout for normal print requests; product payment; shipping; production deploy of 9A until separately authorized.

---

## Exit Criteria (Phase 9 overall — later)

Custom design help is distinct from print requests. Etsy recommendations work in Portal. Later slices add AI and Assisted Creation when explicitly started.

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
* Remote helpers can import, review, and build print plans without local production-folder access.
* Exporting to gangsheet is faster.
* AI reduces repetitive catalog enrichment.
* Customer portal (Fresh Prints Portal) separates cleanly from Fresh Prints Studio.
* The platform remains maintainable for years.

Every feature should move the project toward these goals.
