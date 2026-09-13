# Plan — Studio release pipeline typecheck stabilization

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Corrective child | `studio-release-pipeline-typecheck-stabilization` |
| Date | 2026-09-12 |
| Phase | Plan |
| Scope | Complete existing Studio release-blocking TypeScript baseline; no new product feature |
| Prior evidence | Lint corrective accepted: 49/49 tests, baseline-aware lint PASS, Windows/macOS lint PASS |
| Current blocker | Studio `npx tsc` fails with 29 diagnostics before packaging in workflow run `34738737103` |

## Goal

Resolve the complete existing Studio TypeScript baseline that prevents the repository-supported
Windows and macOS Studio `1.0.10` release workflow from reaching packaging. TypeScript remains a
real release gate. The already-accepted baseline-aware lint corrective is retained and validated
as part of the consolidated corrective.

This is one bounded release-pipeline stabilization pass. It does not reopen Portal behavior,
Functions behavior, Firestore/Storage Rules, indexes, Smart Profile work, production rollout, or
the settled maintenance sequence.

## Current evidence and inventory

The authoritative command is:

```text
npx tsc -p apps/studio/tsconfig.json --noEmit --pretty false
```

It currently reports **29 diagnostics**. The same typecheck failure occurs in both platform jobs
after baseline-aware lint passes in workflow run `34738737103`.

