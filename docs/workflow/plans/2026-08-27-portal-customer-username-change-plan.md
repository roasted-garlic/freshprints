# Plan: Portal Customer Username Change (Self-Service + Propagation)

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase (new goal — separate from Slice 6) |
| Related | `docs/workflow/plans/2026-07-07-customer-update-sync-plan.md` |

---

## Goal

Let **Portal customers** change their **username** (and optionally **display name**) after signup. Changes must update canonical identity data and propagate to denormalized records where staff/customers see customer identity. Historical records should **display the current username** while preserving **what the username was when the record was created** (e.g. “@newname · was @oldname at submission”).

---

## Background

- Customers have a unique lowercase **`username`** (handle) and separate **`displayName`** on `customers/{id}` with reservation docs in `customerUsernames/{username}`.
- Staff can already change username via Studio → **`updateCustomer`** callable (`functions/src/updateCustomer.ts`), which swaps reservations and syncs `users` + Firebase Auth display name/email.
- Portal **Account Settings** today supports password, email sync, deletion — **not** username/display name (`apps/portal/features/account/components/AccountSettingsModal.tsx`).
- Print requests store **`customerUsernameSnapshot`** / **`customerDisplayNameSnapshot`** at creation; locked request **`name`** is `{username}-CR{seq}` and is **not** renamed today (ADR in `DATA_MODEL.md` ~1078–1089).
- Owner request: customers have been asking for self-service username changes with full propagation and honest historical labeling.

---

## Scope

### In Scope

1. **Portal self-service profile edit** — username + display name in Account Settings.
2. **New callable** `updatePortalCustomerProfile` (pattern: `syncPortalAccountEmail` + reuse `updateCustomer` transaction logic).
3. **Canonical updates** (transactional):
   - `customers/{id}` — `username`, `displayName`, `usernameUpdatedAt`
   - `customerUsernames` — swap reservation (release old, claim new; fail if taken)
   - `users/{uid}` — `displayName` when linked
   - Firebase Auth — `displayName` sync
4. **Denormalized propagation** (Admin SDK batch / background chunking):
   - `printRequests` where `customerId == X` — update snapshot fields to **new** values; add **`customerUsernameAtCreationSnapshot`** / **`customerDisplayNameAtCreationSnapshot`** on first change only (preserve original submit-time values).
   - `designIssueReports` where `customerId == X` — same snapshot + at-creation fields.
5. **Display helpers** (shared):
   - Format submitter / customer label as current snapshot with optional “was @old at submission” when at-creation differs.
   - Studio print request lists, staff inbox, design issue reports, Portal “my requests” where applicable.
6. **Customer username history** on `customers/{id}`:
   - `usernameHistory?: { username: string; changedAt: Timestamp }[]` (append-only, capped e.g. last 10) for support/audit.
7. **Validation** — reuse `packages/shared/src/utils/customerUsername.ts` + `customerUpdateValidation.ts`.
8. **Security rules** — no client direct writes; callable-only.
9. **Tests** — callable unit tests, propagation tests, shared formatters, Portal form validation.
10. **Docs** — `DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md`, ADR in `DECISIONS.md`.

### Out of Scope

- Renaming locked print request **`name`** field (`olduser-CR001` stays as immutable request id label; UI explains relationship to current @handle).
- Guest customers (`isGuest: true`) without Portal accounts — remain staff-managed in Studio.
- Releasing tombstoned usernames from `customerUsernames`.
- Algolia / analytics identity (no username in public analytics per SECURITY.md).
- One-time migration for customers who changed username **only via Studio** before this feature (optional follow-up backfill).

---

## Affected Areas

### Files / Modules (expected)

**Functions**
- `functions/src/updatePortalCustomerProfile.ts` (new)
- `functions/src/lib/customerProfileUpdate.ts` (extract shared txn from `updateCustomer.ts`)
- `functions/src/lib/propagateCustomerIdentitySnapshots.ts` (new)
- `functions/src/index.ts` — export callable
- `functions/src/updateCustomer.ts` — refactor to shared helper; optionally call propagation

**Shared**
- `packages/shared/src/types/customer/updatePortalCustomerProfile.types.ts` (new)
- `packages/shared/src/types/customer/customer.types.ts` — `usernameHistory`, at-creation snapshot types
- `packages/shared/src/types/printRequest/printRequest.types.ts` — at-creation snapshot fields
- `packages/shared/src/designIssueReports/designIssueReport.types.ts`
- `packages/shared/src/utils/formatCustomerIdentityLabel.ts` (new — current + was-at-creation)

**Portal**
- `apps/portal/features/account/components/AccountSettingsModal.tsx` — Profile section
- `apps/portal/features/account/services/portalAccountSettingsService.ts`
- Reuse `apps/portal/features/auth/components/PortalUsernameField.tsx`

**Studio** (display only + optional propagation trigger on staff `updateCustomer`)
- `apps/studio/.../EditCustomerModal.tsx` — align copy with propagation behavior
- Print request / design issue display components using new formatter

**Rules**
- `firestore.rules` — validate new optional fields on snapshots if client-readable

### Architecture Impact

- [x] Extract shared **customer profile update** domain logic from staff-only callable into reusable module used by staff + portal callables.
- [x] Propagation is a **server-side side effect** after successful profile commit (same request or chunked follow-up for large request counts).

### Security Impact

- [x] Callable requires `requirePortalCustomer`; customer may only update **own** `customers/{id}`.
- [x] Username uniqueness enforced in transaction (no race).
- [x] Rate limit / cooldown on username changes (recommend **30 days** between username changes — product confirm).
- [x] No client writes to `customers.username`, `customerUsernames`, or snapshot fields.
- [x] Propagation queries scoped by `customerId` + caller ownership verified before batch.

