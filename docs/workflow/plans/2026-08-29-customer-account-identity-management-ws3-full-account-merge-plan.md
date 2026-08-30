# Plan: Customer Account Identity Management — WS3 Full Account Merge

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Author | Planning Agent |
| Status | **approved — owner 2026-08-29** |
| Workflow | managed-phase |
| Goal id | `customer-account-identity-management-ws3-full-account-merge` |
| Master plan | `docs/workflow/plans/2026-08-28-customer-account-identity-management-and-audit-plan.md` |
| WS1 signoff | `docs/workflow/reviews/2026-08-28-customer-account-identity-management-ws1-signoff.md` |
| WS2 signoff | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws2-signoff.md` |
| Production | **NOT AUTHORIZED** |

---

## Goal

Deliver a safe, owner-only **Merge Accounts** workflow that consolidates two customer identities into one surviving canonical account while preserving immutable historical truth, Print Request integrity, uploads, show relationships, and audit traceability.

The source account must not behave as an independent active customer after a successful merge.

---

## Product distinction (do not blur with WS2)

| Tool | Studio label | When to use |
|------|--------------|-------------|
| **WS2 (done)** | **Transfer Username** | Move username only; survivor stays login; source disabled; **no** history reassignment |
| **WS3 (this plan)** | **Merge Accounts** | Same person; survivor canonical; operational history consolidated; source becomes merge tombstone |

Do not rename Transfer Username back to duplicate-resolution language.

---

## Primary scenario

**Source (old):** email/password account with historical print requests, uploads, allocations, favorites, etc. Customer no longer wants this login.

**Survivor (new):** Google (or other) account customer wants to keep; future activity; chosen username.

Owner selects **Account to Merge** and **Account to Keep**. After merge: survivor canonical; source cannot Portal-login separately; eligible operational data owned by survivor; immutable snapshots preserved; source doc tombstoned with merge metadata.

---

## Repo paths discovered (2026-08-29 inspection)

### Shared / types

- `packages/shared/src/types/customer/customer.types.ts` — `isMerged`, `mergedIntoCustomerId` (partial); `nextPrintRequestSequence`
- `packages/shared/src/types/customer/customerIdentity.types.ts` — locks, propagation state
- `packages/shared/src/types/customer/customerDuplicateResolution.types.ts` — WS2 contracts (reuse patterns)
- `packages/shared/src/types/customer/customerActivityEvent.types.ts`
- `packages/shared/src/types/printRequest/printRequest.types.ts`
- `packages/shared/src/types/printRequest/convertCustomerPrintRequestToInternal.types.ts`
- `packages/shared/src/types/showAllocation/showAllocation.types.ts`
- `packages/shared/src/types/customerUpload/customerUpload.types.ts`
- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts`
- `packages/shared/src/constants/customerUpload/customerUploadStoragePaths.ts`
- `packages/shared/src/utils/portalPrintRequestEditability.ts`
- `packages/shared/src/utils/printRequestConversion.ts`

### Functions — WS1/WS2 foundations

- `functions/src/lib/customerAccountEligibility.ts`
- `functions/src/lib/customerIdentityEligibilitySnapshot.ts`
- `functions/src/lib/customerIdentityOperationLock.ts`
- `functions/src/lib/customerIdentityOperationPreview.ts`
- `functions/src/lib/customerUsernameTransfer.ts`
- `functions/src/lib/customerContinuablePrintRequests.ts`
- `functions/src/lib/propagateCustomerIdentitySnapshots.ts`
- `functions/src/lib/applyCustomerAccountDisableInternal.ts`
- `functions/src/lib/customerActivityEvents.ts`
- `functions/src/lib/portalWorkingPrintRequest.ts`
- `functions/src/lib/portalCustomer.ts`
- `functions/src/transferCustomerUsername.ts` — preview/apply pattern reference
- `functions/src/convertCustomerPrintRequestToInternal.ts`
- `functions/src/disableCustomerAccount.ts`
- `functions/src/ownerDeleteUser.ts` — inverse cascade inventory reference (dev-gated)

### Studio

- `apps/studio/.../ResolveDuplicateAccountWizard.tsx` — WS2 UX pattern (separate Merge wizard)
- `apps/studio/.../customerIdentityManagementService.ts`
- `apps/studio/.../utils/customerDirectoryVisibility.ts`
- `apps/studio/.../pages/UserManagementPage.tsx`

