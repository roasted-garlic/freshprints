# Signoff: Studio hard-delete production UI gate

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Parent | `coordinated-production-promotion-release-readiness` |
| Goal | `studio-hard-delete-production-ui-gate` |
| Plan | `docs/workflow/plans/2026-09-10-studio-hard-delete-production-ui-gate-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-review.md` |
| Review verdict | `approved_with_changes` — owner accepted |
| Final status | **approved_with_notes** |

## Delivered

The shared Studio `CustomerDirectoryTable` now evaluates the existing
`isOperationalWipeUiEnabled()` helper and requires it before adding the hard-delete menu item
or exposing the hard-delete callback through the row menu. The existing owner permission and
callback checks remain in place. The dialog, preview/apply service, callable authorization, DEV
test-data reset capability, tombstone path, merge preview, and reversible disable/restore paths
were not changed.

The gate is the lowest shared customer-directory menu boundary. The helper requires both
`import.meta.env.DEV` and the allowlisted DEV project, so a production-mode Studio build cannot
render `Delete Account Permanently` or reach the customer-directory hard-delete callback.

## Test evidence

- Focused users/identity contracts: **12/12 PASS** across 3 suites, including the new
  `customerDirectoryHardDeleteGate.contract.test.ts` (4/4), existing identity UX contracts
  (6/6), and permission contracts (2/2).
- Targeted ESLint for the changed table and new contract: **PASS**.
- Studio `npx vite build`: **PASS**. Only existing chunk-size and dynamic/static import warnings
  were emitted.
- Studio `npx tsc --noEmit`: **FAIL — existing unrelated baseline**. Diagnostics are in the
  Electron IPC/import, print-request services/pages, Staff Inbox, Upcoming Shows, and shared test
  fixtures; no diagnostic references the changed table or new gate contract.
- `git diff --check`: **PASS** (normal CRLF conversion warnings only).

The DEV and production behavior proof is source/build based: the allowlisted DEV gate remains in
the path, while the successful Studio production build compiles the same boundary with
`import.meta.env.DEV` false. No customer mutation, live production Studio session, publication,
deployment, or production data operation was performed.

## Hard-delete exclusion audit

The DEV source still exports `previewHardDeleteCustomerAccount` and `hardDeleteCustomerAccount`
from `functions/src/index.ts` so the existing allowlisted DEV capability remains available. The
`origin/production` Functions source baseline exports neither name, and the accepted parent Plan
explicitly excludes both names from the coordinated production Function allowlist. No backend or
authorization source changed in this child.

## Parent handoff and blockers

This child is signed off and returns control to parent M0. The parent candidate is still **not
frozen**. Remaining M0 work is to close inherited-document dispositions, reconcile every runtime
path to the accepted Strategy B scope and transitive closure, and produce a clean committed
candidate before presenting the exact M1 freeze proposal for owner approval. No freeze, commit,
push, merge, deploy, publish, maintenance activation, or production action is authorized by this
signoff.
