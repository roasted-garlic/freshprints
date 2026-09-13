# Test Report: Portal Assisted Final Artwork Progress and Re-add Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-assisted-final-artwork-progress-and-readd-corrective` |
| Implementation Review | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-implementation-review.md` |
| Status | **Automated Test complete; DEV deployment complete; Owner DEV QA PASS** |
| Signoff | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-signoff.md` — **approved_with_notes** |

## Automated results

### New re-add/progress contracts

Command:

```text
npx tsx --test functions/src/assistedCreationWs2Corrective.contract.test.ts apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts
```

Result: **10 tests passed, 0 failed**.

Coverage includes:

- all three existing-upload branches guard `Transaction.update` against an empty patch;
- legacy Assisted origin backfill remains available;
- server progress writer, real image-pipeline `onStage` callback, save/attach stages, and ephemeral
  cleanup are present;
- Portal parses the Assisted request progress stream, rejects unknown/stale progress snapshots, and
  passes the live value to the existing modal;
- customer-safe stage mapping, elapsed time, logical step count, and remaining-step copy are
  rendered;
- no fake percentage, ETA, countdown, Storage path, or raw exception exposure is introduced;
- existing direct Add-to-Request/no-catalog-consent and final-artwork behavior remain covered.

### Existing Assisted/customer-upload corrective regression

Command:

```text
npx tsx --test functions/src/lib/customerUploadCatalogConfirmation.test.ts functions/src/assistedCreationWs2Corrective.contract.test.ts apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts
```

Result: **25 tests passed, 0 failed**.

This retains the prior Assisted final-artwork/add-to-request, catalog-consent bypass, ordinary
upload, donation, queue, allocation, and retention contracts alongside the new tests.

### Lineage and eligibility regression

Command:

```text
npx tsx --test functions/src/lib/customerUploadCatalogConfirmation.test.ts functions/src/lib/assistedFinalSourceAttachReuse.test.ts packages/shared/src/utils/assistedCreationApprovedProofAddToRequest.test.ts packages/shared/src/utils/customerUploadCatalogIntakeEligibility.test.ts
```

Result: **28 tests passed, 0 failed**.

This confirms final-source/proof lineage reuse, approved Add-to-Request eligibility, legacy
customer-upload catalog-intake eligibility, and unchanged permission-follow-up utility behavior.

## Static/build validation

- Functions build (`npm run build` from `functions/`): **pass**
- Portal typecheck (`npm run typecheck --workspace @fresh-prints/portal`): **pass**
- Targeted ESLint over all changed runtime/types/tests: **pass**
- `git diff --check`: **pass** (existing LF/CRLF normalization warnings only)

The Function deployment used for live DEV QA is recorded in
`2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-dev-deployment.md`.
The stale-progress parser is Portal-local source and is exercised by the typecheck/contract tests;
Portal remains localhost-only for DEV QA.

No Rules, Storage Rules, indexes, migrations, backfills, production actions, staging, commit, push,
freeze, or Signoff were performed.

## Owner DEV QA remaining

The owner completed the authenticated live Firestore subscription and visual-modal QA. The tested
path covered first add, removal, second add/reuse, live real-stage changes, elapsed timer, Step N
of M/remaining steps, no duplicate upload/item, no consent/retention state, and unchanged ordinary
customer-upload permission behavior. This evidence is recorded as Owner DEV QA PASS in the linked
Signoff.

Exact next checkpoint:

> **OWNER DEV QA: portal-assisted-final-artwork-progress-and-readd-corrective - PASS**
