# Plan: Phase 6 Print Requests Foundation

| Field | Value |
|-------|-------|
| Date | 2026-06-28 |
| Author | Managing Agent |
| Status | signed_off_pass_with_notes |
| Workflow | managed-phase |
| Related | `.cursor/workflow/state.md`, `docs/project/ROADMAP.md`, `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md` |

---

## 1. Current blocker check

Phase 5 was previously blocked on Phase 0 deploy verification for AI catalog enrichment.

The Phase 0 gate has now cleared on `fresh-prints-dev`:

* Firebase Functions deployed.
* One design was re-run through AI Review.
* Studio showed `catalog-enrich-openai-v15`.
* Studio showed `provider: openai`, not `development`.

Phase 6 foundation has been signed off PASS WITH NOTES. See `docs/workflow/reviews/2026-06-29-phase-6-print-requests-catch-up-test-report.md`.

---

## 2. Product goal

Build the staff foundation for **Print Requests** in Fresh Prints Studio.

The goal is to let staff create named print request lists from approved catalog designs without changing design lifecycle status.

Phase 6 must support:

* Registered customer requests
* Guest customer requests
* Internal staff request lists
* Request item snapshots and item-level production progress

It must not introduce checkout, shipping, or order fulfillment.

---

## 3. Phase alignment

This is the next roadmap-safe build target after the Phase 5 blocker clears.

Phase 6 is the correct place for:

* `printRequests`
* `printRequestItems`
* Staff-only Studio UI for request creation and editing
* Request item production tracking

Phase 7 remains future work only:

* Upcoming shows / print runs
* Show grouping
* Production export
* Any Whatnot import discovery

---

## 4. Data model proposal

Use the documented Phase 6 entities already captured in `docs/architecture/DATA_MODEL.md`.

### Core entities

* `customers/{customerId}`
* `printRequests/{printRequestId}`
* `printRequestItems/{printRequestItemId}`

### Customer strategy

Use the existing `customers` collection for both registered and guest customers.

* Registered customer: `isGuest: false`, optional `userId`
* Guest customer: `isGuest: true`, no Auth identity

### Print Request fields

* `id`
* `name`
* `customerId`
* `guestCustomerId`
* `isInternal`
* `status`
* `itemCount`
* `notes`
* `createdBy`
* `updatedBy`
* `createdAt`
* `updatedAt`

### Print Request Item fields

* `id`
* `printRequestId`
* `designId`
* `quantity`
* `printWidthInches`
* `printHeightInches`
* `sizeLabel`
* `notes`
* `status`
* `addedBy`
* `printedAt`
* `printedBy`
* `completedAt`
* `createdAt`
* `updatedAt`

### Status rules

* Print Request status: `draft`, `active`, `completed`, `archived`
* Print Request Item status: `pending`, `queued`, `in_progress`, `printed`, `done`, `canceled`

### Data rules

* Only `designs.status === "ready"` may be added.
* Item snapshots should capture production-relevant design data at add time.
* Production progress belongs on items, not on `designs`.

---

## 5. Route and workspace proposal

Primary Studio route:

* `/print-requests`

Implemented workspace structure:

* `src/renderer/src/features/print-requests/`

UI shape:

* Print Requests list page
* Print Request detail view
* Add design modal / drawer from approved catalog
* Item edit controls for quantity, size snapshot, and notes
* Item status controls for production tracking

This phase should stay Studio-only.

---

## 6. Permission model proposal

Print Requests are staff-managed in Phase 6.

Suggested permission coverage:

* Owner, admin, helper can view and manage print requests
* Owner and admin can create or edit guest customer records
* Customer role remains Portal-only and cannot access Studio routes

Likely permission-service additions:

* `canViewPrintRequests`
* `canManagePrintRequests`
* `canManagePrintRequestItems`
* `canManageGuestCustomers`

Security should remain default-deny for anything not explicitly allowed.

---

## 7. Service and hook architecture

Keep Firebase access in services and UI state in hooks.

Suggested service split:

* `printRequestService`
* `printRequestItemService`
* `customerService` extensions for guest and registered lookup
* `designService` reads for approved catalog selection

Suggested hooks:

* `usePrintRequests`
* `usePrintRequest`
* `usePrintRequestItems`
* `useCustomers`
* `useReadyDesignsForSelection`

Implemented shared types:

* `shared/types/printRequest/printRequest.types.ts`
* `shared/types/customer/customer.types.ts`

The implementation should reuse existing shared conventions rather than inventing new model shapes in the renderer.

---

## 8. Firestore rules and index considerations

Firestore rules have been implemented for the Phase 6 collections after plan approval. Indexes have not been added because the current implementation uses broad collection reads plus client-side filtering/sorting for the foundation slice.

### Collections to protect

* `printRequests`
* `printRequestItems`
* `customers`

### Rule direction

* Staff can read/write request collections
* Customers can only access their own portal-facing records later in Phase 8
* Guest customers have no Auth identity, so staff mediation is required

