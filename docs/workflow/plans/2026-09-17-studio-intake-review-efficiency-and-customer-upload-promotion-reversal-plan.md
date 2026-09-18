# Studio intake review efficiency and customer-upload promotion reversal — Plan

Date: 2026-09-17  
Phase: `studio-intake-review-efficiency-and-customer-upload-promotion-reversal`  
Workflow: Plan → Formal Review → Implement → Test → Owner DEV QA → Signoff

## Goal and boundary

Improve the shared Studio Customer Uploads / Donated Designs intake workflow and add a safe,
single-item reversal for an accidental Customer Upload → AI Review promotion.

The reversal is limited to designs that are still in the AI Review/pre-ready lifecycle. It does
not reverse a `ready` design, a catalog-approved design, a design with downstream print/show/
companion references, or any other downstream-used design. Bulk reversal from AI Review is out of
scope for this phase; single-item reversal is required.

The original customer upload, its source/production/preview/thumbnail assets, customer/request
links, print-request items, show allocation history, consent evidence, and technical-processing
fields remain intact. Only the catalog-intake lifecycle and the temporary promoted-design link are
changed by a successful reversal.

## 1. Root cause and existing behavior

The reported failure is caused by the generic permanent-design path:

- `promoteCustomerUploadToAiReview` creates `designs/{designId}` with
  `sourceCustomerUploadId: uploadId`, copies the existing preview/thumbnail/production image to
  canonical design paths, sets the upload to `sent_to_ai_review`, and writes `promotedDesignId`.
- The current Studio AI Review delete action reaches `deleteEligibleUnapprovedDesign`.
- That callable intentionally blocks any design with non-empty `sourceCustomerUploadId`, after
  checking status, active AI stage, and downstream reference blockers. It is an owner-only,
  permanent-delete workflow and is not the safe reversal path.
- `excludeCustomerUploadFromCatalog` is metadata-only and currently rejects an upload with a
  `promotedDesignId`, so it cannot undo the promotion by itself.

The fix is therefore a separate trusted callable/service transaction. It must not weaken or route
around the generic `sourceCustomerUpload` Delete blocker.

## 2. Lifecycle and authoritative operation

Add a dedicated callable, tentatively `returnCustomerUploadToIntakeAndExclude`, using the same
active owner/admin/helper staff authority as the existing Customer Upload intake callables.
The backend is authoritative; the renderer never directly writes either the upload or design
documents.

The operation is recoverable and idempotent:

1. Validate the upload ID and load both `customerUploads/{uploadId}` and the linked
   `designs/{promotedDesignId}`. Require the design's trimmed `sourceCustomerUploadId` to equal
   the upload ID and the upload's `promotedDesignId` to equal the design ID. A missing design with
   the expected upload backlink is treated as a recoverable already-retired case; an inconsistent
   cross-link fails closed rather than guessing.
2. Require the upload to be technical `ready`, ownership/terms/provenance to be valid for catalog
   intake, and catalog status `sent_to_ai_review`. Require the design to be pre-ready (`imported`,
   `processing`, or `rejected`) and not catalog-approved. Reject `ready`, `archived`, approved,
   or any downstream-used design.
3. Reuse the existing design-reference checks for `printRequestItems`, `showAllocations`, and
   `companionLinks`, plus the existing denormalized companion-link checks. These checks are for
   the promoted design only; request items and allocations attached to the original upload are
   preserved and are not treated as a reason to delete the upload.
4. In a Firestore transaction, invalidate the current `aiProcessingAttemptId` and place the
   design in the existing terminal/failed processing state. This is the cancellation boundary:
   pending client work is removed separately, while an already-running provider request is not
   falsely reported as cancellable. Existing attempt-identity guards then make later stage,
   success, or failure writes no-ops.
5. Delete only the derived design assets at the canonical design paths using a strict,
   ignore-missing helper. If any Storage deletion fails, keep the upload backlink and invalidated
   design so the same callable can retry; return a truthful failure instead of silently orphaning
   the lifecycle.
