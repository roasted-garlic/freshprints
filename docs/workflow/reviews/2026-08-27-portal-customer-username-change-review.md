# Review: Portal Customer Username Change (Self-Service + Propagation)

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-27-portal-customer-username-change-plan.md` |
| Verdict | **approved** |

---

## Summary

Owner decisions resolve all plan open questions. The approach is architecturally sound: reuse existing `updateCustomer` reservation/transaction semantics, add a Portal-scoped callable, and propagate identity snapshots with write-once at-creation preservation. **No new Firestore composite indexes are required** for propagation queries. Propagation must use an **idempotent, resumable, same-callable batch pattern** (existing `clearPortalWorkingPrintRequest` style) with persisted cursor state on the customer doc — **not** a new background worker or catalog-reprocess-style job infrastructure.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Guest/tombstone/CR name immutability explicit |
| Architecture alignment | pass | Shared domain helper; callables own writes |
| Security impact addressed | pass | Callable-only; cooldown portal-only |
| Data model impact addressed | pass | Optional fields; write-once at-creation |
| Backend impact addressed | pass | Two callables + shared lib |
| Test strategy adequate | pass | Requires multi-hop username test (binding) |
| Human checkpoints identified | pass | Dev functions deploy; prod deploy gate |
| Roadmap alignment | pass | Customer-requested Portal capability |
| Documentation plan | pass | DATA_MODEL, BACKEND, SECURITY, DECISIONS |
| No silent scope expansion | pass | No CR `name` rename; no username recycling policy change |

---

## PORTAL CUSTOMER USERNAME CHANGE — FORMAL REVIEW RESULT

### Verdict

**approved** — proceed to implementation per binding requirements below. No blockers.

---

### Binding changes (incorporate into plan before/during implement)

1. **Propagation recovery is mandatory** — add `customers.identitySnapshotPropagation` state (Admin SDK only) and shared `resumeCustomerIdentitySnapshotPropagation()` used by Portal + Studio callables.
2. **Do not add** catalog-reprocess-style job collections, Firestore triggers, or Cloud Tasks for this goal.
3. **Cooldown applies only to Portal self-service username changes** — staff `updateCustomer` bypasses cooldown.
4. **Display-name-only changes** propagate snapshots but do not advance `usernameUpdatedAt` or consume username cooldown.
5. **At-creation fields are write-once** — use `FieldValue` merge guards: set only when field absent; never overwrite on later propagations.
6. **Formatter is shared** — new `formatCustomerIdentityLabel` (or extend existing helpers) must implement owner copy exactly; do not show “was @old” when at-creation equals current snapshot username.
7. **usernameHistory cap = 10** — append previous username on each username change; support/audit only.
8. **Add functions unit tests** for `updateCustomer` propagation parity (none exist today).
9. **Update plan open questions** to closed with owner decisions (done in this review).

---

### Final data model

#### `customers/{customerId}` (additions)

```ts
usernameHistory?: Array<{
  username: string;      // previous username at time of change
  changedAt: Timestamp;
}>;                      // append-only, max 10 entries (drop oldest)