### Index direction

Expected future indexes when query patterns move server-side:

* `printRequests` by `status`, `updatedAt`
* `printRequests` by customer / guest / internal filter
* `printRequestItems` by `printRequestId`, `status`, `createdAt`
* `customers` by `isGuest`, `displayName`

Exact index shape should be verified against the implemented query pattern before deployment. Current broad reads are acceptable only for the Phase 6 foundation and should be treated as a scalability follow-up before large request volume.

---

## 9. Migration or legacy scaffold considerations

There are existing legacy routes and scaffolds for:

* `/show-queue`
* `/customer-requests`

The Phase 6 plan should not silently repurpose those surfaces.

Recommended approach:

* Keep the legacy scaffolds intact until the new Print Requests UI is ready
* Add the Phase 6 surface explicitly
* Decide later whether legacy routes become redirects, hidden admin utilities, or migration shells

This avoids confusing Phase 6 work with the future Phase 7 print run migration.

---

## 10. Phase 7 readiness notes

Phase 6 should prepare, but not implement, the next stage.

Phase 7 readiness means:

* Print Requests can later be grouped into shows or runs
* Item snapshots already carry the data needed for production grouping
* Request items can later be attached to run items without changing design documents
* Route and service naming should leave room for `printRuns` and `printRunItems`

Do not build `printRuns` yet.

---

## 11. Future Phase 7: Whatnot Show-Date Import Discovery

The user wants to reduce manual entry by pulling only upcoming show dates from their own Whatnot show URL.

Discovery order:

1. Official Whatnot API or approved partner access
2. User-exported data or Whatnot-provided seller tools
3. Public page metadata, only if allowed and stable
4. User-pasted show URL plus manual confirmation
5. Manual show creation only

Rules for the discovery track:

* Manual show creation must remain the fallback.
* The first production-safe Phase 7 version should support manual Upcoming Shows CRUD.
* Any automated Whatnot import must be explicitly reviewed before implementation.
* Do not implement scraping, browser automation, headless login, private GraphQL calls, or unofficial API access in Phase 6.
* Do not store Whatnot credentials.
* If no compliant source is available, keep show creation manual.

---

## 12. Out-of-scope list

Do not build the following in this phase:

* Phase 7 print runs
* Whatnot scraping or automation
* Customer Portal
* Ecommerce checkout
* Shipping or fulfillment
* Payment processing for normal print requests
* Native mobile app work
* Design lifecycle changes
* Production status on design documents

---

## 13. Implementation steps

Implementation status:

1. Confirm the Phase 5 deploy gate is cleared — complete.
2. Add shared types for print requests and print request items — complete.
3. Add print request services and hooks — complete.
4. Add Staff-only Studio routes and pages — complete.
5. Add Firestore rules — complete.
6. Add Firestore indexes — deferred until server-side query patterns require them.
7. Wire request item add/edit/remove flows — complete.
8. Add production item status controls — complete on request items only.
9. Update docs and tests — PASS WITH NOTES; targeted Print Request tests remain a hardening follow-up.

Signoff notes:

* Internal and guest request workflows pass authenticated Studio QA.
* Design Library request-selection mode works.
* Request item persistence works.
* Design lifecycle status remains clean.
* Registered customer request testing is blocked by customer creation/provisioning from User Management.
* Print Request indexes and dedicated unit tests remain follow-up hardening items.

---

## 14. Testing plan

Required checks once implementation is approved:

* `npm run lint`
* `npx tsc --noEmit`
* `npm run build` if routes, shared types, Firebase config, or build-affecting files change

Targeted tests should cover:

* Request creation
* Request item add/edit/remove
* Item status transitions
* Permission gates
* Design eligibility filtering

---

## 15. Manual QA checklist

* Staff can create a print request.
* Staff can add an approved catalog design to a print request.
* Staff can edit item quantity.
* Staff can edit item notes.
* Staff can remove an item from a print request.
* Staff can update request-item production status without changing the design status.
* Design Library still shows approved catalog designs only.
* AI Review still behaves the same.
* Imports still behave the same.
* Unauthorized users cannot access the new Print Requests area.

---

## 16. Human checkpoints

Stop for human review before:

* Implementing this plan
* Creating or changing Firestore rules
* Adding or changing Firestore indexes
* Migrating legacy `showQueues`, `showQueueItems`, or `customerRequests`
* Adding any external Whatnot integration
* Adding scraping, browser automation, or a third-party scraping service
* Deploying to production

---

## 17. Open questions

* Should guest customers stay in `customers` with `isGuest: true`, or do we want a separate guest collection later?
* Should print request item production status be limited to `pending` / `printed` / `done`, or keep the richer Phase 6 status set from the data model?
* Should Phase 6 reuse any of the legacy `customer-requests` or `show-queue` scaffolding, or should it be a clean new surface?
* Do we want customer-facing portal reads to be planned now, or deferred entirely until Phase 8?
* Which exact print-request summary queries should drive the first Firestore indexes?
