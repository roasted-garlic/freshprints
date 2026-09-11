# Customer Upload Follow-up Catalog Permission — Test Report

| Field | Value |
|---|---|
| Goal | `customer-upload-follow-up-catalog-permission` |
| Date | 2026-09-10 |
| Environment | local source / no Firebase deploy |
| Result | focused implementation gate passed; full-repo baselines documented |

## Focused tests

Command:

```text
npx tsx --test packages/shared/src/utils/customerUploadCatalogIntakeEligibility.test.ts packages/shared/src/utils/customerNotifications.test.ts functions/src/lib/customerUploadCatalogConfirmation.test.ts apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeQueries.test.ts tests/customerUploadCatalogPermission.contract.test.ts tests/portalMaintenance.contract.test.ts
```

Result: **36 tests passed, 0 failed**. The focused contracts cover original YES/NO state, follow-up
approval eligibility, donation exclusion, confirmation caller wiring, opaque-token callable exports,
maintenance guarding, transaction/replay/wrong-customer checks, no private ID/path in customer DTOs,
Studio reason/action/Restore behavior, Portal token route/modal wiring, and the existing maintenance
guard inventory.

Additional command:

```text
npx tsx --test functions/src/lib/portalMaintenance.test.ts tests/customerUploadCatalogPermission.contract.test.ts tests/portalMaintenance.contract.test.ts
```

Result: **9 tests passed, 0 failed**.

## Validation

* `npm run build` in `functions`: **passed**.
* `npm run typecheck` in `apps/portal`: **passed**.
* Targeted ESLint over all changed implementation/test files: **passed**.
* `git diff --check`: **passed** (only normal LF/CRLF warnings were emitted).
* `npx tsc --noEmit -p apps/studio/tsconfig.json`: **baseline failed** on pre-existing unrelated
  errors in PNG upscale typing, print-request tracing metadata, Staff Inbox/Upcoming Shows unused
  symbols, and shared test fixtures. No error referenced the customer-upload follow-up files.
* Full `npm run lint`: **baseline failed** on 23 existing errors and 5 warnings in unrelated
  catalog, print-request, Staff Inbox, Upcoming Shows, Functions identity, and shared test files;
  no changed follow-up file was reported.
* Portal `npm run build`: **blocked by the already-running local Portal dev server** holding
  `apps/portal/.next/trace` (`EPERM: operation not permitted`). Portal typecheck and targeted ESLint
  passed; the dev process was not terminated or altered.

No Rules test was required because this child made no Firestore or Storage Rules change. No emulator,
deployment, production read/write, migration, backfill, publication, commit, push, or freeze was run.

## Gate conclusion

All implementation-scoped focused tests and validations passed. The unrelated Studio typecheck,
full-lint, and locked `.next` build failures are recorded as existing/environment baselines, not
follow-up regressions.