### Rules

- `firestore.rules` — `customerIdentityOperationPreviews`, `customerActivityEvents`

**Not in repo:** `customerMergeJobs`, merge callables, Storage UID migration helper, merge activity event types, merged directory tab.

---

## Current ownership graph (summary)

```text
customers/{id} ──userId──► Firebase Auth
              ──username──► customerUsernames/{username}

Owned by customerId (+ often customerUid when Auth present):
  printRequests, showAllocations, customerUploads, customerUploadBatches,
  assistedCreationRequests, customerNotifications, emailDeliveryJobs,
  etsyRecommendationRequests, etsySuggestionRequests, designIssueReports,
  customRequests (legacy)

Subcollections:
  customers/{id}/favorites/{designId}
  customers/{id}/webPushSubscriptions/{id}

Storage (UID-keyed):
  customer-uploads/{customerUid}/...
  assisted-creation/{customerUid}/...
```

Survivor keeps **survivor customerId + survivor Auth UID** (owner decision — do not swap Auth UID).

---

## Proposed Studio UX — Merge Accounts

**Entry:** Users → Customers → **Merge Accounts** (owner-only; distinct from **Transfer Username**)

| Step | Purpose |
|------|---------|
| 1 | Select two accounts (searchable Select) |
| 2 | Choose **Account to Merge** vs **Account to Keep** (clear username/email cards) |
| 3 | Preview identity comparison |
| 4 | Preview merge inventory + blockers |
| 5 | Resolve blockers (external flows) |
| 6 | Review final consequences + username choice |
| 7 | Typed confirmation phrase |
| 8 | Start merge → show resumable progress |
| 9 | Complete / partial failure / retry |

Not a single Firestore transaction.

---

## Preview contract — `previewCustomerAccountMerge` (planned)

**Owner-only callable.** Server-authoritative inventory.

### Request (conceptual)

```ts
{
  sourceCustomerId: string;   // Account to Merge
  survivorCustomerId: string; // Account to Keep
  survivorUsernameChoice?: string; // optional if both have usernames
}
```

### Response must include

- Source + survivor identity summaries (Auth providers, emails, uids, lifecycle)
- Username reservations for both + planned survivor username
- Blockers (continuable PRs, locks, tombstoned/merged, dual continuable)
- Counts / IDs for every Appendix A collection (see migration matrix)
- Storage prefix inventory when UIDs differ
- Planned merge stages summary
- `previewId`, `previewChecksum`, `previewExpiresAtMillis` (reuse WS1/WS2 preview model; operation `account_merge`)
- Recommendation: `ELIGIBLE` | `BLOCKED_*`

### Revalidation on Apply

Same checksum inputs as preview: eligibility snapshots, continuable PR sets, reservations, locks, username choice.

---

## ADR-FP-071 / continuable working requests

**Definition:** `isPortalEditablePrintRequest` — draft/editing + portal_customer origin + not internal.

| Case | WS3 policy (proposed) |
|------|------------------------|
| Both have continuable | **BLOCK** — owner resolves via existing PR flows first |
| Source only | **Reassign** source continuable PR to survivor if survivor has none (master-plan direction) — differs from WS2 transfer which blocks source-only |
| Survivor only | **ALLOW** if other checks pass |
| Neither | **ALLOW** |

Do **not** auto-combine request items. Reassign `printRequests.customerId` only after explicit merge stage.

`[NEEDS REPO CHECK]` Confirm no Portal branch resolver assumes immutable customerId on continuable draft after mid-merge partial state.

---

## Print Request migration plan

| State / type | Action |
|--------------|--------|
| All `printRequests` with `customerId == source` | Reassign to survivor (batch + cursor) |
| `printRequestItems` | Follow parent via `printRequestId` — no direct customerId |
| Immutable | `name`, `customerUsernameAtCreationSnapshot`, `customerDisplayNameAtCreationSnapshot`, allocation `requestNameSnapshot` |
| Mutable snapshots | Update via `propagateCustomerIdentitySnapshots` post-merge username/display change |
| Converted pairs | Preserve `closureKind: converted_to_internal`, `convertedToInternalRequestId`; survivor inherits archived customer PR; internal PR stays without customerId |
| Internal-only requests | Unaffected unless incorrectly keyed to source customerId |

