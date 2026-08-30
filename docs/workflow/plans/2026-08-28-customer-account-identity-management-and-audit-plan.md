# Plan: Customer Account Identity Management, Duplicate Resolution, Safe Delete, Account Merge, and Activity Audit Trail

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal ID | `customer-account-identity-management-and-audit` |
| Related | `docs/workflow/plans/2026-08-27-portal-customer-username-change-plan.md`, `docs/workflow/plans/2026-07-22-studio-contextual-safe-deletion-plan.md`, ADR-FP-071, ADR-FP-115, ADR-FP-104 |
| Production | **NOT AUTHORIZED** |
| Studio publish | **NOT AUTHORIZED** |

---

## CUSTOMER ACCOUNT IDENTITY MANAGEMENT — PLAN RESULT

### 1. Root problem

Customers sometimes create **duplicate Portal accounts** (e.g. Outlook signup first, Gmail signup later). The desired username may be reserved on the unused account while the customer actively uses the other. This is an **identity-management** problem, not a username-creation bug.

Studio today supports:

- Staff **username edit** via `updateCustomer` (owner/admin) with reservation-safe semantics.
- **Tombstone** (disable Auth, keep history, permanently reserve username) via `tombstoneCustomerAccount` (owner).
- **Dev-only hard cascade** via `ownerDeleteUser` on Test Data (destroys history, frees username).

There is **no** owner workflow for: duplicate preview, username transfer between verified duplicates, history-gated hard delete, reversible disable (distinct from tombstone), account merge, or structured customer activity grouped by Print Request.

---

### 2. Current identity / Auth architecture

| Layer | Location | Behavior |
|-------|----------|----------|
| Business entity | `customers/{customerId}` | Canonical `displayName`, `username`, `email`, `userId?`, counters, tombstone fields |
| Auth profile | `users/{uid}` | `email`, `displayName`, `role`, `isActive`, `isDeleted` |
| Username reservation | `customerUsernames/{normalizedUsername}` | `{ customerId, createdAt, updatedAt }` |
| Portal gate | `requirePortalCustomer` | Rejects tombstoned / inactive users |
| Staff customer edit | `updateCustomer` | `assertCanManageCustomers` → owner **or** admin |
| Product account removal | `tombstoneCustomerAccount` | Owner only; Auth **disable**; retain customer + username + all history |
| Portal deletion request | `accountDeletionRequests/{uid}` | Customer request; owner fulfills via tombstone |

**Linkage:** Portal customers have `customers.userId === Firebase Auth uid`. Guest customers have no `userId`; staff-managed only.

**Auth providers:** Email/password and Google supported via Firebase Auth. Survivor UID must remain unchanged in duplicate scenarios where customer keeps Gmail login — merge must not swap Auth UIDs on the survivor.

---

### 3. Current username architecture

Shared module: `functions/src/lib/customerProfileUpdate.ts` → `applyCustomerProfileUpdate`.

| Concern | Implementation |
|---------|----------------|
| Validation | `packages/shared/src/utils/customerUsername.ts` |
| Reservation swap | Single Firestore transaction on `customerUsernames` |
| History | `usernameHistory` append-only, max 10 |
| Staff cooldown | **Bypassed** (`mode: "staff"`) |
| Portal cooldown | 30-day after first self-service change |
| Propagation | `propagateCustomerIdentitySnapshots` — `printRequests`, `designIssueReports` |
| Immutable CR name | `printRequests.name` never updated |
| At-creation truth | `*AtCreationSnapshot` backfilled on first propagation |

Studio path: `EditCustomerModal` → `useUpdateCustomerRecord` → `updateCustomer` callable. Username field already editable with warning copy; no dedicated `@username` identity header or isolated “Change username” action.

---

### 4. Current `ownerDeleteUser` behavior

| Question | Answer (repo-confirmed) |
|----------|-------------------------|
| Exists in source? | **Yes** — `functions/src/ownerDeleteUser.ts` |
| Production? | **Excluded** from production deploy allowlist (`DEPLOYMENT.md`) |
| Gating | Active **owner** + `isOperationalWipeAllowedProjectId` → **`fresh-prints-dev` only** |
| Preview / eligibility? | **None** |
| Deletes Firebase Auth? | **Yes** (`deleteUser`) for staff and customer paths |
| Releases `customerUsernames`? | **Yes** — deletes reservation doc |
| Cascades historical data? | **Yes** — print graph, uploads, assisted, etsy, notifications, favorites, Storage prefixes |
| Gap | **`designIssueReports` not deleted** (orphan risk on destructive path) |
| UI | `OwnerDeleteUserModal` on **Test Data Reset** only; comment directs product delete to tombstone |

**Verdict:** Do **not** expose raw `ownerDeleteUser` for product duplicate resolution. **Reuse** its low-level delete helpers after adding a **history-free eligibility gate** and narrowing customer path to identity/bootstrap records only. Keep Test Data entry for scratch cleanup or retire customer tab after new callable ships.

---

### 5. Complete customer-history dependency inventory

See **Appendix A** (full table). Summary by blocker category for **hard delete**:

