# Pre-freeze Owner QA Correctives — Request Editing, Live Sync, and Denied Intake

| Field | Value |
|---|---|
| Goal | `pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Phase | Plan → Formal Review only |
| Date | 2026-09-11 |
| Current DEV candidate | `7c775233e05a2eae65cc4b3c519d2b62a1736b16` (must not be frozen) |
| Owner QA truth | Customer-upload follow-up core **PASS**; overall Owner DEV QA **CORRECTIVE REQUIRED / NOT PASS FOR FREEZE** |
| Production | Untouched; no production deploy, publish, freeze, data operation, backfill, or maintenance activation |

## 1. Gate and objective

This is a new corrective child of the coordinated production promotion program. It records the
actual repository evidence and the smallest implementation that can resolve the two newly reported
Portal/Studio regressions and separate customer permission denials from staff exclusions. This
artifact intentionally stops before implementation. No owner QA is performed on the owner's behalf.

The existing candidate is not a freeze candidate. After this child reaches Signoff and Owner DEV QA
passes, the parent must reassemble a new candidate and regenerate its manifests before any M1 freeze
decision.

## 2. Evidence inspected

The current workflow state, handoff architecture/data/security notes, the signed-off Portal parking
and Studio editing phases, the signed-off customer-upload follow-up child, the exclusion/restore/delete
checkpoint, and the current source were read. Relevant source evidence is:

* `apps/portal/features/print-requests/hooks/useMyPrintRequests.ts` loads continuable requests with
  two one-shot equality queries and then one-shot item reads; it has no request subscription.
* `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts` owns working-item
  hydration, but its failed item load sets `itemsError` while leaving
  `hydratedWorkingRequestId` as `undefined`.
* `usePortalWorkingRequestLimitState.isWorkingPrintCountKnown()` returns false for that undefined
  hydration; `isReady` therefore remains false.
* `apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx` renders only the
  indefinite `Checking print limits…` state for that false value and does not surface `itemsError`.
* `apps/portal/features/print-requests/services/portalPrintRequestService.ts` has a 30-second
  read cache and one-shot request/item reads. Existing Portal subscriptions are used for settings,
  uploads, notifications, and other bounded surfaces, but not for print-request/item changes.
* `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` implements
  catalog selection as a direct `setDoc(printRequestItems/{id})` followed by a separate
  `updateDoc(printRequests/{id})`. The created item is therefore observable even if the parent
  update is rejected. `savePrintRequestDesignSelections` then reloads details, while the detail
  loader catches read failures into state; the selection UI currently formats generic permission
  failures as a pending-Rules message.
* Checked-in Firestore Rules allow active staff to create/read/update the request and item paths,
  but the resulting document is still validated as a whole. A live DEV Rules/document comparison is
  required before claiming the observed Studio denial is a source Rules defect.
* `CustomerUploadIntakeFilter` currently has only `pending_staff_review` and
  `excluded_from_catalog`; the existing follow-up implementation already persists
  `catalogExclusionReason: "customer_permission_denied"` and the one-time follow-up status.
* `useCustomerUploadIntake` and `CustomerUploadIntakeSection` use purpose/status queries and expose
  only Pending and Excluded. `usePendingCustomerUploadCount` counts Pending by listener snapshot;
  there is no Denied count mechanism.
* `purgeIdleCustomerUploadFullSize` is an owner/admin **manual `onCall`**, not an automatic Excluded
  cleanup. It uses `updatedAt`/`createdAt` for a 14-day idle clock, checks request/allocation
  references, deletes only source and production files, and retains the upload document, preview,
  thumbnail, and metadata. `cleanupAbandonedCustomerUploads` is a separate 24-hour manual cleanup
  for non-finalized, unattached uploads and deletes source objects only.
* `deleteEligibleCustomerUpload` is the existing manual hard-delete path. Its preview and execution
  use `resolveCustomerUploadDeletionBlockers`, `resolveCustomerUploadAssetManifest`, and
  `buildCustomerUploadBatchDeletionPatch`; any Print Request item or promoted-design reference
  blocks deletion, and the manifest fail-closes on unexpected/unowned paths. On success it deletes
  all owned upload Storage paths, updates batch metadata, and deletes the upload document.
* `functions/src/index.ts` contains no Excluded/Denied cleanup scheduler. Existing scheduled
  Functions are unrelated (for example Algolia reconciliation and assisted-proof purge).

## 3. Workstream A — exact root cause and fix boundary

### Confirmed source-level root cause

The limit state machine has a non-terminal failure path. For a valid Portal-editable `draft` or
`editing` request, `useWorkingCurrentRequestItems` can reject its one-shot item read. It records the
error in `itemsError`, but it never marks that request as hydrated or passes the error into the
limit state. `usePortalWorkingRequestLimitState` consequently keeps `isReady === false` forever;
`CustomerUploadPanel` treats that as “Checking print limits…” and disables Upload Designs and the
catalog Add-to-request actions. This is why an empty request can be unusable even though the Editing
request itself still exists.

The exact failing DEV read (Rules drift, a malformed request/item record, or another environmental
condition) is not proven from source alone and is marked `[NEEDS DEV REPRO]`. The new permission
workflow is not assumed to be the cause. Implement must capture the failing operation/path and
error code before changing Rules or data.

### Required implementation shape

* Represent working-item resolution as a terminal state: hydrated-empty, hydrated-nonempty, or
  failed. A failed read must be visible as a safe error/retry state, never an infinite spinner and
  never an assumed zero count.
* Preserve the existing `workingRequest` selection, Editing-over-draft priority, parked-draft
  exclusion, one-working-request rule, quota calculation, and `studio_customer` non-editability.
* Ensure a successful empty snapshot sets `hydratedWorkingRequestId` to the active request ID and
  yields room under the configured limit. Removing the final item must not clear the request
  selection or convert it to virtual-empty.
* Keep the source of truth in the existing Component → Hook → Service path. Do not bypass the
  server quota callables and do not add a polling loop.

## 4. Workstream B — exact Studio partial-write finding and live-sync design

### Confirmed operation shape

The Studio Design Library selection path is:

`DesignLibraryPage` → `usePrintRequestSelectionMode` →
`savePrintRequestDesignSelections` → `addPrintRequestItem`.

For a catalog item, `addPrintRequestItem` writes the new `printRequestItems` document first and
then updates `printRequests.itemCount`/audit fields in a separate direct write. The checked-in Rules
permit active staff for both operations, but whole-document validation and deployed DEV drift have
not yet been compared. The reported “item appears, then Missing or insufficient permissions” is
therefore consistent with a second-operation failure after a successful first write, not proof that
the item create was denied. No retry may blindly repeat the create.

### Required diagnostic before a fix

Instrument the operation (sanitized operation phase, request/item IDs only, no document bodies or
secrets) and reproduce against `fresh-prints-dev` with the authorized owner. Distinguish:

1. item create rejection;
2. parent update rejection (including the exact Rules/document condition);
3. post-write detail read or listener rejection; and
4. UI error classification/navigation after a committed write.

If the deployed DEV Rules differ from checked-in Rules, record that as environment drift and use the
separate DEV Rules checkpoint required by FreshForge. If the checked-in Rules genuinely reject a
valid staff write, prepare the minimum Rules correction and full Rules regression; do not relax
customer access or hide the error.

### Reviewed implementation direction

* Make the Studio item-create + parent-counter update one atomic staff write (or an equivalently
  trusted server transaction) so a parent failure cannot leave an orphan item. Preserve the current
  synthesized return shape and size/quantity validation. The customer Portal callable path remains
  unchanged; its multi-write/read-budget rationale must not be copied into the staff-only path.
* Make success/error reporting phase-aware. A committed write must report success and reconcile once;
  a rejected write must show the real failure and must not invite a duplicate create. If a
  post-commit refresh fails, report that as refresh/reconciliation failure without claiming the write
  was rolled back.
* Add a bounded Firestore subscription for Portal-editable customer requests and the selected
  working request's items. Reuse the existing trace/unsubscribe conventions and Rules predicates:
  two status-equality request listeners may be merged by ID, and one `printRequestItems` listener
  scoped to the active request ID may own item hydration. No arbitrary interval polling is allowed.
* Keep the existing optimistic removal/add safeguards and generation checks. A listener emission
  must not resurrect a pending removal, switch a customer to a parked draft, or make a
  `studio_customer` request editable.

## 5. Workstream C — Denied tab and count

### State-model decision

Use classification **A**: Denied is a query/UI classification over
`catalogReviewStatus == "excluded_from_catalog"` and
`catalogExclusionReason == "customer_permission_denied"`. Do not add a new lifecycle status or
perform a migration. The existing typed reason, original `catalogUseAcknowledged === false`, and
follow-up status remain authoritative. Staff exclusion remains Excluded (`staff_review`).

This preserves the signed-off transitions:

* initial denial → Denied;
* one Ask Again while follow-up is `not_requested`;
* Allow → Pending;
* second Decline → Denied, no third request;
* generic Restore is unavailable and server-rejected for a Denied row unless the follow-up is already
  approved (then the existing idempotent Pending result applies).

### Query and count design

* Add a bounded Denied list query for the print-request intake that filters the two authoritative
  fields and orders by `createdAt desc`. Legacy documents with missing `purpose` are treated as
  print-request by the existing convention; donation denial is prohibited by the trusted
  confirmation/follow-up callables and must remain excluded by a defensive client predicate.
* Add the matching count query using the Firebase aggregation `getCountFromServer` (or an equivalent
  Admin-backed count if the SDK/emulator proves aggregation unavailable). The count must not be
  derived from rendered cards or a load-more page. Refresh it when the Denied listener emits and
  after each follow-up/restore/exclusion mutation; never perform an unbounded client document scan.
* The current index file has `customerUploads(catalogReviewStatus, createdAt)` and
  `customerUploads(purpose, catalogReviewStatus, ...)`, but no
  `catalogExclusionReason` index. The list/count query will likely require one reviewed composite
  index on `catalogReviewStatus ASC, catalogExclusionReason ASC, createdAt DESC`; verify with the
  emulator/CLI before editing `firestore.indexes.json`. If a different query plan avoids a new
  index without a full scan, document that evidence. Any new index changes the parent M0 union and
  must be reassembled/reconciled before freeze.
* Render Pending / Denied / Excluded with the existing Studio tab primitives. Denied cards show the
  follow-up state and Ask Again only in the signed-off open state. They do not show generic Restore.
  Existing Excluded Restore/Delete and Pending promotion behavior remain unchanged.
* Do not add an Excluded badge automatically in this child. The current intake UX has no per-tab
  counts (the existing listener count is a sidebar Pending badge), and adding a second aggregate
  badge would expand query/index/UI scope without being required for the Owner defect. During
  Implement, confirm whether the shared count hook makes an Excluded count genuinely zero-cost;
  otherwise record Excluded count as a follow-up recommendation while keeping the required Denied
  count authoritative.

## 6. Workstream D — unified Denied + Excluded retention

### Repository finding

`[NEEDS REPO CHECK — expected 14-day Excluded cleanup not implemented]` is resolved by source
inspection as follows: there is **no automatic Excluded or Denied document cleanup**. The only
14-day customer-upload operation is the manually invoked `purgeIdleCustomerUploadFullSize`, which
uses the generic `updatedAt`/`createdAt` idle clock for ready print-request uploads, removes source
and production files only, and preserves the upload document plus preview/thumbnail. The separate
`cleanupAbandonedCustomerUploads` is a manually invoked 24-hour orphan-source cleanup. Neither is
a Denied/Excluded-specific scheduler, and neither hard-deletes the Firestore upload record.

The existing hard-delete path is the safety authority: it checks every `printRequestItems` reference,
promoted-design references, a canonical owned-asset manifest, and batch metadata before deleting
all owned Storage derivatives and the upload document. A reference from an active **or historical**
Print Request blocks hard deletion. Promoted assets are never deleted through upload cleanup.
Donations are outside the Denied reason contract and are not cleanup candidates.

### Unified data model and timestamp rules (implementation only after this Review/owner acceptance)

Use one current-episode field, `catalogRetentionStartedAt`, for both visual queues. It is additive
and does not replace `catalogPermissionOriginalDeniedAt`, `catalogUseAcknowledged`, follow-up audit
history, `catalogExclusionReason`, or existing staff actor/time evidence.

* Initial authenticated customer denial: write immutable
  `catalogPermissionOriginalDeniedAt` and `catalogRetentionStartedAt` from the same trusted server
  timestamp; status is Excluded with reason `customer_permission_denied`.
* Staff exclusion of an eligible Pending upload: set reason `staff_review` and start
  `catalogRetentionStartedAt` from a trusted server timestamp. An idempotent repeat of an already
  excluded row preserves the current timestamp; a meaningful re-exclusion after Restore starts a
  new episode.
* Ask Again: set follow-up `requested`, preserve the timestamp for audit, and pause cleanup while
  the request is outstanding.
* Customer Allow or staff Restore: transition to Pending and clear the active retention timestamp
  (or otherwise make it explicitly inactive); this removes cleanup eligibility. Original denial and
  follow-up history are preserved.
* Second customer Decline: preserve the original denial timestamp, set follow-up `declined`, and
  restart `catalogRetentionStartedAt` from the trusted response timestamp.
* Unrelated metadata edits do not restart the clock. No client can write the timestamp directly.

### Unified scheduled cleanup

Add one daily, bounded scheduled Function (provisional name
`purgeExpiredCustomerUploadCatalogRetention`) covering both reason values. It queries only Excluded
rows with an expired `catalogRetentionStartedAt`, uses a page size/cursor and maximum per-run cap,
and emits sanitized per-row outcomes: eligible, deleted, deferred-reference, deferred-follow-up,
invalid-manifest, or failed/retryable. A dry-run must perform no deletes. The job is idempotent and
safe to resume; one bad row cannot abort or corrupt other rows.

For an unreferenced eligible row, reuse the existing safe-delete authority and perform the existing
hard-delete sequence: verify blockers and the canonical asset manifest, delete all upload-owned
Storage derivatives, apply the batch metadata patch, then delete the `customerUploads` document.
Storage failure retains the Firestore row for retry. Any active or historical Print Request item,
promoted Design, active allocation/production dependency, malformed/unexpected asset, unowned path,
or other existing safety blocker defers physical deletion. If a referenced row qualifies for the
existing full-size purge, that separate operation may remove only source/production while retaining
the record/history; it must never bypass hard-delete blockers. Donations remain outside both reason
values and therefore outside this job.

A scheduler is not deployed during Plan/Review. Implementation must extract/reuse the existing
`resolveCustomerUploadDeletionBlockers`, `resolveCustomerUploadAssetManifest`, and
`buildCustomerUploadBatchDeletionPatch` logic rather than duplicate deletion code. Any DEV deploy
requires its own explicit checkpoint.

## 7. Expected files (confirm at Implement; conditional paths are marked)

Portal runtime and tests:

* `apps/portal/features/print-requests/hooks/useMyPrintRequests.ts`
* `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts`
* `apps/portal/features/print-requests/hooks/usePortalWorkingRequestLimitState.ts`
* `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx`
* `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
* `apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx`
* focused Portal request/listener/limit/upload tests and any extracted state controller

