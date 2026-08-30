# WS1 QA Corrective DEV Deploy — fresh-prints-dev

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Production | **NOT AUTHORIZED** |
| Studio publish | **NOT AUTHORIZED** |

---

## Pre-deploy checks

| Check | Result |
|-------|--------|
| Branch `development` | PASS |
| Firebase project `fresh-prints-dev` | PASS |
| Functions `npm run build` | PASS |
| Corrective implementation review | `approved_with_notes` |
| Rules diff limited to `customerRequiredFieldsValid` WS1 allowlist | PASS |
| Firestore indexes deploy | NOT run (untouched) |
| Production targeted | NO |
| Hard-delete dev gate (`assertHardDeleteAllowedProject`) | Unchanged in source |
| WS2/3/4 runtime | Not included |

---

## Reconciled Function allowlist

| Function | Deployed | Reason |
|----------|----------|--------|
| `updateCustomer` | **YES** | Direct source: propagation persistence + partial-success `propagationWarning` |
| `previewHardDeleteCustomerAccount` | **YES** | Shared `loadCustomerEligibilitySnapshot` → fixed `hasSubcollectionDocuments` subcollection path |
| `hardDeleteCustomerAccount` | **YES** | Error mapping + shared eligibility helper |
| `restoreCustomerAccount` | **YES** | Restore batch adds `users.isDeleted: false` reconciliation |
| `disableCustomerAccount` | **NO** | Disable handler unchanged; only `restoreCustomerAccount` block in same file was corrected. Prior revision `00001` remains ACTIVE. |

---

## Deploy commands

```bash
firebase deploy --project fresh-prints-dev --only functions:updateCustomer,functions:previewHardDeleteCustomerAccount,functions:hardDeleteCustomerAccount,functions:restoreCustomerAccount

firebase deploy --project fresh-prints-dev --only firestore:rules
```

---

## Deploy results

| Artifact | Result |
|----------|--------|
| Functions | **Deploy complete** (exit 0) |
| Firestore Rules | **Released** — compiled successfully (pre-existing warnings only) |

---

## ACTIVE verification (us-central1, nodejs20)

| Function | State | Revision | updateTime (UTC) |
|----------|-------|----------|------------------|
| `updateCustomer` | ACTIVE | `updatecustomer-00014-noy` | 2026-08-28T19:58:47Z |
| `previewHardDeleteCustomerAccount` | ACTIVE | `previewharddeletecustomeraccount-00002-six` | 2026-08-28T19:58:52Z |
| `hardDeleteCustomerAccount` | ACTIVE | `harddeletecustomeraccount-00002-hux` | 2026-08-28T19:58:52Z |
| `restoreCustomerAccount` | ACTIVE | `restorecustomeraccount-00002-sic` | 2026-08-28T19:58:52Z |

Shared deploy hash: `firebase-functions-hash: 75b1d4c1420be2616a925f21a0a01c68c760489e`

`disableCustomerAccount`: not redeployed (prior WS1 revision still ACTIVE).

---

## Runtime verification (source / compiled lib)

- **updateCustomer:** `propagationWarning` catch path; imports corrected `propagateCustomerIdentitySnapshots` with `buildPersistedPropagationState` / `withoutUndefinedDeep`.
- **previewHardDelete:** `hasSubcollectionDocuments` uses `collection(name).doc(id).collection(sub)`.
- **hardDelete:** `assertHardDeleteAllowedProject` + improved `mapHttpsError`.
- **restore:** `isActive: true`, `isDeleted: false`, Auth `disabled: false`, clears `customers.isDisabled`.

---

## Rules verification

- `customerRequiredFieldsValid` now allows WS1 fields (`isDisabled`, `identitySnapshotPropagation`, tombstone/merge fields, etc.).
- Staff `allow update` on `customers` unchanged — still `isStaff()` + `customerRequiredFieldsValid`; customers cannot mutate protected identity fields.
- `customerActivityEvents`: read staff only; client writes denied.
- `customerIdentityOperationPreviews`: client read/write denied.
- Print Request rules unchanged.
- Rules emulator: **not run** (Java unavailable on host — carried as signoff note).

---

## Indexes / production

- **Indexes:** not deployed.
- **Production:** not touched.

---

## Affected customer re-QA procedure

1. Reload Studio (local build with corrective UX).
2. Inspect previously affected customer.
3. If disabled or state uncertain → **Re-enable account** once.
4. Retry Studio Print Request creation.

No manual Firestore patch.

---

## Status

**READY FOR OWNER RE-QA**
