# Plan: Phase 6 Design Library Request Selection Mode

| Field | Value |
|-------|-------|
| Date | 2026-06-28 |
| Author | Managing Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `.cursor/workflow/state.md`, `docs/workflow/plans/2026-06-28-phase-6-print-requests-foundation-plan.md` |

---

## 1. Goal

Add a route-driven Design Library selection mode so staff can visually choose approved catalog designs for a specific Print Request, with quantities and a save action that writes request items.

---

## 2. Scope

In scope:

* Add an `Add designs from Library` entry point from Print Request detail.
* Open `/designs` in request-selection mode using query params.
* Highlight selected catalog cards and show quantity badges.
* Allow quantity adjustment while selection mode is active.
* Show a sticky request summary tray with save/cancel actions.
* Save selected designs as `printRequestItems`.
* Update existing request items instead of duplicating them where practical.
* Keep normal Design Library behavior unchanged when no request context is active.

Out of scope:

* Phase 7 print runs or show grouping.
* Checkout, shipping, payment, or customer portal work.
* Firestore rules or indexes changes.
* Design lifecycle changes or AI Review changes.

---

## 3. Architecture impact

This slice keeps the existing layer boundaries:

* Components remain UI-only.
* Hooks own route state and selection state.
* Services own Firestore reads/writes.
* Permission checks stay centralized in `permissionService.ts`.

The selector should use the existing Design Library page rather than introducing a duplicate browse surface.

---

## 4. Data model impact

The save action writes `printRequestItems` only.

Expected behavior:

* Existing items remain request items.
* Selected designs map to request items by `designId`.
* Quantity updates should adjust existing request items instead of creating duplicates when the design is already on the request.
* Design documents must not receive production-status writes.

---

## 5. Firebase impact

No new collections are introduced.

No Firestore rules or indexes are changed in this slice.

The selector relies on the already-approved Phase 6 Print Request Firestore access.

---

## 6. Security considerations

Selection mode remains staff-only through the existing Print Requests permission surface.

The route should fail safely if the active request cannot be loaded.

Firestore remains the authorization boundary.

---

## 7. UI considerations

The selector should feel cart-like without becoming ecommerce:

* Visible active request summary
* Selected card highlight
* Quantity badge or bubble
* Quantity stepper or quick control
* Save and cancel actions in a sticky tray

Normal Design Library mode should remain unchanged when the selector is inactive.

---

## 8. Risks

* Route/query-param state can drift if request ID sync is incomplete.
* Existing request items may need careful merge behavior to avoid duplicate writes.
* Sticky tray styling can interfere with the existing catalog grid if overflow rules are too broad.

---

## 9. Future expansion considerations

This selector can later support richer request-item editing, but Phase 7 and portal work must stay separate.

Keep the route and data flow flexible enough to support print-run workflows later without changing the design catalog again.
