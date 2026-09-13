# Plan: Customer Account Identity Management — WS2 Duplicate Resolution

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Author | Planning Agent |
| Status | **approved — owner decisions recorded 2026-08-29** |
| Workflow | managed-phase |
| Master plan | `docs/workflow/plans/2026-08-28-customer-account-identity-management-and-audit-plan.md` |
| WS1 signoff | `docs/workflow/reviews/2026-08-28-customer-account-identity-management-ws1-signoff.md` |
| Goal id | `customer-account-identity-management-ws2-duplicate-resolution` |

---

## Goal

Deliver an **owner-only**, fail-closed workflow in Studio to preview two verified customer accounts believed to represent the same person, designate **source (duplicate)** and **survivor**, and **atomically transfer a desired username** from source to survivor **without** performing WS3 full account merge or rewriting historical business records.

Primary real-world scenario: customer created email/password account (owns desired username), later created Google account (wants to use going forward); Google account cannot claim username while first account retains reservation.

---

## Background

WS1 closed with disable/restore, history-free hard delete (dev-gated), Change Username, identity snapshot propagation, and append-only `customerActivityEvents`. **No** duplicate-resolution callables or wizard exist in repo today.

Master plan §9–§10 defines WS2 scope. This plan narrows WS2 to **preview + username transfer + owner disposition choice**; WS3 merge and WS4 activity UI remain out of scope.

---

## Scope

### In Scope

- `previewDuplicateAccountResolution` callable (**owner-only** preview)
- `transferCustomerUsername` callable (owner apply only)
- Extend `customerIdentityOperationPreviews` operation types + checksum model for duplicate resolution
- Shared types for preview/apply payloads, verification verdict, disposition options
- Studio **`ResolveDuplicateAccountWizard`** (owner-only entry from Users / customer context)
- New activity event type(s) for preview + username transfer
- Unit/contract tests for reservation txn, stale preview rejection, verification fail-closed paths
- DEV-only apply gate (reuse `customerIdentityProjectGate` pattern from WS1 hard delete)
- Documentation updates: `DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md`, `DECISIONS.md` (ADR-FP-153)

### Out of Scope

- WS3: `previewCustomerAccountMerge`, `applyCustomerAccountMerge`, ownership reassignment across print graph
- WS4: `CustomerActivityCards`, PR-grouped timeline UI, deep links into Studio workflows
- Bulk/auto duplicate detection
- Firebase Auth provider-linking configuration changes (research only; separate human checkpoint if pursued)
- Production deploy (separate owner authorization)
- Portal self-service duplicate resolution
- Changing tombstone username reservation semantics (ADR-FP-115) except documented owner-authorized transfer exception (ADR-FP-153)

---

## Master-plan / WS1 artifact map

| Artifact | Path |
|----------|------|
| Master plan | `docs/workflow/plans/2026-08-28-customer-account-identity-management-and-audit-plan.md` |
| WS1 kickoff amendment (ADR numbering) | `docs/workflow/plans/2026-08-28-customer-identity-ws1-kickoff-amendment.md` |
| Master formal review | `docs/workflow/reviews/2026-08-28-customer-account-identity-management-and-audit-review.md` |
| WS1 signoff | `docs/workflow/reviews/2026-08-28-customer-account-identity-management-ws1-signoff.md` |
| WS1 implementation review | `docs/workflow/reviews/2026-08-28-customer-identity-management-ws1-implementation-review.md` |

**ADR-FP-153** is referenced in master plan + kickoff amendment but **does not yet have a full ADR entry** in `docs/project/DECISIONS.md` — create at implementation.

---

## Repo source files discovered (WS2-relevant)

### Username reservation (authoritative)

| Path | Role |
|------|------|
| `functions/src/lib/customerProfileUpdate.ts` | `applyCustomerProfileUpdate()` — Firestore txn: read `customerUsernames/{username}`, set new reservation, delete old on change |
| `functions/src/registerCustomer.ts` | Portal signup txn reserves username |
| `functions/src/createCustomerWithPortalInvite.ts` | Studio invite txn reserves username |
| `apps/studio/src/renderer/src/features/customers/services/customerService.ts` | Client-side create + reservation assert |
| `apps/studio/src/renderer/src/features/firebase/constants/firestoreCollections.ts` | `customerUsernames` collection constant |
| `firestore.rules` (~1615+) | Staff-managed reservation docs `{ customerId, createdAt, updatedAt }` |