identitySnapshotPropagation?: {
  status: "idle" | "in_progress" | "completed" | "failed";
  targetUsername: string;
  targetDisplayName: string;
  printRequestCursor?: string | null;       // last processed doc id
  designIssueReportCursor?: string | null;
  printRequestsUpdated: number;
  designIssueReportsUpdated: number;
  startedAt: Timestamp;
  updatedAt: Timestamp;
  lastError?: string;                       // safe, bounded message
};
```

Existing fields unchanged: `username`, `displayName`, `usernameUpdatedAt`, `userId`, tombstone flags.

#### `printRequests/{id}` (additions)

```ts
customerUsernameAtCreationSnapshot?: string;   // write-once
customerDisplayNameAtCreationSnapshot?: string; // write-once
// customerUsernameSnapshot / customerDisplayNameSnapshot → "current identity" after propagation
// name (e.g. olduser-CR001) → IMMUTABLE — never updated
```

#### `designIssueReports/{id}` (additions)

Same at-creation + current snapshot semantics as print requests.

#### `customerUsernames/{username}`

No policy change. Transactional swap: create new reservation, delete old (existing `updateCustomer.ts` behavior). Tombstone reservations remain permanent.

---

### Canonical update transaction

**Shared module:** `functions/src/lib/customerProfileUpdate.ts`

**Transaction scope (single Firestore transaction):**

1. Read `customers/{customerId}`; verify caller authority (Portal: `requirePortalCustomer` + matching `customerId`; Studio: `assertCanManageCustomers`).
2. **Portal username cooldown** (username change only): reject if `usernameUpdatedAt` exists and is &lt; 30 days ago (use server `Timestamp`; compare in UTC).
3. Validate `displayName` + `username` via shared validators (`customerUpdateValidation.ts` / `validateCustomerUsername`).
4. **Username reservation race safety:**
   - `transaction.get(customerUsernames/{newUsername})` — fail `already-exists` if owned by another customer.
   - `transaction.update(customers/{id})` — `username`, `displayName`, `usernameUpdatedAt` (only if username changed), `updatedAt`.
   - `transaction.set(customerUsernames/{newUsername})` — `{ customerId, createdAt, updatedAt }`.
   - `transaction.delete(customerUsernames/{oldUsername})` when username changed and old exists.
   - If linked `userId`: `transaction.update(users/{uid})` — `displayName`, optional `email` (staff path only), `updatedAt`, `updatedBy`.
5. **Append `usernameHistory`** (username change only) inside same transaction or immediately after via Admin batch (prefer same transaction if doc size allows; else atomic follow-up write on customer doc only).

**Post-transaction (outside transaction, same callable invocation):**

6. **Firebase Auth sync** — mirror `updateCustomer.ts`:
   - Email change: staff path only (`adminAuth.updateUser` email + displayName).
   - Display name only: `adminAuth.updateUser({ displayName })`.
7. **Initialize propagation state** on customer: `status: in_progress`, targets = new identity, cursors null, counters 0.
8. **Run propagation loop** (see below).

**Auth failure semantics:** Canonical Firestore + reservation commit is authoritative. Auth sync failure logs error and returns `portalAuthDisplayNameSynced: false` (Portal) — same pattern as existing email sync flag; do not roll back reservation.

---

### Propagation / retry architecture

**Module:** `functions/src/lib/propagateCustomerIdentitySnapshots.ts`

**Pattern source:** `functions/src/clearPortalWorkingPrintRequest.ts` — batch commits at **400 ops**, loop until complete.

**Query paths (no new indexes):**

- `printRequests.where("customerId", "==", customerId).orderBy(documentId())` or `orderBy("updatedAt")` with pagination — single-field `customerId` equality is index-free; existing `customerId + updatedAt` composite also supports ordered pagination if needed.
- `designIssueReports.where("customerId", "==", customerId)` — single-field equality; no composite index in `firestore.indexes.json` required.

**Per-document idempotent update logic:**

```
if customerUsernameAtCreationSnapshot missing:
  set from existing customerUsernameSnapshot (or previous canonical username if snapshot empty)
if customerDisplayNameAtCreationSnapshot missing:
  set from existing customerDisplayNameSnapshot (or previous displayName)
