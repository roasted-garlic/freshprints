# Formal Review: Portal Assisted Final Artwork Add Retention Sentinel Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase |
| Goal | `portal-assisted-final-artwork-add-retention-sentinel-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Plan | `docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-plan.md` |
| Verdict | **`approved_with_changes` — conditional; implementation not authorized** |

## Review boundary

The attached phase brief authorizes only isolated investigation, Plan, and Formal Review while the
Portal Staff Artwork corrective is active. This review therefore changes no runtime source and does
not modify shared workflow/handoff state. No Rules, Storage, index, data, migration/backfill,
deployment, staging, commit, push, freeze, publication, or production action occurred.

## 1. Executive verdict and root cause

The defect is confirmed and release-blocking. The Portal assisted flow correctly reaches the trusted
callable and preserves the existing maintenance guard, but the fresh assisted-upload branch reuses
an update-style catalog-intake patch in a non-merge new-document transaction set.

The exact sequence is:

1. Portal `AssistedCreationDetailPanels` calls
   `assistedCreationService.addApprovedProofToPrintRequest` with `catalogUseAcknowledged`.
2. `customerAddAssistedApprovedProofToPrintRequest` resolves `finalSource` when present, copies and
   processes the artwork, and opens `adminDb.runTransaction`.
3. At `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts:496-502`,
   `buildCatalogIntakeConfirmationPatch({ submitForStaffReview: false, ... })` is called without an
   existing upload.
4. With affirmative consent, the helper returns delete sentinels for
   `catalogRetentionStartedAt` and `studioIntakeHoldUntilShow` at
   `functions/src/lib/customerUploadCatalogConfirmation.ts:78-83`.
5. Those fields are spread into `Transaction.set(uploadRef, payload)` at
   `customerAddAssistedApprovedProofToPrintRequest.ts:533-577`, creating a new document without
   `{ merge: true }`. Firestore rejects the payload; the reported field is
   `catalogRetentionStartedAt`, and the sibling hold sentinel is illegal for the same reason.

This is a helper contract mismatch, not a retention-policy failure and not a Portal UI or Storage
copy failure.

## 2. Required review changes

The Plan is acceptable only with these conditions:

- Make create vs update an explicit helper contract. Do not infer mode from
  `existingUpload === undefined`; donation currently omits that argument while performing an
  existing-document update.
- In create mode, omit both fields when affirmative consent means there is nothing to clear. Do not
  replace them with `null`, `undefined`, a timestamp, or a client value.
- Keep update mode’s `FieldValue.delete()` behavior for existing uploads. This preserves retention
  episode clearing, Ask Again pause, Allow/Restore exit, second Decline restart, staff Exclude, and
  promotion semantics.
- Use create mode only at the fresh assisted `uploadRef` `Transaction.set`. Keep the existing
  `Transaction.update` paths unchanged unless the explicit mode parameter requires mechanical call
  site annotation.
- Add a regression that inspects the actual create payload (including a recursive sentinel check),
  not only a source regex. Add update and declined-create semantic cases so the fix cannot silently
  trade the Firestore error for retention data loss.
- Preserve `assertPortalMaintenanceAllowsCustomerMutation` and add/retain a maintenance-guard
  assertion for the callable.

Using `set(..., { merge: true })` as a blanket fix is rejected: it would hide the contract mistake,
make create semantics dependent on merge behavior, and fail to document that a new upload has no
retention field to clear.

## 3. Affected workflows review

| Workflow | Finding |
|---|---|
| Assisted first add of approved proof/final artwork | **Affected.** New `customerUploads` document is written with illegal delete sentinels when affirmative consent is selected. |
| Assisted retry/reuse of a ready upload | Not affected. `ensureIngestOnWorkingRequest` updates the existing upload. Its delete sentinels are legal and idempotency behavior remains in scope for regression. |
| Normal customer-upload Add to Request | Not affected. Existing upload docs are updated, not created, by the shared helper caller. |
| Donation | Not affected. Donation confirmation updates existing upload docs; `submitForStaffReview: true` does not produce the reported retention delete, and donation retention starts through its dedicated patch. |
| Ask Again / Allow / Decline / Restore / staff Exclude / Promote | Not affected by the invalid set. These paths use update/transaction-update APIs; their signed-off retention behavior must remain unchanged. |
| Studio attachment / Your Designs reattach | No matching helper-in-create call found; current paths update existing uploads and create only request items. |

The direct assisted pointer cleanup at `customerAddAssistedApprovedProofToPrintRequest.ts:330-335`
uses `assistedRef.update`, so it is valid. No nested delete sentinel was found in the reported
payload; the two top-level helper fields are the complete defect.

## 4. Architecture and security review

**Pass with conditions.** The proposed correction stays at the Functions/helper boundary:

```text
Portal component → assistedCreationService → guarded callable → transaction/helper
```

No Firestore write moves into React. No client-provided retention value is trusted. Existing
customer authorization, ownership checks, approved/final-artwork eligibility, server-side image
processing, sizing, idempotent ingest pointer, and maintenance guard remain authoritative.

No Firestore Rules, Storage Rules, index, collection, or DTO boundary changes are required. No Portal
typecheck is required unless implementation unexpectedly edits Portal source.

## 5. Retention/data-model review

**Pass with conditions.** The correction must preserve this exact distinction:

| State | Required fields |
|---|---|
| New assisted upload + affirmative consent | `catalogReviewStatus: not_eligible`; omit `catalogRetentionStartedAt` and `studioIntakeHoldUntilShow`; do not start a retention episode. |
| New assisted upload + denial | `excluded_from_catalog`, customer-denial reason, `studioIntakeHoldUntilShow: true`, server `catalogRetentionStartedAt`, and original denial audit evidence. |
| Existing upload + affirmative consent/follow-up approval | Update clears the active retention timestamp and intake hold with `FieldValue.delete()`. |
| Donation / Ask Again / Decline / Restore / staff Exclude / Promote | Existing update contracts remain unchanged. |

This is the smallest correction that preserves the signed-off customer-upload retention semantics and
does not rewrite existing records or trigger cleanup.

## 6. Test review

The required focused coverage is adequate if it includes all of the following:

- exact assisted first-add create payload with affirmative consent and no delete sentinel;
- sibling `studioIntakeHoldUntilShow` sentinel absence, not just the reported
  `catalogRetentionStartedAt` absence;
- declined create payload and original-denial/30-day retention fields;
- existing update payload with legal delete sentinels;
- assisted reuse/idempotency (one item, stable ingest pointer, no duplicate retry);
- sizing, quantity, request count, realtime refresh, and approved proof/final artwork preservation;
- maintenance guard remains enforced;
- targeted Functions tests, Functions build, targeted ESLint, and `git diff --check`.

Rules/Storage/index tests are correctly out of scope for this small helper/write-shape correction.

## 7. Files expected to change after authorization

Expected allowlist:

- `functions/src/lib/customerUploadCatalogConfirmation.ts`
- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`
- `functions/src/lib/customerUploadCatalogConfirmation.test.ts`
- one focused assisted callable/transaction-payload test only if needed to exercise the exact
  `Transaction.set` boundary.