**Collection:** `customerUsernames/{normalizedUsername}` → `{ customerId, createdAt, updatedAt }`

**No standalone `claimUsername` / `releaseUsername` helper** — WS2 must extract or mirror txn logic in `functions/src/lib/customerUsernameTransfer.ts` (new).

### Identity profile + propagation

| Path | Role |
|------|------|
| `functions/src/updateCustomer.ts` | Staff profile update + propagation + `account.username_changed` event |
| `functions/src/updatePortalCustomerProfile.ts` | Portal self-service (not WS2 surface) |
| `functions/src/lib/propagateCustomerIdentitySnapshots.ts` | Resumable snapshot updates on `printRequests`, `designIssueReports` |
| `packages/shared/src/utils/readCustomerIdentityDocumentFields.ts` | Shared identity field reader |

### Lifecycle (source disposition options — do not repurpose silently)

| Path | Role |
|------|------|
| `functions/src/disableCustomerAccount.ts` | Reversible disable (ADR-FP-150); **username stays reserved** |
| `functions/src/tombstoneCustomerAccount.ts` | Tombstone (ADR-FP-115); **username stays reserved** |
| `functions/src/hardDeleteCustomerAccount.ts` | History-free delete (ADR-FP-151); **releases username**; dev-gated apply |
| `functions/src/lib/customerAccountEligibility.ts` | History inventory + hard-delete blockers |
| `functions/src/lib/customerIdentityEligibilitySnapshot.ts` | Snapshot + checksum for previews |
| `functions/src/lib/customerIdentityOperationPreview.ts` | Single-use preview docs (15 min TTL); today **`hard_delete` only** |
| `functions/src/lib/customerIdentityProjectGate.ts` | Apply limited to `fresh-prints-dev` |

### Activity audit

| Path | Role |
|------|------|
| `functions/src/lib/customerActivityEvents.ts` | `appendCustomerActivityEvent()` |
| `packages/shared/src/types/customer/customerActivityEvent.types.ts` | Event types (no transfer events yet) |

### Studio UI (existing)

| Path | Role |
|------|------|
| `apps/studio/src/renderer/src/features/users/pages/UserManagementPage.tsx` | Customer directory + actions |
| `apps/studio/src/renderer/src/features/users/services/customerIdentityManagementService.ts` | WS1 callables client |
| `apps/studio/src/renderer/src/features/users/components/HardDeleteCustomerConfirmDialog.tsx` | Preview/apply pattern reference |
| `apps/studio/src/renderer/src/permissions/services/permissionService.ts` | Permission gates |

**Planned, missing:** `ResolveDuplicateAccountWizard.tsx`, `CustomerIdentitySection.tsx`

### Portal auth / duplicate account creation

| Path | Role |
|------|------|
| `apps/portal/features/auth/services/authService.ts` | Email + Google login |
| `apps/portal/features/auth/context/AuthProvider.tsx` | Session bootstrap; `missing-customer` → complete profile |
| `functions/src/registerCustomer.ts` | New customer per Auth uid; email uniqueness guard |
| `docs/project/DECISIONS.md` | ADR-FP-081 / ADR-FP-104 area — separate Auth users unless linked in Firebase console |

---

## Root cause: why username transfer is blocked today

1. Each Firebase Auth uid maps to at most one `customers` document via `userId`.
2. Email/password signup and Google signup create **separate Auth users** unless provider linking is configured outside the app.
3. Desired username is reserved on `customerUsernames/{username}` for the **source** customer id.
4. Survivor cannot claim it via normal `updateCustomer` / Portal profile — reservation owned by source.
5. **Disable** and **tombstone** do **not** release username (ADR-FP-115 / ADR-FP-150).
6. **Hard delete** would release username but requires history-free eligibility and dev gate — not equivalent to duplicate resolution and may fail when source has print/upload history.

WS2 adds an **explicit owner-authorized reservation swap** (ADR-FP-153) without WS3 data merge.

---

## Proposed duplicate-resolution UX (Studio)

**Entry:** Users → customer row / detail → **Resolve Duplicate Account** (owner only; new permission `canResolveDuplicateCustomerAccount` or reuse owner-only gate).

