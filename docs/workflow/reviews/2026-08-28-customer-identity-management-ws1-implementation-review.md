# Implementation Review: Customer Identity Management — WS1

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Reviewer | Implementation Agent |
| Plan | `docs/workflow/plans/2026-08-28-customer-account-identity-management-and-audit-plan.md` |
| Kickoff amendment | `docs/workflow/plans/2026-08-28-customer-identity-ws1-kickoff-amendment.md` |
| Verdict | **approved_with_notes** |

---

## CUSTOMER IDENTITY MANAGEMENT — WS1 IMPLEMENTATION RESULT

### 1. Corrected ADR assignments

| Topic | ADR |
|-------|-----|
| Reversible disable | **ADR-FP-150** |
| History-free hard delete | **ADR-FP-151** |
| Account merge (WS3 placeholder) | **ADR-FP-152** |
| Duplicate username transfer (WS2 reserved) | **ADR-FP-153** |

Recorded in `DECISIONS.md` (150–151) and kickoff amendment.

### 2. Exact files changed (WS1 scope)

**Shared**
- `packages/shared/src/constants/customerIdentityConfirmationPhrases.ts`
- `packages/shared/src/types/customer/customerActivityEvent.types.ts`
- `packages/shared/src/types/customer/customerIdentityManagement.types.ts`
- `packages/shared/src/types/customer/customer.types.ts`
- `packages/shared/src/types/customer/customerIdentity.types.ts`

**Functions**
- `functions/src/lib/customerAccountEligibility.ts` (+ `.test.ts`)
- `functions/src/lib/customerAccountIdentityBootstrapDeletion.ts`
- `functions/src/lib/customerActivityEvents.ts`
- `functions/src/lib/customerIdentityEligibilitySnapshot.ts`
- `functions/src/lib/customerIdentityOperationLock.ts`
- `functions/src/lib/customerIdentityOperationPreview.ts`
- `functions/src/lib/customerIdentityProjectGate.ts`
- `functions/src/hardDeleteCustomerAccount.ts`
- `functions/src/disableCustomerAccount.ts`
- `functions/src/updateCustomer.ts` (audit event on username change)
- `functions/src/lib/portalCustomer.ts` (`isDisabled` gate)
- `functions/src/index.ts`

**Studio**
- `apps/studio/.../users/services/customerIdentityManagementService.ts` (+ contract test)
- `apps/studio/.../users/components/ChangeUsernameModal.tsx`
- `apps/studio/.../users/components/HardDeleteCustomerConfirmDialog.tsx`
- `apps/studio/.../users/components/DisableCustomerConfirmDialog.tsx`
- `apps/studio/.../users/components/EditCustomerModal.tsx`
- `apps/studio/.../users/components/CustomerDirectoryTable.tsx`
- `apps/studio/.../users/pages/UserManagementPage.tsx`
- `apps/studio/.../permissions/services/permissionService.ts`

