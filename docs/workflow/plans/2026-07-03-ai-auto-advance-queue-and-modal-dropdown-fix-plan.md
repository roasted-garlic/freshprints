# Plan - AI Auto-Advance Queue And Modal Dropdown Fix

- **Date:** 2026-07-03
- **Mode:** Managed Phase
- **Goal slug:** `ai-auto-advance-queue-and-modal-dropdown-fix`
- **Roadmap phase:** Phase 5 AI Processing maintenance
- **Gate:** Retrospective reconciliation for already-committed work
- **Commit reconciled:** `794067a` (`Fix AI auto-advance queue hang and dropdown clipping in modals`)

## 1. Goal

Reconcile an already-committed AI Processing maintenance change that fixed auto-advance queue hangs,
made reranker/vision requests less likely to consume the callable timeout budget, and fixed select/tag
dropdown clipping inside scrollable modals.

## 2. Scope

### In scope

- AI Processing queue state cleanup in `useAiProcessingQueue`.
- AI Processing copy cleanup from "Re-run AI" to "Reprocess".
- Removal of redundant queueing copy where the stepper already communicates progress.
- Tag reranker retry-budget tightening.
- Vision request per-request timeout handling.
- Shared dropdown positioning fix for scrollable modal bodies via nearest-scrollable-ancestor measurement.
- Focused tests and build verification against the current tree.

### Out of scope

- No Firebase deploy.
- No Firestore writes, migrations, seed writes, or backfills.
- No Firestore rules, Storage rules, secrets, dependencies, or external service setup.
- No change to design lifecycle statuses.
- No Print Request, Print Run, Design Library, Imports, or Portal behavior.

## 3. Architecture Impact

- Renderer queue behavior remains owned by the AI Review hook and components.
- Shared dropdown behavior remains inside shared UI components/utilities, not feature-specific modal code.
- AI request retry/timeout behavior remains server-side in Functions AI provider utilities.

## 4. Data Model Impact

None.

## 5. Firebase Impact

Functions code changed, but no deploy is part of this reconciliation. Production deploy remains a
separate human checkpoint.

## 6. Security Considerations

No permission, role, rules, secret, or customer-data behavior changed.

## 7. UI Considerations

- Dropdowns should flip based on available space inside scrollable modal bodies rather than the full
  browser window.
- AI Processing user-facing labels should use "Reprocess" for a full AI rerun to avoid confusion with
  reopening existing suggestions.

## 8. Verification

- Focused AI Review utility tests.
- Root TypeScript check.
- Root lint.
- Renderer/Electron Vite build.
- Functions build.
- `git diff --check`.

## 9. Reconciliation Note

This plan was created after implementation had already landed in commit `794067a`. It exists to
restore the workflow trail before opening the next Phase 6 hardening phase, not to claim the normal
Plan -> Review -> Implement order happened.