Sequence counter: **`max(source.nextPrintRequestSequence, survivor.nextPrintRequestSequence)`** on survivor; reconcile `totalPrintRequests` per repo field semantics `[NEEDS REPO CHECK]` exact counter fields on Customer.

---

## CR → IR traceability

Inspect at implement time:

- `functions/src/convertCustomerPrintRequestToInternal.ts`
- `packages/shared/src/utils/printRequestConversion.ts`
- Archived source fields: `convertedToInternalRequestId`, closure metadata

Merge must not break linkage. WS4 will surface grouped history + deep links — survivor query must discover source-origin requests post-reassign while preserving conversion metadata.

---

## Show allocations

- Reassign `showAllocations.customerId` from source → survivor where tied to source-owned print requests or direct source customerId.
- Do **not** rewrite frozen snapshots (`requestNameSnapshot`, `requestOriginSnapshot`).
- `[NEEDS REPO CHECK]` Legacy allocations missing `customerId`.

---

## Uploads + Storage (critical)

When source and survivor **Auth UIDs differ**:

1. Inventory `customerUploads` / `customerUploadBatches` (customerId + customerUid)
2. Copy Storage objects `customer-uploads/{sourceUid}/...` → `customer-uploads/{survivorUid}/...`
3. Verify destination (size/hash or existence)
4. Update Firestore paths + ownership fields
5. Delete source Storage only after verify
6. Same pattern for `assisted-creation/{uid}/...`

**No Storage migration utility exists today** — new module required:

`functions/src/lib/customerAccountMergeStorageMigration.ts` (proposed)

Idempotent stage cursors per prefix/upload id.

---

## Assisted Creation

Reassign `assistedCreationRequests.customerId` + `customerUid` (if UID migration completes). Do **not** reassign staff `createdBy` / revision actor fields.

---

## Favorites

Move `customers/{source}/favorites/*` → `customers/{survivor}/favorites/*` with dedupe by `designId` (survivor wins on conflict).

---

## Web Push — `[NEEDS OWNER DECISION]`

Options:

1. **Migrate** subscription docs to survivor subcollection; update `customerId`/`customerUid` (risk if token bound to old Auth session)
2. **Invalidate** source subscriptions; survivor re-subscribes
3. **Discard** source subscriptions on merge completion

**Recommendation:** Invalidate source subscriptions + document survivor re-subscribe (safest unless repo proves token is customerId-scoped only). Inspect `registerWebPushSubscription.ts` before implement.

---

## Audit / activity — `[NEEDS OWNER DECISION]`

`customerActivityEvents` are immutable evidence.

**Recommendation for WS3 plan:** Retain original `customerId` on historical events; add merge metadata on source/survivor (`sourceCustomerId`, `survivorCustomerId`, `mergeJobId`) on new merge events; WS4 queries union survivor + merged-source aliases via `mergedIntoCustomerId` / merge job index — **do not rewrite** historical event customerId.

New event types (planned):

- `account.merge_previewed`
- `account.merge_started`
- `account.merge_completed`
- `account.merge_failed`

Reuse `account.disabled` if source Auth disabled as separate step.

---

## Username strategy

Reuse `customerUsernameTransfer.ts` transaction primitives when survivor must take source username — **inside merge job**, not WS2 wizard.

Preview shows both usernames + planned survivor reservation outcome.

If survivor keeps own username and source username released → placeholder on source before tombstone (similar to WS2 `dupe-src-*` or merge-specific prefix `[NEEDS OWNER DECISION]` vs reuse).

---

## Auth handling — `[NEEDS OWNER DECISION]`

Survivor Auth unchanged.

Source Auth after merge — options:

1. Disable permanently (reversible disable pattern)
2. Delete immediately
3. Disable then delayed delete

**Recommendation:** Disable immediately (consistent with WS2); optional delayed delete job after Storage stages complete — avoids login while preserving recovery window.

Do **not** change Firebase Auth provider linking settings.

---

## Source `users/{uid}` — `[NEEDS OWNER DECISION]`

Source `customers` doc remains merge tombstone.

