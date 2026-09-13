# PORTAL CUSTOMER USERNAME CHANGE — IMPLEMENTATION RESULT

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Plan | `docs/workflow/plans/2026-08-27-portal-customer-username-change-plan.md` |
| Formal review | `docs/workflow/reviews/2026-08-27-portal-customer-username-change-review.md` |
| Phase | Implement + Test complete — **STOP** (no deploy) |

---

## 1. Implementation Review verdict

**approved_with_notes** — Implementation matches approved plan/review bindings. Notes: Studio `tsc --noEmit` reports pre-existing unrelated errors in other features; Portal typecheck and Functions build pass. No Firestore rules/index changes required (Admin SDK propagation). Production untouched.

---

## 2. Exact files changed (this workstream)

### New

| Path | Purpose |
|------|---------|
| `functions/src/lib/customerProfileUpdate.ts` | Shared canonical profile transaction |
| `functions/src/lib/customerProfileUpdate.test.ts` | Cooldown, history cap, helper tests |
| `functions/src/lib/propagateCustomerIdentitySnapshots.ts` | Resumable batch propagation |
| `functions/src/lib/propagateCustomerIdentitySnapshots.test.ts` | old1→new1→new2 + immutability tests |
| `functions/src/lib/validateUpdatePortalCustomerProfileRequest.ts` | Portal callable validation |
| `functions/src/lib/validateUpdatePortalCustomerProfileRequest.test.ts` | Validation tests |
| `functions/src/updatePortalCustomerProfile.ts` | Portal self-service callable |
| `packages/shared/src/types/customer/customerIdentity.types.ts` | History + propagation types |
| `packages/shared/src/types/customer/updatePortalCustomerProfile.types.ts` | Portal callable I/O |
| `packages/shared/src/utils/formatCustomerIdentityLabel.ts` | Shared identity formatter |
| `packages/shared/src/utils/formatCustomerIdentityLabel.test.ts` | Formatter tests |
| `apps/portal/features/account/services/portalAccountSettingsProfile.contract.test.ts` | Portal validation contract |

### Modified

| Path | Purpose |
|------|---------|
| `functions/src/updateCustomer.ts` | Refactor to shared helper + propagation |
| `functions/src/index.ts` | Export `updatePortalCustomerProfile` |
| `packages/shared/src/types/customer/customer.types.ts` | `usernameHistory`, `identitySnapshotPropagation` |
| `packages/shared/src/types/customer/updateCustomer.types.ts` | Propagation response fields |
| `packages/shared/src/types/printRequest/printRequest.types.ts` | At-creation snapshot fields |
| `packages/shared/src/designIssueReports/designIssueReport.types.ts` | At-creation snapshot fields |
| `packages/shared/src/designIssueReports/formatDesignIssueReportSubmitter.ts` | Uses shared formatter |
| `packages/shared/src/designIssueReports/formatDesignIssueReportSubmitter.test.ts` | Updated expectations |
| `apps/portal/features/account/components/AccountSettingsModal.tsx` | Profile section UI |
| `apps/portal/features/account/services/portalAccountSettingsService.ts` | `updateCustomerProfile` service |
| `apps/studio/.../EditCustomerModal.tsx` | Propagation copy |
| `apps/studio/.../useUpdateCustomerRecord.ts` | Success message propagation note |
| `apps/studio/.../PrintRequestsPage.tsx` | Shared formatter for customer label |
| `docs/architecture/DATA_MODEL.md` | New fields documented |
| `docs/architecture/BACKEND.md` | Callable entries |
| `docs/standards/SECURITY.md` | Portal profile security notes |
| `docs/project/DECISIONS.md` | ADR-FP-148 |

---

## 3. Canonical transaction behavior

`applyCustomerProfileUpdate()` in `customerProfileUpdate.ts`:

- Validates display name + username
- Portal mode: enforces 30-day cooldown when username changes (`failed-precondition`)
- Staff mode: bypasses cooldown
- Single Firestore transaction: customer doc, reservation swap (`customerUsernames`), optional `users/{uid}` mirror, bounded `usernameHistory` append
- Does not touch unrelated customer fields beyond optional staff `email`/`notes`

---

## 4. Username reservation behavior

Unchanged semantics: transactional `set` new reservation + `delete` old when username changes; `already-exists` when another customer owns target username. Tombstone policy unchanged.

---

## 5. Cooldown implementation

`PORTAL_USERNAME_CHANGE_COOLDOWN_MS` (30 days). Portal username changes blocked when `usernameUpdatedAt` within window. Display-name-only updates allowed anytime and do not update `usernameUpdatedAt`.

---

## 6. usernameHistory behavior

Append previous username on username change inside transaction; cap 10 (drop oldest). Support/audit only — not exposed in Portal UI.

---

## 7. Propagation state model

`customers.identitySnapshotPropagation`:

