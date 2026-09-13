# Formal Review: Portal Assisted Final Artwork Progress and Re-add Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-assisted-final-artwork-progress-and-readd-corrective` |
| Plan | `docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-progress-and-readd-corrective-plan.md` |
| Verdict | **`approved_with_changes` — owner accepted; implementation authorized** |

## Review findings

The reported Firestore error is a real post-deploy defect, not a transient Portal failure. The
second Add attempt follows the retained Assisted `printRequestIngest` pointer into
`ensureIngestOnWorkingRequest`. When the existing upload already carries
`assistedCreationRequestId`, `buildUploadPatch()` returns an empty object, yet the callable still
passes it to `Transaction.update`. The smallest correction is a conditional update guard; it does
not alter retention or consent behavior.

The progress request is also valid. The final-artwork card currently has no client timer and no
server stage stream. A real stage/status field plus an elapsed clock is recommended. A fake
percentage or numeric countdown is rejected because the callable has variable Storage, image
processing, and derivative-generation time and has no persisted timing baseline.

## Scope and safety conditions

- Keep the fix inside the Assisted callable, its shared Assisted DTO/parser, and the Assisted
  progress UI/tests listed in the Plan.
- Apply the empty-patch guard to every existing-upload update branch, including already-attached and
  legacy-origin backfill cases.
- Publish only real processing stages; never synthesize customer consent, retention, denial, or
  Design Library promotion fields.
- Preserve maintenance, ownership, approved/final-source selection, sizing, quantity, idempotency,
  and ordinary customer-upload/donation/follow-up behavior.
- No Rules, Storage Rules, indexes, Staff Artwork, multi-proof, migration, backfill, production,
  staging, commit, push, or freeze changes.

## Required evidence after authorization

Focused tests must prove the remove/re-add path, no empty update, legacy origin backfill, real stage
and elapsed rendering, and unchanged ordinary upload permission/retention behavior. Functions build,
Portal typecheck, targeted lint, and `git diff --check` are required before DEV QA. Because Portal
runtime is in scope, the established localhost DEV path must be used; no App Hosting deployment is
expected.

## Decision

The review conditions are satisfied by the accepted Plan: the empty-patch guard is applied to every
existing-upload branch, progress uses server-published real stages with customer-safe mapping, and
no fake ETA/percentage or consent/retention fields are introduced. The owner explicitly accepted
the Plan + Formal Review and authorized Implement → Test → DEV deployment as needed. Signoff remains
blocked on Owner DEV QA.
