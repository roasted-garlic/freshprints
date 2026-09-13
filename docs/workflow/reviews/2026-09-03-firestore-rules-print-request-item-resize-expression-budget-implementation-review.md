# Implementation Review: Firestore Rules Print Request item resize expression budget

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-plan.md |
| Formal Review | docs/workflow/reviews/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-review.md |
| Test report | docs/workflow/reviews/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-test-report.md |
| Verdict | **approved_with_notes** |

---

## Summary

Customer `printRequestItems` updates now use a cheap `affectedKeys().hasOnly` allowlist plus a shared after-image key allowlist, ownership/lifecycle checks, and type checks on writable fields. The formerly failing interactive-upscale customer resize **allows** without hitting the 1000-expression budget. Staff `allow update` predicates are unchanged. Full Rules suite **169/169**.

**DEV deploy (2026-09-03, later owner authorization):** `firebase deploy --only firestore:rules --project fresh-prints-dev` exit 0. Compiled and released to `cloud.firestore`. Functions/Storage/indexes/migration not deployed. Owner smoke **pending**. Production still **not** authorized.

---

## IR answers

### IR1. Exact Rules functions changed

- **Added:** `customerPrintRequestItemPortalEditableUpdate`, `printRequestItemKeysAllowed`
- **Removed:** `customerCanUpdatePrintRequestItem`
- **Updated:** `printRequestItemRequiredFieldsValid` now starts with `printRequestItemKeysAllowed(data)` (same 27-key list as before)
- **`allow update` customer OR** now calls `customerPrintRequestItemPortalEditableUpdate()` only

### IR2. Exact old customer evaluation path

`isStaff()` (false) → `isCustomer()` → `printRequestItemRequiredFieldsValid` (27-key `hasOnly` + full field types including upscale optionals) → `customerCanUpdatePrintRequestItem` (mutate + identity equalities + `optionalFieldUnchanged` ×7) → upload vs catalog+`isReadyDesign`

### IR3. Exact new customer evaluation path

`isStaff()` (false, short-circuit rest of staff AND) → `customerPrintRequestItemPortalEditableUpdate()`:

1. `isCustomer()`
2. `diff().affectedKeys().hasOnly([...])`
3. `printRequestItemKeysAllowed(request.resource.data)`
4. `customerCanMutatePrintRequestItem()` (ownership, `draft|editing`, not parked)
5. type/range checks on allowlisted fields; `updatedAt is timestamp`; `quantity is int && quantity > 0`
6. upload identity OR catalog + `isReadyDesign`

### IR4. Where `affectedKeys().hasOnly` is evaluated

First conjunct after `isCustomer()` inside `customerPrintRequestItemPortalEditableUpdate` — **before** `printRequestItemKeysAllowed`, parent gets, and size type checks.

### IR5. Exact writable-key allowlist

`printWidthInches`, `printHeightInches`, `sizeLabel`, `standardSizePresetKey`, `sortOrder`, `notes`, `updatedAt`

### IR6. Staff path unchanged

**YES** for the staff AND-chain on `allow update` (same identity locks, `optionalFieldUnchanged` set, parent exists, upload-or-ready-design). Shared `printRequestItemRequiredFieldsValid` still used by staff create/update; its key list was extracted to `printRequestItemKeysAllowed` with equivalent membership.

### IR7. Upscale metadata immutable

**YES** — omitted from the customer allowlist. Tests deny customer mutation of `artworkEnhanceMode`, `preEnhancePrintWidthInches`, `preEnhancePrintHeightInches`. Staff still uses `optionalFieldUnchanged` for those fields.

### IR8. Quantity immutable / callable-only

**YES** — `"quantity"` is not in the customer allowlist. Test denies `sizePatch({ quantity: 2 })`. After-image still requires `quantity is int && quantity > 0`.

### IR9. Unknown-field injection denied

**YES** — extra keys appear in `affectedKeys` and fail `hasOnly`. Test: `notARealField`.

### IR10. Ownership unchanged