**Wizard steps:**

1. **Select pair** — search/select Source and Survivor by customer id, username, email (reuse directory search patterns; prevent same-id pair).
2. **Preview** — call `previewDuplicateAccountResolution`; render side-by-side cards:
   - customer id, auth uid (`userId`), username, display name, email
   - account state: active / disabled / tombstoned / merged / locked
   - auth providers (Admin SDK `getUser` provider list — no secrets/tokens)
   - history summary counts (from `customerAccountEligibility` inventory)
   - continuable print request flags per customer
   - username reservation ownership for desired handle
   - **verification verdict** + human-readable reasons
   - recommended paths (hard delete eligible / disable / transfer-only / blocked → WS3)
3. **Owner decisions** (explicit, never silent):
   - confirm Survivor + Source roles (swap allowed before apply)
   - desired username (default: source’s current username)
   - **source disposition** — see § Source-account disposition
4. **Apply** — `transferCustomerUsername` with `previewId`, checksum, disposition choice; show propagation progress link if survivor identity snapshots queued.

**No WS3 merge button** except deep-link placeholder “Requires Full Account Merge (WS3)” when preview recommends it.

---

## Preview contract (`previewDuplicateAccountResolution`)

### Auth

- **Owner:** preview + apply
- **Admin:** preview read-only (align with hard-delete preview visibility) [confirm in implementation review]

### Input

```ts
{
  sourceCustomerId: string;
  survivorCustomerId: string;
  desiredUsername?: string; // optional override; default source.username
}
```

### Output (proposed)

| Section | Fields |
|---------|--------|
| `source` / `survivor` | Identity snapshot per customer (ids, username, email, displayName, userId, flags) |
| `authProviders` | Per uid: `{ providerId, email?, displayName? }[]` from Admin SDK |
| `historySummary` | Blocker counts + `eligibleForHardDelete` per customer |
| `continuablePrintRequests` | Count + ids (cap display) per customer |
| `usernameReservation` | `{ username, ownerCustomerId, matchesSource, matchesSurvivor }` |
| `verification` | `{ status: 'verified' \| 'blocked' \| 'needs_owner_confirmation', reasons: string[], evidence: ... }` |
| `recommendations` | Enum set from master plan §10 |
| `previewToken` | `{ previewId, expiresAtMillis, previewChecksum }` |

### Preview persistence

Extend `customerIdentityOperationPreviews`:

- `operation`: `"duplicate_resolution"` | `"username_transfer"` (prefer single `"duplicate_resolution"` covering transfer payload)
- Store: both customer ids, desired username, survivor/source roles, checksum over eligibility + reservation state for **both** customers
- TTL: **15 minutes** (match WS1 hard delete)
- Single-use via `usedAt` (extend `consumeCustomerIdentityPreview`)

### Fail-closed revalidation on Apply

Apply MUST reject when:

- Preview expired or already used
- Either customer tombstoned, merged, or identity-locked since preview
- `customerUsernames/{desired}` owner ≠ sourceCustomerId
- Verification status === `blocked`
- Survivor/survivor uid changed
- Checksum mismatch

---

## Duplicate verification policy

Master plan requires **verified duplicates** but does not define an automated proof contract. Proposed **fail-closed** policy:

### Automatic `verified` (all required)

| Evidence | Rule |
|----------|------|
| Email match | Normalized primary emails equal **and** both non-empty **OR** Auth provider emails match after normalization |
| Account state | Neither tombstoned nor merged; neither under `identityOperationLock` |
| Distinct accounts | `sourceCustomerId !== survivorCustomerId`; distinct `userId` when both present |
| Username target | Desired username currently reserved to source (or explicit owner override with second confirmation) |

### Automatic `blocked`

- Same customer id or same `userId`
- Either account merged
- Desired username owned by third customer
- Dual continuable working print requests on **both** accounts with conflicting mutation risk (master plan `BLOCKED_DUAL_WORKING`) — transfer allowed only with owner acknowledgment [NEEDS OWNER DECISION: block vs warn]

### `needs_owner_confirmation`

- Emails differ but owner attests same person (checkbox + confirmation phrase)
- Provider list inconclusive (e.g., Google `email` hidden)
- Source has meaningful history (not hard-delete eligible) — transfer still allowed but disposition must not imply hard delete

