# Implementation Review: Portal Assisted Final Artwork Progress and Re-add Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-assisted-final-artwork-progress-and-readd-corrective` |
| Plan | `docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-review.md` |
| Status | **Implemented; automated Test complete; Owner DEV QA PASS; Signoff complete** |
| Authorization | Owner accepted Plan + Formal Review and authorized Implement → Test → DEV deployment as needed |

## Scope implemented

### Re-add correction

`ensureIngestOnWorkingRequest` now computes `buildUploadPatch()` once at each existing-upload write
site and calls `Transaction.update` only when the patch contains fields. A ready upload that already
has `assistedCreationRequestId` therefore skips the illegal `update({})`, while a legacy upload
missing the origin marker still receives the required backfill. Sticky ingest, request-item
identity, quantity, sizing, ownership, maintenance, lineage, and retention behavior are unchanged.

### Truthful progress

The callable now publishes an ephemeral `addToRequestProgress` object on the customer-owned
Assisted request. It is server-owned and contains only:

- real stage
- server `startedAt`
- server `updatedAt`

The Functions image pipeline's existing `onStage` callback supplies actual processing stages. The
callable also publishes safe operational boundaries for proof resolution/download, output saving,
and request attachment, deduplicating repeated stage writes. Progress is cleared in a `finally`
path on both success and failure so an interrupted/failed attempt cannot remain permanently active.

The Portal parser consumes the existing Assisted request `onSnapshot` stream. The existing
`AssistedAddToRequestProgressModal` now maps whitelisted internal stages to customer-safe labels and
shows the current logical step, elapsed time, completed/remaining steps, and duration variability.
It displays no percentage, countdown, raw stage enum, Storage path, image metadata, or exception
details. Final-artwork cards pass the live progress object into this existing modal; no second modal
was introduced.

## Files changed

- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`
- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts`
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts`
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/portal/features/assisted-creation/components/AssistedAddToRequestProgressModal.tsx`
- `apps/portal/styles/assisted-creation.css` (layout for progress metadata)
- focused contract tests in `functions/src/assistedCreationWs2Corrective.contract.test.ts` and
  `apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts`

No Rules, Storage Rules, indexes, retention helper/scheduler, donation/follow-up behavior, Staff
Artwork corrective, multi-proof runtime, migration, backfill, production, staging, commit, push, or
freeze changes were made.

## Owner QA boundary

Automated validation and the actual local Portal DEV workflow are complete. The owner reported
PASS for live stage transitions, elapsed/remaining-step rendering, first add, remove, and re-add.
Signoff is recorded at
`docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-signoff.md`.
