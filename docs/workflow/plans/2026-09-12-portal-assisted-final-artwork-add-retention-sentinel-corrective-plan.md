# Plan: Portal Assisted Final Artwork Add Retention Sentinel Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase |
| Goal | `portal-assisted-final-artwork-add-retention-sentinel-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Related signed-off child | `assisted-approved-proof-add-to-print-request` |
| Status | `implemented_and_tested_owner_qa_partial` |
| Formal Review | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-review.md` |
| Authorization | **Owner accepted Plan + Formal Review and authorized Implement → Test → DEV deployment** |

## 1. Gate and isolation

This is an isolated investigation/corrective plan running in parallel with
`portal-staff-artwork-neutral-projection-corrective`. The attached owner brief explicitly forbids
runtime edits during this turn. No runtime source, Rules, Storage, indexes, data, migration,
backfill, deployment, staging, commit, push, candidate freeze, publication, or production action is
authorized here.

The other corrective is the active FreshForge state owner. `.cursor/workflow/state.md`,
`references/project-chatgpt-handoff/CURRENT-STATE.md`, and parent M0 artifacts are intentionally not
modified by this child. They must be updated/reconciled later by the managing workflow after the
parallel child is accepted and complete.

## 2. User-observed defect and goal

When Portal adds approved custom/assisted final artwork to a Print Request, the customer sees
`Could not add design`. The observed Functions error is:

```text
Value for argument "data" is not a valid Firestore document. FieldValue.delete() must appear at
the top-level and can only be used in update() or set() with {merge:true} (found in field
"catalogRetentionStartedAt").
```

The corrective must let a new approved proof/final-artwork add succeed once, preserve idempotency,
sizing, request truth, maintenance protection, and the existing customer-upload catalog-retention
contract. A new assisted upload must not start an unrelated retention episode or erase audit data.

## 3. Exact root cause and write trace

### Portal entry path

1. `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx:647-685`
   opens the consent flow and calls `assistedCreationService.addApprovedProofToPrintRequest`.
2. `apps/portal/features/assisted-creation/services/assistedCreationService.ts:621-641`
   invokes the callable `customerAddAssistedApprovedProofToPrintRequest`, passing the boolean
   `catalogUseAcknowledged`.
3. `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts:197-238` authenticates the
   Portal customer, revalidates maintenance mode, and resolves the approved `finalSource` when
   present (`functions/src/lib/assistedCreationApprovedProofDownload.ts:118-135`); otherwise it
   resolves approved proof bytes.

### Failing transaction

On a first add (no reusable owned upload),
`functions/src/customerAddAssistedApprovedProofToPrintRequest.ts:448-615` runs an Admin SDK
`adminDb.runTransaction`. The exact failing operation is:

```text
Transaction.set(uploadRef, payload)
```

at `customerAddAssistedApprovedProofToPrintRequest.ts:533-577`, where `uploadRef` is a newly
allocated `customerUploads/{uploadId}` document (`:388-396`). The call supplies no `{ merge: true }`.
The same transaction also sets a new batch and request item, then updates the request and assisted
request; those other writes do not contain the retention delete sentinel.

### Helper that inserts the sentinel

`functions/src/lib/customerUploadCatalogConfirmation.ts:16-88` is shared by customer-upload attach,
donation, and assisted attach. For `submitForStaffReview: false` with affirmative consent (or an
existing follow-up approval), its return value contains:

```text
catalogRetentionStartedAt: FieldValue.delete()
studioIntakeHoldUntilShow: FieldValue.delete()
```

Those deletes are semantically correct when clearing fields on an existing upload update. The fresh
assisted branch calls the same helper at `customerAddAssistedApprovedProofToPrintRequest.ts:496-502`
without an existing upload and spreads the result into the new-document `Transaction.set` at
`:533-577`. `withoutUndefinedFields` only removes `undefined` (`functions/src/lib/firestoreDocument.ts:4-9`);
it does not normalize or remove Firestore sentinels. Firestore therefore rejects the new-document
set before the assisted add can complete.

The first reported field is `catalogRetentionStartedAt`; the sibling
`studioIntakeHoldUntilShow` sentinel is an additional illegal field in the same payload and must be
covered by the correction.

## 4. Why the field is present and semantic distinction

The helper is intentionally reused so an assisted upload follows the same consent/intake fields as
a normal customer-upload attach. On an **existing** upload, affirmative consent clears a prior
Denied/Excluded retention episode and intake hold through `transaction.update`; Ask Again/Allow,
Restore, and promotion retain their reviewed update semantics.

On a **new** upload, there is no prior retention episode or hold to clear. The create payload must
omit both fields entirely when consent is affirmative. It must not write `null`, `undefined`, an
arbitrary timestamp, or a client value. When consent is declined, the create payload must retain the
existing semantics: `catalogReviewStatus: excluded_from_catalog`,
`catalogExclusionReason: customer_permission_denied`, `studioIntakeHoldUntilShow: true`, and a
server timestamp in `catalogRetentionStartedAt` (plus original denial evidence).

## 5. Affected-workflow matrix

