# WS1 Owner QA Corrective Plan

| Field | Value |
|---|---|
| Goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Workstream | WS1 — Customer remove queued request from show to edit |
| Trigger | Owner DEV QA FAIL on 2026-08-31 |

## Goal

Make Portal unqueue behavior reliable and make the restored request state explicit: the request remains grouped under the **Working** tab, while its card and detail status display **Editing** after removal from a show.

## Approved corrective scope

1. Review and complete the existing uncommitted Portal/callable recovery changes without overwriting unrelated work.
2. Keep the Portal and deployed callable request contract aligned for any no-allocation recovery path.
3. Reconcile successful unqueue state immediately so the request leaves Queued without requiring refresh.
4. On the requests list, prefer the persisted `editing` lifecycle label over the allocation-derived `Working` label. `Working` remains the tab name.
5. Add focused tests for contract validation, immediate reconciliation, CTA behavior, and the Editing card-label precedence.

## Architecture, data, Firebase, and security

- Portal component/hook/service and existing WS1 callable only.
- No data-model migration.
- No Firestore or Storage Rules change.
- Existing callable authentication, ownership, origin, production-state, and ADR-FP-071 conflict checks remain mandatory.

## UI

- Minor copy/state correction only: a restored editable request displays **Editing** in its status chip.
- No layout or navigation changes.

## Tests

- Focused Portal unit/contract tests.
- Functions build and focused callable/core tests when the backend recovery edits are included.
- Portal typecheck/build proportional to the final change set.

## Deployment

- No deployment without a separate owner DEV-deploy checkpoint.
- Production remains unauthorized.