Expected not to change:

- Portal assisted UI/service, Storage resolver, request-item UI, and shared Portal types;
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`;
- customer-upload retention scheduler and purge logic;
- permission follow-up, Restore, Exclude, Promote, donation, normal upload, Studio attachment, and
  Staff Artwork corrective surfaces;
- workflow state/handoff files during this parallel Plan/Formal Review turn.

## 8. Parent/release disposition

The parent’s candidate assembly remains stopped for the separate Staff Artwork Outcome B corrective,
and this newly confirmed assisted Add defect must also be resolved before any coordinated candidate
assembly resumes. After this child eventually passes Implement → Test → Owner DEV QA → Signoff, the
managing workflow must rerun the parent M0 evidence from a new reviewed snapshot. No existing
candidate inventory or SHA may be frozen or reused.

## 9. Verdict and exact next owner decision

**Formal Review verdict: `approved_with_changes` — conditional.** The plan is technically sound and
appropriately narrow, provided the implementation separates create omission from update deletion,
adds the exact write-shape regression, and preserves all maintenance and retention semantics above.
This verdict is not implementation authorization.

> **OWNER ACCEPT PLAN + FORMAL REVIEW AND AUTHORIZE IMPLEMENT**

Until that decision is explicit, stop here. Do not implement, deploy, stage, commit, push, freeze,
publish, migrate, backfill, or perform any production action.
