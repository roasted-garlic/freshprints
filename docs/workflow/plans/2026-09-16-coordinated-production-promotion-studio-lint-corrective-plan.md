# Plan — coordinated production promotion Studio lint corrective

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-2026-09-16` |
| Corrective | Resolve Studio release workflow lint hard stop and resume v1.0.13 publication |
| Date | 2026-09-16 |
| Phase | Implementation / Test |
| Scope | Minimal lint-safe Studio/Portal source cleanup, release-lint invocation parity, and evidence documentation |
| Production baseline | `3802ff8564efb0d24e6c783a23c4b4b65d7cef8f` |

## Goal

Resolve the six deterministic diagnostics reported by Studio release workflow
run `35138234015`, close the validation gap that allowed the canonical runner
to discover them late, and resume the already-authorized Studio `v1.0.13`
release. Preserve all signed-off behavior and avoid redeploying already-live
Rules, Functions, Portal, IAM, indexes, Storage Rules, or data surfaces.

## Evidence and classification

The canonical workflow runs
`node .github/scripts/run-studio-release-lint.mjs`, which invokes ESLint over
the whole repository and compares exact diagnostic identity to the checked-in
baseline. The prior local release preparation did not run that real comparator;
it ran changed-file lint and release-policy tests. The six findings are:

| Finding | Existed at original promoted production `840d596b`? | Classification | Disposition |
|---|---:|---|---|
| `apps/portal/features/admin-staff-artwork/components/PortalAdminStaffArtworkUploadForm.tsx:53:5` — `@next/next/no-img-element` rule definition not found | No | D — lint configuration/directive inconsistency in candidate-new Portal code | Remove the invalid directive; do not add the unavailable Next plugin or a blanket disable. |
| `apps/portal/features/admin-staff-artwork/hooks/usePortalAdminStaffArtworkUpload.ts:114:34` — `no-unsafe-finally` | No | A — real lint defect in candidate-new code | Keep the mounted guard, but branch inside `finally` instead of returning from it. |
| `apps/portal/middleware.ts:13:28` — unused `_request` | No | A — real lint defect in candidate-new code | Remove the unused request parameter and its type import; middleware behavior is unchanged. |
| `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx:669:6` — missing `intake` dependency | Yes | A — real lint defect introduced by candidate navigation code | Alias the stable `setSelectedId` callback and depend on that callback explicitly. |
| `apps/studio/src/renderer/src/features/designs/components/SmartProfileDimensionListsView.tsx:5:14` — Fast Refresh export warning | Yes | A — real component-module boundary defect; underlying warning was baseline-known but moved identity is new | Extract non-component labels/helpers into a Studio utility module. |
| `apps/studio/src/renderer/src/features/designs/components/SmartProfileDimensionListsView.tsx:22:17` — Fast Refresh export warning | Yes | A — same boundary defect as above | Extract non-component labels/helpers; do not expand the baseline. |

The first three files were absent from the original production tree and were
added by cumulative candidate work. `CustomerUploadIntakeSection` and
`SmartProfileDimensionListsView` existed before that production baseline, but
the reported code/diagnostic identity is present in the promoted candidate.
None of the six is a generated artifact, and none requires a baseline waiver.

## Approved scope

- Make only the source corrections listed above.
- Add root `lint:release` as a named alias for the canonical comparator and
  have both Studio release jobs invoke that alias, so local release preparation
  and CI use the same command/scope.
- Add focused corrective documentation and tests only where needed to prove
  the lint runner invocation and preserved Studio behavior.
- Do not change the lint baseline, lower lint strictness, add blanket disables,
  or alter product behavior.

## Runtime and deployment impact

The source delta is limited to Portal/Studio client code, root release
validation wiring, and workflow documentation. It changes no Functions,
Firestore Rules, indexes, Storage Rules, IAM, schema, secrets, or production
data requirements. After corrective verification, promote the new exact
candidate through the protected Git path and dispatch only the Studio stable
workflow from that new production SHA. Do not redeploy the already-live
backend or Portal surfaces.

## Required verification

- `npm run lint:release` passes with zero new diagnostics and no baseline edit.
- Studio typecheck and relevant focused Studio/Portal tests pass.
- Release-policy and lint-runner contract tests pass.
- Studio build/package preflight passes as applicable.
- `git diff --check` passes.
- Candidate-vs-production scope audit proves no Functions, Rules, Portal
  App Hosting, IAM, indexes, Storage Rules, or data delta requiring redeploy.
- Protected promotion succeeds; the Studio workflow passes both platform jobs,
  creates a correctly pinned eight-asset draft, and the canonical publish
  helper verifies/publishes `v1.0.13`.

## Hard stops

Stop before promotion if lint still reports a new finding, the correction
requires a product/architecture change, the runtime delta expands beyond
Studio/client/release validation/docs, a new release-policy/security failure
appears, or any accepted Rules limitation changes.