**YES** — still `customerCanMutatePrintRequestItem` → `customerOwnsPrintRequestById`. Different-customer resize denied.

### IR11. Lifecycle / parking unchanged

**YES** — same `isCustomerEditablePrintRequestStatus` (`draft`|`editing`) and `!isPrintRequestParked`. Queued parent still denied (existing test).

### IR12. Catalog / customer-upload unchanged

**YES** — same source OR: both before/after upload, or catalog + `isReadyDesign`. Existing catalog and upload ALLOW tests pass.

### IR13. Malformed / legacy-item parity

**Checked.**

| Existing malformed shape | Customer size-only update |
|--------------------------|---------------------------|
| Unknown extra key (`notARealField`) | **DENY** via `printRequestItemKeysAllowed` on the after-image |
| `quantity: 0` | **DENY** via `quantity is int && quantity > 0` |

Residual (not a permission expansion of writable keys): other invalid **unchanged** types (e.g. illegal `status` string written only via Admin SDK) are not re-run through the full staff/create type suite. Client create/staff update still use `printRequestItemRequiredFieldsValid`. No owner decision required; documented as residual.

### IR14. Formerly failing test

**PASS** — `allows customer size update when interactive upscale fields are present and unchanged` (fixture still includes enhance + preEnhance + `updatedBy` + `requestCountApplied`). No expression-budget log on that ALLOW.

### IR15. Focused resize suite

**PASS** — 22/22, exit 0

### IR16. Full Rules suite

**PASS** — `npm run test:rules`, exit 0

### IR17. Final total

**169 tests, 169 pass, 0 fail** (was 159 with 1 fail; +10 focused cases)

### IR18. Rules compile

**PASS** — emulator compiled and executed `firestore.rules` (no compile error)

### IR19. Functions

**NO**

### IR20. Storage

**NO**

### IR21. Indexes

**NO**

### IR22. Migration

**NO**

### IR23. Security verdict

**No customer permission broadening** of writable keys. Protected fields remain immutable by omission. Unknown keys denied. Ownership/lifecycle/source checks retained. Fail-closed denials remain.

**Note:** Some **deny** cases still log emulator 1000-expression messages (including pre-existing staff marker-flip denials). Those writes still `assertFails`. The previously failing **allow** no longer hits the budget.

### IR24. DEV deployment inventory

| Surface | Deploy now? |
|---------|-------------|
| Firestore Rules | **YES later** — owner-authorized `firebase deploy --only firestore:rules --project fresh-prints-dev` |
| Functions / Storage / indexes / migration / Studio / Portal | **NO** |

**Deployed (owner-authorized, 2026-09-03):** `firebase deploy --only firestore:rules --project fresh-prints-dev` — compile + release succeeded. No further deploy from this review.

### IR25. Production inventory

Firestore Rules later only under a separate production checkpoint. Nothing else. **NOT AUTHORIZED.**

### IR26. [NEEDS OWNER DECISION]

None for implementation. **Owner must authorize DEV Rules deploy** before it is run.

---

## Checklist (hard gates)

| Gate | Result |
|------|--------|
| Previous expression-budget ALLOW passes | pass |
| Focused resize 0 failures | pass (22/22) |
| Full Rules 0 failures | pass (169/169) |
| Customer writable set not broadened | pass |
| Interactive-upscale protected | pass |
| Unknown fields denied | pass |
| Different-customer denied | pass |
| Lifecycle/ownership retained | pass |
| Malformed/legacy explicitly tested | pass |
| Staff behavior unchanged | pass |
| Rules compile | pass |
| Diff narrow | pass (`firestore.rules` + 2 test files) |

---

## Verdict rationale

Approved with notes: residual deny-path emulator budget logs (fail-closed, not the original ALLOW defect); shared key-list extract inside `printRequestItemRequiredFieldsValid`; incomplete re-validation of exotic Admin-only type-malformed unchanged fields other than keys/`quantity`. None of these fail the hard gates or broaden the customer allowlist.

---

## Next step

**STOP.** Await owner authorization for DEV `firestore:rules` deploy. No commit/push. No production.