- `status`: `in_progress` | `completed` | `failed`
- `targetUsername` / `targetDisplayName`
- `stage`: `printRequests` | `designIssueReports`
- `printRequestCursor` / `designIssueReportCursor`
- Counters + `lastError` on failure

---

## 8. Batching/cursor behavior

`IDENTITY_SNAPSHOT_BATCH_WRITE_LIMIT = 400` (matches `clearPortalWorkingPrintRequest` precedent). Paginates `printRequests` then `designIssueReports` by `customerId` + `orderBy(documentId())`. Persists cursor after each stage/batch boundary.

---

## 9. Partial-failure + resume behavior

On batch error: `status: failed`, cursor preserved, bounded `lastError`. `resumeCustomerIdentitySnapshotPropagation()` / second pass in callables continues idempotently. Portal callable auto-resumes once via `runIdentityPropagationWithAutoResume`. Staff `updateCustomer` resumes stale `in_progress`/`failed` state on save even without identity change.

---

## 10. old1→new1→new2 test result

**PASS** — `functions/src/lib/propagateCustomerIdentitySnapshots.test.ts` verifies at-creation set from `old1` on first propagation and preserved through `new2` update.

---

## 11. Immutable CR-name proof

**PASS** — `buildIdentitySnapshotFieldUpdates` test asserts `name` field never included in updates.

---

## 12. Portal UI behavior

Account Settings → **Profile**: display name + username (`PortalUsernameField`), validation, saving state, success toast explaining CR names unchanged, `refreshCustomer()` after save. Cooldown/taken username surfaced via callable error messages.

---

## 13. Studio parity behavior

`updateCustomer` uses shared txn + propagation. `EditCustomerModal` copy updated. Success message notes propagation + immutable CR names.

---

## 14. Formatter/display surfaces

- `formatCustomerIdentityLabel` / `formatCustomerUsernameIdentityLabel` (shared)
- Studio Print Requests customer label (`PrintRequestsPage`)
- Design issue report submitter (`formatDesignIssueReportSubmitter` → Staff Inbox rows)
- Portal request detail still shows immutable `printRequest.name` as title (no new surface invented)

---

## 15. Rules/index impact

**No changes.** Propagation and new customer fields written via Admin SDK only. Existing `printRequests` client `hasOnly` validation unaffected for server writes.

---

## 16. Tests/results

| Check | Command | Result |
|-------|---------|--------|
| Functions build | `npm --prefix functions run build` | **PASS** |
| Targeted unit tests | `npx tsx --test` (6 files listed below) | **PASS** (23 tests) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **PASS** |
| Studio typecheck | `npx tsc --noEmit` (apps/studio) | **FAIL** (pre-existing unrelated errors) |
| git diff --check | `git diff --check` | **PASS** (warnings only: CRLF) |

Test files run:

- `functions/src/lib/customerProfileUpdate.test.ts`
- `functions/src/lib/propagateCustomerIdentitySnapshots.test.ts`
- `functions/src/lib/validateUpdatePortalCustomerProfileRequest.test.ts`
- `packages/shared/src/utils/formatCustomerIdentityLabel.test.ts`
- `packages/shared/src/designIssueReports/formatDesignIssueReportSubmitter.test.ts`
- `apps/portal/features/account/services/portalAccountSettingsProfile.contract.test.ts`

---

## 17. Exact DEV deploy allowlist

```bash
firebase deploy --project fresh-prints-dev --only functions:updatePortalCustomerProfile,functions:updateCustomer
```

No rules, indexes, App Hosting, or Studio publish in this phase.

---

## 18. Owner DEV QA checklist

### Portal

1. Sign in as Portal customer → Account settings → **Profile**
2. Change display name only → saves; username cooldown unaffected
3. Change username → success; header/context shows new @handle after save
4. Confirm existing request still shows old `name` (e.g. `olduser-CR001`)
5. Retry username change within 30 days → clear cooldown error
6. Try taken username → clear taken error

### Studio

1. Edit customer username/display name → save succeeds
2. Print Requests list shows `@new · was @old at submission` when snapshots differ
3. Print request `name` column unchanged after username edit
4. Design issue report submitter label uses formatter

### Propagation (large customer)

1. After username change on customer with many requests, confirm callable returns `propagationComplete: true` or notice if incomplete
2. Re-save customer in Studio to resume if `failed` state simulated

---

## 19. Remaining limitations

- No dedicated customer-facing “retry propagation” button (auto-resume in callable only)
- Portal My Requests list does not show historical username clause (request title remains immutable `name`)
- No global backfill for at-creation snapshots on unchanged customers (by design — write-once on first propagation only)
- Studio typecheck debt in unrelated modules remains

---

## 20. Production untouched confirmation

**Confirmed** — no production deploy, rules deploy, index deploy, or migration executed in this session.
