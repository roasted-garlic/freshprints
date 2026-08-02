# Formal Review: Donated Designs overflow menu no-op

Date: 2026-08-01  
Plan: `docs/workflow/plans/2026-08-01-donated-designs-overflow-menu-no-op-plan.md`  
Verdict: **approved_with_changes**

## Independent findings

- Source establishes exactly one overflow action: **Delete unused upload…**. The action was introduced by the reviewed contextual-safe-deletion work and is owner-gated through `canDeleteEligibleCustomerUpload`; inventing more items would violate scope.
- The trigger is not a no-handler placeholder. `DangerOverflowMenu` toggles local state and mounts an absolute panel below itself.
- The intake panel's `overflow: hidden` is an actual clipping ancestor. Because the action row is the last detail content and the menu opens down, z-index cannot escape that clip. An upward placement is the narrowest correction and avoids weakening the panel's border-radius containment globally.
- The shared component is used on both Customer Uploads and Donated Designs through the same intake component. The fix therefore must preserve both and must not add donation-specific mutation logic.
- Current menu semantics are mostly sound, but focus does not enter the menu and Escape does not return focus. The requested accessibility acceptance requires addressing those gaps.
- `IntakeDetail` currently has no key at its selected rendering site, so React may preserve local menu state across row/tab changes. Keying by filter plus row identity is required.

## Required changes incorporated into approval

1. Keep `placement` explicit at the intake call site rather than changing every shared-menu consumer.
2. Do not remove `overflow: hidden` from the intake panel.
3. Do not add a second action or bypass the existing preview/confirmation/server guard.
4. Ensure disabled triggers cannot open and empty item lists render no trigger.
5. Add deterministic coverage for data-safety and stale-context wiring in addition to presentation.

## Verdict rationale

The intended action and root cause are established directly by source and history. With the five constraints above, the change is narrow, reversible, preserves feature/service boundaries, and is approved for implementation on `development` only.

