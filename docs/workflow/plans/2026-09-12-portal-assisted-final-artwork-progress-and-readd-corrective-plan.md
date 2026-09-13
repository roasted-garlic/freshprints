# Plan: Portal Assisted Final Artwork Progress and Re-add Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase |
| Goal | `portal-assisted-final-artwork-progress-and-readd-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Related goal | `portal-assisted-final-artwork-add-retention-sentinel-corrective` |
| Status | `signed_off_approved_with_notes` |
| Authorization | **Owner accepted Plan + Formal Review and authorized Implement → Test → DEV deployment as needed** |

## 1. Owner-reported symptoms

1. While adding approved Assisted Creation final artwork, the dialog remains on
   `Preparing final artwork` without showing a useful indication of elapsed or remaining work.
2. A second Add to Request attempt, after the artwork was added and then removed, fails with:

   ```text
   Update() requires either a single JavaScript object or an alternating list of field/value pairs
   that can be followed by an optional precondition. At least one field must be updated.
   ```

The first add succeeds; the failure is specific to the re-add/reuse path.

## 2. Confirmed source findings

### Re-add error

`functions/src/customerAddAssistedApprovedProofToPrintRequest.ts` preserves
`printRequestIngest` after a request item is removed. On the next Add to Request, the callable finds
the existing owned upload and enters `ensureIngestOnWorkingRequest`.

That helper's `buildUploadPatch()` intentionally returns `{}` when the upload already has its
`assistedCreationRequestId`. The helper then calls `tx.update(uploadSnap.ref, buildUploadPatch())`
in the already-attached and re-attach branches. Firestore rejects the empty update before the
ingest pointer can be repaired. The same unsafe call shape exists in all three existing-upload
branches and should be corrected uniformly.

### Progress visibility

`apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx` keeps the
final-artwork `addProgressPhase` at `preparing` until the one-shot callable resolves; unlike the
catalog-share card, the final-artwork card has no stage timer. The shared
`AssistedAddToRequestProgressModal` explicitly describes its stages as client-timed and receives
no server progress or start time. The Functions image pipeline already exposes stage callbacks and
stage names, but this Assisted callable does not publish them to a customer-readable status path.

## 3. Proposed smallest safe correction

### Re-add write guard

Add a narrow helper that applies an upload patch only when it has at least one field. Use it at all
three `tx.update(uploadSnap.ref, buildUploadPatch())` call sites. Preserve the origin backfill when
needed; do not change idempotency, sticky ingest behavior, ownership checks, sizing, quantity,
maintenance protection, or retention semantics. Add a regression covering an existing upload with
the origin marker (the exact remove-then-re-add shape) and a legacy upload that still needs the
backfill.

### Honest progress feedback

Use the existing image-processing stage callback rather than a fake percentage or countdown:

- record an ephemeral, server-maintained Assisted Add progress object on the Assisted request while
  the callable runs (stage, started-at, and updated-at only; terminal/error state is not persisted
  because the existing callable response/error path already supplies that state);
- reuse the existing `onSnapshot` request subscription to render the current real stage;
- add a live elapsed clock and `Step N of M`/remaining-step copy to the modal;
- clear the progress object on success or failure and treat stale progress as inactive;
- keep copy explicit that duration varies with artwork size; do not promise an invented ETA.

This provides a truthful answer to “how much longer” (current server stage, completed/remaining
steps, and elapsed time) without claiming a precision the one-shot callable cannot know. If the
owner instead wants a numeric ETA, that is a separate product decision because no reliable baseline
duration is currently persisted.

## 4. Expected files and boundaries

Expected runtime/type/test files:

- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`
- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts` (optional progress DTO)
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts`
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/portal/features/assisted-creation/components/AssistedAddToRequestProgressModal.tsx`
- focused Assisted progress/re-add contract tests and/or callable write-shape tests

No Rules, Storage Rules, indexes, retention scheduler, catalog-permission helper, Staff Artwork
projection, multi-proof runtime, migration, backfill, or automatic Design Library promotion is in
scope. No customer consent fields are added or manufactured.

## 5. Verification and Owner QA

Automated checks must cover:

1. remove then re-add reuses the existing Assisted upload without an empty Firestore update;
2. legacy origin backfill still writes when required;
3. live stage and elapsed/remaining-step feedback are rendered for final artwork;
4. ordinary customer upload permission/retention behavior remains unchanged;
5. Functions build, Portal typecheck, targeted lint, focused tests, and `git diff --check` pass.

Owner DEV QA must exercise the actual local Portal against `fresh-prints-dev`, including first add,
remove, second add, no duplicate item, no consent/retention state, and the progress display.

## 6. Checkpoint

Owner accepted the Plan + Formal Review. The reviewed implementation, automated tests, DEV
deployment, and explicit Owner DEV QA PASS are complete. Signoff is recorded as
`approved_with_notes`. No staging, commit, push, freeze, or production action is part of this child.

> **OWNER DEV QA: portal-assisted-final-artwork-progress-and-readd-corrective**