**NOT sufficient alone:** display name match, username similarity, creation date proximity.

`[NEEDS OWNER DECISION]` — Final binding verification matrix before implement (see Open Questions).

---

## Username transfer transaction (`transferCustomerUsername`)

Implement in **`functions/src/lib/customerUsernameTransfer.ts`** + thin callable wrapper.

### Input

```ts
{
  previewId: string;
  sourceCustomerId: string;
  survivorCustomerId: string;
  desiredUsername: string;
  sourceDisposition: 'leave_active' | 'disable_source' | 'defer' ; // hard_delete only via separate WS1 flow after transfer
  ownerConfirmationPhrase?: string; // if verification needs_owner_confirmation
}
```

### Single Firestore transaction (atomic reservation swap)

1. **Re-read** preview + consume token (outside txn or first txn op with idempotent guard).
2. Load source + survivor customer docs; validate states (not merged; not tombstoned unless plan explicitly forbids — **forbid tombstoned**).
3. Validate `customerUsernames/{desiredUsername}.customerId === sourceCustomerId`.
4. If survivor has different username:
   - **Delete** `customerUsernames/{survivorOldUsername}` (survivor relinquishes old handle — owner intent for duplicate case).
5. **Set** `customerUsernames/{desiredUsername}` → `{ customerId: survivorCustomerId, updatedAt }` (overwrite in txn — never delete-then-commit outside txn).
6. Update survivor: `username`, append `usernameHistory`, `usernameUpdatedAt`.
7. Assign source a **unique placeholder username** (required invariant: one reservation per customer):
   - Default pattern: `merged-src-{first8OfCustomerId}` or `dupe-{shortId}` validated via `validateCustomerUsername`
   - Update source customer doc + **set** new `customerUsernames/{placeholder}` → sourceCustomerId
   - **Delete** old source reservation only after new placeholder reservation exists in **same txn** (swap ordering: set placeholder first, then delete old source reservation, or direct reassignment of desired doc to survivor + create placeholder doc — order must leave no window where desired username is unowned)
8. Append source `usernameHistory` for loss of desired handle.

**Critical ordering (no steal window):**

```
// Within one transaction:
// A) set customerUsernames/{placeholder} -> source (if placeholder new)
// B) set customerUsernames/{desired} -> survivor
// C) delete customerUsernames/{survivorOld} if relinquished
// D) delete customerUsernames/{sourceOldDesired} ONLY after step B succeeds (same txn)
// E) update customers/{survivor} + customers/{source} username fields
```

Never leave `customerUsernames/{desired}` deleted without survivor ownership in same commit.

### Post-transaction

- `initializeIdentitySnapshotPropagation` + `propagateCustomerIdentitySnapshots` for **survivor** (and optionally source display if placeholder affects labels — usually not)
- If `sourceDisposition === 'disable_source'`: invoke disable callable logic **after** successful transfer (separate step; failure leaves username transferred but source active — log + surface partial success)
- Append `account.duplicate_resolution_previewed` (preview) and `account.username_transferred` (apply) events on **both** customer ids or survivor + metadata referencing source [NEEDS OWNER DECISION: event shape]

### Race safety

- Transaction retry on contention
- Reject if reservation owner changed between preview checksum and apply
- Optional short-lived `identityOperationLock` on both customers during apply (extend WS1 lock helper if present)

---

## Source-account disposition options

| Option | Behavior | WS2 default candidate |
|--------|----------|----------------------|
| **A — Leave active** | Username transferred; source keeps login with placeholder username | Safest minimal scope |
| **B — Disable source** | After transfer, call `disableCustomerAccount` (reversible) | **Recommended default** for email/password duplicate customer no longer wanted |
| **C — Hard delete source** | Only if `eligibleForHardDelete`; separate WS1 preview/apply after transfer | Optional chained action, not silent |
| **D — Defer to WS3** | Transfer only; owner handles merge/tombstone later | Valid when source has history |

**Do not** tombstone source merely to clean up — tombstone **retains** username reservation on the **old** username doc; transfer must happen **before** any tombstone if desired handle moves.

`[NEEDS OWNER DECISION]` — binding default disposition for primary Google-survivor / email-source scenario.