| Workflow | Current write shape | Affected by this defect? |
|---|---|---|
| Assisted approved proof/final artwork, first add | `Transaction.set(uploadRef, …helper patch…)` | **Yes — release-blocking** when affirmative consent selects delete sentinels. |
| Assisted add reusing an existing ready upload | `Transaction.update(uploadSnap.ref, …)` in `ensureIngestOnWorkingRequest` (`:715-843`) | No; update sentinels are legal. |
| Normal customer-upload Add to Request | Existing upload is updated at `confirmCustomerUploadsAndAttachToRequest.ts:240-243,277` | No. |
| Donation confirmation | Existing upload is updated at `confirmCustomerUploadsForDonation.ts:100-108`; donation helper starts its own clock only when required | No. |
| Permission follow-up Ask Again / Allow / Decline | Transaction updates in `requestCustomerUploadCatalogPermissionFollowUp.ts:144-154` and `respondToCustomerUploadCatalogPermissionFollowUp.ts:150-162` | No. Retention pause/clear/restart remains intact. |
| Staff Restore / Exclude / Promote | `update`/transaction `update` in the respective callables | No. |
| Your Designs / existing customer-upload reattach | `attachExistingCustomerUploadsToPrintRequest.ts:250-293` updates existing uploads; it does not call this helper | No. |
| Studio request attachment paths | Existing trusted upload/item updates; no create call with this helper | No evidence of this sentinel defect. |

The repository-wide `FieldValue.delete()` inventory contains unrelated valid update paths. The
only illegal retention payload found is the assisted fresh-upload `Transaction.set`; no nested
delete sentinel is produced by this helper, and the direct `printRequestIngest: FieldValue.delete()`
at `customerAddAssistedApprovedProofToPrintRequest.ts:330-335` is already inside
`assistedRef.update` and is legal.

## 6. Smallest safe corrective

Separate the helper’s create and update contracts without redesigning retention:

1. Add an explicit write mode (or a narrowly named create-patch helper) to
   `buildCatalogIntakeConfirmationPatch`. In `create` mode, affirmative/follow-up-clearing fields
   are **omitted**; in `update` mode, existing `FieldValue.delete()` sentinels remain unchanged.
   Create mode must not be inferred from the presence/absence of `existingUpload` because the
   donation caller also omits that argument while performing an update.
2. Call the create-safe mode only for the fresh assisted `Transaction.set(uploadRef, …)` path.
   Keep `ensureIngestOnWorkingRequest`, normal upload attach, and donation callers on explicit update
   semantics.
3. Do not change the Portal component/service contract, the Storage copy, final-artwork selection,
   request resolver, idempotency pointer, sizing calculation, or request-item shape.
4. Do not use `set(..., { merge: true })` as a blanket workaround; the new document should have no
   retention field to clear, and an explicit create/update contract prevents future misuse.

## 7. Expected implementation/test files

Expected runtime/test changes after owner authorization:

- `functions/src/lib/customerUploadCatalogConfirmation.ts` — explicit create/update patch contract.
- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts` — use create-safe patch only at
  the new `uploadRef` set.
- `functions/src/lib/customerUploadCatalogConfirmation.test.ts` — create/update write-shape and
  retention-semantic regression cases.
- A focused assisted-callable/source or transaction-payload test alongside
  `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts` if the existing helper test
  cannot exercise the exact `Transaction.set` boundary.

No Portal runtime file is expected to change; the Portal only passes consent to the callable. No
shared package change is expected unless a type is needed for the explicit helper mode.

## 8. Files and surfaces explicitly not changing

- Portal React components/services and the assisted final-artwork Storage resolver.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, and Firestore collection shape.
- Customer-upload retention scheduler, purge behavior, or retention durations.
- Permission follow-up, Restore, Exclude, Promote, donation, normal upload, Studio attachment, or
  Staff Artwork neutral-projection behavior.
- Maintenance guard: `assertPortalMaintenanceAllowsCustomerMutation` remains in the callable before
  the customer mutation; it must not be removed, reordered around authorization, or bypassed.
- Any migration/backfill, data repair, deployment, candidate assembly, staging, commit, push,
  freeze, publication, or production action.

## 9. Regression and verification plan (for Implement → Test)

Focused tests must prove:

1. **Exact reported scenario:** approved assisted custom/final artwork with affirmative consent uses
   a fresh upload create payload with no `FieldValue.delete()` sentinel and can complete the request
   attach once.
2. **Create write-shape:** the create payload omits both `catalogRetentionStartedAt` and
   `studioIntakeHoldUntilShow` for affirmative consent; a recursive sentinel guard proves no nested
   delete sentinel remains.
3. **Declined create semantics:** a new denied upload still writes the server retention timestamp,
   hold flag, exclusion reason, original denial audit fields, and no delete sentinel.
4. **Update semantics:** affirmative reattachment/follow-up approval still clears
   `catalogRetentionStartedAt` and `studioIntakeHoldUntilShow` with update sentinels; Ask Again,
   second Decline, Restore, staff Exclude, and promotion semantics remain unchanged where touched.
5. **Idempotency/request truth:** a retry creates one upload/item and one assisted ingest pointer;
   existing item IDs, quantity, requested size, request count, and realtime refresh behavior remain
   unchanged.
6. **Maintenance:** the callable remains guarded by
   `assertPortalMaintenanceAllowsCustomerMutation`; maintenance-on ordinary customers are still
   rejected.
7. **Build/static:** targeted Functions tests, Functions build, targeted ESLint, and
   `git diff --check` pass. Portal typecheck is not required unless a Portal file unexpectedly
   changes. Rules/Storage/index tests are not in scope because those resources do not change.

## 10. Parent/release impact

This is a release-blocking Functions defect inside the already reviewed assisted/customer-upload
runtime. Any implementation change invalidates the parent’s current dirty candidate inventory and
requires a later M0 reconciliation, Function closure/maintenance inventory, and manifest regeneration
after child Signoff. No candidate SHA may be frozen or reused while this child is unresolved.

## 11. Exact next owner decision

> **OWNER ACCEPT PLAN + FORMAL REVIEW AND AUTHORIZE IMPLEMENT**

Until that decision is explicit, remain stopped after Plan/Formal Review. Do not implement, deploy,
stage, commit, push, freeze, publish, migrate, backfill, or touch production.