6. In a final transaction, re-read and revalidate the upload/design pair and reference blockers,
   delete the retired pre-ready design document, and update only the catalog-intake fields on the
   upload: `catalogReviewStatus: "excluded_from_catalog"`,
   `catalogExclusionReason: "staff_review"`,
   `catalogRetentionStartedAt: FieldValue.serverTimestamp()`,
   `promotedDesignId: FieldValue.delete()`, and `updatedAt`.
7. Preserve `promotedAt` as the existing promotion-time provenance field; do not delete source,
   production, preview, thumbnail, consent, request, allocation, or technical fields. The current
   schema has no append-only promotion-history collection; the active backlink is cleared only so
   the upload can legitimately enter Excluded retention and be promoted again later.
8. A repeated call after the final transition returns an idempotent already-excluded result. A
   repeated call after a partial Storage cleanup finishes missing-object cleanup and completes the
   Firestore transition. No stale AI completion may create a design because the pipeline writes are
   attempt-guarded and the design document is never recreated by the pipeline.

The existing `excludeCustomerUploadFromCatalog` callable remains unchanged for ordinary pending
intake exclusion. The existing permanent `deleteEligibleCustomerUpload` flow remains unchanged
and continues to block promoted uploads and preserve request/allocation history.

## 3. Statuses and eligibility

Use explicit server-side eligibility, not UI-only checks:

| Entity | Allowed for reversal | Rejected / out of scope |
|---|---|---|
| Upload catalog status | `sent_to_ai_review` with matching `promotedDesignId` | `pending_staff_review`, `excluded_from_catalog`, `not_eligible`, missing/mismatched link |
| Upload technical status | `ready` | uploading/processing/failed or missing source required by promotion |
| Design status | `imported`, `processing`, `rejected` | `ready`, `archived`, missing, or unknown |
| AI review state | pre-ready pending/needs-review/rejected state | approved/catalog-ready state |
| Design references | none in print items, show allocations, companion links/denorms | any downstream reference |
| Source | non-empty `design.sourceCustomerUploadId` equal to upload ID | imports, staff artwork, mismatched/absent provenance |

The server rejects a design that became Ready or gained a downstream reference between the UI
render and callable invocation. The action is not exposed for staff artwork or ordinary imports.

## 4. Firestore and Storage writes

The new callable has no direct client write path. Its writes are limited to the two documented
Firestore transactions and deterministic derived-design Storage cleanup:

- Design invalidation: clear/invalidate the active attempt identity, set the existing failed
  processing stage, and update the actor/timestamp fields already used by lifecycle mutations.
- Design retirement: delete only the pre-ready promoted design document after the strict asset
  cleanup and final reference recheck.
- Upload reversal: set Excluded + `staff_review` + a fresh server retention timestamp, delete only
  `promotedDesignId`, and preserve `promotedAt` and every customer-upload/request/allocation
  field.
- Storage: delete canonical design original, preview, and thumbnail objects only. Never delete
  `customer-uploads/**` objects in this operation.

The renderer service returns the design ID, upload ID, final status, and whether the result was
already complete so the UI can reconcile truthfully.

## 5. Helpers and concurrency safety

Extract narrowly reusable internals from `functions/src/deleteEligibleUnapprovedDesign.ts` without
changing that callable's authorization, status allowlist, provenance blocker, or permanent-delete
semantics:

- reference-blocker collection, with transaction-aware rechecks where the reversal needs them;
- canonical design asset path cleanup, with a strict result for the reversal and the existing
  idempotent behavior retained for generic delete;
- existing `isActiveAiPipelineStage` and canonical design storage-path helpers.

The new reversal helper must be provenance-aware and must never call the generic permanent-delete
callable. It should use the existing staff authorization helpers shared by promotion/exclusion.

On the client, add cancellation support to the existing process-local background AI queue and the
AI Review processing queue only to remove/skip pending IDs. There is no provider-cancel API. If a
provider call is already active, the backend invalidation/attempt guard is the source of truth:
the request may finish, but its result is discarded and cannot resurrect the design.