Studio runtime and tests:

* `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts`
* `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.ts`
* `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeQueries.ts`
* `apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts`
* `apps/studio/src/renderer/src/features/customer-uploads/hooks/usePendingCustomerUploadCount.ts`
  (or its narrowly renamed shared count hook)
* `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx`
* `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts`
* focused intake/query/count and Studio write-state tests

Trusted/shared retention state:

* `functions/src/lib/customerUploadCatalogConfirmation.ts`
* `functions/src/respondToCustomerUploadCatalogPermissionFollowUp.ts`
* `functions/src/excludeCustomerUploadFromCatalog.ts`
* `functions/src/restoreCustomerUploadCatalogEligibility.ts`
* `functions/src/lib/customerUploadDeletionEligibility.ts` (reuse/extract only)
* `functions/src/deleteEligibleCustomerUpload.ts` (reuse/extract only)
* `functions/src/index.ts`
* conditional new `functions/src/purgeExpiredCustomerUploadCatalogRetention.ts` and retention utility/tests
* `packages/shared/src/types/customerUpload/customerUpload.types.ts`
* `packages/shared/src/types/customerUpload/customerUpload.enums.ts` only if a type is genuinely needed
* `docs/architecture/DATA_MODEL.md` and the applicable ADR/retention documentation
* conditional `firestore.indexes.json` entries established by emulator/CLI evidence: the Denied
  status/reason/createdAt list-count index and the scheduler status/retention-start index