---

## Primary use case handling (email/password → Google)

| Step | WS2 behavior |
|------|----------------|
| Identify pair | Source = email/password customer (owns `@desired`); Survivor = Google customer |
| Preview | Show both Auth providers; email match if same normalized email on records |
| Transfer | Move `@desired` reservation to Google survivor; assign placeholder on email account |
| Disposition | **Recommend B (disable source)** — blocks email login, preserves history on source id |
| Portal login | Customer uses Google going forward on survivor uid unchanged |
| History | Print requests / uploads remain on original customer ids — **no WS3 merge** |

QA scenario must be explicit in manual test checklist.

---

## WS3 boundary — what WS2 must NOT do

| Domain | WS2 | WS3 |
|--------|-----|-----|
| `printRequests.customerId` | No reassignment | Reassign operational ownership |
| Customer uploads / assisted creation | No move | Migrate / reassign |
| Show allocations | No rewrite | Reassign |
| `printRequests.name` | Immutable (propagation only updates snapshots) | Same immutability |
| Auth uid on survivor | Unchanged | Survivor uid kept by design |
| Source Auth user | Disable optional; not delete in WS2 | May delete/disable after merge job |
| `customerActivityEvents` | Append transfer events | Merge job events |

### WS3 inventory (planning only)

**Likely relationships to reconcile in WS3** (from master plan Appendix + `customerAccountEligibility`):

- `printRequests`, show allocations, `customerUploads`, assisted creation, favorites, Etsy requests, notifications, Storage paths keyed by uid, `designIssueReports`

**Key risks:** dual continuable working requests, partial Storage migration, Auth delete timing, immutable snapshots vs operational queries

**Why separate:** Username transfer solves login + handle collision without cross-customer data graph rewrite.

**Read when WS3 starts:** master plan §11–§12, `customerAccountEligibility.ts`, `propagateCustomerIdentitySnapshots.ts`, ADR-FP-152 placeholder

---

## WS4 inventory — customer history / deep linking

Master plan WS4: **`listCustomerActivityEvents`**, **`listCustomerPrintRequestSummaries`**, card UI grouped by Print Request.

Owner expects (investigation):

| Expectation | In master plan? |
|-------------|-----------------|
| Richer customer activity trail | Yes — `customerActivityEvents` timeline |
| PR-grouped history cards | Yes — § activity cards |
| Deep links into Studio workflows | Partially — “deep-link helper” in test matrix; **exact routes TBD** |
| Show/date visibility for requests | `[NEEDS REPO CHECK]` — likely derived from `printRequests` + show allocation fields in list API |
| Traceability when Customer Request → Internal Request | `[NEEDS REPO CHECK]` — `requestOrigin` / conversion fields exist in print request model; WS4 should surface, not WS2 |

`[NEEDS OWNER DECISION]` — deep-link targets (Print Request detail, Show Queue, etc.)

---

## Future duplicate prevention (research only)

**Finding:** `[NEEDS REPO / AUTH CONFIG CHECK]`

- Portal creates **new** customer per Auth uid at registration (`registerCustomer`).
- Google first sign-in without customer doc → complete-profile → new customer.
- Same human email across password + Google yields separate Auth users unless Firebase **account linking** enabled in console.
- Portal shows `account-exists-with-different-credential` style messaging — no in-app merge.

**Prevention candidates (no change in WS2):**

1. Firebase Auth `linkWithCredential` / provider linking policy
2. Portal bootstrap detecting existing customer by verified email before `registerCustomer`
3. Block second registration when normalized email matches existing customer (conflicts with multi-user email policy — needs product decision)

Current duplicate must remain resolvable via WS2 even if prevention improves later.

---

## Affected files (implementation expectation)

### New

- `functions/src/previewDuplicateAccountResolution.ts`
- `functions/src/transferCustomerUsername.ts`
- `functions/src/lib/customerUsernameTransfer.ts`
- `functions/src/lib/customerDuplicateVerification.ts` (verification policy)
- `packages/shared/src/types/customer/customerDuplicateResolution.types.ts`
- `apps/studio/.../users/components/ResolveDuplicateAccountWizard.tsx`
- `apps/studio/.../users/components/DuplicateAccountPreviewPanel.tsx` (optional split)
- Tests: `functions/src/lib/customerUsernameTransfer.test.ts`, Studio contract tests

