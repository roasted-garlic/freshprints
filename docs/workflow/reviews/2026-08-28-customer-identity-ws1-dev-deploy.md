# DEV Deploy: Customer Identity Management — WS1

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Project | `fresh-prints-dev` only |
| Branch | `development` |
| Production | **NOT touched** |
| Indexes | **NOT deployed** |
| Studio publish | **NOT authorized** |

---

## Pre-deploy corrective — checksum

| Finding | **Option C** — source accidentally truncated SHA-256 to 32 hex chars via `.slice(0, 32)` |
|---------|---|
| Fix | Removed truncation; checksum is now **full 64-character SHA-256 hex** digest |
| Tests | `customerAccountEligibility.test.ts` asserts length 64 + hex pattern |
| Docs | Implementation review §15 wording corrected |

No intentional truncation; collision resistance now matches standard SHA-256.

---

## Pre-deploy verify

| Check | Result |
|-------|--------|
| Branch `development` | pass |
| Firebase project `fresh-prints-dev` | pass |
| Functions build | pass |
| Callable exports in `functions/src/index.ts` | pass (all four) |
| `firestore.rules` WS1 blocks present | pass |
| Index deploy required | no |
| `hardDeleteCustomerAccount` dev gate | `assertHardDeleteAllowedProject()` → `fresh-prints-dev` only |
| Production targeted | no |

### Rules tests

`npm run test:rules` — **not run** (emulator requires Java; `Could not spawn java -version` on this host). Rules compiled successfully during `firebase deploy --only firestore:rules`. Manual rule review confirms WS1-only additions.

---

## Functions deploy

**Command:**

```bash
firebase deploy --project fresh-prints-dev --only functions:previewHardDeleteCustomerAccount,functions:hardDeleteCustomerAccount,functions:disableCustomerAccount,functions:restoreCustomerAccount
```

**Result:** Partial failure on first attempt — `previewHardDeleteCustomerAccount` Cloud Build `CANCELLED`; three others created successfully.

**Retry command:**

```bash
firebase deploy --project fresh-prints-dev --only functions:previewHardDeleteCustomerAccount
```

**Retry result:** success (`Successful update operation`).

---

## Firestore Rules deploy

**Command:**

```bash
firebase deploy --project fresh-prints-dev --only firestore:rules
```

**Result:** success — `released rules firestore.rules to cloud.firestore`

---

## Post-deploy — Functions (ACTIVE)

| Function | Gen | Region | Revision | updateTime (UTC) | Runtime | State |
|----------|-----|--------|----------|------------------|---------|-------|
| `previewHardDeleteCustomerAccount` | v2 | us-central1 | `previewharddeletecustomeraccount-00001-rer` | 2026-08-28T18:39:12Z | nodejs20 | ACTIVE |
| `hardDeleteCustomerAccount` | v2 | us-central1 | `harddeletecustomeraccount-00001-jop` | 2026-08-28T18:34:58Z | nodejs20 | ACTIVE |
| `disableCustomerAccount` | v2 | us-central1 | `disablecustomeraccount-00001-wis` | 2026-08-28T18:34:54Z | nodejs20 | ACTIVE |
| `restoreCustomerAccount` | v2 | us-central1 | `restorecustomeraccount-00001-wix` | 2026-08-28T18:34:56Z | nodejs20 | ACTIVE |

Verified via `gcloud functions describe … --gen2`.

### Deployed behavior (code review — not live mutation tested)

- **Preview:** owner-only, eligibility inventory, 15-min preview doc TTL, single-use consume, full SHA-256 checksum, audit preview event
- **Hard delete Apply:** owner-only, `DELETE CUSTOMER`, preview revalidation, eligibility re-check, `fresh-prints-dev` gate, identity/bootstrap-only deletion, audit apply event with checksum
- **Disable:** owner-only, Auth disable, history + username preserved, `isDisabled` fields
- **Restore:** owner-only, tombstone/merged rejected, Auth re-enable

---

## Post-deploy — Rules

Live rules (deployed 2026-08-28):

- `customerActivityEvents/{eventId}` — staff read; create/update/delete **denied**
- `customerIdentityOperationPreviews/{previewId}` — read/write **denied** (Admin SDK only)

No unrelated permission widening in WS1 diff.

---

## Status

**READY FOR OWNER DEV QA**

Owner must run checklist in parent implementation review + user-provided WS1 QA sections A–H on `fresh-prints-dev` with disposable fixtures only.
