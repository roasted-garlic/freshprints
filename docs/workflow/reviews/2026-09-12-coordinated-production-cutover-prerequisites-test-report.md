# Test Report — Coordinated production cutover prerequisites

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `coordinated-production-cutover-prerequisites` |
| Plan | `docs/workflow/plans/2026-09-12-coordinated-production-cutover-prerequisites-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-12-coordinated-production-cutover-prerequisites-implementation-review.md` |
| Status | **Automated checks complete; Owner DEV QA PASS** |
| Production | untouched; no production reads, runner invocation, data mutation, or deployment |
| Git promotion | no staging, commit, push, freeze, tag, or publish |

## Automated checks

| Check | Result | Notes |
|---|---|---|
| Focused cutover, projection, Rules-contract, Staff Artwork, and release-policy suites | **PASS — 87/87** | `npx --no-install tsx --test functions/scripts/backfill-portal-print-request-items-dev.test.ts functions/scripts/reconcile-portal-print-request-items-prod.test.ts scripts/generate-commit-byte-manifest.test.ts scripts/generate-firestore-transition-rules.test.ts functions/src/onPrintRequestItemPortalProjectionWritten.contract.test.ts functions/src/onStaffArtworkPortalProjectionRefreshWritten.contract.test.ts tests/firebase/staffArtwork.rules.contract.test.ts packages/shared/src/utils/portalPrintRequestItemProjection.test.ts packages/shared/src/utils/staffArtworkSource.test.ts apps/portal/features/print-requests/utils/mergeProjectionPreferredPrintRequestItems.test.ts apps/portal/features/print-requests/services/portalPrintRequestService.staffArtworkProjection.test.ts .github/workflows/studio-release-signing-policy.test.ts .github/scripts/publish-studio-stable-github-release.test.ts` |
| Functions build | **PASS** | `npm --prefix functions run build` |
| Portal typecheck | **PASS** | `npm run typecheck --workspace @fresh-prints/portal` |
| Targeted lint | **PASS** | ESLint over the new/modified cutover, Portal, runner, manifest, and generator files |
| Diff whitespace check | **PASS** | `git diff --check`; only line-ending warnings were reported |
| Portal production build | **FAILED — documented environment baseline** | `EPERM` opening `apps/portal/.next/trace`; same environment limitation observed in the M0 evidence |
| Firestore Rules emulator suite | **FAILED — documented baseline** | `npm run test:rules` reaches the emulator but exceeds the existing expression budget at `firestore.rules` line 303 (`isOptionalMap`) |
| Studio typecheck | **FAILED — documented baseline** | Existing errors include `pngValidator`, customer-upload intake fields, enhance-mode typing, Staff Artwork nullability, image data, unused imports, and Select keyboard overloads |
| Whole-repository lint | **FAILED — documented baseline** | `npm run lint` reports 20 errors / 5 warnings in unrelated pre-existing Studio/shared files |

The Studio build was not run because the package build invokes packaging/artifact-producing tooling;
the existing typecheck and whole-repository lint failures are recorded above and no release workflow
was invoked.

## Manual Owner DEV QA

**Result: PASS.** The owner explicitly reported:

> `OWNER DEV QA: coordinated-production-cutover-prerequisites - PASS`

The owner validated the required DEV/local cutover behavior and authorized the child Signoff.

The validation was limited to the DEV/local environment. Use `firebase.transition.json` (not production) when
checking canonical fallback, and the default final `firestore.rules` when checking the converged
projection-only behavior. Confirm the Portal print-request list, current-request drawer, request
detail, queue, and Staff Artwork paths for all of the following:

1. A populated `portalPrintRequestItems` row is preferred and renders once with stable ordering.
2. A missing projection falls back to the canonical `printRequestItems` row while the transition is
   in progress.
3. Delayed/stale projections reconcile without duplicate IDs or order churn.
4. A projection read error does not erase usable canonical fallback data.
5. Portal code does not directly read `staffArtworks`; preview/thumbnail behavior remains the
   authenticated known-ID Storage-only path documented in `SECURITY.md` and `FIREBASE.md`.

This report is not itself a Signoff; the final Signoff is recorded separately. No production or
release action is permitted by the Owner DEV QA PASS.