`firestore.rules` and `storage.rules` are not expected to change. If the DEV reproduction proves a
real Rules defect, the exact minimal rule and full regression must be separately reviewed; no source
Rules or Storage Rules change is presumed from the permission message.

## 8. Testing and validation plan

The eventual Implement → Test gate must include:

* A exact owner sequence: queued request → remove from show → Editing → remove final item → empty
  request remains selected and editable; limit reaches either ready-empty or explicit error; no
  indefinite spinner; first catalog add and first upload work; one-working and `studio_customer`
  protections remain.
* B operation-phase tests proving atomic Studio success/failure, no orphan/duplicate on retry,
  truthful post-commit refresh errors, existing owner/non-owner authorization, and no customer
  Rules relaxation.
* Firestore listener tests for request status/item add/remove, external Studio add visibility,
  unsubscribe/generation races, parked-draft exclusion, and bounded reads. No polling timer.
* C Denied/Excluded/Pending classification, count aggregation independent of pagination, count
  transitions, Ask Again/Allow/Decline, no third request, and generic Restore rejection.
* D shared retention transitions for both queues: initial Denied, requested pause, Allow exit,
  second-Decline restart; staff Excluded timestamp creation, Restore exit, meaningful re-exclusion
  restart, unrelated-metadata preservation, and both 14-day boundaries. Cover scheduled dry-run,
  mixed Denied/Excluded pagination and cursor/resume, per-row isolation, idempotency, Storage and
  batch cleanup, invalid-manifest failure, promoted-design blocker, active/historical request
  reference blocker, and ordinary staff Excluded restore/delete regressions.