## 6. Modal and action behavior

On both Customer Uploads and Donated Designs, remove the ordinary reversible exclusion confirmation
from the shared `CustomerUploadIntakeSection`. Exclude becomes an immediate guarded mutation using
the existing pending/error/notice state. Keep:

- permanent `Delete Upload` confirmation and exact typed confirmation;
- `Restore to Pending` confirmation;
- technical details and permission-activity modals.

In AI Review, add one dedicated non-bulk action labelled **Undo Promotion & Exclude** for eligible
sourceCustomerUpload designs only. It must not reuse `Delete Upload`, `deleteEligibleUnapprovedDesign`,
or the permanent-delete confirmation. Use a narrowly scoped warning/confirmation copy that states
the derived AI Review design will be retired, the original upload and its request/assets remain,
and the upload returns to Excluded with 14-day retention. The action is absent for imports, staff
artwork, Ready designs, and downstream-used designs. There is no bulk AI reversal in this phase.

## 7. Preview and display

Keep using the existing `previewStoragePath`/resolved `previewUrl` derivative and the existing
`CustomerUploadIntakePreviewControls` plus background resolver. Increase the default detail preview
from the current 7rem square to a responsive maximum of about 20rem in the available column:

- use intrinsic image aspect ratio with `object-fit: contain`, not a forced square crop;
- cap both inline and block dimensions at the responsive container size;
- keep Auto, Light, Dark, and Halftone behavior and persisted metadata unchanged;
- preserve the current mobile one-column layout and add overflow-safe sizing for narrow windows;
- do not fetch originals or add a new derivative.

## 8. Keyboard shortcuts

The existing AI Review convention is `a` = approve and `r` = reject, with `j`/`k` navigation and
editable-target guards. Reuse that convention in normal, single-selection intake mode:

- `a`: Send the selected eligible row to AI Review;
- `r`: Exclude the selected eligible row from catalog.

The intake action is enabled only when the selected row is action-eligible, metadata save is not
pending/failed, no modal/lightbox is open, the target is not an editable control, and multiple
select mode is off. `ArrowUp`/`ArrowDown` remain the existing guarded intake navigation and do not
change semantics. Shortcuts are disabled while a row mutation is pending. No new competing key
scheme is introduced.

## 9. Multiple Select

Add one shared multiple-select controller to `CustomerUploadIntakeSection`, so Customer Uploads and
Donated Designs get identical behavior:

- reuse the existing AI Review selection primitives for toggle, anchor, Shift+click range, and
  empty-state behavior; do not invent a second selection model;
- add an obvious toolbar with selected count, `Send to AI Review (N)`, `Exclude (N)`, and Exit;
- clicking an eligible row in multiple-select mode toggles selection and does not open its details
  or lightbox; selected rows expose a clear visual/ARIA state;
- clear selection on purpose/tab/filter/search changes, purpose changes, row removal, and live
  snapshot reconciliation; remove IDs that leave the visible list;
- run selected mutations serially, revalidate each row immediately before its callable, and keep
  successful/removed rows reconciled while failed or skipped rows remain inspectable;
- aggregate truthful partial results (`N succeeded`, `M failed/skipped`) without claiming an
  all-success operation; each promotion enqueues through the existing sequential AI background
  queue.

Bulk intake exclusion and promotion are in scope. Bulk AI Review reversal is not.

## 10. Files and Functions expected to change

Expected implementation files, subject to small routing changes discovered during implementation:

- `functions/src/returnCustomerUploadToIntakeAndExclude.ts` — new callable and strict lifecycle;
- `functions/src/lib/` design lifecycle helper extracted from the existing generic delete path;
- `functions/src/index.ts` — export the new callable;
- `functions/src/*test.ts` and/or `functions/src/lib/*test.ts` — authorization, lifecycle,
  reference, idempotency, Storage-failure, and active/stale-AI contracts;
- `packages/shared/src/types/customerUpload/customerUploadStaffActions.types.ts` — callable
  response type, only if the existing response conventions do not already cover it;
