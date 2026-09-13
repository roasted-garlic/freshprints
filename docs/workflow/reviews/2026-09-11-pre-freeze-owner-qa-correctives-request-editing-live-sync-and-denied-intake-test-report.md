# Pre-freeze Owner QA Correctives — Test Report

| Field | Value |
|---|---|
| Goal | `pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Date | 2026-09-11 |
| Environment | local source; no DEV or production deploy |
| Candidate | `7c775233e05a2eae65cc4b3c519d2b62a1736b16` remains unfrozen |
| Result | implementation-scoped focused gate passed; unrelated baselines documented |

## Focused implementation contracts

Command:

```text
npx tsx --test functions/src/lib/customerUploadCatalogConfirmation.test.ts functions/src/customerUploadExclusionPreservation.test.ts functions/src/customerUploadRestoreAuthorization.test.ts functions/src/customerUploadCatalogRetention.contract.test.ts apps/portal/features/print-requests/portalWorkingRequestLimitError.contract.test.ts apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeQueries.test.ts apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeParityContract.test.ts
```

Result: **41 tests passed, 0 failed**. Coverage includes the shared Denied/Excluded retention
timestamp transitions, bounded resumable dry-run scheduler and Donation exclusion, safe-delete
helper reuse, atomic Studio item/parent writes, bounded Portal request/item listeners, terminal
Portal quota error/retry behavior, and existing customer-upload follow-up/intake parity contracts.

## Additional suites

* Portal print-request feature tests: **218 passed, 3 failed** out of 221. The failures are existing
  static-source baselines in `usePrintRequestDetail.test.ts` (the fixed 7,000-character source
  window no longer reaches its existing `throw error;` assertion) and
  `portalPrintRequestWs1Corrective4.contract.test.ts` (pre-existing missing
  `selectPortalWorkingPrintRequest` / `isPortalEditablePrintRequest` source markers). No changed
  file from this child is implicated.
* Customer-upload/Studio intake targeted collection (excluding the long image-processing fixture):
  **138 passed, 2 failed** out of 140. The failures are pre-existing
  `customerUploadDeletionEligibility.test.ts` manifest expectation drift for
  `interactiveEnhancedProductionStoragePath` and `customerUploadValidation.test.ts` oversized-zip
  expectation. The separate image-processing fixture exceeded the 120-second command cap while
  its normalization cases were still passing, so it is not represented in this count. No changed
  child implementation file is implicated.
* Firestore/Storage rules regression (`npm run test:rules`): **181 passed, 1 failed** out of 182.
  The sole failure is the existing `companionSets.rules.test.ts` active-staff read, which hit a
  local emulator offline/1000-expression evaluation error. Rules source was not changed in this
  child.

## Build, type, lint, and diff validation

* `npm run build` in `functions`: **passed**.
* `npm run typecheck --workspace @fresh-prints/portal`: **passed**.
* Studio renderer Vite build (`node scripts/generate-packaged-build-config.mjs` followed by
  `npx vite build` in `apps/studio`): **passed**. Existing chunk-size/dynamic-import warnings only.
* Targeted ESLint over all changed implementation and contract files: **passed**.
* `npx tsc --noEmit -p apps/studio/tsconfig.json`: **baseline failed** on unrelated PNG-upscale,
  print-request trace metadata, Staff Inbox/Upcoming Shows, and shared test-fixture errors; no
  changed Studio file was reported.
* `npm run build --workspace @fresh-prints/portal`: **blocked** by the existing Windows
  `.next/trace` `EPERM` lock from the local Portal environment. No process was stopped or altered.
* `git diff --check`: **passed** (normal LF/CRLF warnings only).
* `firestore.indexes.json` parses successfully. The child adds only the reviewed Denied list/count
  composite and retention scheduler composite; `firestore.rules` and `storage.rules` are unchanged.

No production or DEV deployment, Rules/Storage release, scheduler activation, data mutation,
backfill, publication, commit, push, candidate freeze, or Owner DEV QA was performed.

## Gate conclusion

The implementation-scoped focused gate is complete and passed. The documented broad-suite,
emulator, Studio typecheck, and Portal build failures are unrelated/environment baselines. The
child now requires the owner's DEV QA and Signoff checkpoint. After child Signoff, the parent must
rerun M0 and regenerate the candidate manifests because runtime source and indexes changed.
