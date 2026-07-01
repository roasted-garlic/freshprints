# FF Phase 6 Print Requests Catch-Up And Verification Report

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| FF goal | `phase-6-print-requests-foundation` |
| FF mode | `managed-phase` |
| FF phase | `signoff` |
| Report type | Docs/state reconciliation + verification + signoff |
| Recommendation | PASS WITH NOTES |

---

## 1. Current FF State

`.cursor/workflow/state.md` reports:

* Mode: `managed-phase`
* Goal: `phase-6-print-requests-foundation — Print Requests implementation`
* Phase: `signoff`
* Status: `complete — PASS WITH NOTES`
* Phase 0 deploy gate: PASS
* Human checkpoint required: no
* Forbidden actions: Phase 7, Whatnot integration, production deploy without approval, scope expansion beyond approved Phase 6 plan

FF state is reconciled: Phase 6 Print Requests foundation is signed off as PASS WITH NOTES for the current internal/guest request foundation scope.

---

## 2. Actual App State Found In Code

Repo verification found:

* `/print-requests` route exists and is protected by `viewPrintRequests` in `src/renderer/src/routes/AppRoutes.tsx`.
* `PrintRequestsPage` exists at `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`.
* `printRequestService` exists at `src/renderer/src/features/print-requests/services/printRequestService.ts`.
* Internal, registered customer, and guest customer create modes are present in `PrintRequestsPage`.
* Request item list/edit/remove UI exists through `PrintRequestItemCard`.
* Design Library request-selection mode exists through URL mode `request-selection`.
* Selection mode supports quantity state and saving selected designs through `printRequestService.savePrintRequestDesignSelections`.
* `loadPrintableDesign` in `printRequestService` blocks non-`ready` designs from being added.
* `permissionService` includes `canViewPrintRequests`, `canManagePrintRequests`, `canManagePrintRequestItems`, and `canManageGuestCustomers`.
* `firestore.rules` includes `customers`, `printRequests`, and `printRequestItems` rules.
* `firestore.indexes.json` has no Print Request indexes.
* `shared/types/printRequest/` contains `PrintRequest`, `PrintRequestItem`, and status unions.
* `src/renderer/src/features/firebase/constants/firestoreCollections.ts` includes `customers`, `printRequests`, and `printRequestItems`.
* No Print Request code path was found writing production lifecycle statuses to `designs.status`.
* `printRequestService.addPrintRequestItem` increments `designs.requestCount` and `designs.lastRequestedAt`.

---

## 3. Drift Between Docs, Plan, And Code

Found drift:

* `docs/project/ROADMAP.md` still said Phase 5 was current and Phase 6 was planned.
* Phase 6 plan still had `Status: ready_for_review` and described the Phase 0 deploy gate as pending.
* Phase 6 plan still marked implemented paths as `[NEEDS REPO CHECK]`.
* `DATA_MODEL.md` described Print Requests and Print Request Items as planned even though code exists.
* `WORKFLOWS.md` described the Print Request workflow too generically and said `requestCount` increments were Phase 10 without resolving the current Phase 6 write.
* Firestore rules for Phase 6 are implemented, but indexes are not.

Resolved drift:

* Roadmap now reflects Phase 6 as current/in progress.
* Phase 6 plan now records implementation progress and the cleared Phase 0 gate.
* Data model labels now reflect Phase 6 in progress.
* Workflow docs now describe the implemented staff request-selection flow.
* ADR-FP-030 records the request-counter and deferred-index decisions.

---

## 4. Docs Updated

Updated:

* `docs/project/ROADMAP.md`
* `docs/workflow/plans/2026-06-28-phase-6-print-requests-foundation-plan.md`
* `docs/architecture/DATA_MODEL.md`
* `docs/WORKFLOWS.md`
* `docs/project/DECISIONS.md`
* `docs/project/TECH_DEBT.md`
* `docs/workflow/reviews/2026-06-29-phase-6-print-requests-catch-up-test-report.md`
* `project-chatgpt-handoff/CURRENT-STATE.md`
* `project-chatgpt-handoff/03-roadmap-and-phases.md`
* `project-chatgpt-handoff/04-features-inventory.md`
* `project-chatgpt-handoff/05-workflows-summary.md`
* `project-chatgpt-handoff/06-data-model-essentials.md`
* `project-chatgpt-handoff/12-decisions-and-constraints.md`
* `project-chatgpt-handoff/13-recent-completed-work.md`