- `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts`;
- `apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts`;
- `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx`;
- `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadExclusionDialog.tsx`
  and its contract test — remove the now-unused ordinary exclusion modal;
- `apps/studio/src/renderer/src/features/customer-uploads/utils/` — focused selection/keyboard/
  bulk helpers and contract tests as needed;
- `apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx`,
  `pages/AiReviewPage.tsx`, `hooks/useAiReviewInbox.ts`, and the inbox service/types — dedicated
  single-item reversal and local reconciliation;
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts` and
  `features/imports/services/importAiBackgroundQueue.ts` — pending-ID cancellation/skip only;
- `apps/studio/src/renderer/src/styles/layout.css` — responsive larger intake preview and any
  scoped multi-select styling;
- focused tests for the existing AI Review `a`/`r` shortcut convention, intake actions, dialogs,
  selection, preview sizing, and queue race behavior.

No Portal code, customer-upload source asset path, generic permanent-delete flow, or production
configuration is expected to change.

## 11. Rules, indexes, and schema

No Firestore Rules or Storage Rules change is planned: the renderer invokes a callable, and the
Admin SDK performs the protected writes/deletes. No new composite query is planned; reference
checks reuse existing single-field/array-contains reads. No migration or backfill is planned.

No new schema is preferred. Existing `promotedAt` is retained as the promotion-time provenance
field; `promotedDesignId` is cleared only after the derived design is safely retired so the upload
can enter canonical Excluded retention. If implementation discovers that a durable reversal audit
cannot be represented by the existing fields, stop for owner review rather than adding an
unreviewed schema field.

## 12. Test and DEV deployment requirements

Implementation must test at minimum:

- staff authorization and caller revalidation;
- source provenance/link mismatch, import/staff-artwork rejection, Ready/downstream/reference
  blockers, already-excluded idempotency, and preservation of every upload/request/allocation/
  asset field;
- 14-day `staff_review` retention start and retry after partial/missing Storage cleanup;
- active/in-flight AI race: invalidation wins, stale stage/success/failure writes no-op, and no
  design is recreated;
- generic `deleteEligibleUnapprovedDesign` still blocks sourceCustomerUpload designs;
- direct exclusion has no modal, Delete Upload and Restore still do, and exact typed delete is
  unchanged;
- responsive preview aspect/overflow, `a`/`r` and Arrow navigation guards, multi-select toggle/
  range/clear behavior, serial bulk success/failure/partial result reconciliation, and existing
  AI Review shortcuts;
- Functions build, focused Functions/Shared/Studio tests, Studio typecheck/build, targeted lint,
  and `git diff --check`.

After implementation and tests, Owner DEV QA is a separate gate. With explicit owner approval,
the expected backend DEV deployment is a narrow allowlist, for example:

```text
firebase deploy --only functions:returnCustomerUploadToIntakeAndExclude,functions:<any-modified-existing-function> --project fresh-prints-dev
```

No Rules, indexes, Storage Rules, Portal hosting, production Functions, production Studio release,
or production data action is part of this Plan. The DEV deployment record and Owner DEV QA result
must be captured before Signoff.

## 13. Formal Review verdict and owner decisions

Formal Review is recorded in:
`docs/workflow/reviews/2026-09-17-studio-intake-review-efficiency-and-customer-upload-promotion-reversal-formal-review.md`.

Verdict after review: **approved_with_changes**. The bounded conditions are incorporated below and
must be accepted before implementation begins.

Owner acceptance is required for:

1. the exact reversal lifecycle (invalidate → strict derived-asset cleanup → final transaction);
2. deleting the retired pre-ready design document while retaining `promotedAt` and all original
   upload/request/allocation data, with no new audit schema;
3. the label **Undo Promotion & Exclude**, the dedicated warning/confirmation, and no bulk AI
   reversal in this phase;
4. reuse of `a`/`r` for intake Send-to-AI/Exclude and inclusion of Shift+click range selection;
5. owner-authorized DEV deployment followed by manual Owner DEV QA.

Implementation is intentionally not started by this Plan/Review pass.
