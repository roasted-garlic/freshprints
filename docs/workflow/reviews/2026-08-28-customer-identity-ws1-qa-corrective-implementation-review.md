# Implementation Review: Customer Identity WS1 QA Corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Reviewer | Implementation Agent |
| Plan | WS1 owner QA corrective (inline scope from owner FAIL report) |
| Verdict | **approved_with_notes** |
| Production | **NOT AUTHORIZED** |
| Studio publish | **NOT AUTHORIZED** |

---

## Summary

Corrective pass addresses all six owner-observed WS1 DEV QA failures without expanding into WS2. Backend propagation persistence, hard-delete preview eligibility scanning, Firestore customer field whitelist, restore reconciliation, and Studio identity UX were updated. **Rules change is required** for print-request creation after disable/restore/username propagation — owner must approve Rules redeploy separately.

---

## Root causes confirmed

| # | Issue | Root cause |
|---|-------|------------|
| 1 | Username change error | `propagateCustomerIdentitySnapshots` persisted `lastError: undefined` on completion → Firestore rejected write |
| 2 | Partial-success UX | Canonical username transaction committed before propagation; thrown Firestore error surfaced as total failure |
| 3 | Permanent delete `internal` | `hasSubcollectionDocuments` used invalid collection path `customers/{id}/favorites` as a top-level collection id |
| 4–5 | Disabled / re-enable UX | Affordances existed but were easy to miss (overflow-only restore label, weak list emphasis) |
| 6 | Print Request permission denied | `customerRequiredFieldsValid` `keys().hasOnly(...)` omitted WS1 fields (`isDisabled`, `identitySnapshotPropagation`, tombstone/merge fields). Staff customer counter update failed rules evaluation on merged customer docs |

---

## Checklist

- [x] Scope limited to WS1 corrective
- [x] No WS2 duplicate/merge/transfer work
- [x] No Rules weakening for print requests
- [x] Restore sets `users.isActive: true`, `users.isDeleted: false`, Auth enabled, `customers.isDisabled` cleared
- [x] Regression tests added
- [x] Functions build passes
- [ ] Rules emulator tests (Java missing — same as prior WS1 test report)
- [ ] Owner DEV redeploy + re-QA pending

---

## Deploy impact

### Functions (source changed — redeploy to fresh-prints-dev after owner approval)

| Export | Reason |
|--------|--------|
| `updateCustomer` | Propagation persistence + partial-success response |
| `previewHardDeleteCustomerAccount` | Eligibility subcollection scan fix + error mapping |
| `hardDeleteCustomerAccount` | Shared eligibility helper + error mapping |
| `restoreCustomerAccount` | Explicit `users.isDeleted: false` on restore |
| `disableCustomerAccount` | No logic change (only touched for `isDeleted: false` on restore batch in same file) |

**Note:** `disableCustomerAccount` runtime behavior unchanged; redeploy only needed if deploying the whole changed bundle — not strictly required in isolation.

**Minimal corrective allowlist:** `updateCustomer`, `previewHardDeleteCustomerAccount`, `restoreCustomerAccount`

### Firestore Rules

**Changed:** `customerRequiredFieldsValid` extended with WS1 identity/tombstone/merge/propagation fields.

**Owner approval required** before Rules redeploy — print-request fix depends on this.

### Studio

Local-only changes; **no publish** authorized. Owner re-QA uses dev Studio against deployed Functions + Rules.

---

## Affected DEV customer repair guidance

If the QA customer was disabled then re-enabled **before** this corrective:

1. **Run Re-enable again** after `restoreCustomerAccount` deploy — restores `users.isActive` and clears `isDisabled`.
2. If print requests still fail **before Rules deploy**, that is expected until Rules whitelist ships.
3. No manual Firestore mutation recommended without owner approval.

If username change left `identitySnapshotPropagation` in a failed state, saving again or a propagation resume after `updateCustomer` deploy should clear it.

---

## Open notes

- GCP logs showed generic `Invalid request, unable to process` for some callable traffic; hard-delete root cause was proven in code (invalid subcollection path), not deployment absence.
- Studio error mapping now replaces bare `internal` with actionable copy when preview still fails unexpectedly.

---

## Next step

Owner: **APPROVE DEV DEPLOY** (Functions + Rules) → re-run WS1 DEV QA checklist.