| Category | Collection / resource | Linking field(s) | Hard-delete blocker? |
|----------|----------------------|------------------|----------------------|
| Print requests | `printRequests` | `customerId` | **Yes** — any doc |
| Print items | `printRequestItems` | via `printRequestId` | **Yes** — if parent exists |
| Show allocations | `showAllocations` | `customerId`, `printRequestId` | **Yes** |
| Gang sheets | `gangSheets`, `gangSheetItems` | via `printRequestId` / show | Indirect — follows requests |
| Uploads | `customerUploads`, `customerUploadBatches` | `customerId`, `customerUid` | **Yes** |
| Assisted creation | `assistedCreationRequests` | `customerId`, `customerUid` | **Yes** |
| Notifications | `customerNotifications` | `customerId`, `customerUid` | **Yes** |
| Email jobs | `emailDeliveryJobs` | `customerId`, `customerUid` | **Yes** |
| Etsy | `etsyRecommendationRequests`, `etsySuggestionRequests` | `customerId`, `customerUid` | **Yes** |
| Design issues | `designIssueReports` | `customerId`, `customerUid` | **Yes** |
| Favorites | `customers/{id}/favorites` | subcollection | **Yes** — any doc |
| Web push | `customers/{id}/webPushSubscriptions` | subcollection | **Yes** — any enabled sub |
| Legacy | `customRequests` | `customerId` / `customerUid` | **Yes** if present |
| Storage | `customer-uploads/{uid}/`, `assisted-creation/{uid}/` | `customerUid` | **Yes** — any object |
| Deletion request | `accountDeletionRequests/{uid}` | identity | **No** — cleanup allowed |
| Rate limits / idempotency | `customerUploadRateLimits`, leases, etc. | `customerUid` | **No** — ephemeral |
| Identity only | `customers`, `users`, `customerUsernames`, `usernameHistory` | — | **Allowed** when no blockers |

---

### 6. Hard-delete eligibility definition

**MEANINGFUL CUSTOMER/BUSINESS HISTORY** = any persisted record beyond identity/bootstrap material listed below.

An account is **eligible for hard delete** when **all** of the following are true:

1. **Zero** `printRequests` where `customerId == subject`.
2. **Zero** `customerUploads` / `customerUploadBatches` (by `customerId` OR `customerUid`).
3. **Zero** `assistedCreationRequests`.
4. **Zero** `showAllocations` where `customerId == subject`.
5. **Zero** `customerNotifications`, `emailDeliveryJobs`, `etsyRecommendationRequests`, `etsySuggestionRequests`, `designIssueReports`.
6. **Zero** docs in `customers/{id}/favorites` and `customers/{id}/webPushSubscriptions`.
7. **Zero** objects under Storage prefixes for linked `customerUid` (or no `userId`).
8. **Zero** legacy `customRequests` for subject.
9. Customer is **not** mid-merge (`mergeStatus` / lock — new fields, see §11).
10. Caller is **owner**; confirmation phrase **`DELETE CUSTOMER`** (new constant; distinct from `DELETE USER`).

**Identity/bootstrap-only records** (removed on eligible hard delete):

- Firebase Auth user (if `userId` present) — **delete**
- `users/{uid}` — delete
- `customers/{customerId}` — delete
- `customerUsernames/{username}` — delete (**frees username** — intentional for history-free duplicates)
- `accountDeletionRequests/{uid}` — delete if present
- Ephemeral rate-limit / idempotency docs for `customerUid`
- `usernameHistory` — deleted with customer doc

**Owner checkpoint required** before implementation: approve this blocker inventory (§Human Checkpoints).

---

### 7. Hard-delete execution model

**New callables** (do not widen `ownerDeleteUser` UI):

| Callable | Purpose |
|----------|---------|
| `previewHardDeleteCustomerAccount` | Server-authoritative eligibility + counts |
| `hardDeleteCustomerAccount` | Apply after revalidation |

**Flow:**

1. Owner selects customer → **Preview** loads blocker counts (parallel count queries; bounded).
2. Outcome: `eligible` | `blocked` | `already_deleted`.
3. If eligible → show identity summary, records to remove, username to release, Auth uid.
4. Owner types **`DELETE CUSTOMER`** → **Apply** re-runs full eligibility server-side (preview is not authorization).
5. Execute in order:
   - Set short-lived `customers/{id}.identityOperationLock` (prevent concurrent merge/username ops).
   - Delete ephemeral ops docs.
   - Delete `accountDeletionRequests` if any.
   - Delete `customerUsernames/{username}`.
   - Delete `users/{uid}`, Auth user.
   - Delete `customers/{id}`.
   - Append `customerActivityEvents` (forward audit).
6. Idempotent: if customer already gone, return `already_done`.

**Reuse:** Extract shared delete helpers from `ownerDeleteUser.ts` into `functions/src/lib/customerAccountDeletion.ts` (internal module). Customer hard-delete path calls **narrow** subset only.

**Project gate:** Owner decision — allow on **dev first**; production requires separate human approval and deploy checklist (same pattern as other owner callables).

---

### 8. Disable Account model