set customerUsernameSnapshot = targetUsername
set customerDisplayNameAtCreationSnapshot = targetDisplayName (current snapshot fields only)
NEVER mutate printRequest.name
```

**Recovery / partial failure (binding):**

- After each committed batch: persist `printRequestCursor` / `designIssueReportCursor` + counters + `updatedAt` on `customers.identitySnapshotPropagation`.
- On full completion: set `status: completed`, clear cursors.
- On batch commit error: set `status: failed`, `lastError` (bounded), leave cursors at last successful position.
- **Retry:** `resumeCustomerIdentitySnapshotPropagation(customerId)` — idempotent; callable entry points:
  - End of `updatePortalCustomerProfile` (loop until complete or callable time budget)
  - End of `updateCustomer` (staff parity)
  - Start of either callable if `status` is `in_progress` or `failed` and targets match current canonical identity (stale state from abandoned run)
  - Optional dedicated export `resumeCustomerIdentitySnapshotPropagation` in `functions/src/index.ts` for explicit Portal retry if first response returns `propagationComplete: false` (client may call once automatically)

**Callable time budget:** Loop batches until complete. If approaching safe limit (e.g. 50 batches / ~20k docs per invocation), return `propagationComplete: false` with counts; Portal chains resume call. **Do not** leave docs permanently inconsistent — any doc not yet processed still has old snapshot; retry completes them. Docs already processed are idempotent.

**No half-updated at-creation corruption:** Write-once at-creation fields prevent retroactive history loss on retry.

---

### Cooldown behavior

| Actor | Username change | Display name change |
|-------|-----------------|---------------------|
| Portal customer | Blocked if `usernameUpdatedAt` within **30 days** | Allowed anytime |
| Studio staff | No cooldown | Allowed anytime |

`usernameUpdatedAt` updates **only** when normalized username string changes.

Error message (Portal): clear, user-safe, includes next eligible date.

---

### Studio parity behavior

`functions/src/updateCustomer.ts` refactored to call shared `applyCustomerProfileUpdateInTransaction` + same propagation/resume path as Portal.

Studio `EditCustomerModal` copy updated: snapshots propagate; CR **names** stay unchanged; historical label shows `@new · was @old at submission` when applicable.

Staff may trigger propagation resume by re-saving customer if a prior propagation failed (idempotent).

---

### UI behavior

#### Portal (`apps/portal/features/account/components/AccountSettingsModal.tsx`)

- New **Profile** section: `displayName` + `username` (reuse `PortalUsernameField`, `CompleteProfileForm` validation patterns).
- Success toast explains CR names unchanged; lists show new @handle.
- If `propagationComplete: false`, show non-blocking notice + auto-call resume once (or manual “Finish updating history” retry).
- Do **not** expose `usernameHistory` to customers.

#### Studio

- Wire `formatCustomerIdentityLabel` into print request list rows, staff inbox derivations, design issue submitter display.
- Keep `formatCustomerUsernameForDisplay` for deleted-customer `(Deleted)` suffix.

#### Historical display (binding copy)

- Primary: current snapshot username as `@newname`
- Secondary (only when `customerUsernameAtCreationSnapshot` present **and** normalized value ≠ current snapshot username): ` · was @oldname at submission`
- Display name: prefer `customerDisplayNameSnapshot`; at-creation display name for support only unless product asks otherwise

---

### Security

| Control | Implementation |
|---------|----------------|
| Portal scope | `requirePortalCustomer` (`functions/src/lib/portalCustomer.ts`); reject `isDeleted` / inactive |
| Own profile only | Portal callable ignores client `customerId`; derives from auth uid |
| Username uniqueness | Transactional `customerUsernames` reservation (existing) |
| Client writes | `firestore.rules` — customers may **not** write `username`, `displayName`, snapshot fields, propagation state (unchanged allowlist at `customers` ~1541–1548) |
| Propagation | Admin SDK only via callables |
| Staff path | `assertCanManageCustomers` unchanged |
| Cooldown authority | Server-side `usernameUpdatedAt` only; not client-trusted |

**Human approval before production:** functions deploy to `fresh-prints-prod` (existing checkpoint).

---

### Tests (required before signoff)

| Test | Location |
|------|----------|
| Username cooldown allow/deny | `functions/src/updatePortalCustomerProfile.test.ts` (new) |
| Reservation race / taken username | shared lib + callable tests |
| Propagation write-once at-creation | `functions/src/lib/propagateCustomerIdentitySnapshots.test.ts` (new) |
| **old1 → new1 → new2** — at-creation stays old1, snapshot new2 | propagation unit test (binding) |
| Retry after simulated batch failure | propagation resume test |
| Formatter identical usernames (no redundant “was”) | `packages/shared/src/utils/formatCustomerIdentityLabel.test.ts` (new) |
| Staff parity calls propagation | `updateCustomer` test or integration |
| Rules regression | extend `tests/firebase/` only if rules change (expect **none** for client paths) |

---

### Migrations / indexes

| Item | Required? |
|------|-----------|
| New Firestore composite indexes | **No** — `customerId` equality queries only |
| Data backfill for pre-feature Studio edits | **Out of scope** (plan) |
| Rules changes | **No** — callables use Admin SDK |
| `firestore.indexes.json` deploy | **Not required** for this goal |

---

### Exact implementation files (repo truth)

**Functions (new / modify)**

| File | Action |
|------|--------|
| `functions/src/lib/customerProfileUpdate.ts` | **new** — shared canonical txn |
| `functions/src/lib/propagateCustomerIdentitySnapshots.ts` | **new** — batch + resume |
| `functions/src/lib/propagateCustomerIdentitySnapshots.test.ts` | **new** |
| `functions/src/updatePortalCustomerProfile.ts` | **new** |
| `functions/src/updatePortalCustomerProfile.test.ts` | **new** |
| `functions/src/updateCustomer.ts` | **modify** — delegate to shared lib + propagation |
| `functions/src/lib/customerUpdateValidation.ts` | **modify** — add Portal payload validator (no `customerId` from client) |
| `functions/src/index.ts` | **modify** — export new callable(s) |

**Shared**

| File | Action |
|------|--------|
| `packages/shared/src/types/customer/customer.types.ts` | add `usernameHistory`, propagation type |
| `packages/shared/src/types/customer/updatePortalCustomerProfile.types.ts` | **new** |
| `packages/shared/src/types/printRequest/printRequest.types.ts` | at-creation snapshot fields |
| `packages/shared/src/designIssueReports/designIssueReport.types.ts` | at-creation snapshot fields |
| `packages/shared/src/utils/formatCustomerIdentityLabel.ts` | **new** |
| `packages/shared/src/utils/formatCustomerIdentityLabel.test.ts` | **new** |

**Portal**

| File | Action |
|------|--------|
| `apps/portal/features/account/components/AccountSettingsModal.tsx` | Profile section |
| `apps/portal/features/account/services/portalAccountSettingsService.ts` | callable client |
| `apps/portal/features/auth/components/PortalUsernameField.tsx` | reuse as-is |

**Studio**

| File | Action |
|------|--------|
| `apps/studio/src/renderer/src/features/users/components/EditCustomerModal.tsx` | copy alignment |
| `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` | formatter |
| `apps/studio/src/renderer/src/features/print-requests/utils/printRequestListSearch.ts` | search uses updated snapshots post-propagation |
| `packages/shared/src/designIssueReports/formatDesignIssueReportSubmitter.ts` | extend or delegate to identity label helper |
| `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSubscriptionService.ts` | if snapshot labels shown |

**Docs (implement phase)**

- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md`
- `docs/standards/SECURITY.md`
- `docs/project/DECISIONS.md` (ADR: immutable CR `name` + snapshot propagation)