### Data Model Impact

- [x] `Customer.usernameHistory[]` (optional, append-only).
- [x] `PrintRequest.customerUsernameAtCreationSnapshot?`, `customerDisplayNameAtCreationSnapshot?`
- [x] `DesignIssueReport` — same at-creation fields.
- [x] Existing `customerUsernameSnapshot` becomes **current display identity** after propagation (updated on profile change).

### Backend Impact

- [x] New callable + export in `functions/src/index.ts`.
- [x] Deploy to dev before Portal QA (`firebase deploy --only functions:updatePortalCustomerProfile`).

### UI / UX Impact

- [x] Portal Account Settings → **Profile** section: edit display name + username with validation hints (Whatnot guidance).
- [x] Success copy: explains propagation + that request **names** like `olduser-CR001` stay unchanged but lists show @newname with “was @olduser”.
- [x] Studio staff views use shared formatter for consistent labeling.

### Migration Impact

- [x] **Forward:** New fields optional; old docs without at-creation fields treat current snapshot as both current and historical.
- [x] **Propagation on change:** Only runs when username/displayName actually changes; idempotent.
- [x] **Rollback:** Revert function deploy; manual username swap via Studio if needed (no automatic undo).

---

## Approach

### Phase A — Shared server core

1. Extract `applyCustomerProfileUpdateInTransaction()` from `updateCustomer.ts` (reservation swap, customer doc, users doc).
2. Add `propagateCustomerIdentityToSnapshots(customerId, { username, displayName, previousUsername, previousDisplayName })`:
   - Query `printRequests` where `customerId == …` (paginated batches of 400).
   - For each doc: if at-creation fields missing, set from **previous** snapshot values; then set snapshot fields to **new** values.
   - Same for `designIssueReports`.
   - Append to `customers.usernameHistory`.
3. Refactor `updateCustomer` to call propagation after txn (staff path).

### Phase B — Portal callable + UI

1. `updatePortalCustomerProfile({ displayName, username })`:
   - `requirePortalCustomer`
   - Validate; enforce cooldown if `usernameUpdatedAt` within policy window.
   - Run shared txn; sync Auth displayName.
   - Run propagation.
   - Return `{ usernameChanged, displayNameChanged, printRequestsUpdated, designIssueReportsUpdated }`.
2. Portal Account Settings — add **Profile** menu item with form (mirror CompleteProfile validation).
3. Refresh `customer` in Auth context after success.

### Phase C — Display layer

1. `formatCustomerIdentityLabel({ currentUsername, atCreationUsername, currentDisplayName, atCreationDisplayName })`.
2. Wire into Studio print request rows, staff inbox, design issue submitter, Portal request cards.
3. Search: index continues to use snapshot fields (updated) so search finds new @handle.

### Phase D — Tests & docs

1. Callable tests: success, taken username, cooldown, unauthorized, propagation batch.
2. Formatter unit tests.
3. Update `DATA_MODEL.md`, `SECURITY.md`, `BACKEND.md`, ADR in `DECISIONS.md`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Functions unit tests | `npm test` (functions package) | yes |
| Shared unit tests | `npx tsx --test packages/shared/...` | yes |
| Portal lint/typecheck | portal app build | yes |
| Firestore rules | existing rules test suite if snapshot fields validated | yes |

### Manual

- [ ] Portal: change username on test account; dashboard shows @newname.
- [ ] Portal: existing print request card shows @newname + “was @oldname”.
- [ ] Studio: same request row shows consistent labeling; locked name still `olduser-CR001`.
- [ ] Duplicate username rejected.
- [ ] Cooldown blocks second username change inside window (if enabled).
- [ ] Staff `updateCustomer` still works; propagation runs.

---

## Human Checkpoints Anticipated

- [x] **Business logic:** Username change cooldown duration (recommend 30 days).
- [x] **Business logic:** Confirm locked request **`name`** stays unchanged (recommended).
- [x] **Production deploy:** Functions deploy to prod after dev QA.
- [ ] Manual UI/UX review — Portal profile form copy.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Large print-request count → slow propagation | Medium | Paginated batches; return counts; optional async continuation |
| Username squatting after change | Low | Old reservation deleted only after new reserved; cooldown |
| Staff/customer confusion on CR name vs @handle | Medium | Clear UI copy + formatter “was at submission” |
| Studio staff edit + portal edit race | Low | Firestore transaction on reservation |
| Search/grouping by old snapshot | Low | Propagation updates snapshots |

---

## Rollback Plan

- Disable Portal UI section (feature flag or hide menu item).
- Remove callable export / leave function unused.
- No schema rollback required (optional fields).

---

## Documentation Updates Required

- [x] DATA_MODEL.md — at-creation snapshot fields, usernameHistory, propagation behavior
- [x] BACKEND.md — new callable
- [x] SECURITY.md — portal self-service username rules
- [x] DECISIONS.md — ADR for locked request name vs snapshot propagation
- [ ] STYLE_GUIDE.md — Portal profile form patterns

---

## Open Questions

- [x] **Cooldown:** 30 days between username changes — **owner approved**
- [x] **Display name:** Include in same self-service form — **owner approved**
- [x] **Staff-triggered changes:** Same propagation as Portal — **owner approved**
- [x] Review: `docs/workflow/reviews/2026-08-27-portal-customer-username-change-review.md` — **approved**

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-27-portal-customer-username-change-review.md`
- Verdict: **approved**
