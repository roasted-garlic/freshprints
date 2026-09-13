# Review: Firestore Rules Print Request item resize expression budget

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-plan.md |
| Verdict | **approved** |

---

## Summary

Independent re-trace of `firestore.rules` and `tests/firebase/printRequestItemResize.rules.test.ts` on baseline `2b457e2aac18bf138f5459126587daf42ae46dee` confirms the Plan’s root cause: the customer `printRequestItems` update branch re-runs `printRequestItemRequiredFieldsValid` (27-key `hasOnly` + optional interactive-upscale validators) plus `customerCanUpdatePrintRequestItem` (nested user/parent gets and seven `optionalFieldUnchanged` calls). That path exceeds 1000 expressions when interactive-upscale fields are present and unchanged. Replacing the customer branch with a cheap `diff().affectedKeys().hasOnly` transition allowlist, without changing the staff chain or product ADRs, is behaviorally equivalent and does not broaden access. No implementation in this review.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Rules + resize Rules tests + alignment regex tests only |
| Architecture alignment | pass | Same fast-path pattern as catalog expression-budget helpers |
| Security impact addressed | pass | Allowlist ⊂ current customer-mutable keys; staff unchanged |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Firestore Rules only |
| Test strategy adequate | pass | T1–T10 + full `npm run test:rules` |
| Human checkpoints identified | pass | DEV Rules deploy later; production not authorized |
| Roadmap alignment | pass | Deferred from prior closeout; Smart Profiling parked |
| Documentation plan | pass | No new ADR; plan/review artifacts only |
| No silent scope expansion | pass | Explicit reject list for validation removal / DPI-in-Rules |

---

## Required answers (FR1–FR22)

### FR1. Exact failing Rules match/branch

`match /printRequestItems/{printRequestItemId}` → `allow update` at **L1908**.

Failing evaluation: staff AND-chain is false after `isStaff()`; customer OR-chain at L1929–1940 is evaluated and exhausts the budget before an allow/deny result.

### FR2. Exact helper call chain

`isStaff()` (false) → `isCustomer()` → `printRequestItemRequiredFieldsValid` → `customerCanUpdatePrintRequestItem` → `customerCanMutatePrintRequestItem` → `customerOwnsPrintRequestById` / `customerOwnsPrintRequestData` / `isPrintRequestParked` / `isCustomerEditablePrintRequestStatus` → identity equalities → `optionalFieldUnchanged` × (printedAt, printedBy, completedAt, requestCountApplied, updatedBy, artworkEnhanceMode, preEnhancePrintWidthInches, preEnhancePrintHeightInches) → `isCatalogPrintRequestItem` + `isReadyDesign`.

### FR3. Exact expression-budget root cause

Customer updates always pay the full after-image shape validator. Extra present keys (`artworkEnhanceMode`, `preEnhancePrintWidthInches`, `preEnhancePrintHeightInches`, plus `updatedBy` / `requestCountApplied` in the fixture) increase `keys().hasOnly` and optional-field expression cost. Combined with non-memoized `callerUser()` / triple parent `get` / repeated `optionalFieldUnchanged`, the emulator reports **1000 expressions** at L1908.

### FR4. Evidence of duplicated/redundant evaluation

- `isCustomer()` / `callerUser()` not memoized; nested again inside `customerOwnsPrintRequestData`.
- Parent print request `get` three times in `customerCanMutatePrintRequestItem`.
- Source classifiers in shape validator and again on `allow update`.
- Interactive-upscale fields type-checked on the after-image even when unchanged, then immutability-checked again.

### FR5. Why the interactive-upscale-present fixture crosses the limit

It is a legal after-image (fields are in `printRequestItemRequiredFieldsValid`’s allowlist). Present optionals take the expensive type/range and `optionalFieldUnchanged` equality arms. The same customer size patch **without** those keys passes (subtest 2). Staff with the same fixture passes because staff never runs `customerCanUpdatePrintRequestItem`.

### FR6. Chosen refactor

Replace the customer OR of `allow update` with `customerPrintRequestItemPortalEditableUpdate()` (name flexible) that:

1. `isCustomer()`
2. `diff().affectedKeys().hasOnly` of today’s customer-mutable keys
3. `customerCanMutatePrintRequestItem()`
4. type checks on allowlisted fields only
5. existing upload vs catalog+`isReadyDesign` OR

Keep the staff AND-chain unchanged. Do **not** leave `printRequestItemRequiredFieldsValid` as a customer fallback.

### FR7. Why it is behaviorally equivalent

Today’s customer helper already forbids changing quantity, identity, completion timestamps, Wave C marker, `updatedBy`, and interactive-upscale fields. The complement of that lock set is the seven keys in the Plan allowlist. `affectedKeys().hasOnly` on that set is the same transition: protected keys and unknown keys cannot change; changed keys stay type-bounded; ownership/editability/source checks remain.

### FR8. Security comparison before/after

See Plan table. Net change for the failing ALLOW case only (budget deny → semantic allow). All listed DENY cases remain DENY. No new writable keys. Quantity still callable-only for customers. Interactive upscale remains callable-owned.

### FR9. Exact Rules functions expected to change