**Reference (read-only patterns)**

- `functions/src/updateCustomer.ts` — current txn
- `functions/src/syncPortalAccountEmail.ts` — Portal self-service callable pattern
- `functions/src/clearPortalWorkingPrintRequest.ts` — batch chunking
- `functions/src/lib/portalCustomer.ts` — Portal auth gate
- `functions/src/registerCustomer.ts` — initial username reservation

---

### Remaining owner decisions

| Topic | Status |
|-------|--------|
| Username cooldown 30 days | **Closed** — approved |
| Display name in Portal form | **Closed** — approved |
| Immutable CR names | **Closed** — approved |
| Staff propagation parity | **Closed** — approved |
| Historical display copy | **Closed** — approved |
| Write-once at-creation snapshots | **Closed** — approved |
| usernameHistory support-only | **Closed** — approved |
| Guest customers staff-only | **Closed** — approved |
| Username reservation / tombstone | **Closed** — no change |
| Portal auto-retry vs manual retry on propagation incomplete | **Deferred to implement** — prefer one automatic client resume call, then non-blocking message (no owner gate) |
| Display-name historical “was at submission” for displayName | **Deferred** — implement username clause per owner; display name primary only unless staff requests parity later |

---

## Architecture Review

**Findings:**

- Extracting `customerProfileUpdate` avoids duplicating reservation logic between Portal and Studio.
- Propagation belongs in Functions Admin SDK layer, not Portal/Studio clients.
- Catalog reprocess worker is the wrong pattern; bounded batch + customer-scoped cursor is sufficient.

**Required changes:**

- [x] Documented above (propagation state, resume helper)

---

## Security Review

**Findings:**

- Existing rules already deny customer writes to username/displayName; no weakening required.
- Cooldown and uniqueness must be server-enforced only.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Functions deploy to production after dev QA

---

## Data Model Review

**Findings:**

- Write-once at-creation snapshots preserve audit trail while allowing current-identity display.
- `usernameHistory` bounded list is appropriate for support.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Two callables share one domain module; index.ts export required.
- Auth sync follows existing `updateCustomer` post-txn pattern.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- Plan tests are adequate if multi-hop username propagation test is mandatory (binding).
- No `updateCustomer` tests exist today; add with refactor.

**Required changes:**

- [x] Add old1→new1→new2 propagation test

---

## Documentation Review

**Findings:**

- Plan lists correct docs; ADR needed for immutable `name` vs mutable snapshots.

---

## Verdict Rationale

Owner decisions close all product questions. Technical risks (race safety, partial propagation, index needs) are addressable with existing repo patterns. No security rule relaxation. Scope is bounded and reversible. **Approved for implementation.**

---

## Next Step

**Implement** per plan + binding changes in this review. Do not deploy to production until dev QA and human deploy checkpoint.