**Rules / docs**
- `firestore.rules`
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md`
- `docs/project/DECISIONS.md`
- Plan amendment + plan ADR appendix correction

### 3. Username UX

- `EditCustomerModal` shows **Username** panel with `@handle` display and **Change username** button (owner/admin).
- `ChangeUsernameModal` calls existing `updateCustomer` — no new username callable.
- Main edit form no longer inline-edits username (reduces accidental changes).

### 4. Permissions

| Action | Server | Studio |
|--------|--------|--------|
| Username change | `assertCanManageCustomers` | `canChangeCustomerUsername` (owner + admin) |
| Hard delete | Owner only | `canHardDeleteCustomerAccount` |
| Disable / restore | Owner only | `canDisableCustomerAccount` |
| Tombstone | Owner only | unchanged |

### 5. Final hard-delete blocker inventory

Implemented in `customerAccountEligibility.ts`: printRequests, showAllocations, uploads/batches (by customerId + customerUid), assistedCreation, notifications, email jobs, etsy requests/suggestions, designIssueReports, favorites, webPushSubscriptions, customRequests, Storage prefixes, tombstone, merged, active identity lock.

### 6. Preview implementation

`previewHardDeleteCustomerAccount` — owner-only; builds eligibility snapshot; stores single-use preview doc (15 min TTL); returns `previewId` + `previewChecksum`; logs `account.hard_delete_previewed` audit event.

### 7. Hard-delete Apply implementation

`hardDeleteCustomerAccount` — revalidates preview (single-use), checksum, full eligibility; dev project gate; deletes identity/bootstrap only via `hardDeleteCustomerIdentityBootstrap`; logs `account.hard_delete_applied` with actor + checksum.

### 8. ownerDeleteUser reuse/refactor

No change to `ownerDeleteUser` behavior or Test Data UI. New narrow `hardDeleteCustomerIdentityBootstrap` module shares deletion patterns without cascade graph.

### 9. DEV project gate proof

`assertHardDeleteAllowedProject()` uses `isOperationalWipeAllowedProjectId` → `fresh-prints-dev` only on Apply.

### 10. Disable implementation

`disableCustomerAccount` — sets `isDisabled`, disables Auth, `users.isActive: false`; preserves history and username reservation; blocks tombstoned accounts.

### 11. Restore implementation

`restoreCustomerAccount` — clears disable fields; re-enables Auth; fails for tombstone/merged.

### 12. Auth behavior

Disable: `adminAuth.updateUser({ disabled: true })`. Restore: `disabled: false`. Hard delete: `deleteUser`. Tombstone unchanged (ADR-FP-115).

### 13. Identity lock behavior

`identityOperationLock` set during hard-delete Apply; eligibility treats active lock as blocker; 15-minute staleness window in `isIdentityOperationLockActive`.

### 14. Audit evidence implementation

`customerActivityEvents` collection — append-only via `appendCustomerActivityEvent`. Events: username_changed, disabled, restored, hard_delete_previewed, hard_delete_applied. **Not** lifecycle source-of-truth.

### 15. Preview checksum behavior

SHA-256 full hexadecimal digest (64 characters) over customerId, updatedAt, blocker counts, flags. Apply rejects checksum mismatch after preview consumption.

### 16. DATA_MODEL changes

Added `isDisabled*`, `identityOperationLock`, merge placeholder fields, `customerActivityEvents` section.

### 17. Rules/index impact

`firestore.rules`: `customerActivityEvents` staff read; `customerIdentityOperationPreviews` deny all. **No index changes** (preview docs keyed by id).

### 18. Automated test results

| Command | Result |
|---------|--------|
| `npx tsx --test functions/src/lib/customerAccountEligibility.test.ts` | **PASS** (6 tests) |
| `npx tsx --test functions/src/lib/customerProfileUpdate.test.ts` | **PASS** (6 tests) |
| `npx tsx --test apps/studio/.../customerIdentityManagement.contract.test.ts` | **PASS** (2 tests) |
| `npm run build` (functions) | **PASS** |

Not run: full Studio `tsc` (pre-existing unrelated errors in ai-review, customer-uploads, upcoming-shows, etc.). WS1-touched files fixed for null-safety / contract test types.

### 19. Functions build/typecheck/lint

Functions `tsc` build **PASS**. No new lint tooling run on full repo.

### 20. DEV deploy allowlist

New callables to add on next DEV deploy (not deployed this session):

- `previewHardDeleteCustomerAccount`
- `hardDeleteCustomerAccount`
- `disableCustomerAccount`
- `restoreCustomerAccount`

Plus rules deploy for `customerActivityEvents` / preview collection.

### 21. Owner DEV QA checklist

- [ ] Owner: Edit customer → see @username + Change username → save → propagation message
- [ ] Admin: Change username still works
- [ ] Helper: no destructive menu items
- [ ] History-free test customer → hard delete preview eligible → Apply with `DELETE CUSTOMER`
- [ ] Customer with one PR → hard delete blocked with reason
- [ ] Disable → Portal sign-in blocked → Restore → sign-in works
- [ ] Tombstone customer → hard delete blocked
- [ ] Tombstone flow unchanged (ADR-FP-115)

### 22. Remaining WS2 dependencies

- `previewDuplicateAccountResolution`, `transferCustomerUsername`
- Preview token pattern established in WS1
- Eligibility module reusable for duplicate wizard

### 23. Production untouched

No Functions deploy, no rules deploy, no Studio publish, no production config changes.

---

## Verdict

**approved_with_notes** — WS1 scope complete. Deploy + owner DEV QA are explicit follow-ups before using in shared dev.

## Next step

**STOP** per workflow — await owner DEV QA and DEV Functions deploy authorization.