- New: `customerPrintRequestItemPortalEditableUpdate` (or equivalent)
- Replace/remove uses of: `customerCanUpdatePrintRequestItem`
- Unchanged: `printRequestItemRequiredFieldsValid` (create + staff update), staff `allow update` chain, `optionalFieldUnchanged` on staff item updates, `customerCanMutatePrintRequestItem` (unless Test phase still exceeds 1000)
- `match /printRequestItems/{printRequestItemId}` `allow update` customer OR only

### FR10. Exact test files expected to change

- `tests/firebase/printRequestItemResize.rules.test.ts`
- `packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts`

### FR11. Shared / type / app code

**No** Studio/Portal/Functions/shared types. **Yes** shared **alignment** tests that regex-pin the old customer helper (quantity equality and customer `optionalFieldUnchanged` for `requestCountApplied` / `artworkEnhanceMode`). Those tests **must** be retargeted or implementation cannot land.

### FR12. Functions impact

**NO**

### FR13. Storage Rules impact

**NO**

### FR14. Indexes

**NO**

### FR15. Migration / backfill

**NO**

### FR16. DEV deployment inventory

Firestore Rules **YES** (`firebase deploy --only firestore:rules --project fresh-prints-dev`) after Implementation Review + owner approval. Nothing else.

### FR17. Production inventory for later

Firestore Rules **YES** only under a separate production-promotion checkpoint. Functions/Storage/indexes/migration/apps **NO**.

### FR18. Rollback strategy

Redeploy `firestore.rules` from `2b457e2aac18bf138f5459126587daf42ae46dee` to the same project.

### FR19. Focused test matrix

Plan T1–T10 accepted. Existing file already covers T2, T6 (partial), T7, T8, T9, staff upscale ALLOW, staff enhance-mode DENY. Implementation must add/keep T1 ALLOW, customer T3 DENY, T4, T5, and T10 item completion-field immutability as needed.

### FR20. Full Rules success requirement

`npm run test:rules` with portable JDK 21: **0 failures**. If count stays 159, target **159/159**. If tests are added, use the new total. Do not treat budget-exhausted `assertFails` as sufficient proof for T3/T5/T6 after the fix — those denials should fail the cheap allowlist.

### FR21. ADR required

**NO.** ADR-FP-075 / 080 / 071 are unchanged. This is Rules evaluation efficiency.

### FR22. [NEEDS OWNER DECISION]

**None** for implementation. Owner decision later: **approve DEV Rules deploy**. Production remains not authorized.

---

## Architecture Review

**Findings:**

- Matches established catalog fast-path design: cheap `affectedKeys().hasOnly` before expensive full-document validators (`companionDenormOnlyUpdate` at ~L264, archive/approval helpers).
- Portal already performs item-only size `updateDoc` (`portalPrintRequestService.updatePrintRequestItem.size`) with width/height/`sizeLabel`/optional preset/`updatedAt`. The allowlist is a superset of that write (adds `sortOrder`, `notes` for Rules equivalence).

**Required changes:**

- [x] None beyond the Plan’s mandatory helper order (`affectedKeys` before mutate/validator).

---

## Security Review

**Findings:**

- Replacing full after-image `hasOnly` with transition `affectedKeys().hasOnly` is **not** a weakening if the allowlist is exactly the current customer-mutable set.
- Keeping `sortOrder` and `notes` avoids silent narrowing.
- Omitting them would be a small deny-expansion; the Plan correctly keeps them.
- Must not add quantity, enhance fields, or `requestCountApplied` to the customer allowlist.
- Must not skip `isReadyDesign` for catalog items.
- 200 DPI remains product-layer; Rules still only cap inches at 22. Correct.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] Production Rules deploy (not this goal)
- [x] DEV Rules deploy after tests (owner)

---

## Data Model Review

**Findings:**

- No entity, field, or status changes.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Firestore Rules only. Default-deny catch-all at L2730 is unrelated cost.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Planning session reproduced 11/12 pass, 1 fail, exit code 1, exact emulator message. Sufficient for plan; Test phase must re-run focused + full suite.
- Alignment tests in `printRequestLimitSettingsRulesAlignment.test.ts` **will fail** if the old `customerCanUpdatePrintRequestItem` body is removed without updating regexes. Plan already lists this — required, not optional.

**Required changes:**

- [x] None (already in Plan)

---

## Documentation Review

**Findings:**

- No product ADR. Optional FIREBASE.md one-liner can wait until implementation if the helper lands as planned.

---

## Required Changes (if approved_with_changes)

None. Implement the Plan as written, including alignment-test updates and cheap-discriminator ordering.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

The defect is reproduced and traced to a known Rules pattern already used elsewhere in this file. The chosen refactor preserves authorization semantics, rejects validation-removal shortcuts, names exact files, and gates DEV/production correctly. Security comparison does not show broadening.

---

## Next Step

Implementation of the approved Plan only. **No implementation from the planning prompt.** After implementation: Implementation Review → Test phase (`printRequestItemResize` + `npm run test:rules`) → STOP for owner DEV Rules deploy approval. Production remains **NOT AUTHORIZED**.