**Today:** `tombstoneCustomerAccount` sets `isDeleted: true`, disables Auth, **not reversible**, username **permanently reserved** (ADR-FP-115).

**Gap:** Duplicate resolution needs **reversible disable** without tombstone semantics (investigation / deferred merge).

**Proposed new callable:** `disableCustomerAccount` / `restoreCustomerAccount` (owner; admin read-only preview TBD).

| Field | Tombstone (`isDeleted`) | Reversible disable (new) |
|-------|-------------------------|---------------------------|
| Auth | `disabled: true` | `disabled: true` |
| `users.isActive` | `false` | `false` |
| `customers.isDeleted` | `true` | **`false`** |
| New fields | — | `isDisabled: true`, `disabledAt`, `disabledBy`, `disabledReason?` |
| Username reservation | Retained forever | **Retained** (no public release) |
| History | Preserved | Preserved |
| Portal sign-in | Blocked | Blocked |
| Restore | Not supported | Clears `isDisabled`, re-enables Auth |

Update `requirePortalCustomer` to reject `isDisabled === true` (in addition to tombstone).

**Permissions:** Owner **apply**; owner + admin **preview** and view status (align with tombstone preview visibility).

---

### 9. Username-transfer model

**New callable:** `transferCustomerUsername` (owner only).

