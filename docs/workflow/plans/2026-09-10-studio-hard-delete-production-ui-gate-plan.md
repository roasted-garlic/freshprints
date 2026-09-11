# Plan: Studio hard-delete production UI gate

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Parent | `coordinated-production-promotion-release-readiness` |
| Goal | `studio-hard-delete-production-ui-gate` |
| Status | ready for Formal Review; implementation not started |
| Scope | Studio UI exposure only; DEV-only project gate |

## Goal

Prevent the coordinated production Studio candidate from exposing a misleading or usable customer
hard-delete workflow while preserving the existing DEV-only test capability and ADR-FP-151 server
backstop. This is a narrow security/release corrective required before candidate freeze.

## Evidence

Read-only inspection found:

- `UserManagementPage` passes `canHardDeleteCustomer` and `onHardDeleteCustomer` into
  `CustomerDirectoryTable`.
- `CustomerDirectoryTable` currently renders `Delete Account Permanently` for an owner and opens
  `HardDeleteCustomerConfirmDialog`.
- `customerIdentityManagementService` calls both `previewHardDeleteCustomerAccount` and
  `hardDeleteCustomerAccount`.
- `hardDeleteCustomerAccount` Apply fails closed outside `fresh-prints-dev`, but
  `previewHardDeleteCustomerAccount` has no equivalent project gate.
- The existing `isOperationalWipeUiEnabled()` helper already requires `import.meta.env.DEV` and an
  allowlisted DEV project ID for destructive test UI.

## Smallest corrective

Reuse `isOperationalWipeUiEnabled()` at the customer-directory hard-delete menu boundary. The
hard-delete menu item and callback must be available only when the helper is true; production
builds must render no hard-delete action and must not invoke the preview callable. Keep the backend
exports and dialog source intact for DEV-only use, but exclude both hard-delete exports from the
production Function allowlist. Do not alter tombstone, reversible disable/restore, merge preview,
or any server authorization.

The gate should be applied at the lowest shared UI boundary (`CustomerDirectoryTable`) so future
callers cannot accidentally expose the action. The existing `UserManagementPage` prop wiring may
remain, but the table must require the project/build gate before adding the menu item or showing the
owner menu solely for hard delete.

## Test scope

- Add/update a focused Studio contract test proving the gate is imported and is required for the
  hard-delete menu/callback.
- Run the focused users/identity contract tests and Studio typecheck/build checks appropriate to the
  change; record unrelated baseline diagnostics honestly.
- In DEV, verify the allowlisted project can still reach the existing preview/dialog path.
- In a production-mode build configuration, verify no customer-directory hard-delete menu/action is
  rendered and no preview callable is invoked.
- Re-run the parent hard-delete exclusion audit and generated Function allowlist before freeze.

## Non-goals and safety

- No production hard-delete enablement, data deletion, account merge, tombstone, or callable
  authorization change.
- No removal of the DEV-only test-data reset feature.
- No branch/worktree, deploy, publish, candidate freeze, or production mutation under this Plan.

## Exit criteria

The child is complete only when the focused Plan/Review/Implement/Test evidence proves the
production UI gate, the parent manifest excludes both hard-delete Functions, and no unrelated
runtime path changed. The parent M0/M1 preparation must then be rerun before any freeze proposal.

## Approval

Owner acceptance is required before Implement because this is a production-visible security/UI
behavior change, even though it preserves existing DEV-only behavior.