No runtime code was changed in this reconciliation slice.

---

## 5. Required Repo Verification Checklist

| Check | Result |
|-------|--------|
| `/print-requests` route exists and is staff-only | PASS |
| `PrintRequestsPage` exists and is wired into routing | PASS |
| `printRequestService` exists and handles create/update behavior | PASS |
| Internal request mode exists | PASS |
| Registered customer request mode exists | PASS |
| Guest customer request mode exists | PASS |
| Request item list/edit/remove UI exists | PASS |
| Design Library request-selection mode exists | PASS |
| Only approved catalog designs can be selected for request items | PASS |
| Quantity selection exists | PASS |
| Selected designs can be saved back to a request | PASS |
| Permission service includes Print Requests capabilities | PASS |
| Firestore rules include customers, printRequests, and printRequestItems | PASS |
| `firestore.indexes.json` includes Print Request indexes | FAIL / NOT PRESENT |
| No design lifecycle status is changed to queued, printed, pending, or done | PASS by code search |
| Design analytics writes are identified and evaluated | PASS |

---

## 6. Analytics Decision

Decision: Option A, keep in Phase 6 with limits.

`printRequestService.addPrintRequestItem` updates:

* `requestCount`
* `lastRequestedAt`

These are allowed in Phase 6 as lightweight request reference metadata because:

* They do not mutate `designs.status`.
* They do not imply production, print completion, shipping, fulfillment, or payment.
* They do not implement Phase 10 analytics dashboards.
* They support the future ability to understand whether a catalog design has been requested.

Guardrail:

* Do not add `showAddCount`, `printCount`, `lastAddedToShowAt`, `lastPrintedAt`, analytics dashboards, popularity ranking, or trend views in Phase 6.

Decision recorded in `docs/project/DECISIONS.md` as ADR-FP-030.

---

## 7. Firestore Rules And Index Decision

Rules:

* `customers` rules are present.
* `printRequests` rules are present.
* `printRequestItems` rules are present.
* Rules match staff-only Studio access for Phase 6.
* Customer role does not receive Studio access to these collections.
* Request item create rules require parent request existence and `designs.status == "ready"`.
* No broad `allow read, write: if true` rule was introduced.
* Default-deny remains in place.

Indexes:

* Print Request indexes are missing from `firestore.indexes.json`.
* Current Print Request service code uses broad `getDocs` reads and client-side filtering/sorting, so composite Print Request indexes are not required by current queries.
* Broad reads are acceptable only for the Phase 6 foundation and should be hardened before large request volume.

Follow-up recommended:

* Add server-side query patterns and indexes for:
  * `printRequests.status + updatedAt`
  * `printRequests.customerId + updatedAt`
  * `printRequests.guestCustomerId + updatedAt`
  * `printRequests.isInternal + updatedAt`
  * `printRequestItems.printRequestId + updatedAt`
  * `printRequestItems.printRequestId + status + updatedAt`
  * `customers.isGuest + displayName`

No indexes were added in this slice because current functionality does not require them.

---

## 8. Test Commands Run

| Command | Exit code | Notes |
|---------|-----------|-------|
| `npm run lint` | 0 | Passed |
| `npx tsc --noEmit` | 0 | Passed |
| `npm run build` | 0 | Passed; existing missing icon fallback messages and circular chunk warning remain |

Targeted print request tests:

* No print-request-specific test files were found with the current repo naming patterns.
* Follow-up: add targeted tests for `printRequestService` mapping/validation, design eligibility, item merge behavior, permission gates, and item status updates.

---

## 9. Manual QA Results

Authenticated Fresh Prints Studio manual QA was completed by the human tester.

Manual QA checklist status:

