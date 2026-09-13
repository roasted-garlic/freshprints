# Plan — Studio release workflow baseline-aware lint gate

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Corrective child | `studio-release-workflow-baseline-aware-lint-gate` |
| Date | 2026-09-12 |
| Phase | Plan |
| Scope | Release-workflow validation only; no Studio runtime behavior change |
| Former candidate | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` (M1 superseded for release purposes by owner decision; historical evidence retained) |

## Goal

Allow the repository-supported Studio release workflow to package and validate Studio `1.0.10`
when the candidate introduces no new lint findings, while retaining a deterministic, fail-closed
lint safety gate. Existing findings may be carried as an explicitly reviewed baseline; the baseline
must never grow silently.

This is a workflow/tooling correction only. Studio application/runtime source, Portal source,
Functions, Rules, indexes, package behavior, and the coordinated feature scope are unchanged.

## Root-cause investigation

Both `build-windows` and `build-macos` in `.github/workflows/studio-release.yml` contain the same
step:

```yaml
- name: Lint
  run: npm run lint
```

The root `package.json` expands that command to:

```txt
eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
```

Therefore the workflow intentionally lints the entire monorepo, not only Studio release files.
The frozen-SHA run reported **25 findings (20 errors, 5 warnings)** before packaging:

| Severity | File and finding(s) | Rule |
|---|---|---|
| warning | `apps/portal/features/catalog/hooks/useCatalogDesigns.ts:485:6` missing `options.halftoneFilterOn` dependency | `react-hooks/exhaustive-deps` |
| error | `apps/studio/src/renderer/src/features/deletion/services/schedulePostAuthDeletionWarmup.contract.test.ts:46:42` unnecessary escape | `no-useless-escape` |
| warning (2) | `apps/studio/src/renderer/src/features/designs/components/SmartProfileDimensionListsView.tsx:4:14,21:17` fast-refresh export warnings | `react-refresh/only-export-components` |
| error | `apps/studio/src/renderer/src/features/designs/components/TagManagementModal.tsx:2:36` unused `_props` | `@typescript-eslint/no-unused-vars` |
| error (6) | `apps/studio/src/renderer/src/features/designs/hooks/useCatalogTags.ts:28:32,49:7,52:23,54:24,55:23,55:39` unused parameters/locals | `@typescript-eslint/no-unused-vars` |
| warning | `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx:478:6` unnecessary `managedSearchActive` dependency | `react-hooks/exhaustive-deps` |
| error | `apps/studio/src/renderer/src/features/designs/utils/designLibrarySearch.ts:24:3` unused `_retiredCatalogTags` | `@typescript-eslint/no-unused-vars` |
| error | `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx:160:30` unused `current` | `@typescript-eslint/no-unused-vars` |
| error | `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxAlertDeliveryService.ts:2:3` unused `deleteDoc` | `@typescript-eslint/no-unused-vars` |
| error | `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSuppressionService.ts:5:3` unused `setDoc` | `@typescript-eslint/no-unused-vars` |
| warning | `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowRailDollarTotals.ts:93:6` missing `input.shows` dependency | `react-hooks/exhaustive-deps` |
| error | `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx:19:10` unused `desktopAppService` | `@typescript-eslint/no-unused-vars` |
| error | `functions/src/lib/propagateCustomerIdentitySnapshots.ts:128:33` unused `_ignoredUpdatedAt` | `@typescript-eslint/no-unused-vars` |
| error (3) | `packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts:63:5,88:5,109:5` regex spaces | `no-regex-spaces` |
| error | `packages/shared/src/utils/customerUploadTransparency.test.ts:8:3` unused constant | `@typescript-eslint/no-unused-vars` |
| error | `packages/shared/src/utils/manualArtworkEnhance.test.ts:10:10` unused import | `@typescript-eslint/no-unused-vars` |
| error | `packages/shared/src/utils/showProductionRecovery.ts:265:7` control characters in regex | `no-control-regex` |

The diagnostic files above have **zero overlap** with the TypeScript/TSX files changed by the
former candidate (`git diff --name-only <ff533c8>^ <ff533c8> -- '*.ts' '*.tsx'`). They are therefore
pre-existing relative to the candidate, not Studio `1.0.10` candidate regressions. The same output
was observed by the validation-only workflow on both Windows and macOS.

## Existing mechanisms considered

| Approach | Finding | Decision |
|---|---|---|
| A — existing baseline-aware tooling | Repository search found only the strict whole-repo command and documented changed-file lint usage; no baseline comparator exists. | Not reusable. |
| B — checked-in exact baseline manifest | Can preserve whole-repo lint, distinguish known findings from new findings, keep baseline reviewable, and test growth/removal behavior. | **Selected.** |
| C — release-scope/changed-files-only lint | Would weaken the current whole-repo safety surface and could hide regressions in untouched release dependencies. | Rejected as the primary gate. |
| D — another mechanism | No safer repository-native option identified. | Not selected. |

## Proposed correction

Add a small Node-based release lint runner that invokes the same ESLint scope and rules, emits
machine-readable JSON, normalizes paths and diagnostic identity deterministically, and compares the
result with a checked-in baseline manifest.

The comparator will:

1. fail closed if ESLint cannot run or output cannot be parsed;
2. permit findings present in the manifest;
3. fail on every current finding absent from the manifest (new error or warning);
4. report removed baseline findings as improvements without editing the manifest;
5. never write or expand the manifest itself; and
6. sort and serialize identities consistently across Windows and macOS.

Diagnostic identity will include normalized file, severity, rule ID, line, column, end position,
and message. This intentionally treats moved or changed diagnostics as new until reviewed.

The normal targeted lint command remains required for changed files. The release gate remains a
real lint gate; it is not disabled, deleted, or broadly ignored.

## Expected files

Implementation is expected to be limited to:

- `.github/workflows/studio-release.yml` — call the shared baseline-aware runner in both platform jobs;
- `.github/scripts/run-studio-release-lint.mjs` — deterministic runner/comparator;
- `.github/scripts/studio-release-lint-baseline.json` — reviewed 25-finding baseline, with no timestamps;
- `.github/scripts/run-studio-release-lint.test.ts` — comparator and fail-closed behavior tests;
- `.github/workflows/studio-release-signing-policy.test.ts` — assert both jobs use the runner and no direct lint bypass exists;
- release/deployment workflow evidence documentation as needed.

No Studio application/runtime file is expected to change. If implementation discovers a genuine
candidate runtime defect, **STOP** and return for expanded review rather than altering Studio to
satisfy packaging.

## Test strategy

- Unit-test exact normalization and stable sorting.
- Prove an identical baseline passes.
- Prove removal of a baseline finding passes and does not mutate the manifest.
- Prove one new error and one new warning fail.
- Prove malformed ESLint output and process failure fail closed.
- Prove the workflow contains the same runner invocation in Windows and macOS jobs and retains
  packaging/release safety gates.
- Run targeted lint on all implementation files, focused release-policy tests, and the real
  baseline-aware runner.
- Preserve the existing whole-repository diagnostics as reviewed baseline evidence; do not label
  them newly introduced.

## Post-implementation RC validation (separate gate)

After owner-authorized implementation and tests, dispatch `.github/workflows/studio-release.yml`
with the exact new candidate SHA, `release_type=prerelease`, and the existing validation-only
distribution mode. Record Windows and required macOS artifacts, names, SHA-256 hashes, provenance,
and version `1.0.10`; no stable release, tag, or production publication may occur.

Then run the supported clean install/launch and `v1.0.9 → 1.0.10` update validation. If local
interaction is required, stop at the smallest Owner QA checklist.

## Separate Rules evidence track

Read-only Firestore and Storage Rules snapshot attempts still return **403** (service disabled/no
quota project for the available credential). No IAM or quota change is authorized or proposed here.
If access remains unavailable, stop that subtask and report the exact owner/admin intervention
required; it must not broaden this Studio workflow correction.

## Production boundary

This Plan authorizes no implementation, staging, commit, push, deploy, publish, production read
beyond already authorized read-only evidence, runner invocation, DRY RUN, VERIFY, APPLY/backfill,
maintenance activation, settings/Auth/secrets/data mutation, or merge to production.

## Next checkpoint

**`OWNER ACCEPT STUDIO RELEASE WORKFLOW CORRECTIVE + AUTHORIZE IMPLEMENT`**
