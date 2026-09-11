# Formal Review — Pre-freeze Owner QA Correctives

| Field | Value |
|---|---|
| Goal | `pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Reviewed Plan | `docs/workflow/plans/2026-09-11-pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake-plan.md` |
| Review date | 2026-09-11 |
| Review phase | Formal Review; no implementation authorized |
| Verdict | **`approved_with_changes` — owner acceptance required before Implement → Test** |
| Candidate | `7c775233e05a2eae65cc4b3c519d2b62a1736b16` remains unfrozen and not approved for freeze |
| Production | Untouched; no production action is authorized |

## Review basis

The Plan was independently checked against the current Portal, Studio, Functions, shared types,
Firestore Rules/indexes, and the prior signed-off parking, editing, follow-up, and safe-delete
artifacts. The Owner's customer-upload follow-up core PASS is preserved, but the overall QA status is
correctly **CORRECTIVE REQUIRED / NOT PASS FOR FREEZE**.

## 1. Workstream A root cause

The reproducible source defect is a limit-state liveness hole, not a proven permission-feature
regression. `useWorkingCurrentRequestItems` owns item hydration. On a rejected one-shot item read it
sets `itemsError` but leaves `hydratedWorkingRequestId` undefined. The limit hook's
`isWorkingPrintCountKnown` deliberately treats undefined as unknown, so `isReady` remains false.
`CustomerUploadPanel` has no error branch for that state and renders `Checking print limits…`
indefinitely, disabling both upload and Add-to-request actions. A successful empty snapshot is
different: it must set the active request ID as hydrated and yield room under the limit.

This is a confirmed state-machine defect. The exact DEV trigger for the rejected item read (deployed
Rules drift, malformed data, or another path condition) is not yet proven and must be captured in
Implement before any Rules/data change. The new permission workflow is not treated as the cause by
assumption.

Required change: make hydrated-empty, hydrated-nonempty, and failed terminal states explicit; surface
safe error/retry for failed reads; keep zero-item Editing requests selected and editable; never
convert a failed read into a zero count or quota bypass.

## 2. Workstream B permission message root cause

The current Studio path has a confirmed partial-write hazard. `savePrintRequestDesignSelections`
calls `addPrintRequestItem`; the catalog branch first `setDoc`s the item and then separately
`updateDoc`s the parent request's `itemCount`, `updatedBy`, and `updatedAt`. A failure in the second
operation leaves the item visible even though the UI receives a permission error. Checked-in Rules
allow staff on both paths, but whole-document validation and the live DEV Rules/document have not
been compared, so “stale Rules” is a hypothesis, not a finding. The diagnostic must identify whether
the item write, parent write, post-write detail read, or UI reconciliation failed.

Required change: reproduce with sanitized phase/path diagnostics first; then make the staff item +
parent-counter mutation atomic (or use an equivalent trusted server transaction), and report a
committed write separately from a post-commit refresh failure. Retrying a failed operation must not
blindly create a duplicate. Do not weaken customer Rules or hide a real rejection.

## 3. Current Portal realtime architecture

Portal request chrome is one-shot and cache-backed. `useMyPrintRequests` calls two equality queries
for `draft`/`editing`, then one-shot item queries; `portalPrintRequestReadCache` can retain results
for 30 seconds. `useWorkingCurrentRequestItems` reloads items with `getDocs` and has generation/
optimistic-removal protections, but no `onSnapshot` for requests or request items. Existing live
patterns are present elsewhere (settings, uploads, notifications, customer profiles), so the
architecture supports a narrow subscription without introducing polling.

## 4. Reviewed realtime fix

Add a request-scoped, bounded Firestore subscription layer using the existing trace and unsubscribe
conventions:

* two status-equality request listeners (`customerId` + `draft`, `customerId` + `editing`) merged by
  ID, preserving Editing priority, parked-draft exclusion, and Portal-origin editability;
* one item listener scoped to the active working request ID, owned by the existing working-item hook;
* listener errors become the same explicit terminal error state as one-shot failures;
* snapshot add/remove/status changes reconcile with pending-removal and generation guards;
* no interval or arbitrary polling loop, and no `studio_customer` promotion into Portal editability.

The subscription may coexist with one-shot full-history loads; it must not widen the Portal query
scope or Rules. External Studio item creation must appear in the active Portal request without a hard
refresh.

## 5. Denied state-model decision

The reviewed decision is **classification A**, not a new persisted lifecycle status. Denied is
`catalogReviewStatus == "excluded_from_catalog"` plus
`catalogExclusionReason == "customer_permission_denied"`; Excluded remains the same status with
`catalogExclusionReason == "staff_review"`. This directly reuses the signed-off trusted fields,
avoids migration, and keeps the original `catalogUseAcknowledged === false` immutable audit evidence.

The existing follow-up contract remains unchanged: one Ask Again while open, Allow → Pending,
second Decline remains Denied, and generic Restore cannot grant consent. If implementation evidence
shows classification A would require an unsafe unbounded scan or a materially different index model,
stop and return to Review before switching to classification B.

## 6. Denied count design

The Denied tab must not derive its badge from the currently rendered 50-card page. Use an aggregate
`getCountFromServer` query (or a narrowly equivalent Admin count if the SDK/emulator cannot support
aggregation) over the authoritative status + reason predicate. Refresh it on the Denied listener
emission and after each relevant mutation. The query must remain bounded in returned data and must
not scan the collection client-side.

The current indexes contain status/createdAt and purpose/status variants but no exclusion-reason
field. A list/count query ordered by `createdAt` will likely require one new composite
`catalogReviewStatus ASC, catalogExclusionReason ASC, createdAt DESC`; this is an Implement-time
emulator/CLI fact check, not an automatic index edit. If required, the parent 87-entry union and all
M0 manifests change and must be regenerated before freeze. The trusted callables already prohibit
the permission-denied reason for donations; a defensive list predicate must still exclude malformed
donation rows.

An Excluded badge is **not added automatically** in this child. Existing intake tabs do not expose
per-tab counts; the current count listener is a sidebar Pending badge. During Implement, verify
whether the shared aggregate-count hook makes an Excluded count genuinely zero-cost. If not, record
it as a follow-up recommendation rather than expanding the approved scope merely because the shared
retention job now handles both queues.

## 7. Existing Excluded cleanup/retention finding

The required repository check is complete: **there is no automatic 14-day Excluded or Denied cleanup**.
`purgeIdleCustomerUploadFullSize` is a manual owner/admin `onCall`; it applies a 14-day
`updatedAt`/`createdAt` idle clock to ready print-request uploads, checks allocation and working
request references, deletes source + production only, and retains the upload document, preview,
thumbnail, and metadata. `cleanupAbandonedCustomerUploads` is a separate manual 24-hour cleanup for
unfinalized unattached uploads and deletes source objects only. `functions/src/index.ts` has no
Denied/Excluded scheduler.

The existing `deleteEligibleCustomerUpload` path is the hard-delete authority. It checks all
`printRequestItems` references (including historical ones), promoted-design references, and a
canonical upload-owned Storage manifest; it fails closed on malformed/unowned paths, patches batch
metadata, then deletes every owned derivative and the upload document. It is not currently invoked
automatically for Excluded rows.

## 8. Unified 14-day Denied + Excluded contract

The Owner's product decision changes the scope from Denied-only to one shared safe-retention system
for both Denied and staff-Excluded uploads. The Review accepts the following additive timestamp
contract with these changes locked:

* Initial customer denial writes immutable `catalogPermissionOriginalDeniedAt` and shared mutable
  `catalogRetentionStartedAt` from one trusted server timestamp; status is Excluded with reason
  `customer_permission_denied`.
* Staff exclusion writes reason `staff_review` and starts `catalogRetentionStartedAt` from a trusted
  server timestamp. An idempotent repeat preserves the timestamp; a meaningful re-exclusion after a
  Restore starts a new episode. Unrelated metadata edits never restart it.
* Ask Again sets follow-up `requested`, preserves the timestamp for audit, and pauses Denied cleanup
  while the request is outstanding.
* Customer Allow or staff Restore returns the row to Pending and clears (or explicitly inactivates)
  the current retention timestamp. Original denial/follow-up and staff exclusion audit remain.
* Second Decline preserves the original denial timestamp, sets `declined`, and restarts
  `catalogRetentionStartedAt` from the trusted response timestamp.
* One daily bounded, cursor/cap-limited, retryable scheduled job handles both reason values. It
  reports eligible, deleted, deferred-reference, deferred-follow-up, invalid-manifest, and
  failed/retryable outcomes. Any Print Request reference (active or historical), promoted design,
  active allocation/production dependency, or invalid/unowned asset defers the row and never permits
  forced deletion.
* Unreferenced eligible rows use existing hard-delete semantics: all owned derivatives, batch patch,
  and Firestore document. Storage failure retains the row for retry. A dry-run performs no deletes.
  Referenced artwork may use only the existing safe source/production full-size purge and may not
  bypass hard-delete blockers.

The scheduler and retention field are implementation scope after owner acceptance, not a Plan/Review-
time destructive action. Donations remain outside both reason values and the cleanup job.

## 9. Safe-delete/reference protection

The safety boundary is sufficient if reused, not duplicated: `resolveCustomerUploadDeletionBlockers`
blocks any request-item or promoted-design reference; `resolveCustomerUploadAssetManifest` verifies
all persisted Storage paths belong to the customer/upload and rejects unknown `*StoragePath` fields;
`buildCustomerUploadBatchDeletionPatch` removes the upload from ZIP metadata and adjusts counts.
Because request and catalog lifecycles are independent, deleting an upload that is still referenced
by an active or retained Print Request would break production/history and is prohibited. No cleanup
change may relax these checks.

## 10. Exact expected file scope

The Plan's file list is accepted as the implementation boundary. In summary it covers:

* Portal request/item hooks, service, context, limit state, upload panel, and focused tests;
* Studio request-item service/selection state and customer-upload query, hook, count, component,
  service, and focused tests;
* trusted follow-up confirmation/response and shared customer-upload types;
* extraction/reuse of the existing safe-delete helper plus a conditional new Denied retention
  Function/utility and its tests;
* `functions/src/index.ts`, data-model/ADR documentation, and a conditional reviewed index entry.

`firestore.rules`/`storage.rules` are not expected to change. Any Rules change requires a new exact
reviewed diff, expression-budget tests, and its own DEV deployment checkpoint. The intentionally
excluded request-design parity Plan remains untouched and unstaged.

## 11. Rules and index impact

No source Rules relaxation is justified by the current evidence. The new listeners use existing
customer ownership predicates, and staff writes retain existing staff authorization. The Denied
list/count likely adds one composite index as described above; verify rather than assume. A new
scheduled Function uses Admin SDK and does not itself require client Rules. Any index/Rules change
must be reflected in the parent M0 union and manifests.

## 12. Testing strategy

The Review locks the Plan's focused tests, including:

* exact queued → unqueue → Editing → remove-final-item repro, terminal empty/error limit state,
  first catalog replacement, first upload, one-working/parked/`studio_customer` protections, and
  no quota bypass;
* Studio atomic success/failure, operation-phase truthfulness, no duplicate on retry, owner and
  non-owner authorization, and post-commit refresh distinction;
* request/item listener add/remove/status and unsubscribe/generation races, including external Studio
  add appearing in Portal without hard refresh and no polling timer;
* Denied/Excluded/Pending classification, aggregate count independent of pagination, count
  transitions, Ask Again/Allow/Decline/no third request, and Restore rejection;
* shared retention boundary for both queues: initial Denied, requested pause, Allow exit,
  second-Decline restart, staff Excluded timestamp, Restore exit, meaningful re-exclusion restart,
  unrelated-metadata preservation, mixed Denied/Excluded dry-run/cursor/idempotency, per-row
  isolation, Storage/batch cleanup, invalid manifest, promoted/reference blockers, and existing
  Excluded safe-delete regressions;
* maintenance guard, Functions build, Portal typecheck/build, Studio targeted validation/build,
  targeted lint, and `git diff --check`. If Rules/indexes change, run the complete Rules suite and
  expression-budget fixtures.

## 13. Production candidate impact

The current candidate `7c775233e05a2eae65cc4b3c519d2b62a1736b16` remains unfrozen. Any runtime or
index change requires parent M0 reassembly at a new SHA and regeneration of closure, guard,
Rules/Storage, index, Portal/Studio, maintenance, config/data, and exclusion manifests. No
production deployment, publication, maintenance activation, backfill, data mutation, merge, or
freeze is authorized. Approved production backfills remain scheduled for a later overnight window;
AI autonomy remains OFF.

## 14. Formal Review verdict

**`approved_with_changes`**. The corrective child is suitable for implementation after owner
acceptance, provided the locked diagnostics, atomic write, terminal limit state, bounded subscriptions,
classification-A count/index fact check, and safe retention/deletion conditions above are met. No code
may be changed before the owner accepts this Plan and Review.

## 15. Exact next owner decision

`OWNER ACCEPT PLAN AND FORMAL REVIEW FOR pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake — AUTHORIZE IMPLEMENT → TEST; KEEP CANDIDATE 7c775233e05a2eae65cc4b3c519d2b62a1736b16 UNFROZEN; NO PRODUCTION ACTION`

Until that exact checkpoint is accepted, the workflow remains at Plan/Formal Review and stops here.