| Manual QA item | Result |
|----------------|--------|
| Start the app | PASS |
| Confirm `/designs` still shows approved catalog designs only | PASS |
| Confirm Design Library search works | PASS |
| Confirm Design Library filters work | PASS |
| Confirm Design Library filters/search remain accessible after scrolling | PASS |
| Navigate to `/print-requests` | PASS |
| Create an internal print request | PASS |
| Create a guest customer print request | PASS |
| Create or select a registered customer print request | BLOCKED |
| Add an approved catalog design from Design Library selection mode | PASS |
| Set quantity | PASS |
| Save selected designs back to the request | PASS |
| Revisit request and confirm items persist | PASS |
| Edit a request item | PASS |
| Remove a request item | PASS |
| Confirm source design remains `status: ready` | PASS |
| Confirm no design receives production lifecycle status | PASS |
| Confirm no major workflow breakage | PASS |
| Confirm owner/admin/helper access behavior | PASS by code/rules review; no human QA issue reported |
| Confirm unauthorized/customer Studio access is blocked | PASS by route/rules review; no human QA issue reported |

Registered customer request testing is BLOCKED because customer creation/provisioning from User Management is not currently working, even for owner. This is a follow-up bug or scope clarification, not a failure of the working Phase 6 internal/guest request foundation.

Phase 6 scope remains intact:

* Print Requests foundation
* Internal requests
* Guest requests
* Request items referencing approved catalog designs
* No Phase 7 Print Runs
* No Portal implementation
* No checkout, shipping, Whatnot, or ecommerce

Design lifecycle status remains clean:

* Source designs remain catalog records.
* Source designs remain `status: ready`.
* Print Requests do not write `queued`, `printed`, `pending`, `done`, or other production/request lifecycle statuses to `designs.status`.

---

## 10. Remaining Blockers Or Risks

* No targeted automated tests exist for Print Requests.
* Registered customer request testing is blocked until customer creation/provisioning is fixed or clarified.
* Print Request service currently uses broad reads; this is acceptable for foundation but not scalable.
* `canManageGuestCustomers` is owner/admin in `permissionService`, but Firestore rules allow active staff to create/update customers. The service currently calls `canManageGuestCustomers` for guest customer creation, so UI/service behavior is stricter than rules. This does not weaken security, but rules and service semantics should be aligned in a future security hardening pass.
* `printRequestService` combines request, item, and customer logic in one large service file. This is acceptable for foundation but should be split if Phase 6 grows.

Follow-up bug:

Title: Customer creation/provisioning unavailable from User Management

Summary: Owner cannot create a customer from User Management, which blocks testing registered customer print requests.

Scope:

* Verify whether User Management is intended to create customer records/users in Phase 6.
* If yes, fix owner/admin customer creation.
* If no, document the intended way to create/select registered customers for print requests.
* Do not implement Portal.
* Do not give customers Studio access.
* Do not weaken auth, roles, or Firestore rules.

---

## 11. Recommended FF Status

Final recommendation: PASS WITH NOTES.

Reason:

* FF docs are now caught up to the actual Phase 6 implementation state.
* Code verification confirms the Phase 6 foundation exists and does not mutate design lifecycle status.
* Automated checks passed.
* Authenticated manual QA passed for Design Library, internal requests, guest requests, request item edit/remove, and request-selection mode.
* Firestore rules are present and default-deny remains intact.
* Registered customer testing is blocked by customer creation/provisioning and targeted automated tests remain incomplete, so Phase 6 should not be marked full PASS.

Signoff language:

Phase 6 Print Requests foundation is PASS WITH NOTES.

Notes:

* Internal and guest request workflows pass authenticated Studio QA.
* Request item selection from approved catalog designs works.
* Request item persistence works.
* Design lifecycle status remains clean.
* Registered customer request testing is blocked because customer creation/provisioning from User Management is unavailable, even for owner.
* Customer creation/provisioning should be handled as the next managed bug or scope clarification.
* Print Request indexes and dedicated unit tests remain follow-up hardening items.

Next FF step:

* Start the managed bug for customer creation/provisioning unavailable from User Management.