Policy for `users/{sourceUid}`:

- **Retain** with `isActive: false` + merge metadata, or
- **Delete** after merge completes

**Recommendation:** Retain inactive mirror (consistent with disable/tombstone patterns) unless owner prefers hard delete for GDPR — document in ADR at implement.

---

## Source completion semantics

After successful merge:

**Survivor:** active; canonical customerId + Auth UID; chosen username; owns reassigned operational data.

**Source customer doc:**

```ts
isMerged: true
mergedIntoCustomerId: survivorId
mergedAt, mergedBy  // add fields — align DATA_MODEL
// optional mergeJobId reference
```

No active Portal login. Hidden from normal Active directory tab.

---

## Studio directory — `[NEEDS OWNER DECISION]`

**Recommendation:** Add **Merged** visibility tab or badge; exclude `isMerged` from Active; show "Merged into @username" with link to survivor; do not classify as Disabled or Closed tombstone.

---

## Merge job model — `[NEEDS REPO CHECK]` collection name

Proposed collection: `customerMergeJobs/{jobId}`

Conceptual fields:

- `jobId`, `sourceCustomerId`, `survivorCustomerId`
- `status`: pending | in_progress | completed | failed
- `stage`: enum (see stages below)
- `createdAt`, `startedAt`, `completedAt`, `actorUid`
- `previewId`, `previewChecksum`
- Stage cursors (collection-specific)
- `lastError`, retry count

Alternative: persist job on source customer doc — **prefer dedicated collection** for progress UI + idempotency (mirror propagation pattern on customer doc for sub-stages if needed).

### Proposed stages (ordered)

1. `acquire_locks`
2. `validate_preview`
3. `username_reservation` (if needed — reuse WS2 txn)
4. `reassign_print_requests`
5. `reassign_show_allocations`
6. `reassign_uploads_metadata`
7. `migrate_upload_storage`
8. `reassign_assisted_creation`
9. `migrate_assisted_storage`
10. `reassign_notifications_jobs_etsy_reports`
11. `move_favorites`
12. `handle_web_push`
13. `reassign_activity_query_metadata` (if any index fields added)
14. `finalize_survivor_counters`
15. `tombstone_source_customer`
16. `disable_source_auth`
17. `propagate_identity_snapshots`
18. `release_locks`

Each stage: idempotent, checkpointed, owner-visible via `getCustomerAccountMergeStatus`.

---

## Identity locks

Acquire `identityOperationLock` kind `merge` on **both** source and survivor during Apply (reuse `customerIdentityOperationLock.ts`).

Block concurrent WS2 transfer, disable, hard delete, other merge.

Stale lock: WS1 15-minute policy.

---

## Failure / retry

Partial completion is expected. No automatic rollback of completed stages.

Return:

- completed stages
- failed stage + error
- whether retry safe
- explicit recovery runbook in signoff

Failed mid-Storage: do not delete source Auth until upload migration verified or explicitly aborted.

---

## WS4 compatibility

WS3 must enable survivor-centric history queries including data originally created under merged source customerId.

Requirements for WS4 (plan only):

- Print Request grouped cards
- Deep links via existing route helpers
- CR → IR conversion visibility
- Merge + username transfer audit events

Plan merge job completion metadata and optional `mergedCustomerIds[]` on survivor or merge alias index for WS4 queries.

---

## Ownership migration matrix (complete)

| Entity | Link | Merge action | Immutable |
|--------|------|--------------|-----------|
| customers (source) | id | Tombstone | username history |
| customers (survivor) | id | Counters max | — |
| customerUsernames | username | Txn transfer/placeholder | — |
| printRequests | customerId | Reassign | name, at-creation snapshots |
| printRequestItems | printRequestId | Parent follow | titleSnapshot |
| showAllocations | customerId | Reassign | request snapshots |
| customerUploads | customerId, customerUid | Reassign + Storage | storage paths |
| customerUploadBatches | customerId, customerUid | Reassign + Storage | — |
| assistedCreationRequests | customerId, customerUid | Reassign + Storage | staff uids |
| customerNotifications | both | Reassign | — |
| emailDeliveryJobs | both | Reassign | — |
| etsy* | both | Reassign | — |
| designIssueReports | both | Reassign + propagation | at-creation snapshots |
| favorites | subcollection | Move dedupe | — |
| webPushSubscriptions | subcollection | Policy TBD | — |
| customRequests | both | Reassign if present | — |
| customerActivityEvents | customerId | Append + query strategy | no rewrite |
| Storage | customerUid prefix | Copy-verify-delete | — |
| users (source) | uid | Policy TBD | — |

