# Plan: Donated Designs overflow menu no-op

Date: 2026-08-01
Goal: `production-release` Goal #13
Slice: `donated-designs-overflow-menu-no-op`
Starting commit: `ca315f2391b4961dc97ddbe87bf351c335405c6a`

## Repository evidence and root cause

- Route: `/donated-designs` in `AppRoutes.tsx` renders `DonatedDesignsPage`.
- Page: `DonatedDesignsPage` supplies `purposeScope="catalog_donation"` to the shared `CustomerUploadIntakeSection`.
- Selected-design detail and trigger: `CustomerUploadIntakeSection.tsx` renders `IntakeDetail`, whose action row renders `DangerOverflowMenu` for owner-authorized, unpromoted uploads.
- The approved existing overflow action is **Delete unused upload…**. It calls the existing `deleteEligible` hook/service path, which previews and confirms the owner-only server deletion. No other overflow action is established by source or the contextual-safe-deletion Plan.
- The trigger is a real button and already owns open state, click toggling, outside-click/Escape handling, menu semantics, and the existing handler. The panel is mounted when open.
- Root cause: `.customer-upload-intake-panel` clips descendants with `overflow: hidden`, while `.danger-overflow-menu-panel` always opens below the bottom action-row trigger. The menu exists but is clipped outside the panel. This affects both intake routes when the trigger is near the panel bottom; it is not a missing provider, handler, or permission path.
- A selected-row change can reuse `IntakeDetail` and retain the menu's local open state. That creates stale open context even though the item closure rerenders. The detail instance must reset by filter and selected upload identity.
- Pending and Excluded rows use the same detail branch. The trigger is shown only when the existing delete-eligibility permission and `!promotedDesignId` guard permit the approved action. Otherwise it is absent; no empty menu is rendered.

## Approved implementation

1. Extend the existing shared destructive menu with an explicit `placement` option and use an upward placement for intake action rows, keeping the panel inside the clipping container.
2. Improve the shared primitive's focus behavior: focus the first enabled menu item on open; restore focus to the trigger on Escape; retain button/menu semantics and native Enter/Space behavior.
3. Give the intake detail a key containing the active filter and selected row ID so selection/tab changes unmount stale menu state.
4. Use a design-specific accessible trigger label while exposing no private customer identifier.
5. Preserve the existing single action, permission checks, preview/confirmation/deletion service, primary actions, halftone toggle, and all data boundaries. Opening/closing performs no mutation.

## Tests

- Add a pure menu-state/placement helper test for toggle, outside click, Escape/focus restoration, selection close, disabled behavior, and upward placement.
- Add a source-contract test proving the donated-design route, exact approved action and row ID handler, no mutation on trigger open, detail reset key, accessible label, primary actions, halftone path, pending/excluded shared branch, and unchanged Customer Uploads reuse.
- Run focused tests, Studio TypeScript, Studio production build/package, repo lint, and `git diff --check`.

## Non-goals and gates

- No new action, mutation, callable, role, permission, Firestore/Storage rule, or backend change.
- No production promotion, installer release, deployment, production QA, Stage 2 resume, settings/data/capacity, domain, DNS, analytics, or tag action.
- Manual authenticated development QA remains a later owner checkpoint after this development commit.