**Inputs:** `sourceCustomerId`, `survivorCustomerId`, optional `survivorNewUsername` (default: transfer source's username to survivor).

**Atomic transaction (Firestore):**

1. Load both customers; verify not tombstoned/disabled/locked/merged.
2. Verify `customerUsernames/{sourceUsername}.customerId === sourceCustomerId`.
3. If survivor has different username:
   - Delete survivor's old `customerUsernames/{old}` **only if** policy allows (survivor relinquishes old handle — owner intent for duplicate case).
4. Set `customerUsernames/{desired}` → `survivorCustomerId` (no delete-then-gap; txn swap).
5. Update survivor: `username`, `usernameHistory`, `usernameUpdatedAt`.
6. If source remains active (merge deferred): assign source **placeholder username** `merged-src-{shortId}` or owner-selected temp (validated unique) — **required** so reservation invariant holds.
7. If source will be hard-deleted immediately: order **transfer txn first**, then hard-delete in same callable invocation (no public window).

**Post-txn:** `initializeIdentitySnapshotPropagation` + `propagateCustomerIdentitySnapshots` for **survivor** only.

**Concurrency:** Reject if either customer has `identityOperationLock` or stale `previewToken` mismatch.

**Audit:** Append `customer_activity.username_transferred` event with source/survivor ids and usernames (no secrets).

---

### 10. Duplicate-resolution UX

**Studio surface:** Customer details → **Resolve Duplicate Account** (owner only).

**Wizard steps:**

1. Select **Duplicate (source)** and **Survivor** (search by email, username, customer id).
2. **Preview** callable `previewDuplicateAccountResolution` composes:
   - Both identities (id, email, username, displayName, auth linked, providers if available via Admin SDK provider list — no secrets)
   - Meaningful-history counts per §6
   - Continuable print request state per account
   - Username reservation ownership
   - **Recommendation:** `ELIGIBLE_FOR_HARD_DELETE` | `HISTORY_EXISTS_MERGE_REQUIRED` | `DISABLE_MANUAL_REVIEW` | `BLOCKED_DUAL_WORKING`
3. Owner chooses path:
   - **Hard delete source** (if eligible) + optional **transfer username** to survivor
   - **Disable source** (reversible)
   - **Merge** (launches merge wizard — Workstream 3)
   - **Transfer username only** (if histories allow survivor to keep both — rare)

Preview token: `{ previewId, expiresAt, checksum }` — Apply must pass `previewId`; server recomputes eligibility.

---

### 11. Full account-merge model

**High-risk, multi-stage, resumable** — separate workstream after WS1–2.

**New callables:**

| Callable | Role |
|----------|------|
| `previewCustomerAccountMerge` | Inventory + blockers + ADR-FP-071 check |
| `applyCustomerAccountMerge` | Start / resume merge job |
| `getCustomerAccountMergeStatus` | Poll progress |

**Persisted job:** `customerMergeJobs/{jobId}` OR fields on source customer:

- `mergeStatus`: `pending` | `in_progress` | `completed` | `failed`
- `mergeIntoCustomerId`, `mergedAt`, `mergedBy`
- Stage cursors (reuse pattern from `identitySnapshotPropagation`)
- `identityOperationLock` on both accounts during apply

**Survivor keeps:** `customerId`, `userId` (Auth/email), chosen `username`, future activity.

**Source becomes:** Preserved **merge tombstone** doc — NOT deleted:

- `isMerged: true`, `mergedIntoCustomerId`, `mergedAt`, `mergedBy`
- Auth disabled/deleted **after** successful data migration
- Username reservation: **released or transferred** per owner preview choice
- Historical records keep **original** `customerId` on immutable snapshots where required; **reassign** `customerId` on owned operational docs per Appendix A

**Ownership migration classes:**

| Class | Action | Examples |
|-------|--------|----------|
| A — Reassign to survivor | Update `customerId` (+ `customerUid` if survivor UID kept) | `printRequests`, allocations, uploads, assisted, notifications, etsy, favorites |
| B — Preserve original + link | Keep source id on doc; add `mergedFromCustomerId` metadata on job only | N/A on entities — use survivor ownership for queries |
| C — Denormalized snapshot | Update current display snapshots only | `customerUsernameSnapshot` via propagation |
| D — Immutable | Never rewrite | `printRequests.name`, `*AtCreationSnapshot`, allocation `requestNameSnapshot` |
| E — Tombstone on source | Leave on source doc | `usernameHistory` on source |
| F — Blocking | Owner must resolve first | Dual continuable Working requests |

**Storage:** If survivor UID === source UID scenario N/A; if merging accounts with **different** UIDs, **Storage copy/migrate** `customer-uploads/{sourceUid}` → `{survivorUid}` required (async stage).

**Auth:** After data migration: `adminAuth.deleteUser(sourceUid)` OR disable only if owner chooses keep Auth audit — **default: disable then delete** after 7-day deferral [NEEDS OWNER DECISION on deferral].

**Partial failure:** Job records `lastError`, `stage`, cursor; **retry** resumes idempotently. No automatic rollback of completed stages — forward-fix compensation documented per stage.

---

### 12. Survivor / source semantics

| | Survivor | Source |
|---|----------|--------|
| Portal login | Yes | No (disabled) |
| `customers.id` | Canonical | Tombstone / merged record |
| Print request ownership (operational) | Reassigned | Historical attribution via immutable snapshots |
| Username | Owner-selected (often transferred from source) | Placeholder or none |
| Queries in Studio “customer activity” | Includes reassigned data | Shows merge card + link to survivor |

---

### 13. Auth handling

- **Duplicate scenario (Gmail survives):** Survivor = Gmail account; `userId` unchanged. Source Outlook Auth disabled after resolution.
- **Do not** merge Firebase Auth providers automatically in v1.
- Email on survivor unchanged unless owner separately runs `updateCustomer` email sync.
- `users` doc: only survivor remains active; source `users` tombstoned or deleted per post-merge policy [owner checkpoint].

---

### 14. ADR-FP-071 merge handling

**Rule:** Merge Apply **must block** when **both** accounts have Portal-continuable requests (`status in draft|editing`) unless owner explicitly selects **which Working request survives** in preview (no automatic item combine).

**Default:** `BLOCKED_DUAL_WORKING` — preview lists both request names/ids; owner must archive/clear/queue one via existing flows before merge.

**Single continuable on source only:** Reassign that request to survivor; verify survivor has zero continuable **before** apply OR survivor's continuable is the chosen survivor request.

**Implementation:** Shared helper `countContinuablePrintRequests(customerId)` used in preview + apply (same query as `portalWorkingPrintRequest.ts`).

---

### 15. Print Request migration behavior

| Request state | Merge action |
|---------------|--------------|
| Working (`draft`/`editing`) | Reassign `customerId`; enforce one continuable on survivor |
| Queued (`active`) | Reassign; allocations unchanged |
| Printing / printed / archived | Reassign `customerId`; **immutable** `name` and at-creation snapshots |
| Converted internal | Reassign if `customerId` set |
| Both accounts Working | **Block** until resolved |

Propagation job refreshes survivor **current** snapshots on reassigned requests; does not rename `name`.

---

### 16. Upload migration behavior

- Reassign `customerId` on all `customerUploads` / `customerUploadBatches`.
- If `customerUid` changes: async Storage migration stage; update `customerUid` on docs after copy verified.
- Guest uploads (`customerId: "guest"`) out of scope.

---

### 17. Assisted Creation migration behavior

- Reassign `assistedCreationRequests` `customerId` + `customerUid`.
- Migrate `assisted-creation/{uid}/` Storage if UID changes.
- Preserve request history and staff ack docs (staff uid keyed — unchanged).

---

### 18. Other discovered ownership migrations

| Surface | Merge action |
|---------|--------------|
| `showAllocations` | Reassign `customerId` |
| `designIssueReports` | Reassign + propagation |
| `customerNotifications` | Reassign |
| `emailDeliveryJobs` | Reassign in-flight jobs |
| `etsyRecommendationRequests` / `etsySuggestionRequests` | Reassign |
| `customers/{id}/favorites` | Move subcollection docs to survivor (dedupe designId) |
| `webPushSubscriptions` | Move or invalidate; survivor re-subscribes [prefer move] |
| `customerUsernames` | Transfer chosen username; source placeholder |
| Counters `nextPrintRequestSequence` | **Max** or **sum** policy — use **max** of both + reconcile `totalPrintRequests` [owner checkpoint] |

---

### 19. Username tombstone / reservation policy

| Scenario | Policy |
|----------|--------|
| Product tombstone (ADR-FP-115) | Username **never** released |
| History-free hard delete | Username **released** (intentional for duplicate cleanup) |
| Owner username transfer | **Direct** reservation reassignment in txn — no public availability window |
| Reversible disable | Username **held** on disabled account |

**ADR amendment required (ADR-FP-148 proposed):** Explicit **owner-authorized duplicate username transfer** is an exception to “tombstoned usernames never reusable” — transfer is between verified duplicates, not public reclaim. Document in `DECISIONS.md` at implementation.

---

### 20. Optional username-reset recommendation

**Defer** to post-WS2 unless owner requests earlier.

`Reset Username` (placeholder + Portal first-login pick) requires new `customers.usernameSetupRequired` (or similar) and Portal gate — **not** present today. Portal signup assumes username at registration. **Recommendation:** defer; duplicate flows can use owner-assigned temporary username via `transferCustomerUsername` + `updateCustomer`.

---

### 21. Existing audit architecture inventory

| Asset | Status |
|-------|--------|
| `auditLogs` collection | Documented in DATA_MODEL; **no writers** in codebase |
| `usernameHistory` on customer | Append-only; support-only |
| `userAuditTrailActivityService` | **Derived** from print requests, allocations, designs — flat timeline |
| `UserAuditTrailModal` | Single “Recent activity” list — not grouped by PR |
| Entity `createdAt`/`updatedAt` | Partial reconstruction possible |
| Show production resolution fields | `productionResolvedBy` etc. on shows — not customer-centric |

---

### 22. Proposed customer audit / event architecture

**New collection:** `customerActivityEvents/{eventId}` (name TBD — prefer over overloading `auditLogs` until AI-review audit ships)

| Field | Purpose |
|-------|---------|
| `customerId` | Partition key (survivor after merge) |
| `eventType` | Enum (see below) |
| `occurredAt` | Server timestamp |
| `actorUid` | Staff or system |
| `actorRole` | owner / admin / system |
| `printRequestId?` | Grouping |
| `showId?` | Context |
| `sourceCustomerId?` / `targetCustomerId?` | Merge/transfer |
| `metadata` | Safe structured payload (no secrets) |
| `derivation` | `live` \| `reconstructed` |

**Event types (forward):**

- Account: `account.created`, `account.username_changed`, `account.username_transferred`, `account.disabled`, `account.restored`, `account.tombstoned`, `account.hard_deleted`, `account.merge_started`, `account.merge_completed`, `account.duplicate_resolution_previewed`
- Print request: `print_request.created`, `item.added`, `item.removed`, `quantity.changed`, `queued_to_show`, `production.completed`, `converted_to_internal`, … (business-significant only)

**Writers:** Trusted callables only — profile update, merge, delete, disable, queue, etc.

**Rules:** Staff read where `canViewAuditLogs` (owner/admin); **no client writes**.

**Indexes:**

- `customerId` + `occurredAt` desc (paginated customer feed)
- `customerId` + `printRequestId` + `occurredAt` desc (modal timeline)

---

### 23. Print Request activity-card UX

Replace / augment flat `UserAuditTrailModal` with **Customer Details** activity section:

- One **card per Print Request** (sorted by last activity desc).
- Card shows: `name`, created date, lifecycle tab, related show if any, last activity, event count.
- Click → **modal** with chronological events for that `printRequestId` + **Open Print Request** button.

**Bounded load:** Initial page of PR ids from `printRequests where customerId == X order by updatedAt desc limit 25`; events per PR loaded on card expand or modal open (`limit 50`, cursor pagination).

---

### 24. Account Activity UX

Separate card: **Account Activity** — username changes, disable/restore, merge, hard delete preview, duplicate resolution. Sourced from `customerActivityEvents` where `printRequestId` absent.

Optional cards (if data exists): **Customer Uploads**, **Assisted Creation** — aggregate counts + link to existing Studio list filters.

---

### 25. Deep-link behavior

Use `getPrintRequestsPath({ requestId, kind: "customer", tab, workingFilter })` from `apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.ts`.

Tab resolution: reuse `resolvePrintRequestRouteFromRequest` (same module) from request `status` + allocations — **do not hardcode** `/print-requests?...` strings.

---

### 26. Bounded query / index strategy

| Query | Index |
|-------|-------|
| Customer events timeline | `customerActivityEvents`: `customerId` ASC, `occurredAt` DESC |
| PR-scoped events | `customerActivityEvents`: `customerId` ASC, `printRequestId` ASC, `occurredAt` DESC |
| Customer PR list | Existing `printRequests`: `customerId` + `updatedAt` |
| Eligibility counts | Parallel `count()` queries or aggregation callables — no full collection scans in UI |

**No unbounded listeners** — paginate with `startAfter`.

---

### 27. Permissions / security

| Operation | Server | Studio client |
|-----------|--------|---------------|
| Staff username / profile edit | `assertCanManageCustomers` (owner, admin) | `canManageCustomers` |
| Tombstone customer | Owner | `canTombstoneCustomerAccount` |
| Hard delete | Owner | New `canHardDeleteCustomerAccount` |
| Disable / restore | Owner apply; admin view | Owner only apply |
| Username transfer | Owner | Owner only |
| Duplicate preview / resolve | Owner | Owner only |
| Account merge | Owner | Owner only |
| View activity / audit | Owner, admin | `canViewAuditLogs` |

**Do not** narrow admin off existing `updateCustomer` without owner decision — **retain** admin username edit per current behavior.

Identity operations: **fail closed**; preview ≠ authorization; revalidate on apply.

---

### 28. Concurrency / resumability / idempotency

| Race | Mitigation |
|------|------------|
| Username change during preview | Apply re-reads reservations; rejects if checksum mismatch |
| PR created during merge | `identityOperationLock` on source; merge apply rejects new PR creation via rules [optional tighten] or recheck counts at apply |
| Staff edits source during merge | Lock + stale preview rejection |
| Username claimed between preview/apply | Transactional reservation checks |
| Source Auth login during merge | Disable source early in merge job (stage 1) |
| Partial merge failure | Resumable job with stage cursors (pattern: `identitySnapshotPropagation`) |
| Idempotent apply | Job id + `completed` status short-circuit |

---

### 29. Exact files (expected)

**Functions (new/modified)**

- `functions/src/lib/customerAccountDeletion.ts` (new — shared helpers)
- `functions/src/lib/customerAccountEligibility.ts` (new — history inventory)
- `functions/src/lib/customerUsernameTransfer.ts` (new)
- `functions/src/lib/customerAccountMerge.ts` (new — staged job)
- `functions/src/lib/customerActivityEvents.ts` (new — append + query)
- `functions/src/previewHardDeleteCustomerAccount.ts` (new)
- `functions/src/hardDeleteCustomerAccount.ts` (new)
- `functions/src/disableCustomerAccount.ts` / `restoreCustomerAccount.ts` (new)
- `functions/src/previewDuplicateAccountResolution.ts` (new)
- `functions/src/transferCustomerUsername.ts` (new)
- `functions/src/previewCustomerAccountMerge.ts` / `applyCustomerAccountMerge.ts` (new)
- `functions/src/ownerDeleteUser.ts` (refactor — delegate to shared helpers)
- `functions/src/lib/customerProfileUpdate.ts` (emit audit events)
- `functions/src/updateCustomer.ts` (emit audit events)
- `functions/src/lib/portalCustomer.ts` (reject `isDisabled`)
- `functions/src/index.ts` (exports)

**Shared**

- `packages/shared/src/types/customer/customerIdentityManagement.types.ts` (new)
- `packages/shared/src/types/customer/customerActivityEvent.types.ts` (new)
- `packages/shared/src/types/customer/customer.types.ts` (`isDisabled`, merge fields)
- `packages/shared/src/constants/customerIdentityConfirmationPhrases.ts` (new)

**Studio**

- `apps/studio/.../users/pages/UserManagementPage.tsx` (customer details layout)
- `apps/studio/.../users/components/CustomerIdentitySection.tsx` (new)
- `apps/studio/.../users/components/ChangeUsernameModal.tsx` (new — wraps updateCustomer)
- `apps/studio/.../users/components/ResolveDuplicateAccountWizard.tsx` (new)
- `apps/studio/.../users/components/CustomerActivityCards.tsx` (new)
- `apps/studio/.../users/components/PrintRequestActivityModal.tsx` (new)
- `apps/studio/.../users/services/customerIdentityManagementService.ts` (new)
- `apps/studio/.../permissions/services/permissionService.ts`
- Retire or keep `UserAuditTrailModal` — deprecate in favor of card UX

**Rules / indexes**

- `firestore.rules` — `customerActivityEvents`, `customerMergeJobs`, disabled-field guards
- `firestore.indexes.json` — new composite indexes

**Docs**

- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md`, `DECISIONS.md` (ADR-FP-148+)

---

### 30. Functions / callables required

| Callable | WS |
|----------|-----|
| `previewHardDeleteCustomerAccount` | 1 |
| `hardDeleteCustomerAccount` | 1 |
| `disableCustomerAccount` / `restoreCustomerAccount` | 1 |
| `previewDuplicateAccountResolution` | 2 |
| `transferCustomerUsername` | 2 |
| `previewCustomerAccountMerge` | 3 |
| `applyCustomerAccountMerge` | 3 |
| `getCustomerAccountMergeStatus` | 3 |
| `listCustomerActivityEvents` | 4 |
| `listCustomerPrintRequestSummaries` | 4 |

Extend existing: `updateCustomer` — emit `account.username_changed` event (WS4 or WS1).

---

### 31. Rules / index changes

- Add `customerActivityEvents` — staff read, no client write.
- Add `customerMergeJobs` — owner system write via Functions only.
- Guard `customers.isDisabled` / merge fields — client cannot set.
- Composite indexes for activity queries (§26).
- Optional: deny customer create on `printRequests` when `identityOperationLock` set (Functions-only creates already — verify rules).

---

### 32. Migration / backfill impact

| Item | Gate |
|------|------|
| Forward audit events | Ship with WS4; no backfill required for MVP |
| Historical reconstruction | Read-only derived cards from `printRequests` timestamps; label `reconstructed` |
| Full event backfill | **Separate human approval** — not in initial scope |
| Existing tombstoned customers | No migration |
| `isDisabled` field | Absent on existing docs → treat as false |

---

### 33. Test matrix

Automated tests planned per user acceptance list (38 tests minimum):

- **Username:** staff edit, duplicate rejection, transfer, concurrent race, immutable CR name
- **Hard delete:** eligible empty, blocked per history type (PR, upload, assisted, etsy, design issue, favorites), unauthorized, idempotent retry
- **Merge:** ownership reassignment, dual printed history, single Working, dual Working block, queued/printing preserved, multi-show allocations, uploads, assisted, snapshots truthful, username choice, Auth disable timing, partial resume, stale preview reject, idempotent second apply
- **Disable:** Auth block, history preserved, restore
- **Audit:** event emission, grouping, pagination, deep-link helper, unauthorized read

Test locations: `functions/src/**/*.test.ts`, `packages/shared/**/*.test.ts`, Studio `*.contract.test.ts`.

---

### 34. Owner DEV QA fixtures

| Fixture | Setup |
|---------|--------|
| A | History-free Outlook duplicate + Gmail survivor |
| B | Source owns desired `@username` |
| C | Both have printed PR history |
| D | Both have Working (`draft`/`editing`) — expect block |
| E | Source has customer upload history |
| F | Source has queued + printed requests |
| G | Disable / restore survivor |
| H | Activity cards + PR modal deep link |

Create via Studio test flows + seed scripts on `fresh-prints-dev` only.

---

### 35. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Merge partial failure leaves split brain | Critical | Resumable job + locks + owner-visible status |
| ADR-FP-071 violation post-merge | High | Hard block dual Working |
| Username race on transfer | High | Single txn reservation swap |
| Hard delete with hidden history | Critical | Server-side eligibility inventory |
| Storage UID migration incomplete | High | Verify stage before Auth delete |
| `ownerDeleteUser` misuse | High | Keep dev-only; narrow product path |
| Audit PII leakage | Medium | Structured metadata only |
| Admin permission regression | Medium | Retain `assertCanManageCustomers` for ordinary edit |

---

### 36. ADR changes

| ADR | Topic |
|-----|-------|
| **ADR-FP-153** (WS2) | Owner-authorized duplicate username transfer (exception to tombstone reuse ban) |
| **ADR-FP-151** (WS1) | History-free customer hard delete policy |
| **ADR-FP-152** (WS3) | Customer account merge semantics + source tombstone |
| **ADR-FP-150** (WS1) | Reversible customer account disable (distinct from ADR-FP-115 tombstone) |
| **ADR-FP-115** (amend) | Clarify hard-delete exception for history-free accounts only |
| **ADR-FP-071** (reference) | Merge must not create dual continuable requests |

---

### 37. Recommended implementation workstream sequence

| WS | Scope | Risk | Depends |
|----|-------|------|---------|
| **WS1** | Owner username UX polish (`@username` + Change Username modal), history-free hard delete preview/apply, disable/restore | Medium | — |
| **WS2** | Duplicate resolution preview wizard, username transfer callable | Medium–High | WS1 eligibility helpers |
| **WS3** | Full account merge (preview, staged apply, ADR-FP-071 guards) | **Critical** | WS1–2 |
| **WS4** | Customer activity events + PR cards + account activity card | Medium | WS1+ (events emitted from callables) |

Implement **WS1 → WS2 → WS4 (parallel with WS3 prep) → WS3**. Do not ship merge before hard-delete and transfer are proven in dev.

Each workstream: separate implementation review + dev deploy checkpoint.

---

### 38. Remaining owner decisions

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Approve hard-delete blocker inventory (§6) | Required before WS1 implement |
| 2 | Approve merge ownership map (Appendix A) | Required before WS3 |
| 3 | Source post-merge: delete vs tombstone `users` doc | Tombstone with `mergedIntoCustomerId` |
| 4 | Admin: keep username edit? | **Yes** — retain current `updateCustomer` authority |
| 5 | Hard delete in production timing | Dev first; production separate approval |
| 6 | `nextPrintRequestSequence` on merge | Use **max** of both sequences |
| 7 | Reset username / Portal pick on login | **Defer** |
| 8 | Auth delete deferral after merge | Disable immediately; delete after 7 days [optional] |
| 9 | Bulk duplicate detection | **Out of scope** — owner-selected pairs only |

---

## Scope

### In scope (parent goal)

- All sections §1–38 across four workstreams
- DEV Functions deploy per workstream (human checkpoint)
- Studio UI on existing Users / Customers surfaces
- Forward audit events + derived historical reconstruction
- Formal ADRs

### Out of scope

- Immutable CR renames
- Automatic PR item combining
- Show Queue production semantic changes (except merge attribution)
- Production deploy / Studio publish (this phase)
- Bulk migration / auto duplicate detection
- Reset username / Portal first-login pick (deferred)
- Changing ADR-FP-115 tombstone behavior for product deletes

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | None |
| Development Tooling | Test commands in TESTING.md |
| Documentation | DATA_MODEL, BACKEND, SECURITY, DECISIONS |
| Development History | Plan + review artifacts only |

---

## Human checkpoints anticipated

- [x] Owner approval of hard-delete blocker inventory
- [x] Owner approval of merge ownership mapping
- [x] Owner approval of source-account post-merge policy
- [ ] DEV Functions deploy (per workstream)
- [ ] Firestore rules/index deploy
- [ ] Event backfill (if ever approved)
- [ ] Production deploy
- [ ] Studio publish

---

## Test strategy

| Check | Command | Required |
|-------|---------|----------|
| Functions unit tests | `npm test --workspace functions` (pattern: customerIdentity*) | yes |
| Shared unit tests | `npm test --workspace @fresh-prints/shared` | yes |
| Studio contract tests | `npm test` in studio for `*.contract.test.ts` | yes |
| Typecheck | workspace typecheck scripts | yes |
| Manual | Owner DEV QA fixtures A–H | yes |

---

## Rollback plan

- Hide Studio actions via permission flags
- Undeploy new callables per DEPLOYMENT.md allowlist
- `customerActivityEvents` can stop receiving writes without breaking core flows
- Merge jobs: mark `failed` + manual owner intervention doc

---

## Appendix A — Customer identity reference inventory

| Collection / resource | Linking field(s) | Owned vs referenced | Historical significance | Hard-delete blocker? | Merge action | Username propagation | Audit relevance | Migration risk |
|----------------------|------------------|---------------------|-------------------------|----------------------|--------------|----------------------|-----------------|----------------|
| `customers` | `id`, `userId` | Owned root | High | N/A (deleted if eligible) | Survivor doc; source tombstone | Canonical username | High | Medium |
| `users` | `uid` | Owned | Medium | No (deleted with account) | Survivor only | displayName/email mirror | High | Low |
| `customerUsernames` | `username` → `customerId` | Owned reservation | High | No (released on hard delete) | Transfer / reassign | Core | High | High |
| `accountDeletionRequests` | `userId` | Owned | Low | No | Cancel/fulfill | Low | Medium | Low |
| `printRequests` | `customerId` | Owned | **Critical** | **Yes** | Reassign `customerId` | Current snapshots via propagation | High | High |
| `printRequestItems` | `printRequestId` | Referenced | High | Yes (via parent) | Follow parent | titleSnapshot frozen | Medium | Medium |
| `showAllocations` | `customerId`, `printRequestId` | Owned denorm | High | **Yes** | Reassign `customerId` | requestNameSnapshot frozen | High | High |
| `gangSheets` / items | `printRequestId` | Referenced | Medium | Via parent | Follow parent | N/A | Low | Low |
| `customerUploads` | `customerId`, `customerUid` | Owned | High | **Yes** | Reassign + Storage | Low | Medium | High |
| `customerUploadBatches` | `customerId`, `customerUid` | Owned | High | **Yes** | Reassign | Low | Medium | High |
| `assistedCreationRequests` | `customerId`, `customerUid` | Owned | High | **Yes** | Reassign + Storage | Low | Medium | High |
| `customerNotifications` | `customerId`, `customerUid` | Owned | Medium | **Yes** | Reassign | Low | Low | Medium |
| `emailDeliveryJobs` | `customerId`, `customerUid` | Owned | Low | **Yes** if any | Reassign | None | Low | Low |
| `etsyRecommendationRequests` | `customerId`, `customerUid` | Owned | Medium | **Yes** | Reassign | Low | Low | Medium |
| `etsySuggestionRequests` | `customerId`, `customerUid` | Owned | Medium | **Yes** | Reassign | Low | Low | Medium |
| `designIssueReports` | `customerId`, `customerUid` | Owned | High | **Yes** | Reassign + propagation | Snapshots | Medium | Medium |
| `customers/.../favorites` | subcollection | Owned | Low | **Yes** if any | Move to survivor | None | Low | Medium |
| `customers/.../webPushSubscriptions` | subcollection | Owned | Low | **Yes** if any | Move/invalidate | None | Low | Medium |
| `customRequests` | `customerId` | Legacy owned | Medium | **Yes** if any | Reassign | Low | Low | Low |
| Upload rate limits / leases | `customerUid` | Ephemeral | None | No | Recreate | None | None | Low |
| Storage `customer-uploads/` | `customerUid` | Owned binary | High | **Yes** | Migrate if UID changes | N/A | Low | **Critical** |
| Storage `assisted-creation/` | `customerUid` | Owned binary | High | **Yes** | Migrate if UID changes | N/A | Low | **Critical** |
| `usernameHistory` | on customer | Owned audit | Medium | No | Keep on source tombstone | N/A | High | Low |
| `identitySnapshotPropagation` | on customer | Job state | None | No | Reset on survivor after merge | N/A | Low | Medium |
| `customerActivityEvents` | `customerId` | Owned audit evidence | Medium | No | Reassign query key to survivor | N/A | **Audit evidence only** (not lifecycle source-of-truth) | Medium |
| `auditLogs` | `entityId`? | Planned | — | No | Defer | — | Future | Low |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-28-customer-account-identity-management-and-audit-review.md`
- Verdict: pending