### Modified

- `functions/src/lib/customerIdentityOperationPreview.ts` — operation enum + consume
- `functions/src/lib/customerActivityEvents.ts` + shared event types
- `functions/src/index.ts` — exports
- `apps/studio/.../users/pages/UserManagementPage.tsx` — entry point
- `apps/studio/.../users/services/customerIdentityManagementService.ts`
- `apps/studio/.../permissions/services/permissionService.ts`
- `firestore.rules` — preview docs if needed
- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md`, `DECISIONS.md`

---

## Test strategy

### Automated

| Check | Scope |
|-------|-------|
| `customerUsernameTransfer.test.ts` | Atomic swap, placeholder assignment, concurrent reservation conflict, stale preview |
| `customerDuplicateVerification.test.ts` | Email match, blocked same-uid, needs_owner_confirmation |
| Extend preview consume tests | duplicate_resolution operation |
| Studio contract | Wizard service payload mapping |

### Manual (DEV `fresh-prints-dev`)

- [ ] Email/password source + Google survivor — preview → transfer → Google login with desired username
- [ ] Apply rejected after username reservation tamper
- [ ] Apply rejected after preview expiry
- [ ] Source disposition disable — email login blocked; survivor active
- [ ] Historical print request on source unchanged `customerId`; survivor snapshots updated on new requests only
- [ ] No WS3 reassignment occurred (spot-check Firestore)
- [ ] Activity events appended (staff read)

### Human checkpoints

- [ ] Owner approves verification matrix (`[NEEDS OWNER DECISION]`)
- [ ] Owner approves default source disposition
- [ ] DEV deploy authorization (Functions only; no prod)
- [ ] Owner DEV QA PASS before signoff
- [ ] Production deploy — **separate gate** (forbidden in WS2 implement without new authorization)

---

## Rollback

- WS2 apply is forward-only; rollback is **manual compensation**:
  - Reverse transfer via second owner operation (not auto rollback)
  - Document runbook in signoff if DEV QA reveals gap
- DEV gate prevents prod exposure until explicitly authorized

---

## Acceptance criteria mapping

| Criterion | Plan section |
|-----------|--------------|
| Owner preview two accounts | UX § Wizard step 2; callable preview |
| Preview identity + history evidence | Preview contract |
| Fail-closed verification | § Duplicate verification policy |
| Explicit survivor/source | Wizard step 3 |
| Safe username transfer | § Username transfer transaction |
| Atomic / race-safe | Txn ordering + preview checksum |
| Survivor identity consistency | Propagation post-txn |
| Immutable `printRequests.name` | WS3 boundary |
| Snapshot propagation respected | Post-txn propagation |
| Source history preserved | No WS3 |
| No accidental WS3 merge | Out of scope + UI guard |
| Audit events | Activity events |
| Explicit source disposition | § Source-account disposition |
| Disable/tombstone/hard-delete semantics intact | Preserve ADRs |
| Email/password + Google QA | § Primary use case |
| Rollback/failure defined | § Rollback + partial disable failure |
| DEV deploy + owner QA | Test strategy |
| Production gated | Out of scope |

---

## Open questions / `[NEEDS OWNER DECISION]`

**Resolved 2026-08-29 (owner approval):**

1. **Verification** — Tier A verified email match; Tier B owner attestation + reason; phrase `TRANSFER USERNAME` on all Apply.
2. **Default source disposition** — Transfer username + disable source (reversible); partial-success if disable fails after transfer.
3. **Continuable print requests** — Block (fail-closed): both have continuable; source has continuable + disable; allow survivor-only.
4. **Survivor old username** — Released in same transaction as transfer.
5. **Activity events** — `account.duplicate_resolution_previewed`, `account.username_transferred`, reuse `account.disabled`.
6. **Admin preview** — **Owner-only** for WS2 preview and apply; admins retain ordinary `updateCustomer` username edit.
7. **WS4 deep-link intent** — Recorded for WS4 only (Print Request grouped history + route helpers); not implemented in WS2.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws2-duplicate-resolution-review.md`
- Verdict: **approved_with_changes** → owner approved 2026-08-29 → **Implement authorized**
