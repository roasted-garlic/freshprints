# Test Report: Portal Assisted Final Artwork Add Retention Sentinel Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-assisted-final-artwork-add-retention-sentinel-corrective` |
| Implementation Review | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-implementation-review.md` |
| Status | Automated Test complete; later superseding Owner DEV QA evidence is partial; Signoff pending |
| Signoff | **Not created** |

## 1. Scope tested

The owner addendum changes qualifying Fresh Prints-created Assisted Creation artwork to a direct
Add-to-Request path. Automated coverage verifies that the Portal no longer opens the catalog
permission modal or sends a consent value, and that the guarded Functions callable bypasses the
customer-consent helper instead of passing fake Allow/Decline semantics. Existing helper tests cover
ordinary customer-upload and donation behavior.

The reviewed callable was deployed to `fresh-prints-dev` as revision `...-00036-gib`; the later
progress/re-add corrective redeployed the same callable as `...-00037-juk`, which is the revision
covered by the superseding Owner DEV QA. No Portal/Studio publish or production action occurred.

## 2. Automated results

### Focused Assisted/sentinel contracts

Command:

```text
npx tsx --test functions/src/lib/customerUploadCatalogConfirmation.test.ts functions/src/assistedCreationWs2Corrective.contract.test.ts apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts
```

Result: **22 tests passed, 0 failed**.

Coverage includes:

- direct Portal Add-to-Request with no `AssistedLibraryListingConsentModal` and no
  `catalogUseAcknowledged` payload;
- existing final-artwork download/progress and reusable-upload lineage contracts;
- Assisted callable bypass of `buildCatalogIntakeConfirmationPatch`;
- no Assisted fresh-write consent/retention fields;
- existing ordinary attach helper semantics;
- donation `pending_staff_review` semantics;
- customer denial, follow-up approval, retention transition, queue, and allocation behavior;
- no automatic Design creation/promotion on allocation.

### Related lineage and eligibility tests

Command:

```text
npx tsx --test functions/src/lib/customerUploadCatalogConfirmation.test.ts functions/src/lib/assistedFinalSourceAttachReuse.test.ts packages/shared/src/utils/assistedCreationApprovedProofAddToRequest.test.ts packages/shared/src/utils/customerUploadCatalogIntakeEligibility.test.ts
```

Result: **28 tests passed, 0 failed**.

This confirms final-source/proof lineage reuse, approved Add-to-Request eligibility, legacy
customer-upload catalog-intake eligibility, and the unchanged permission-follow-up utility.

### Functions build

Command:

```text
npm run build
```

Working directory: `functions/`

Result: **passed** (`tsc` completed successfully).

### Portal typecheck

Command:

```text
npm run typecheck --workspace @fresh-prints/portal
```

Result: **passed**. This was required because the owner addendum authorized Portal Assisted Creation
runtime changes.

### Targeted lint

Command:

```text
npx eslint functions/src/customerAddAssistedApprovedProofToPrintRequest.ts functions/src/lib/customerUploadCatalogConfirmation.test.ts apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx apps/portal/features/assisted-creation/services/assistedCreationService.ts apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts packages/shared/src/types/assistedCreation/assistedCreationActions.types.ts --report-unused-disable-directives --max-warnings 0
```

Result: **passed**.

### Diff hygiene

Command:

```text
git diff --check
```

Result: **passed**. Git emitted existing line-ending normalization warnings only; no whitespace
errors were reported.

## 3. Later superseding Owner DEV QA evidence

The owner reported **PASS** for the later
`portal-assisted-final-artwork-progress-and-readd-corrective` workflow. That QA confirms the
overlapping sentinel behavior: the old catalog-permission prompt is absent, Add-to-Request succeeds,
no fake consent or denial/follow-up/retention state is introduced, no automatic Design Library
publication occurs, final artwork remains usable, remove/re-add is idempotent, and ordinary
customer-upload behavior remains intact.

This evidence is not treated as a complete sentinel QA PASS because the original sentinel checklist
requires additional explicit checks listed below.

## 4. Acceptance evidence and remaining Owner QA

Automated evidence covers the source contract for the direct Assisted path and confirms ordinary
customer-upload/donation helper tests remain green. The following live authenticated Portal/DEV
checks remain explicit Owner DEV QA items:

1. Open approved/final Assisted artwork in Portal and verify Add to Request starts directly with no
   catalog-permission modal.
2. Confirm the callable succeeds once and a retry is idempotent (one upload, one request item,
   stable `printRequestIngest`).
3. Inspect the created `customerUploads` and Assisted request documents: no new
   `catalogUseAcknowledged`, customer-denial, follow-up, `catalogRetentionStartedAt`, or
   `studioIntakeHoldUntilShow` fields were written; the server origin marker and `not_eligible`
   staff-intake status are present.
4. Queue the request to a show and verify the existing staff intake transition remains available;
   no Design is created or published automatically.
5. Verify final-source preference, sizing, quantity, request count, maintenance blocking, and
   ownership behavior.
6. Separately exercise ordinary customer upload, donation, Ask Again/Allow/Decline, Restore, and
   staff promotion paths to confirm their permission/retention behavior is unchanged.

The later progress/re-add PASS is recorded, but the sentinel child remains unsigned. The exact next
checkpoint is:

> **OWNER DEV QA: portal-assisted-final-artwork-add-retention-sentinel-corrective**

No Signoff should be created until that explicit owner report is received.