* Existing customer-upload follow-up, Portal maintenance guard, and safe-delete contracts.
* If Rules/indexes change: the complete Firestore Rules suite, expression-budget fixtures, and index
  deployment/readiness evidence. Otherwise document “no Rules change” explicitly.
* Functions build; Portal typecheck/build in the available environment; Studio targeted validation
  and Vite build; targeted lint; and `git diff --check`. Existing unrelated Studio typecheck and
  Windows Portal `.next/trace` baselines must remain separately documented if they recur.

## 9. Candidate, rollout, and rollback impact

The current SHA `7c775233e05a2eae65cc4b3c519d2b62a1736b16` remains unfrozen. Runtime changes to
Portal, Studio, Functions, shared types, or indexes require a new parent M0 candidate assembly and
fresh Function closure, guard, Rules/Storage, index, Portal/Studio input, maintenance, config/data,
and exclusion manifests. The intentionally excluded request-design parity Plan remains excluded.

No production Functions/Rules/Storage/Hosting deployment, Studio publication, maintenance change,
backfill, Algolia rebuild, Smart Profile reprocess, customer mutation, merge, or candidate freeze is
authorized by this phase. Approved production backfills remain an overnight-window requirement for
the later rollout plan. AI autonomy remains OFF. If implementation requires a DEV Rules/data change,
stop for its explicit checkpoint; production remains untouched.

## 10. Proposed next gate

After Formal Review, the owner must explicitly accept the reviewed Plan/Review and authorize
`Implement → Test` for this corrective child. The exact decision requested is:

`OWNER ACCEPT PLAN AND FORMAL REVIEW FOR pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake — AUTHORIZE IMPLEMENT → TEST; KEEP CANDIDATE 7c775233e05a2eae65cc4b3c519d2b62a1736b16 UNFROZEN; NO PRODUCTION ACTION`

No implementation begins before that decision.