| # | Diagnostic location | Root error | Classification | Planned correction |
|---:|---|---|---|---|
| 1 | `apps/studio/electron/ipc/import/pngValidator.ts:289` | persisted `upscalePassCount` (`0\|1\|2`) assigned to an import result typed `0\|1` | stale compatibility/type contract | Align the import/result boundary with the actual one-pass import contract without widening unrelated IPC behavior. |
| 2 | `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts:285` | constructed `CustomerUploadIntakeRow` omits `catalogPermissionAskCount`, `catalogPermissionActivity`, and `catalogPermissionOriginalDeniedAtMs` | legitimate runtime mapping/type defect | Populate the three existing fields using the same defensive normalization used by the intake hook. |
| 3 | `apps/studio/src/renderer/src/features/print-requests/services/enhancePrintRequestArtworkService.ts:14` | unsupported `feature` property in `FirestoreTraceMetadata` | stale tracing contract | Use the supported metadata shape while preserving callable attribution. |
| 4 | `apps/studio/src/renderer/src/features/print-requests/services/setPrintRequestItemArtworkEnhanceModeService.ts:17` | unsupported `feature` property in `FirestoreTraceMetadata` | stale tracing contract | Apply the same supported metadata correction; preserve timeout and callable behavior. |
| 5 | `apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx:1323` | `string \| null` passed where preview lightbox expects `string \| undefined` | runtime component contract | Normalize the nullable source at the boundary; preserve the existing visual fallback. |
| 6 | `apps/studio/src/renderer/src/features/staff-artwork/utils/suggestDarkArtworkBackgroundFromObjectUrl.ts:23` | DOM `ImageDataArray` is not accepted by shared RGBA-stat input | legitimate runtime type boundary | Make the shared input accept the browser byte-array shape safely, or perform an equivalent typed byte conversion with no algorithm change. |
| 7 | `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx:160` | unused state-updater callback parameter `current` | trivial unused declaration | Remove the unused parameter without changing selection behavior. |
| 8 | `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxAlertDeliveryService.ts:2` | unused `deleteDoc` import | trivial unused import | Remove the import only. |
| 9 | `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSuppressionService.ts:5` | unused `setDoc` import | trivial unused import | Remove the import only. |
| 10 | `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx:19` | unused `desktopAppService` import | trivial unused import | Remove the import only. |
| 11 | `apps/studio/src/renderer/src/shared/components/Select.tsx:214` | React `KeyboardEvent<Element>` handler does not match DOM `addEventListener` overload | legitimate runtime typing defect | Use the DOM keyboard event type at the document listener boundary and retain capture/cleanup behavior. |
| 12 | `apps/studio/src/renderer/src/shared/components/Select.tsx:221` | same overload mismatch for the second keydown listener cleanup path | legitimate runtime typing defect | Correct the shared handler type once so both registrations typecheck. |
| 13 | `packages/shared/src/utils/customerUploadTransparency.test.ts:8` | unused `CUSTOMER_UPLOAD_FULL_BLEED_MAX_OPAQUE_BBOX_RATIO` import | test-only import correction | Remove the unused fixture import. |
| 14 | `packages/shared/src/utils/explicitContentAutomation.test.ts:287` | readonly `censoredTerms`/`matches` fixture not assignable to mutable result type | test-only fixture typing | Use a mutable typed fixture or remove the overly restrictive `as const`; preserve assertions. |
| 15 | `packages/shared/src/utils/explicitContentAutomation.test.ts:301` | same readonly fixture incompatibility | test-only fixture typing | Same fixture correction. |
| 16 | `packages/shared/src/utils/explicitContentAutomation.test.ts:311` | same readonly fixture incompatibility | test-only fixture typing | Same fixture correction. |
| 17 | `packages/shared/src/utils/explicitContentAutomation.test.ts:321` | same readonly fixture incompatibility | test-only fixture typing | Same fixture correction. |
| 18 | `packages/shared/src/utils/explicitContentAutomation.test.ts:331` | same readonly fixture incompatibility | test-only fixture typing | Same fixture correction. |
| 19 | `packages/shared/src/utils/manualArtworkEnhance.test.ts:10` | unused `resolveInitialPrintRequestItemSize` import | test-only import correction | Remove the unused import. |
| 20 | `packages/shared/src/utils/showProductionRecovery.test.ts:162` | `null` supplied where `ShowCapacityResult` is required | test-only fixture/API contract correction | Supply an explicit zero-capacity fixture or make the test input match the established function contract; preserve the completed-show assertion. |
| 21 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:71` | timestamp double lacks Firestore `Timestamp` members | test-only fixture typing | Replace or complete the timestamp test double. |
| 22 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:287` | same timestamp-double incompatibility | test-only fixture typing | Same fixture correction. |
| 23 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:312` | same timestamp-double incompatibility | test-only fixture typing | Same fixture correction. |
| 24 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:326` | same timestamp-double incompatibility | test-only fixture typing | Same fixture correction. |
| 25 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:330` | same timestamp-double incompatibility | test-only fixture typing | Same fixture correction. |
| 26 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:344` | same timestamp-double incompatibility | test-only fixture typing | Same fixture correction. |
| 27 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:600` | same timestamp-double incompatibility | test-only fixture typing | Same fixture correction. |
| 28 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:650` | same timestamp-double incompatibility | test-only fixture typing | Same fixture correction. |
| 29 | `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:678` | same timestamp-double incompatibility | test-only fixture typing | Same fixture correction. |

## Root-cause grouping

1. **Runtime/shared type boundaries (8 diagnostics):** import sizing metadata, customer-upload
   intake projection, callable trace metadata, Staff Artwork lightbox nullability, browser RGBA
   byte-array compatibility, and the shared Select DOM listener type.
2. **Trivial runtime hygiene (4 diagnostics):** one unused state callback parameter and three
   unused imports. These are behavior-preserving corrections.
3. **Test-only typing/import fixtures (17 diagnostics):** one unused import, five readonly
   explicit-content fixtures, one unused import, one capacity fixture, and nine timestamp doubles.

No diagnostic currently indicates a required new feature, security-boundary change, Rules/index
change, Portal/Functions behavior change, or production operation.

## Expected files

Expected implementation paths are limited to these existing Studio/shared files, plus minimal
tests adjacent to the corrected contracts:

- `apps/studio/electron/ipc/import/pngValidator.ts`
- `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts`
- `apps/studio/src/renderer/src/features/print-requests/services/enhancePrintRequestArtworkService.ts`
- `apps/studio/src/renderer/src/features/print-requests/services/setPrintRequestItemArtworkEnhanceModeService.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx`
- `apps/studio/src/renderer/src/features/staff-artwork/utils/suggestDarkArtworkBackgroundFromObjectUrl.ts`
- `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx`
- `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxAlertDeliveryService.ts`
- `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSuppressionService.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `apps/studio/src/renderer/src/shared/components/Select.tsx`
- `packages/shared/src/utils/importArtworkBackgroundDetection.ts` (only if the shared byte-array contract is the selected correction)
- `packages/shared/src/utils/customerUploadTransparency.test.ts`
- `packages/shared/src/utils/explicitContentAutomation.test.ts`
- `packages/shared/src/utils/manualArtworkEnhance.test.ts`
- `packages/shared/src/utils/showProductionRecovery.test.ts`
- `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts`

The two already-approved lint corrective files remain unchanged by this typecheck pass, except for
being included in validation: `.github/workflows/studio-release.yml` and its helper/manifest/test
paths. No Portal runtime, Functions behavior, Rules, index, package-release policy, or production
configuration file is in scope.

## Runtime versus type/test-only impact

- Runtime source corrections are contract alignment, defensive field mapping, metadata typing,
  nullable prop normalization, browser byte-array compatibility, listener typing, and unused
  declaration cleanup. They must not alter user-visible product behavior or security boundaries.
- Test/type-only corrections affect imports, fixture mutability, capacity fixture shape, and
  timestamp doubles. They must preserve the tests' existing assertions and scenarios.
- If a proposed fix changes callable payloads, Firestore data shape, artwork processing semantics,
  permissions, or user-facing behavior, isolate that item and stop for a new product/architecture
  decision rather than folding it into this corrective.

## Implementation strategy after owner authorization

1. Re-run the complete typecheck and freeze the 29-error inventory as the implementation baseline.
2. Correct all mechanically resolvable items in one reviewed pass, retaining TypeScript strictness
   and `noUnusedLocals`/`noUnusedParameters`.
3. Add only minimal contract tests where a boundary correction could regress behavior (intake
   permission fields, RGBA byte input, trace metadata, and lightbox nullability).
4. Run the complete Studio validation pipeline, not isolated one-error iterations.
5. Run the repository-supported Studio release workflow with version `1.0.10`, prerelease, and
   `internal-unsigned`; require both Windows and macOS to pass typecheck and reach packaging.

## Test strategy

- `npx tsc -p apps/studio/tsconfig.json --noEmit --pretty false` must pass.
- Re-run the accepted corrective suite (49/49 prior evidence), baseline-aware lint, and workflow
  policy tests; the lint gate remains real and fail-closed.
- Run targeted tests for each corrected shared/runtime contract and the existing Studio/shared
  focused suites.
- Run targeted lint and `git diff --check`.
- Dispatch the actual Studio release workflow against an owner-authorized immutable RC SHA.
- If packaging succeeds, record Windows installer and required macOS artifact names, SHA-256
  hashes, provenance, and version; then perform only the approved v1.0.9 → v1.0.10 Owner QA.
- Do not publish a stable tag/release, merge to development, freeze a candidate, or perform any
  production action in this corrective turn.

## Product-decision check

No product decision is currently required. All 29 diagnostics have a mechanically safe contract,
hygiene, or test-fixture path. If implementation reveals that a type correction would alter
runtime semantics, permissions, architecture, or persisted data, stop only for that isolated
decision and return to review.

## Separate Rules evidence track

The Firestore/Storage Rules snapshot remains blocked by read-only 403 service-disabled/no-quota-
project access. No IAM, API enablement, quota project, credential, or production configuration
change is authorized. The owner/admin must provide authorized read-only Rules API access or retrieve
the deployed release IDs/exports/hashes directly; this must not block Studio typecheck work.

## Production boundary

This Plan authorizes no implementation until owner acceptance, and no staging, commit, push,
deployment, publication, production reads or writes, runner invocation, DRY RUN, VERIFY,
APPLY/backfill, maintenance activation, Rules/index change, or candidate freeze.

## Next checkpoint

**`OWNER ACCEPT CONSOLIDATED STUDIO RELEASE PIPELINE CORRECTIVE + AUTHORIZE IMPLEMENT`**
