# Implementation Review: Portal Assisted Final Artwork Add Retention Sentinel Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase |
| Goal | `portal-assisted-final-artwork-add-retention-sentinel-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Plan/Formal Review | Accepted by owner; implementation authorized |
| Status | Implemented; automated Test complete; Owner DEV QA evidence partial; Signoff pending |
| Signoff | **Not created** |

## 1. Authorization and scope

The owner accepted the Plan and Formal Review and authorized Implement → Test → Owner DEV QA. The
later owner addendum also removed the Design Library permission prompt for Fresh Prints-created
Assisted Creation artwork. That addendum required a small, explicitly recorded scope expansion to
Portal Assisted Creation source files. It did not authorize changes to ordinary customer uploads,
donations, permission follow-up, Staff Artwork, or the multi-proof child.

No production action, production deployment, staging, commit, push, candidate freeze, migration, or
backfill occurred. No Signoff is recorded.

## 2. Product decision and origin distinction

The trusted origin is the server-loaded `assistedCreationRequests/{requestId}` document, authenticated
against the Portal customer. The callable is specifically
`customerAddAssistedApprovedProofToPrintRequest`; its artwork source is resolved from the approved
Assisted request/final source, and the copied upload is marked with `assistedCreationRequestId`.
Ordinary customer-upload, donation, and permission-follow-up callables do not use this path.

The Portal now calls this Assisted-only action directly. It no longer asks the customer to choose
Allow/Don’t allow, and it sends no consent boolean. The backend does not interpret a missing value as
Allow and does not manufacture a customer-consent audit record.

## 3. Exact implementation

### Functions

`functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`

- Removed the Assisted callable’s catalog-consent input and validation.
- Removed `buildCatalogIntakeConfirmationPatch` from both fresh and reusable Assisted paths.
- Fresh copied uploads retain only the existing technical/request fields plus server-owned
  `catalogReviewStatus: "not_eligible"`, `promotedDesignId: null`, `ownershipConfirmed: true`,
  `printRequestId`, and the Assisted origin IDs. This preserves the existing staff intake queue
  (`not_eligible` becomes Pending after Add to Show) without pretending that the customer provided
  catalog permission.
- Fresh batch and `printRequestIngest` writes omit `catalogUseAcknowledged`, terms-version,
  denial, follow-up, retention-start, and intake-hold fields.
- Reusable/existing Assisted uploads are no longer re-confirmed through the customer-consent helper;
  existing historical consent fields are preserved when already present, but no new ones are
  manufactured.
- The existing maintenance guard, ownership checks, final-source preference, sizing, idempotency,
  request limits, and request-item writes remain unchanged.

This removes the invalid `FieldValue.delete()` create payload dependency entirely for the Assisted
path. The shared helper remains unchanged for ordinary customer-upload and donation update semantics;
the reviewed create/update sentinel correction is not applied by passing a fake consent value.

### Portal

`apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`

- Removed the Assisted `Add to Design Library?` modal import/state/render.
- `Add to Request` starts the existing progress flow directly.

`apps/portal/features/assisted-creation/services/assistedCreationService.ts`

- `addApprovedProofToPrintRequest(requestId)` now sends only the trusted Assisted request ID.

The shared action type remains unchanged so the multi-proof child retains ownership of its shared
Assisted Creation type surface. The Portal service narrows the callable payload locally with
`Omit<CustomerAddAssistedApprovedProofToPrintRequestRequest, "catalogUseAcknowledged">`; no consent
field is sent at runtime.

The unused modal component file remains in the repository but is no longer reachable from the
qualifying Assisted Creation UI. No ordinary customer-upload modal or permission workflow changed.

### Tests

- `apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts`
  verifies direct Add-to-Request, no Assisted consent modal, and no consent payload.
- `functions/src/lib/customerUploadCatalogConfirmation.test.ts` verifies the Assisted callable no
  longer imports/calls the customer-consent helper, keeps the staff `not_eligible` path, and does not
  write the consent/retention fields. Existing helper tests continue to cover ordinary attach,
  donation, denial, follow-up, and update semantics.

## 4. Explicitly untouched surfaces

- `functions/src/lib/customerUploadCatalogConfirmation.ts` and all ordinary customer-upload callers
  remain unchanged.
- Customer upload, donation, Ask Again, Allow, Decline, Restore, staff Exclude, Promote, and
  retention-scheduler behavior remain on their existing helper contracts.
- `functions/src/assistedCreationRequests.ts`, proof-round/types/history, notification round
  identity, and all multi-proof files were not changed.
- Staff Artwork neutral-projection corrective files were not changed.
- Firestore Rules, Storage Rules, indexes, final-source resolver, request-item schema, and retention
  durations were not changed.

## 5. Unexpected overlap / scope disposition

The implementation required Portal Assisted Creation runtime changes, contrary to the original
Functions-only sentinel allowlist. This was the explicit owner addendum’s required consequence and
is recorded here. No overlap occurred with the multi-proof child or Staff Artwork corrective.

No other scope expansion was made. The sentinel defect is handled by removing the inappropriate
catalog-consent helper dependency from this Assisted-only path, not by changing shared retention
policy or manufacturing an Allow response.

## 6. Current QA disposition

The later progress/re-add Owner DEV QA PASS confirms the overlapping direct Assisted Add-to-Request
behavior, including removal of the catalog-permission modal, successful Add, no consent/denial/
follow-up/retention state, no automatic Design Library publication, final-artwork usability,
remove/re-add idempotency, and unchanged ordinary customer-upload behavior. It does not explicitly
cover every sentinel-specific manual criterion listed in the Test Report (queue/staff-intake
transition, exact final-source/sizing/quantity/request-count checks, maintenance/ownership rejection,
separate donation/follow-up/Restore/staff-promotion paths, or direct document inspection of omitted
fields). The sentinel therefore remains unsigned pending those checks.

## 7. Next gate

Proceed to the recorded Test Report and complete the missing Owner DEV QA checks. Do not create
Signoff until the owner explicitly reports:

> **OWNER DEV QA: portal-assisted-final-artwork-add-retention-sentinel-corrective**