---

## Planned implementation scope (after plan approval)

### New Functions

- `previewCustomerAccountMerge.ts`
- `applyCustomerAccountMerge.ts` (starts job)
- `getCustomerAccountMergeStatus.ts`
- `functions/src/lib/customerAccountMerge.ts`
- `functions/src/lib/customerAccountMergeReassignment.ts`
- `functions/src/lib/customerAccountMergeStorageMigration.ts`

### New shared types

- `packages/shared/src/types/customer/customerAccountMerge.types.ts`

### Studio

- `MergeCustomerAccountsWizard.tsx`
- Extend `customerIdentityManagementService.ts`
- Extend `customerDirectoryVisibility.ts`
- `permissionService.canMergeCustomerAccounts` (owner-only)

### Docs / ADR

- ADR-FP-154 (proposed) at implement for merge semantics
- Update DATA_MODEL, BACKEND, SECURITY

### Explicitly out of scope

- WS4 UI
- Production deploy
- Firebase Auth config changes
- Portal provider linking

---

## Test strategy (plan)

- Unit: continuable merge policy, checksum, stage idempotency helpers
- Integration: reassignment batches (emulator)
- Storage migration dry-run tests
- Manual DEV matrix per acceptance criteria below
- No production promotion after WS3 alone

---

## Acceptance criteria (testable)

- [ ] Owner chooses Account to Merge and Account to Keep
- [ ] Preview inventories all meaningful history
- [ ] Identities unmistakable
- [ ] Survivor keeps customerId + Auth UID
- [ ] Source becomes merge tombstone
- [ ] Source cannot Portal-login after completion
- [ ] Operational PR ownership consolidated safely
- [ ] Immutable request names/snapshots preserved
- [ ] ADR-FP-071 one-working-request rule after merge
- [ ] Show allocations truthful
- [ ] CR → IR traceability preserved
- [ ] Upload docs + Storage migrate safely
- [ ] Assisted Creation migrates safely
- [ ] Favorites dedupe
- [ ] Push policy explicitly decided
- [ ] Username atomic via shared txn
- [ ] Audit historically truthful
- [ ] WS4 can query merged history from survivor
- [ ] Both identities locked during Apply
- [ ] Resumable/idempotent Apply
- [ ] Partial failure recovery path
- [ ] Same account rejected
- [ ] Tombstoned/merged fail closed
- [ ] Sequence counter max policy
- [ ] No production deployment

---

## Open questions — **RESOLVED (owner 2026-08-29)**

1. **Source Auth:** Disable permanently in WS3 v1; no automatic delete; no delayed deletion scheduler.
2. **Source `users/{uid}`:** Retain inactive merged tombstone with merge linkage metadata.
3. **Studio presentation:** Distinct **Merged** lifecycle tab/filter (not Disabled/Closed).
4. **customerActivityEvents:** Do not rewrite historical `customerId`; alias-aware WS4 queries; merge events record source/survivor.
5. **Web Push:** Invalidate/remove source subscriptions; do not migrate tokens.
6. **Merge placeholder:** `merged-src-*` (not `dupe-src-*`).
7. **Master plan checkpoints:** Repo source authoritative; stop and document discrepancies.

### Continuable Print Requests (binding amendment)

- Distinguish **empty** vs **meaningful** continuable requests via authoritative `printRequestItems` count.
- Both meaningful → **BLOCK**.
- Empty drafts removed via trusted merge-job cleanup (revalidated at Apply).
- Source-only meaningful → reassign to survivor when survivor has none.
- Apply rechecks item counts to prevent stale empty classification.

### Username during merge

- Default: survivor keeps current username.
- Owner may choose source username via preview option; reuse WS2 txn primitives with `merged-src-*` placeholder.

---

## Approval

Formal review: `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws3-full-account-merge-review.md`

**Owner approved plan 2026-08-29 — Implement authorized (DEV only).**
